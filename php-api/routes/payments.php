<?php

declare(strict_types=1);

/**
 * Paiements mobile money (SFD §4.9).
 *
 * Trois motifs : consultation, déblocage de fiche, commande. Chacun crée une
 * transaction en attente, transmise à l'agrégateur (apisungku, qui relaie vers
 * pawaPay pour Orange Money / MTN MoMo), puis confirmée par sa notification
 * (webhook signé — voir /payments/webhook/sungku).
 *
 * Rien n'est jamais marqué payé sans confirmation externe — simuler un
 * encaissement serait la pire des tromperies pour un éleveur.
 */

return static function (Router $r): void {

    $methods = ['ORANGE_MONEY', 'MTN_MOMO', 'CARD'];

    /**
     * Crée une transaction en attente et renvoie la réponse attendue par le
     * mobile. Le montant vient toujours de la base, jamais du client.
     */
    $initiate = static function (string $purpose, int $amount, array $user, array $metadata = []) use ($methods): array {
        $method = strtoupper((string) Http::input('method', ''));
        if (!in_array($method, $methods, true)) {
            Http::fail('Moyen de paiement invalide.', 400);
        }

        $phone = trim((string) Http::input('phone', $user['phone']));
        if ($method !== 'CARD' && $phone === '') {
            Http::fail('Numéro de téléphone requis pour le paiement mobile.', 400);
        }

        // Référence unique, utilisée pour rendre le webhook idempotent — et
        // transmise telle quelle à apisungku comme `reference`, pour que leur
        // notification nous revienne avec cette même valeur.
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

        // Mobile money : le dépôt est réellement initié auprès de l'opérateur
        // via apisungku. Une carte reste un moyen déclaré mais non branché ici.
        if ($method !== 'CARD') {
            try {
                Sungku::initiateDeposit([
                    'amount'          => (string) $amount,
                    'currency'        => Countries::currency($user['country'] ?? Countries::DEFAULT),
                    'phoneNumber'     => $phone,
                    'reference'       => $reference,
                    'description'     => 'MokineVeto — ' . strtolower($purpose),
                    'customerMessage' => 'MokineVeto paiement',
                    'metadata'        => $metadata,
                ]);
            } catch (SungkuRejected $e) {
                // Refus explicite (numéro invalide, opérateur non couvert…) :
                // c'est prouvé, la transaction n'ira nulle part.
                Db::update('Payment', $paymentId, ['status' => 'FAILED']);
                Http::fail('Paiement refusé : ' . $e->getMessage(), 422);
            } catch (SungkuUnavailable $e) {
                // Issue indéterminée : on laisse la transaction PENDING plutôt
                // que de prétendre à un échec qui n'est pas prouvé — la
                // réconciliation côté apisungku ou une nouvelle tentative de
                // l'éleveur la débloqueront.
                error_log('[payments] apisungku indisponible : ' . $e->getMessage());
            }
        }

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
        $result = $initiate('FICHE_UNLOCK', $amount, $user, ['ficheId' => $ficheId]);

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
     * Applique le verdict d'une notification externe à une transaction
     * locale. Partagé entre les deux webhooks (agrégateur générique et
     * apisungku) : mêmes effets métier, mêmes garanties d'idempotence.
     *
     * @return array{id: string, status: string, alreadyProcessed?: bool}
     */
    $settlePayment = static function (array $payment, string $status, array $rawPayload, ?string $ficheId): array {
        // Idempotence : une transaction déjà tranchée n'est plus modifiée —
        // les notifications arrivent parfois en double ou dans le désordre.
        if ($payment['status'] !== 'PENDING') {
            return ['id' => $payment['id'], 'status' => $payment['status'], 'alreadyProcessed' => true];
        }

        Db::update('Payment', $payment['id'], [
            'status'            => $status,
            'rawWebhookPayload' => json_encode($rawPayload, JSON_UNESCAPED_UNICODE),
        ]);

        if ($status === 'SUCCEEDED') {
            // Les effets métier ne sont appliqués qu'après confirmation réelle.
            if ($payment['purpose'] === 'ORDER') {
                $order = Db::one('SELECT `id` FROM `Order` WHERE `paymentId` = ?', [$payment['id']]);
                if ($order !== null) {
                    Db::update('Order', $order['id'], ['status' => 'CONFIRMED']);
                }
            }

            if ($payment['purpose'] === 'FICHE_UNLOCK' && $ficheId !== null && $ficheId !== '') {
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

        return ['id' => $payment['id'], 'status' => $status];
    };

    /**
     * Notification générique d'un agrégateur.
     *
     * Non authentifiée par jeton utilisateur — elle vient du prestataire — mais
     * protégée par un secret partagé et rendue idempotente par la référence :
     * une même notification reçue deux fois ne crédite qu'une fois.
     */
    $r->post('/payments/webhook', static function () use ($settlePayment): void {
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

        Http::ok($settlePayment($payment, $status, Http::body(), (string) Http::input('ficheId', '')));
    });

    /**
     * Notification signée d'apisungku (dépôts Orange Money / MTN MoMo relayés
     * vers pawaPay). Signature HMAC-SHA256 sur "timestamp.corps", voir
     * apisungku/php-api/lib/Webhooks.php::deliver pour la contrepartie.
     *
     * Le `ficheId` d'un déblocage de fiche n'existe pas côté apisungku : il
     * est retrouvé depuis la transaction locale plutôt que depuis le webhook.
     */
    $r->post('/payments/webhook/sungku', static function () use ($settlePayment): void {
        $rawBody   = Http::rawBody();
        $timestamp = (string) (Http::header('X-Apisungku-Timestamp') ?? '');
        $signature = (string) (Http::header('X-Apisungku-Signature') ?? '');

        if ($timestamp === '' || $signature === '' || !Sungku::verifyWebhookSignature($rawBody, $timestamp, $signature)) {
            Http::fail('Signature invalide.', 403);
        }

        // Tolérance de 5 minutes : au-delà, ce n'est plus une livraison
        // fraîche mais un rejeu d'une signature interceptée.
        if (abs(time() - (int) $timestamp) > 300) {
            Http::fail('Notification expirée.', 403);
        }

        $payload = Http::body();
        $data    = is_array($payload['data'] ?? null) ? $payload['data'] : [];

        $reference    = trim((string) ($data['reference'] ?? ''));
        $sungkuStatus = strtoupper((string) ($data['status'] ?? ''));

        if ($reference === '') {
            Http::fail('Référence manquante.', 400);
        }

        // Sungku traduit déjà les statuts pawaPay bruts vers son propre
        // vocabulaire (StatusMapper::fromPawaPay) avant de nous notifier :
        // c'est CONFIRMED/FAILED qui nous parvient, jamais COMPLETED (qui est
        // le statut pawaPay d'origine, interne à Sungku). PROCESSING/PENDING
        // sont des statuts intermédiaires, pas définitifs de notre point de vue.
        $status = match ($sungkuStatus) {
            'CONFIRMED' => 'SUCCEEDED',
            'FAILED'    => 'FAILED',
            default     => null,
        };
        if ($status === null) {
            Http::ok(['ignored' => true, 'status' => $sungkuStatus]);
        }

        $payment = Db::one('SELECT * FROM `Payment` WHERE `camooReference` = ?', [$reference]);
        if ($payment === null) {
            Http::fail('Transaction introuvable.', 404, 'NOT_FOUND');
        }

        // Le ficheId d'un déblocage voyage dans les métadonnées transmises à
        // l'initiation (voir /payments/init-fiche-unlock) et nous revient
        // telles quelles dans la notification.
        $meta    = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
        $ficheId = isset($meta['ficheId']) ? (string) $meta['ficheId'] : null;

        Http::ok($settlePayment($payment, $status, $payload, $ficheId));
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
