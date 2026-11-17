<?php

declare(strict_types=1);

/**
 * Back-office d'administration (SFD §4.14).
 *
 * Validation des praticiens, supervision, statistiques et cartographie
 * épidémiologique. Toutes les routes exigent le rôle ADMIN.
 */

return static function (Router $r): void {

    /**
     * Liste des comptes, avec le détail propre à chaque rôle : un éleveur se
     * décrit par son cheptel, un vétérinaire par son dossier de vérification.
     * Deux sous-requêtes plutôt qu'un N+1 par utilisateur.
     */
    $r->get('/admin/users', static function (): void {
        Auth::requireRole('ADMIN');

        $sql    = 'SELECT `id`, `name`, `email`, `phone`, `role`, `country`, `status`, `statusReason`, `createdAt` FROM `User`';
        $params = [];

        $role = Http::query('role');
        if (is_string($role) && in_array($role, ['ELEVEUR', 'VETERINAIRE', 'ADMIN'], true)) {
            $sql     .= ' WHERE `role` = ?';
            $params[] = $role;
        }

        $users = Db::all($sql . ' ORDER BY `createdAt` DESC LIMIT 500', $params);
        if ($users === []) {
            Http::ok([]);
        }

        $eleveurIds = array_column(array_filter($users, static fn (array $u): bool => $u['role'] === 'ELEVEUR'), 'id');
        $vetIds     = array_column(array_filter($users, static fn (array $u): bool => $u['role'] === 'VETERINAIRE'), 'id');

        $farmCounts = [];
        $animalCounts = [];
        if ($eleveurIds !== []) {
            $placeholders = implode(',', array_fill(0, count($eleveurIds), '?'));
            $farmCounts = array_column(Db::all(
                "SELECT `userId`, COUNT(*) AS n FROM `Farm` WHERE `userId` IN ($placeholders) GROUP BY `userId`",
                $eleveurIds
            ), 'n', 'userId');
            $animalCounts = array_column(Db::all(
                "SELECT `userId`, COUNT(*) AS n FROM `Animal` WHERE `userId` IN ($placeholders) GROUP BY `userId`",
                $eleveurIds
            ), 'n', 'userId');
        }

        $vetProfiles = [];
        if ($vetIds !== []) {
            $placeholders = implode(',', array_fill(0, count($vetIds), '?'));
            $vetProfiles = array_column(Db::all(
                "SELECT `userId`, `specialty`, `verification`, `availability`, `ratingAvg`, `ratingCount`
                 FROM `VetProfile` WHERE `userId` IN ($placeholders)",
                $vetIds
            ), null, 'userId');
        }

        $shaped = array_map(static function (array $u) use ($farmCounts, $animalCounts, $vetProfiles): array {
            $detail = [];
            if ($u['role'] === 'ELEVEUR') {
                $detail = [
                    'farms'   => (int) ($farmCounts[$u['id']] ?? 0),
                    'animals' => (int) ($animalCounts[$u['id']] ?? 0),
                ];
            } elseif ($u['role'] === 'VETERINAIRE' && isset($vetProfiles[$u['id']])) {
                $p      = $vetProfiles[$u['id']];
                $detail = [
                    'specialty'     => $p['specialty'],
                    'verification'  => $p['verification'],
                    'availability'  => $p['availability'],
                    'ratingAvg'     => (float) $p['ratingAvg'],
                    'ratingCount'   => (int) $p['ratingCount'],
                ];
            }
            return $u + ['detail' => $detail];
        }, $users);

        Http::ok($shaped);
    });

    /**
     * Vue transversale des rendez-vous, tous vétérinaires confondus (SFD
     * §4.14 — « suivi Mes RDV »). Filtrable par vétérinaire ou par statut.
     */
    $r->get('/admin/appointments', static function (): void {
        Auth::requireRole('ADMIN');

        $where  = [];
        $params = [];

        $vetProfileId = Http::query('vetProfileId');
        if (is_string($vetProfileId) && $vetProfileId !== '') {
            $where[]  = 'a.`vetProfileId` = ?';
            $params[] = $vetProfileId;
        }
        $status = Http::query('status');
        if (is_string($status) && in_array($status, ['UPCOMING', 'COMPLETED', 'CANCELLED'], true)) {
            $where[]  = 'a.`status` = ?';
            $params[] = $status;
        }

        $sql = 'SELECT a.`id`, a.`startsAt`, a.`status`, a.`amount`, a.`reason`,
                       eu.`name` AS eleveurName, eu.`phone` AS eleveurPhone,
                       vu.`name` AS vetName, v.`specialty` AS vetSpecialty
                FROM `Appointment` a
                JOIN `User` eu ON eu.`id` = a.`eleveurId`
                JOIN `VetProfile` v ON v.`id` = a.`vetProfileId`
                JOIN `User` vu ON vu.`id` = v.`userId`';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY a.`startsAt` DESC LIMIT 300';

        Http::ok(Db::all($sql, $params));
    });

    /**
     * Modération des avis (SFD §4.14). Masquer, pas supprimer : un avis
     * masqué reste consultable en cas de litige, mais ne compte plus dans la
     * note publique du praticien ni dans la liste vue par les éleveurs.
     */
    $r->get('/admin/reviews', static function (): void {
        Auth::requireRole('ADMIN');

        $rows = Db::all(
            'SELECT r.`id`, r.`stars`, r.`comment`, r.`hidden`, r.`createdAt`,
                    eu.`name` AS eleveurName, vu.`name` AS vetName, v.`id` AS vetProfileId
             FROM `Review` r
             JOIN `User` eu ON eu.`id` = r.`eleveurId`
             JOIN `VetProfile` v ON v.`id` = r.`vetProfileId`
             JOIN `User` vu ON vu.`id` = v.`userId`
             ORDER BY r.`createdAt` DESC LIMIT 300'
        );

        Http::ok(array_map(static fn (array $r): array => [
            'id'           => $r['id'],
            'stars'        => (int) $r['stars'],
            'comment'      => $r['comment'],
            'hidden'       => (bool) $r['hidden'],
            'createdAt'    => $r['createdAt'],
            'eleveurName'  => $r['eleveurName'],
            'vetName'      => $r['vetName'],
            'vetProfileId' => $r['vetProfileId'],
        ], $rows));
    });

    $r->patch('/admin/reviews/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $review = Db::one('SELECT * FROM `Review` WHERE `id` = ?', [$args['id']]);
        if ($review === null) {
            Http::fail('Avis introuvable.', 404, 'NOT_FOUND');
        }

        $hidden = (bool) Http::input('hidden', true);
        Db::update('Review', $review['id'], ['hidden' => $hidden ? 1 : 0]);

        // La note publique du praticien ne doit refléter que les avis visibles.
        $agg = Db::one(
            'SELECT COUNT(*) AS n, COALESCE(AVG(`stars`), 0) AS avg
             FROM `Review` WHERE `vetProfileId` = ? AND `hidden` = 0',
            [$review['vetProfileId']]
        );
        Db::update('VetProfile', $review['vetProfileId'], [
            'ratingCount' => (int) ($agg['n'] ?? 0),
            'ratingAvg'   => round((float) ($agg['avg'] ?? 0), 2),
        ]);

        Http::ok(['id' => $review['id'], 'hidden' => $hidden]);
    });

    /** Dossiers praticiens en attente, avec leurs pièces justificatives. */
    $r->get('/admin/vets/pending', static function (): void {
        Auth::requireRole('ADMIN');

        $vets = Db::all(
            "SELECT v.*, u.`name`, u.`phone`, u.`email`
             FROM `VetProfile` v JOIN `User` u ON u.`id` = v.`userId`
             WHERE v.`verification` = 'PENDING'
             ORDER BY v.`createdAt` ASC"
        );

        Http::ok(array_map(static function (array $v): array {
            $credentials = Db::all(
                'SELECT `id`, `type`, `mimeType`, `sizeBytes`, `originalName`, `createdAt`
                 FROM `VetCredential` WHERE `vetProfileId` = ?',
                [$v['id']]
            );

            $types = array_column($credentials, 'type');

            return [
                'id'               => $v['id'],
                'userId'           => $v['userId'],
                'name'             => $v['name'],
                'phone'            => $v['phone'],
                'email'            => $v['email'],
                'specialty'        => $v['specialty'],
                'ordreNumber'      => $v['ordreNumber'],
                'interventionZone' => $v['interventionZone'],
                'hourlyRate'       => (int) $v['hourlyRate'],
                'experienceYears'  => (int) $v['experienceYears'],
                'createdAt'        => $v['createdAt'],
                'credentials'      => $credentials,
                // Sans les deux pièces, le dossier n'est pas examinable.
                'complete'         => in_array('DIPLOMA', $types, true)
                                      && in_array('ORDER_CARD', $types, true),
            ];
        }, $vets));
    });

    /** Validation ou refus d'un praticien (SFD §4.14.1). */
    $r->patch('/admin/vets/{id}/verification', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $decision = strtoupper((string) Http::input('verification', ''));
        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            Http::fail('Décision attendue : APPROVED ou REJECTED.', 400);
        }

        $reason = trim((string) Http::input('reason', ''));
        // La SFD §4.1.2 impose un refus motivé : sans motif, le praticien ne
        // saurait pas quoi corriger.
        if ($decision === 'REJECTED' && $reason === '') {
            Http::fail('Un refus doit être motivé.', 400, 'REASON_REQUIRED');
        }

        $vet = Db::one('SELECT * FROM `VetProfile` WHERE `id` = ?', [$args['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        if ($decision === 'APPROVED') {
            $types = array_column(
                Db::all('SELECT `type` FROM `VetCredential` WHERE `vetProfileId` = ?', [$vet['id']]),
                'type'
            );
            if (!in_array('DIPLOMA', $types, true) || !in_array('ORDER_CARD', $types, true)) {
                Http::fail(
                    "Validation impossible : le diplôme et la carte d'ordre doivent être déposés.",
                    409,
                    'CREDENTIALS_MISSING'
                );
            }
        }

        Db::update('VetProfile', $vet['id'], ['verification' => $decision]);

        Db::insert('Notification', [
            'userId'    => $vet['userId'],
            'type'      => 'vet_verification',
            'title'     => $decision === 'APPROVED' ? 'Compte validé' : 'Compte refusé',
            'body'      => $decision === 'APPROVED'
                ? 'Votre compte vétérinaire est validé. Vous êtes désormais visible des éleveurs.'
                : 'Votre dossier a été refusé : ' . $reason,
            'data'      => json_encode(['verification' => $decision, 'reason' => $reason], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok(['id' => $vet['id'], 'verification' => $decision]);
    });

    /** Consultation d'une pièce justificative, réservée à l'administration. */
    $r->get('/admin/credentials/{id}/file', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $credential = Db::one('SELECT * FROM `VetCredential` WHERE `id` = ?', [$args['id']]);
        if ($credential === null) {
            Http::fail('Pièce introuvable.', 404, 'NOT_FOUND');
        }

        // Les pièces vivent hors racine web : elles ne sont servies que par
        // cette route, après contrôle du rôle.
        $relative = ltrim(str_replace('/uploads/', '', (string) $credential['fileUrl']), '/');
        // Barrière contre la traversée de répertoire.
        if (str_contains($relative, '..')) {
            Http::fail('Chemin invalide.', 400);
        }

        $path = dirname(__DIR__, 3) . '/uploads/' . $relative;
        if (!is_file($path)) {
            Http::fail('Fichier absent du serveur.', 404, 'NOT_FOUND');
        }

        header('Content-Type: ' . $credential['mimeType']);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . basename($path) . '"');
        readfile($path);
        exit;
    });

    /** Statistiques de la plateforme (SFD §4.14.3). */
    $r->get('/admin/stats', static function (): void {
        Auth::requireRole('ADMIN');

        $count = static fn (string $sql, array $p = []): int => (int) (Db::one($sql, $p)['n'] ?? 0);

        Http::ok([
            'users' => [
                'total'        => $count('SELECT COUNT(*) AS n FROM `User`'),
                'eleveurs'     => $count("SELECT COUNT(*) AS n FROM `User` WHERE `role` = 'ELEVEUR'"),
                'veterinaires' => $count("SELECT COUNT(*) AS n FROM `User` WHERE `role` = 'VETERINAIRE'"),
            ],
            'vets' => [
                'pending'  => $count("SELECT COUNT(*) AS n FROM `VetProfile` WHERE `verification` = 'PENDING'"),
                'approved' => $count("SELECT COUNT(*) AS n FROM `VetProfile` WHERE `verification` = 'APPROVED'"),
                'rejected' => $count("SELECT COUNT(*) AS n FROM `VetProfile` WHERE `verification` = 'REJECTED'"),
            ],
            'animals'      => $count('SELECT COUNT(*) AS n FROM `Animal`'),
            'appointments' => [
                'total'     => $count('SELECT COUNT(*) AS n FROM `Appointment`'),
                'upcoming'  => $count("SELECT COUNT(*) AS n FROM `Appointment` WHERE `status` = 'UPCOMING'"),
                'completed' => $count("SELECT COUNT(*) AS n FROM `Appointment` WHERE `status` = 'COMPLETED'"),
            ],
            'revenue' => [
                // Commission de 15 % retenue par la plateforme (SFD §4.9.2).
                'collected'  => (int) (Db::one("SELECT COALESCE(SUM(`amount`),0) AS n FROM `Payment` WHERE `status` = 'SUCCEEDED'")['n'] ?? 0),
                'commission' => (int) round((float) (Db::one("SELECT COALESCE(SUM(`amount`),0) AS n FROM `Payment` WHERE `status` = 'SUCCEEDED'")['n'] ?? 0) * 0.15),
            ],
            // CA par vétérinaire (SFD §4.14 — « CA généré par vétérinaire »).
            'revenueByVet' => Db::all(
                "SELECT vu.`name` AS vetName, v.`id` AS vetProfileId,
                        COALESCE(SUM(p.`amount`), 0) AS gross,
                        COUNT(p.`id`) AS paidConsultations
                 FROM `VetProfile` v
                 JOIN `User` vu ON vu.`id` = v.`userId`
                 LEFT JOIN `Appointment` a ON a.`vetProfileId` = v.`id`
                 LEFT JOIN `Payment` p ON p.`id` = a.`paymentId` AND p.`status` = 'SUCCEEDED'
                 GROUP BY v.`id`, vu.`name`
                 HAVING gross > 0
                 ORDER BY gross DESC
                 LIMIT 20"
            ),
            // Maladies les plus diagnostiquées, toutes régions confondues
            // (SFD §4.14 — « maladies les plus diagnostiquées par région » ;
            // la ventilation par région est dans /admin/epidemiology).
            'topPathologies' => Db::all(
                "SELECT COALESCE(f.`name`, 'Non classé') AS name, COUNT(*) AS n
                 FROM `HealthReport` hr
                 LEFT JOIN `Fiche` f ON f.`id` = hr.`ficheId`
                 GROUP BY f.`name`
                 ORDER BY n DESC
                 LIMIT 10"
            ),
        ]);
    });

    /**
     * Cartographie épidémiologique (SFD §4.14.3).
     * Les signalements sont anonymes par construction : la table ne porte
     * aucun identifiant d'utilisateur.
     */
    /**
     * Agrégat épidémiologique par région (carte back-office, Innovation 2
     * simplifiée : pas de grille H3 ni de modèle prédictif, un comptage par
     * région et par fiche sur la période demandée).
     */
    $r->get('/admin/epidemiology', static function (): void {
        Auth::requireRole('ADMIN');

        $since = (string) Http::query('since', '');
        if ($since === '') {
            $since = gmdate('Y-m-d\TH:i:s\Z', strtotime('-90 days'));
        }

        $rows = Db::all(
            'SELECT hr.`region`, hr.`urgency`, f.`name` AS ficheName
             FROM `HealthReport` hr
             LEFT JOIN `Fiche` f ON f.`id` = hr.`ficheId`
             WHERE hr.`createdAt` >= ?',
            [$since]
        );

        $aggregate = [];
        foreach ($rows as $row) {
            $region = (string) ($row['region'] ?? '');
            if ($region === '') {
                continue;
            }
            if (!isset($aggregate[$region])) {
                $aggregate[$region] = ['total' => 0, 'high' => 0, 'byFiche' => new stdClass()];
            }
            $aggregate[$region]['total']++;
            if ($row['urgency'] === 'HIGH') {
                $aggregate[$region]['high']++;
            }
            $ficheName = $row['ficheName'] ?? 'Non classé';
            $byFiche = (array) $aggregate[$region]['byFiche'];
            $byFiche[$ficheName] = ($byFiche[$ficheName] ?? 0) + 1;
            $aggregate[$region]['byFiche'] = (object) $byFiche;
        }

        // Objet, jamais un tableau : même une base vide doit encoder en `{}`
        // pour que le front, qui indexe par région, ne reçoive pas `[]`.
        Http::ok($aggregate === [] ? new stdClass() : $aggregate);
    });

    // ─── Marketplace : gestion (SFD §4.7) ───────────────────────────────────
    // Lecture publique dans routes/marketplace.php ; création et suppression
    // réservées à l'administration, ici.

    $r->post('/admin/suppliers', static function (): void {
        Auth::requireRole('ADMIN');

        $name = trim((string) Http::input('name', ''));
        if ($name === '') {
            Http::fail('Le nom du fournisseur est requis.', 400);
        }

        $id = Db::insert('Supplier', [
            'name'   => $name,
            'phone'  => ((string) Http::input('phone', '')) ?: null,
            'region' => ((string) Http::input('region', '')) ?: null,
            'active' => 1,
        ]);

        Http::ok(Db::one('SELECT * FROM `Supplier` WHERE `id` = ?', [$id]), 201);
    });

    $r->delete('/admin/suppliers/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $supplier = Db::one('SELECT `id` FROM `Supplier` WHERE `id` = ?', [$args['id']]);
        if ($supplier === null) {
            Http::fail('Fournisseur introuvable.', 404, 'NOT_FOUND');
        }

        // Désactivé plutôt que supprimé : les commandes passées le référencent
        // par clé étrangère, et l'historique d'un éleveur ne doit pas se
        // retrouver avec un fournisseur qui n'existe plus.
        Db::update('Supplier', $supplier['id'], ['active' => 0]);

        Http::ok(['id' => $supplier['id'], 'active' => false]);
    });

    $r->post('/admin/products', static function (): void {
        Auth::requireRole('ADMIN');

        $name       = trim((string) Http::input('name', ''));
        $supplierId = (string) Http::input('supplierId', '');
        $category   = trim((string) Http::input('category', ''));
        $unit       = trim((string) Http::input('unit', ''));
        $price      = (int) Http::input('price', 0);

        if ($name === '' || $category === '' || $unit === '') {
            Http::fail('Nom, catégorie et unité sont requis.', 400);
        }
        if ($price <= 0) {
            Http::fail('Le prix doit être strictement positif.', 400);
        }

        $supplier = Db::one('SELECT `id` FROM `Supplier` WHERE `id` = ?', [$supplierId]);
        if ($supplier === null) {
            Http::fail('Fournisseur introuvable.', 404, 'NOT_FOUND');
        }

        $id = Db::insert('Product', [
            'supplierId' => $supplierId,
            'name'       => $name,
            'category'   => $category,
            'price'      => $price,
            'unit'       => $unit,
            'imageUrl'   => ((string) Http::input('imageUrl', '')) ?: null,
            'active'     => 1,
        ]);

        Http::ok(Db::one('SELECT * FROM `Product` WHERE `id` = ?', [$id]), 201);
    });

    // ─── Chatbot : base de règles (SFD §4.14) ───────────────────────────────
    // « Ré-entraîner le modèle » n'a pas de sens pour un moteur de règles :
    // ce qui en tient lieu, honnêtement, c'est ajouter ou corriger une
    // corrélation symptômes → pathologie. Voir php-api/routes/ai.php.

    $shapeRule = static fn (array $r): array => [
        'id'            => $r['id'],
        'conditionName' => $r['conditionName'],
        'keywordsA'     => json_decode((string) $r['keywordsA'], true) ?: [],
        'keywordsB'     => $r['keywordsB'] !== null ? (json_decode((string) $r['keywordsB'], true) ?: []) : null,
        'severe'        => (bool) $r['severe'],
        'active'        => (bool) $r['active'],
        'sortOrder'     => (int) $r['sortOrder'],
    ];

    /** @return string[] */
    $readKeywordList = static function (mixed $raw): array {
        if (!is_array($raw)) {
            return [];
        }
        return array_values(array_filter(array_map(
            static fn (mixed $w): string => trim((string) $w),
            $raw
        ), static fn (string $w): bool => $w !== ''));
    };

    $r->get('/admin/chatbot-rules', static function () use ($shapeRule): void {
        Auth::requireRole('ADMIN');
        $rows = Db::all('SELECT * FROM `ChatbotRule` ORDER BY `sortOrder` ASC, `createdAt` ASC');
        Http::ok(array_map($shapeRule, $rows));
    });

    $r->post('/admin/chatbot-rules', static function () use ($shapeRule, $readKeywordList): void {
        Auth::requireRole('ADMIN');

        $conditionName = trim((string) Http::input('conditionName', ''));
        $keywordsA     = $readKeywordList(Http::input('keywordsA', []));
        if ($conditionName === '' || $keywordsA === []) {
            Http::fail('Le nom de la pathologie et au moins un mot-clé (groupe A) sont requis.', 400);
        }

        $keywordsBInput = Http::input('keywordsB');
        $keywordsB      = is_array($keywordsBInput) ? $readKeywordList($keywordsBInput) : null;
        if ($keywordsB === []) {
            $keywordsB = null; // un groupe B vide équivaut à l'absence de second groupe
        }

        $id = Db::insert('ChatbotRule', [
            'conditionName' => $conditionName,
            'keywordsA'     => json_encode($keywordsA, JSON_UNESCAPED_UNICODE),
            'keywordsB'     => $keywordsB !== null ? json_encode($keywordsB, JSON_UNESCAPED_UNICODE) : null,
            'severe'        => Http::input('severe') ? 1 : 0,
            'active'        => 1,
            'sortOrder'     => (int) Http::input('sortOrder', 0),
        ]);

        Http::ok($shapeRule(Db::one('SELECT * FROM `ChatbotRule` WHERE `id` = ?', [$id])), 201);
    });

    $r->patch('/admin/chatbot-rules/{id}', static function (array $args) use ($shapeRule, $readKeywordList): void {
        Auth::requireRole('ADMIN');

        $rule = Db::one('SELECT `id` FROM `ChatbotRule` WHERE `id` = ?', [$args['id']]);
        if ($rule === null) {
            Http::fail('Règle introuvable.', 404, 'NOT_FOUND');
        }

        $patch = [];
        if (Http::input('conditionName') !== null) {
            $patch['conditionName'] = trim((string) Http::input('conditionName'));
        }
        if (Http::input('keywordsA') !== null) {
            $patch['keywordsA'] = json_encode($readKeywordList(Http::input('keywordsA')), JSON_UNESCAPED_UNICODE);
        }
        if (Http::input('keywordsB') !== null) {
            $list          = $readKeywordList(Http::input('keywordsB'));
            $patch['keywordsB'] = $list === [] ? null : json_encode($list, JSON_UNESCAPED_UNICODE);
        }
        if (Http::input('severe') !== null) {
            $patch['severe'] = Http::input('severe') ? 1 : 0;
        }
        if (Http::input('active') !== null) {
            $patch['active'] = Http::input('active') ? 1 : 0;
        }
        if (Http::input('sortOrder') !== null) {
            $patch['sortOrder'] = (int) Http::input('sortOrder');
        }

        if ($patch !== []) {
            Db::update('ChatbotRule', $rule['id'], $patch);
        }

        Http::ok($shapeRule(Db::one('SELECT * FROM `ChatbotRule` WHERE `id` = ?', [$rule['id']])));
    });

    $r->delete('/admin/chatbot-rules/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $rule = Db::one('SELECT `id` FROM `ChatbotRule` WHERE `id` = ?', [$args['id']]);
        if ($rule === null) {
            Http::fail('Règle introuvable.', 404, 'NOT_FOUND');
        }

        Db::run('DELETE FROM `ChatbotRule` WHERE `id` = ?', [$rule['id']]);

        Http::ok(['id' => $rule['id'], 'deleted' => true]);
    });

    $r->delete('/admin/products/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $product = Db::one('SELECT `id` FROM `Product` WHERE `id` = ?', [$args['id']]);
        if ($product === null) {
            Http::fail('Produit introuvable.', 404, 'NOT_FOUND');
        }

        // Même raisonnement que pour un fournisseur : désactivé, pas supprimé.
        Db::update('Product', $product['id'], ['active' => 0]);

        Http::ok(['id' => $product['id'], 'active' => false]);
    });

    // ─── Modération des comptes (SFD-ADMIN §3.1.3, §3.2.3) ──────────────────

    $r->patch('/admin/users/{id}/status', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $target = Db::one('SELECT `id`, `name`, `phone`, `role`, `status`, `statusReason` FROM `User` WHERE `id` = ?', [$args['id']]);
        if ($target === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }
        if ($target['role'] === 'ADMIN') {
            Http::fail("La modération ne s'applique pas aux comptes administrateurs : voir /admin/admins.", 400);
        }

        $status = strtoupper((string) Http::input('status', ''));
        if (!in_array($status, ['ACTIVE', 'SUSPENDED', 'BANNED'], true)) {
            Http::fail('Statut attendu : ACTIVE, SUSPENDED ou BANNED.', 400);
        }

        $reason = trim((string) Http::input('reason', ''));
        if (in_array($status, ['SUSPENDED', 'BANNED'], true) && $reason === '') {
            Http::fail('Un motif est requis pour suspendre ou bannir un compte.', 400, 'REASON_REQUIRED');
        }
        // Un bannissement définitif exige le rôle le plus élevé (SFD-ADMIN §3.1.3).
        if ($status === 'BANNED') {
            Auth::requireAdminRole('super_admin');
        }

        $days = (int) Http::input('days', 0);
        $suspendedUntil = null;
        if ($status === 'SUSPENDED' && $days > 0) {
            $suspendedUntil = gmdate('Y-m-d H:i:s.000', strtotime("+{$days} days"));
        }

        Db::update('User', $target['id'], [
            'status'         => $status,
            'statusReason'   => $status === 'ACTIVE' ? null : $reason,
            'suspendedUntil' => $suspendedUntil,
        ]);

        // Bannissement définitif = blacklist du numéro : même après une
        // éventuelle anonymisation ultérieure du compte, ce numéro reste
        // bloqué à la réinscription (SFD-ADMIN §3.1.3).
        if ($status === 'BANNED') {
            $admin = Auth::user();
            $existing = Db::one('SELECT `phone` FROM `BannedPhone` WHERE `phone` = ?', [$target['phone']]);
            if ($existing === null) {
                // Table sans colonne `id` (clé primaire = `phone`) : Db::insert()
                // y ajouterait systématiquement un `id` inexistant, d'où un
                // INSERT direct plutôt que l'aide générique.
                Db::run(
                    'INSERT INTO `BannedPhone` (`phone`, `reason`, `bannedByUserId`) VALUES (?, ?, ?)',
                    [$target['phone'], $reason, $admin['id'] ?? null]
                );
            }
        }

        if ($status !== 'ACTIVE') {
            Db::insert('Notification', [
                'userId'    => $target['id'],
                'type'      => 'account_status',
                'title'     => $status === 'BANNED' ? 'Compte banni' : 'Compte suspendu',
                'body'      => $reason,
                'data'      => json_encode(['status' => $status], JSON_UNESCAPED_UNICODE),
                'createdAt' => Db::now(),
            ], false);
        }

        Audit::log(
            $status === 'ACTIVE' ? 'USER_REACTIVATE' : ($status === 'BANNED' ? 'USER_BAN' : 'USER_SUSPEND'),
            'user',
            $target['id'],
            ['status' => $target['status']],
            ['status' => $status, 'suspendedUntil' => $suspendedUntil],
            $reason ?: null
        );

        Http::ok(['id' => $target['id'], 'status' => $status]);
    });

    // ─── Litiges (SFD-ADMIN §5.2) ────────────────────────────────────────────

    $r->get('/admin/disputes', static function (): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $status = Http::query('status');
        $where  = [];
        $params = [];
        if (is_string($status) && $status !== '') {
            $where[]  = 'd.`status` = ?';
            $params[] = $status;
        }

        $sql = 'SELECT d.*, eu.`name` AS eleveurName, eu.`phone` AS eleveurPhone,
                       vu.`name` AS vetName, a.`startsAt`, a.`amount`
                FROM `Dispute` d
                JOIN `User` eu ON eu.`id` = d.`eleveurId`
                JOIN `VetProfile` v ON v.`id` = d.`vetProfileId`
                JOIN `User` vu ON vu.`id` = v.`userId`
                JOIN `Appointment` a ON a.`id` = d.`appointmentId`';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY (d.`status` = "OPEN") DESC, d.`createdAt` DESC LIMIT 300';

        Http::ok(Db::all($sql, $params));
    });

    $r->patch('/admin/disputes/{id}', static function (array $args): void {
        $admin = Auth::requireAdminRole('super_admin', 'operations');

        $dispute = Db::one('SELECT * FROM `Dispute` WHERE `id` = ?', [$args['id']]);
        if ($dispute === null) {
            Http::fail('Litige introuvable.', 404, 'NOT_FOUND');
        }

        $decision = strtoupper((string) Http::input('status', ''));
        if (!in_array($decision, ['RESOLVED_ELEVEUR', 'RESOLVED_VET', 'ESCALATED'], true)) {
            Http::fail('Décision attendue : RESOLVED_ELEVEUR, RESOLVED_VET ou ESCALATED.', 400);
        }

        $note = trim((string) Http::input('resolutionNote', ''));
        if ($note === '') {
            Http::fail('Une note de résolution est requise.', 400, 'NOTE_REQUIRED');
        }

        Db::update('Dispute', $dispute['id'], [
            'status'         => $decision,
            'resolutionNote' => $note,
            'resolvedAt'     => $decision === 'ESCALATED' ? null : Db::now(),
        ], false);

        Audit::log('DISPUTE_RESOLVE', 'dispute', $dispute['id'], ['status' => $dispute['status']], ['status' => $decision], $note);

        // Remboursement Mobile Money non automatisé : cet hébergement ne relaie
        // pas d'écriture financière hors ligne sans confirmation humaine
        // explicite (contrairement à une plateforme AWS avec orchestrateur de
        // paiement dédié). L'admin déclenche un remboursement manuel via
        // /payments si la décision est en faveur de l'éleveur.

        Http::ok(['id' => $dispute['id'], 'status' => $decision]);
    });

    // ─── Journal d'audit (SFD-ADMIN §16) — lecture seule, append-only ───────

    $r->get('/admin/audit-log', static function (): void {
        $admin = Auth::requireRole('ADMIN'); // tous les rôles délégués y ont accès en lecture

        $where  = [];
        $params = [];

        $actorId = Http::query('actorId');
        if (is_string($actorId) && $actorId !== '') {
            $where[]  = '`actorId` = ?';
            $params[] = $actorId;
        }
        $action = Http::query('action');
        if (is_string($action) && $action !== '') {
            $where[]  = '`action` = ?';
            $params[] = $action;
        }
        $resourceType = Http::query('resourceType');
        if (is_string($resourceType) && $resourceType !== '') {
            $where[]  = '`resourceType` = ?';
            $params[] = $resourceType;
        }
        $since = Http::query('since');
        if (is_string($since) && $since !== '') {
            $where[]  = '`createdAt` >= ?';
            $params[] = $since;
        }

        $sql = 'SELECT * FROM `AuditLog`';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        // Tri par séquence d'écriture, pas par horodatage (dérive d'horloge
        // observée sur cet hébergement) : garantit le "plus récent en premier"
        // réel plutôt qu'un ordre faussé par l'horloge serveur.
        $sql .= ' ORDER BY `seq` DESC LIMIT 500';

        $rows = Db::all($sql, $params);

        // L'IP complète n'est visible qu'au rôle le plus élevé (SFD-ADMIN §16.1).
        if ($admin['adminRole'] !== null && $admin['adminRole'] !== 'super_admin') {
            $rows = array_map(static function (array $r): array {
                if (is_string($r['actorIp']) && $r['actorIp'] !== '') {
                    $parts = explode('.', $r['actorIp']);
                    $r['actorIp'] = count($parts) === 4 ? "{$parts[0]}.{$parts[1]}.x.x" : substr($r['actorIp'], 0, 8) . '…';
                }
                return $r;
            }, $rows);
        }

        Http::ok($rows);
    });

    /** Recalcule la chaîne SHA-256 du journal et signale toute altération (SFD-ADMIN §16.2). */
    $r->get('/admin/audit-log/verify', static function (): void {
        Auth::requireAdminRole('super_admin', 'auditor');

        $tampered = Audit::verifyChain();

        Http::ok($tampered === null
            ? ['intact' => true]
            : ['intact' => false, 'firstTamperedEntry' => $tampered]);
    });

    // ─── Configuration de plateforme (SFD-ADMIN §15) ─────────────────────────

    $r->get('/admin/config', static function (): void {
        Auth::requireRole('ADMIN');
        $rows = Db::all('SELECT `key`, `value`, `updatedAt` FROM `PlatformConfig` ORDER BY `key` ASC');
        Http::ok($rows);
    });

    $r->patch('/admin/config/{key}', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'finance');

        $existing = Db::one('SELECT * FROM `PlatformConfig` WHERE `key` = ?', [$args['key']]);
        if ($existing === null) {
            Http::fail('Clé de configuration inconnue.', 404, 'NOT_FOUND');
        }

        $value = trim((string) Http::input('value', ''));
        if ($value === '') {
            Http::fail('Valeur requise.', 400);
        }

        Db::run('UPDATE `PlatformConfig` SET `value` = ?, `updatedAt` = ? WHERE `key` = ?', [$value, Db::now(), $args['key']]);

        Audit::log('CONFIG_UPDATE', 'config', $args['key'], ['value' => $existing['value']], ['value' => $value]);

        Http::ok(['key' => $args['key'], 'value' => $value]);
    });

    // ─── Administrateurs délégués (SFD-ADMIN §3.5) ───────────────────────────

    $r->get('/admin/admins', static function (): void {
        Auth::requireAdminRole('super_admin');
        Http::ok(Db::all(
            "SELECT `id`, `name`, `email`, `phone`, `adminRole`, `status`, `createdAt`
             FROM `User` WHERE `role` = 'ADMIN' ORDER BY `createdAt` ASC"
        ));
    });

    $r->post('/admin/admins', static function (): void {
        Auth::requireAdminRole('super_admin');

        $name  = trim((string) Http::input('name', ''));
        $email = trim((string) Http::input('email', ''));
        $phone = trim((string) Http::input('phone', ''));
        $role  = (string) Http::input('adminRole', '');
        $password = (string) Http::input('password', '');

        if ($name === '' || $phone === '' || $password === '') {
            Http::fail('Nom, téléphone et mot de passe sont requis.', 400);
        }
        if (!in_array($role, ['super_admin', 'operations', 'finance', 'ia', 'tech', 'auditor'], true)) {
            Http::fail('Rôle administrateur invalide.', 400);
        }
        if (strlen($password) < 8) {
            Http::fail('Le mot de passe doit comporter au moins 8 caractères.', 400);
        }

        $existing = Db::one('SELECT `id` FROM `User` WHERE `phone` = ? OR (`email` = ? AND `email` IS NOT NULL)', [$phone, $email]);
        if ($existing !== null) {
            Http::fail('Un compte existe déjà avec ce téléphone ou cet e-mail.', 409, 'ALREADY_EXISTS');
        }

        $id = Db::insert('User', [
            'name'         => $name,
            'email'        => $email ?: null,
            'phone'        => $phone,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'role'         => 'ADMIN',
            'adminRole'    => $role,
            'status'       => 'ACTIVE',
        ]);

        Audit::log('ADMIN_CREATE', 'user', $id, null, ['name' => $name, 'adminRole' => $role]);

        Http::ok(['id' => $id, 'name' => $name, 'adminRole' => $role], 201);
    });

    $r->patch('/admin/admins/{id}/status', static function (array $args): void {
        Auth::requireAdminRole('super_admin');

        $target = Db::one("SELECT * FROM `User` WHERE `id` = ? AND `role` = 'ADMIN'", [$args['id']]);
        if ($target === null) {
            Http::fail('Administrateur introuvable.', 404, 'NOT_FOUND');
        }

        $status = strtoupper((string) Http::input('status', ''));
        if (!in_array($status, ['ACTIVE', 'SUSPENDED'], true)) {
            Http::fail('Statut attendu : ACTIVE ou SUSPENDED.', 400);
        }

        Db::update('User', $target['id'], ['status' => $status]);

        Audit::log(
            $status === 'ACTIVE' ? 'ADMIN_REACTIVATE' : 'ADMIN_DEACTIVATE',
            'user',
            $target['id'],
            ['status' => $target['status']],
            ['status' => $status]
        );

        Http::ok(['id' => $target['id'], 'status' => $status]);
    });

    // ─── Journal des transactions Mobile Money (SFD-ADMIN §6.2) ─────────────

    $r->get('/admin/mobile-money', static function (): void {
        Auth::requireAdminRole('super_admin', 'finance');

        $where  = [];
        $params = [];

        $status = Http::query('status');
        if (is_string($status) && in_array($status, ['PENDING', 'SUCCEEDED', 'FAILED'], true)) {
            $where[]  = 'p.`status` = ?';
            $params[] = $status;
        }
        $method = Http::query('method');
        if (is_string($method) && in_array($method, ['ORANGE_MONEY', 'MTN_MOMO', 'CARD'], true)) {
            $where[]  = 'p.`method` = ?';
            $params[] = $method;
        }
        $purpose = Http::query('purpose');
        if (is_string($purpose) && in_array($purpose, ['APPOINTMENT', 'FICHE_UNLOCK', 'ORDER', 'OTHER'], true)) {
            $where[]  = 'p.`purpose` = ?';
            $params[] = $purpose;
        }
        $since = Http::query('since');
        if (is_string($since) && $since !== '') {
            $where[]  = 'p.`createdAt` >= ?';
            $params[] = $since;
        }

        // Le bénéficiaire (vétérinaire) n'existe que pour un paiement de type
        // consultation ; une fiche ou une commande n'a pas de "vétérinaire
        // payé" au sens de ce journal.
        $sql = 'SELECT p.*, payer.`name` AS payerName, payer.`phone` AS payerPhone,
                       vu.`name` AS vetName, vu.`id` AS vetUserId
                FROM `Payment` p
                JOIN `User` payer ON payer.`id` = p.`userId`
                LEFT JOIN `Appointment` a ON a.`paymentId` = p.`id`
                LEFT JOIN `VetProfile` v ON v.`id` = a.`vetProfileId`
                LEFT JOIN `User` vu ON vu.`id` = v.`userId`';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY p.`createdAt` DESC LIMIT 300';

        $rows = Db::all($sql, $params);

        $commissionRate = (float) (Db::one("SELECT `value` FROM `PlatformConfig` WHERE `key` = 'commissionRate'")['value'] ?? 15) / 100;

        $shaped = array_map(static function (array $p) use ($commissionRate): array {
            $gross = (int) $p['amount'];
            // La commission ne s'applique qu'aux sommes qui rémunèrent un
            // vétérinaire (consultation) ; une fiche ou une commande ne lui
            // reverse rien.
            $hasBeneficiary = $p['vetUserId'] !== null;
            $commission = $hasBeneficiary ? (int) round($gross * $commissionRate) : 0;
            return [
                'id'              => $p['id'],
                'createdAt'       => $p['createdAt'],
                'purpose'         => $p['purpose'],
                'method'          => $p['method'],
                'status'          => $p['status'],
                'reference'       => $p['camooReference'],
                'phone'           => $p['phone'],
                'payerName'       => $p['payerName'],
                'payerPhone'      => $p['payerPhone'],
                'vetName'         => $p['vetName'],
                'grossAmount'     => $gross,
                'commission'      => $commission,
                'netAmount'       => $gross - $commission,
                'failureReason'   => (static function () use ($p): ?string {
                    if ($p['status'] !== 'FAILED' || $p['rawWebhookPayload'] === null) {
                        return null;
                    }
                    $decoded = json_decode((string) $p['rawWebhookPayload'], true);
                    return $decoded['data']['failure']['message'] ?? null;
                })(),
            ];
        }, $rows);

        $totals = [
            'gmv'        => array_sum(array_map(static fn (array $p): int => $p['status'] === 'SUCCEEDED' ? $p['grossAmount'] : 0, $shaped)),
            'commission' => array_sum(array_map(static fn (array $p): int => $p['status'] === 'SUCCEEDED' ? $p['commission'] : 0, $shaped)),
            'pending'    => count(array_filter($shaped, static fn (array $p): bool => $p['status'] === 'PENDING')),
            'failed'     => count(array_filter($shaped, static fn (array $p): bool => $p['status'] === 'FAILED')),
            'succeeded'  => count(array_filter($shaped, static fn (array $p): bool => $p['status'] === 'SUCCEEDED')),
        ];

        Http::ok(['transactions' => $shaped, 'totals' => $totals]);
    });

    // ─── Fiche éleveur détaillée (SFD-ADMIN §3.1.2) ──────────────────────────
    // Pas de KLIP, de GPS enregistré ni de "dernière connexion" (non tracée) :
    // seules les données réellement présentes en base sont exposées.

    $r->get('/admin/users/{id}', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $user = Db::one(
            'SELECT `id`, `name`, `email`, `phone`, `role`, `country`, `status`, `statusReason`, `createdAt`
             FROM `User` WHERE `id` = ?',
            [$args['id']]
        );
        if ($user === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }
        if ($user['role'] !== 'ELEVEUR') {
            Http::fail('Cette fiche détaillée ne couvre que les éleveurs.', 400);
        }

        $animals = Db::all(
            'SELECT `id`, `name`, `species`, `breed`, `sex`, `age`, `createdAt` FROM `Animal` WHERE `userId` = ? ORDER BY `createdAt` DESC',
            [$user['id']]
        );

        $consultations = Db::all(
            'SELECT a.`id`, a.`startsAt`, a.`status`, a.`amount`, a.`reason`, vu.`name` AS vetName
             FROM `Appointment` a
             JOIN `VetProfile` v ON v.`id` = a.`vetProfileId`
             JOIN `User` vu ON vu.`id` = v.`userId`
             WHERE a.`eleveurId` = ? ORDER BY a.`startsAt` DESC LIMIT 50',
            [$user['id']]
        );

        $totalPaid = (int) (Db::one(
            "SELECT COALESCE(SUM(`amount`), 0) AS n FROM `Payment` WHERE `userId` = ? AND `status` = 'SUCCEEDED'",
            [$user['id']]
        )['n'] ?? 0);

        $reviewsGiven = (int) (Db::one(
            'SELECT COUNT(*) AS n FROM `Review` WHERE `eleveurId` = ?',
            [$user['id']]
        )['n'] ?? 0);

        Http::ok([
            'user'          => $user,
            'animals'       => $animals,
            'consultations' => $consultations,
            'stats'         => [
                'animalsCount'       => count($animals),
                'consultationsCount' => count($consultations),
                'totalPaid'          => $totalPaid,
                'reviewsGiven'       => $reviewsGiven,
            ],
        ]);
    });

    /**
     * Réinitialisation du mot de passe (SFD-ADMIN §3.1.3 — « Réinitialiser le
     * PIN »). Cette application authentifie par mot de passe, pas par PIN, et
     * aucune passerelle SMS n'est configurée sur cet hébergement : le mot de
     * passe temporaire est donc renvoyé une seule fois à l'admin, à charge
     * pour lui de le transmettre à l'éleveur par le canal dont il dispose.
     */
    $r->post('/admin/users/{id}/reset-password', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $target = Db::one("SELECT `id`, `name`, `role` FROM `User` WHERE `id` = ? AND `role` <> 'ADMIN'", [$args['id']]);
        if ($target === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }

        $temp = strtoupper(substr(bin2hex(random_bytes(4)), 0, 4)) . '-' . random_int(1000, 9999);
        Db::update('User', $target['id'], ['passwordHash' => password_hash($temp, PASSWORD_DEFAULT)]);

        Db::insert('Notification', [
            'userId'    => $target['id'],
            'type'      => 'password_reset',
            'title'     => 'Mot de passe réinitialisé',
            'body'      => "Votre mot de passe a été réinitialisé par l'administration. Contactez le support pour l'obtenir si vous ne l'avez pas reçu.",
            'data'      => null,
            'createdAt' => Db::now(),
        ], false);

        Audit::log('USER_PASSWORD_RESET', 'user', $target['id'], null, null);

        Http::ok(['id' => $target['id'], 'temporaryPassword' => $temp]);
    });

    /**
     * Correction des données de profil par l'admin, sur demande documentée de
     * l'utilisateur (SFD-ADMIN §3.1.3). Le téléphone reste immuable — c'est
     * l'identifiant du compte (SFD §4.1.4).
     */
    $r->patch('/admin/users/{id}/profile', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $target = Db::one("SELECT * FROM `User` WHERE `id` = ? AND `role` <> 'ADMIN'", [$args['id']]);
        if ($target === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }

        $justification = trim((string) Http::input('justification', ''));
        if ($justification === '') {
            Http::fail('Une justification est requise pour toute modification de profil par un administrateur.', 400, 'JUSTIFICATION_REQUIRED');
        }

        $patch = [];
        $name = trim((string) Http::input('name', ''));
        if ($name !== '' && mb_strlen($name) >= 2) {
            $patch['name'] = $name;
        }
        $email = trim((string) Http::input('email', ''));
        if ($email !== '') {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                Http::fail('Adresse e-mail invalide.', 400);
            }
            $patch['email'] = $email;
        }

        if ($patch === []) {
            Http::fail('Aucune modification valide fournie.', 400);
        }

        Db::update('User', $target['id'], $patch);

        Audit::log(
            'USER_PROFILE_EDIT',
            'user',
            $target['id'],
            array_intersect_key($target, $patch),
            $patch,
            $justification
        );

        Http::ok(['id' => $target['id']] + $patch);
    });

    /**
     * Contact direct depuis l'interface admin (SFD-ADMIN §3.1.3). Livré comme
     * notification in-app : aucune passerelle SMS (Africa's Talking…) n'est
     * configurée sur cet hébergement.
     */
    $r->post('/admin/users/{id}/notify', static function (array $args): void {
        Auth::requireAdminRole('super_admin', 'operations');

        $target = Db::one("SELECT `id` FROM `User` WHERE `id` = ? AND `role` <> 'ADMIN'", [$args['id']]);
        if ($target === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }

        $message = trim((string) Http::input('message', ''));
        if ($message === '') {
            Http::fail('Le message ne peut pas être vide.', 400);
        }

        Db::insert('Notification', [
            'userId'    => $target['id'],
            'type'      => 'admin_message',
            'title'     => 'Message de MokineVeto',
            'body'      => $message,
            'data'      => null,
            'createdAt' => Db::now(),
        ], false);

        Audit::log('USER_CONTACT', 'user', $target['id'], null, ['message' => $message]);

        Http::ok(['id' => $target['id'], 'sent' => true]);
    });

    /**
     * Anonymisation RGPD/DPPA (SFD-ADMIN §3.1.3). Les données personnelles
     * sont hachées de façon irréversible ; les données médicales animales
     * (Animal, HealthEvent) sont conservées pour des raisons sanitaires — le
     * lien `Animal.userId` subsiste, pointant vers un compte anonymisé.
     */
    $r->post('/admin/users/{id}/anonymize', static function (array $args): void {
        Auth::requireAdminRole('super_admin');

        $target = Db::one("SELECT * FROM `User` WHERE `id` = ? AND `role` <> 'ADMIN'", [$args['id']]);
        if ($target === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }

        $justification = trim((string) Http::input('justification', ''));
        if ($justification === '') {
            Http::fail('Une justification (demande écrite du titulaire) est requise.', 400, 'JUSTIFICATION_REQUIRED');
        }

        $anonPhone = 'anon-' . substr(hash('sha256', $target['id']), 0, 16);
        $anonEmail = $target['email'] !== null ? $anonPhone . '@anonymise.local' : null;

        Db::update('User', $target['id'], [
            'name'         => 'Compte anonymisé',
            'phone'        => $anonPhone,
            'email'        => $anonEmail,
            'avatarUrl'    => null,
            'birthDate'    => null,
            'passwordHash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
            'status'       => 'BANNED',
            'statusReason' => 'Compte anonymisé sur demande (RGPD/DPPA)',
        ]);

        Audit::log(
            'USER_ANONYMIZE',
            'user',
            $target['id'],
            ['name' => $target['name'], 'phone' => $target['phone'], 'email' => $target['email']],
            ['name' => 'Compte anonymisé', 'phone' => $anonPhone],
            $justification
        );

        Http::ok(['id' => $target['id'], 'anonymized' => true]);
    });

    /**
     * Fusion de comptes doublons (SFD-ADMIN §3.1.3) : réattribue tout ce que
     * possédait le compte secondaire au compte principal, puis supprime le
     * secondaire. Les deux comptes doivent être du même rôle — fusionner un
     * éleveur avec un vétérinaire n'aurait pas de sens métier.
     */
    $r->post('/admin/users/merge', static function (): void {
        Auth::requireAdminRole('super_admin');

        $primaryId   = trim((string) Http::input('primaryId', ''));
        $duplicateId = trim((string) Http::input('duplicateId', ''));
        if ($primaryId === '' || $duplicateId === '' || $primaryId === $duplicateId) {
            Http::fail('Deux comptes distincts sont requis.', 400);
        }

        $primary   = Db::one('SELECT * FROM `User` WHERE `id` = ?', [$primaryId]);
        $duplicate = Db::one('SELECT * FROM `User` WHERE `id` = ?', [$duplicateId]);
        if ($primary === null || $duplicate === null) {
            Http::fail('Compte introuvable.', 404, 'NOT_FOUND');
        }
        if ($primary['role'] !== $duplicate['role']) {
            Http::fail('Les deux comptes doivent avoir le même rôle.', 400);
        }
        // Un vétérinaire a un VetProfile unique (1-pour-1) : fusionner deux
        // dossiers de vérification distincts n'a pas de sens métier. Réservé
        // aux éleveurs, seul cas d'usage réel (changement de numéro).
        if ($primary['role'] !== 'ELEVEUR') {
            Http::fail('La fusion est réservée aux comptes éleveur.', 400);
        }

        // Réassignation par table plutôt que suppression en cascade : chaque
        // historique (rendez-vous, paiements, animaux…) doit survivre à la
        // fusion sur le compte principal.
        $tables = [
            ['Farm', 'userId'],
            ['Animal', 'userId'],
            ['Order', 'userId'],
            ['Appointment', 'eleveurId'],
            ['Review', 'eleveurId'],
            ['FicheUnlock', 'userId'],
            ['Favorite', 'userId'],
            ['Payment', 'userId'],
            ['SavedMoneyAccount', 'userId'],
            ['Conversation', 'eleveurId'],
            ['Notification', 'userId'],
        ];
        foreach ($tables as [$table, $column]) {
            Db::run("UPDATE `$table` SET `$column` = ? WHERE `$column` = ?", [$primaryId, $duplicateId]);
        }

        Db::run('DELETE FROM `User` WHERE `id` = ?', [$duplicateId]);

        Audit::log(
            'USER_MERGE',
            'user',
            $primaryId,
            ['duplicateId' => $duplicateId, 'duplicatePhone' => $duplicate['phone']],
            ['mergedInto' => $primaryId]
        );

        Http::ok(['primaryId' => $primaryId, 'duplicateId' => $duplicateId, 'merged' => true]);
    });
};
