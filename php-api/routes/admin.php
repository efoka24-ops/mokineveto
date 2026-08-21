<?php

declare(strict_types=1);

/**
 * Back-office d'administration (SFD §4.14).
 *
 * Validation des praticiens, supervision, statistiques et cartographie
 * épidémiologique. Toutes les routes exigent le rôle ADMIN.
 */

return static function (Router $r): void {

    $r->get('/admin/users', static function (): void {
        Auth::requireRole('ADMIN');

        $sql    = 'SELECT `id`, `name`, `email`, `phone`, `role`, `createdAt` FROM `User`';
        $params = [];

        $role = Http::query('role');
        if (is_string($role) && in_array($role, ['ELEVEUR', 'VETERINAIRE', 'ADMIN'], true)) {
            $sql     .= ' WHERE `role` = ?';
            $params[] = $role;
        }

        Http::ok(Db::all($sql . ' ORDER BY `createdAt` DESC LIMIT 500', $params));
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
        ]);
    });

    /**
     * Cartographie épidémiologique (SFD §4.14.3).
     * Les signalements sont anonymes par construction : la table ne porte
     * aucun identifiant d'utilisateur.
     */
    $r->get('/admin/epidemiology', static function (): void {
        Auth::requireRole('ADMIN');

        Http::ok([
            'byRegion' => Db::all(
                'SELECT `region`, COUNT(*) AS reports,
                        SUM(`urgency` = \'HIGH\') AS high
                 FROM `HealthReport` GROUP BY `region` ORDER BY reports DESC'
            ),
            'recent' => Db::all(
                'SELECT `region`, `urgency`, `createdAt` FROM `HealthReport`
                 ORDER BY `createdAt` DESC LIMIT 50'
            ),
        ]);
    });
};
