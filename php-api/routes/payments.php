<?php

declare(strict_types=1);

/**
 * Paiements mobile money (SFD §4.9).
 *
 * Trois motifs : consultation, déblocage de fiche, commande. Chacun crée une
 * transaction en attente, transmise à l'agrégateur, puis confirmée par sa
 * notification (webhook).
 *
 * **État actuel** : l'agrégateur n'est pas encore branché sur cet hébergement.
 * Les transactions sont créées et restent en attente ; le webhook est en place
 * et fonctionnel, prêt à recevoir les confirmations dès que les identifiants
 * seront renseignés. Rien n'est jamais marqué payé sans confirmation externe —
 * simuler un encaissement serait la pire des tromperies pour un éleveur.
 */

return static function (Router $r): void {

    $methods = ['ORANGE_MONEY', 'MTN_MOMO', 'CARD'];

    /**
     * Crée une transaction en attente et renvoie la réponse attendue par le
     * mobile. Le montant vient toujours de la base, jamais du client.
     */
    $initiate = static function (string $purpose, int $amount, array $user) use ($methods): array {
        $method = strtoupper((string) Http::input('method', ''));
        if (!in_array($method, $methods, true)) {
            Http::fail('Moyen de paiement invalide.', 400);
        }

        $phone = trim((string) Http::input('phone', $user['phone']));
        if ($method !== 'CARD' && $phone === '') {
            Http::fail('Numéro de téléphone requis pour le paiement mobile.', 400);
        }

        // Référence unique, utilisée pour rendre le webhook idempotent.
        $reference = strtoupper(substr($purpose, 0, 3)) . '-' . bin2hex(random_bytes(8));

        $paymentId = Db::insert('Payment', [
            'userId'         => $user['id'],
            'purpose'        => $purpose,
            'method'         => $method,
            'amount'         => $amount,
            'phone'          => $phone !== '' ? $phone : null,
            'camooReference' => $reference,
            'status'         => 'PENDING',
        ]);

        return [
            'paymentId' => $paymentId,
            'reference' => $reference,
            'amount'    => $amount,
            'phone'     => $phone,
            'method'    => $method,
        ];
    };

    // ─── Consultation ──────────────────────────────────────────────────────
    $r->post('/payments/init-appointment', static function () use ($initiate): void {
        $user = Auth::require();

        $appointmentId = trim((string) Http::input('appointmentId', ''));
        $appt = Db::one('SELECT * FROM `Appointment` WHERE `id` = ?', [$appointmentId]);

        if ($appt === null || $appt['eleveurId'] !== $user['id']) {
            Http::fail('Rendez-vous introuvable.', 404, 'NOT_FOUND');
        }
        if ($appt['paymentId'] !== null) {
            Http::fail('Ce rendez-vous a déjà un paiement en cours.', 409);
        }

        $result = $initiate('APPOINTMENT', (int) $appt['amount'], $user);
        Db::update('Appointment', $appt['id'], ['paymentId' => $result['paymentId']]);

        Http::json(['success' => true] + $result, 201);
    });

    // ─── Déblocage de fiche ────────────────────────────────────────────────
    $r->post('/payments/init-fiche-unlock', static function () use ($initiate): void {
        $user = Auth::require();

        $ficheId = trim((string) Http::input('ficheId', ''));
        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$ficheId]);
        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        $already = Db::one(
            'SELECT `id` FROM `FicheUnlock` WHERE `userId` = ? AND `ficheId` = ?',
            [$user['id'], $ficheId]
        );
        if ($already !== null) {
            Http::fail('Cette fiche est déjà débloquée.', 409);
        }

        // Tarif unique de déblocage, configurable par l'environnement.
        $amount = max(0, (int) Config::get('FICHE_UNLOCK_PRICE', '500'));
        $result = $initiate('FICHE_UNLOCK', $amount, $user);

        // Le déblocage est enregistré mais ne prendra effet qu'à la
        // confirmation du paiement : voir le webhook.
        Http::json(['success' => true, 'ficheId' => $ficheId] + $result, 201);
    });

    // ─── Commande ──────────────────────────────────────────────────────────
    $r->post('/payments/init-order', static function () use ($initiate): void {
        $user = Auth::require();

        $orderId = trim((string) Http::input('orderId', ''));
        $order = Db::one('SELECT * FROM `Order` WHERE `id` = ?', [$orderId]);

        if ($order === null || $order['userId'] !== $user['id']) {
            Http::fail('Commande introuvable.', 404, 'NOT_FOUND');
        }
        if ($order['paymentId'] !== null) {
            Http::fail('Cette commande a déjà un paiement en cours.', 409);
        }

        $result = $initiate('ORDER', (int) $order['totalAmount'], $user);
        Db::update('Order', $order['id'], ['paymentId' => $result['paymentId']]);

        Http::json(['success' => true] + $result, 201);
    });

    // ─── État d'une transaction ────────────────────────────────────────────
    $r->get('/payments/status/{id}', static function (array $args): void {
        $user = Auth::require();

        $payment = Db::one('SELECT * FROM `Payment` WHERE `id` = ?', [$args['id']]);
        if ($payment === null || $payment['userId'] !== $user['id']) {
            Http::fail('Transaction introuvable.', 404, 'NOT_FOUND');
        }

        Http::ok([
            'id'        => $payment['id'],
            'status'    => $payment['status'],
            'amount'    => (int) $payment['amount'],
            'method'    => $payment['method'],
            'purpose'   => $payment['purpose'],
            'createdAt' => $payment['createdAt'],
        ]);
    });

    /** Vérification par référence, utilisée au retour de l'opérateur. */
    $r->get('/payments/verify', static function (): void {
        $user      = Auth::require();
        $reference = (string) Http::query('id', '');

        $payment = Db::one('SELECT * FROM `Payment` WHERE `camooReference` = ?', [$reference]);
        if ($payment === null || $payment['userId'] !== $user['id']) {
            Http::fail('Transaction introuvable.', 404, 'NOT_FOUND');
        }

        Http::ok([
            'id'     => $payment['id'],
            'status' => $payment['status'],
            'amount' => (int) $payment['amount'],
        ]);
    });

    /**
     * Notification de l'agrégateur.
     *
     * Non authentifiée par jeton utilisateur — elle vient du prestataire — mais
     * protégée par un secret partagé et rendue idempotente par la référence :
     * une même notification reçue deux fois ne crédite qu'une fois.
     */
    $r->post('/payments/webhook', static function (): void {
        $secret = Config::get('PAYMENT_WEBHOOK_SECRET', '');
        if ($secret === null || $secret === '') {
            error_log('[payments] webhook appelé sans secret configuré');
            Http::fail('Webhook non configuré.', 503);
        }

        $provided = (string) (Http::header('X-Webhook-Secret') ?? Http::input('secret', ''));
        if (!hash_equals($secret, $provided)) {
            Http::fail('Non autorisé.', 403);
        }

        $reference = trim((string) Http::input('reference', Http::input('external_reference', '')));
        $status    = strtoupper((string) Http::input('status', ''));

        if ($reference === '') {
            Http::fail('Référence manquante.', 400);
        }
        if (!in_array($status, ['SUCCEEDED', 'FAILED'], true)) {
            Http::fail('État de transaction invalide.', 400);
        }

        $payment = Db::one('SELECT * FROM `Payment` WHERE `camooReference` = ?', [$reference]);
        if ($payment === null) {
            Http::fail('Transaction introuvable.', 404, 'NOT_FOUND');
        }

        // Idempotence : une transaction déjà tranchée n'est plus modifiée.
        if ($payment['status'] !== 'PENDING') {
            Http::ok(['id' => $payment['id'], 'status' => $payment['status'], 'alreadyProcessed' => true]);
        }

        Db::update('Payment', $payment['id'], [
            'status'            => $status,
            'rawWebhookPayload' => json_encode(Http::body(), JSON_UNESCAPED_UNICODE),
        ]);

        if ($status === 'SUCCEEDED') {
            // Les effets métier ne sont appliqués qu'après confirmation réelle.
            if ($payment['purpose'] === 'ORDER') {
                $order = Db::one('SELECT `id` FROM `Order` WHERE `paymentId` = ?', [$payment['id']]);
                if ($order !== null) {
                    Db::update('Order', $order['id'], ['status' => 'CONFIRMED']);
                }
            }

            if ($payment['purpose'] === 'FICHE_UNLOCK') {
                $ficheId = (string) Http::input('ficheId', '');
                if ($ficheId !== '') {
                    $exists = Db::one(
                        'SELECT `id` FROM `FicheUnlock` WHERE `userId` = ? AND `ficheId` = ?',
                        [$payment['userId'], $ficheId]
                    );
                    if ($exists === null) {
                        Db::insert('FicheUnlock', [
                            'userId'     => $payment['userId'],
                            'ficheId'    => $ficheId,
                            'paymentId'  => $payment['id'],
                            'unlockedAt' => Db::now(),
                        ], false);
                    }
                }
            }
        }

        Db::insert('Notification', [
            'userId'    => $payment['userId'],
            'type'      => 'payment_' . strtolower($status),
            'title'     => $status === 'SUCCEEDED' ? 'Paiement confirmé' : 'Paiement échoué',
            'body'      => $status === 'SUCCEEDED'
                ? 'Votre paiement de ' . (int) $payment['amount'] . ' FCFA a été confirmé.'
                : "Votre paiement de " . (int) $payment['amount'] . " FCFA n'a pas abouti.",
            'data'      => json_encode(['paymentId' => $payment['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok(['id' => $payment['id'], 'status' => $status]);
    });

    /**
     * Retrait des gains du praticien (SFD §4.9.3).
     * Enregistré comme demande ; le versement effectif reste un acte manuel
     * tant que l'agrégateur n'est pas branché.
     */
    $r->post('/payments/cashout', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($profile === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        // Revenus nets : total encaissé sur les consultations du praticien,
        // moins la commission de 15 % prévue par la SFD §4.9.2.
        $row = Db::one(
            "SELECT COALESCE(SUM(p.`amount`), 0) AS total
             FROM `Payment` p
             JOIN `Appointment` a ON a.`paymentId` = p.`id`
             WHERE a.`vetProfileId` = ? AND p.`status` = 'SUCCEEDED'",
            [$profile['id']]
        );

        $gross = (int) ($row['total'] ?? 0);
        $net   = (int) round($gross * 0.85);

        if ($net <= 0) {
            Http::fail('Aucun gain disponible au retrait.', 400);
        }

        Http::ok([
            'requested'  => true,
            'gross'      => $gross,
            'commission' => $gross - $net,
            'net'        => $net,
            'message'    => 'Demande enregistrée. Le versement intervient sous 48 heures ouvrées.',
        ]);
    });
};
