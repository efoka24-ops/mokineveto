<?php

declare(strict_types=1);

/**
 * Pièces justificatives du praticien (SFD §4.1.2).
 *
 * « Upload obligatoire : copie du diplôme vétérinaire + carte d'ordre
 *   (formats JPG/PDF, max 5 Mo). »
 *
 * Sans ces pièces, la validation administrateur n'a rien à examiner.
 */

return static function (Router $r): void {

    /** Plafond imposé par la SFD §4.1.2. */
    $maxBytes = 5 * 1024 * 1024;

    $allowed = [
        'image/jpeg'      => '.jpg',
        'image/png'       => '.png',
        'application/pdf' => '.pdf',
    ];

    $shape = static fn (array $c): array => [
        'id'           => $c['id'],
        'type'         => $c['type'],
        'fileUrl'      => $c['fileUrl'],
        'mimeType'     => $c['mimeType'],
        'sizeBytes'    => (int) $c['sizeBytes'],
        'originalName' => $c['originalName'],
        'createdAt'    => $c['createdAt'],
    ];

    /** Profil praticien de l'appelant. */
    $profileOf = static function (array $user): array {
        $profile = Db::one('SELECT * FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($profile === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }
        return $profile;
    };

    $r->get('/vet-credentials', static function () use ($shape): void {
        $user = Auth::requireRole('VETERINAIRE');

        $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($profile === null) {
            Http::ok([]);
        }

        $rows = Db::all(
            'SELECT * FROM `VetCredential` WHERE `vetProfileId` = ? ORDER BY `createdAt` DESC',
            [$profile['id']]
        );
        Http::ok(array_map($shape, $rows));
    });

    $r->post('/vet-credentials', static function () use ($shape, $profileOf, $maxBytes, $allowed): void {
        $user    = Auth::requireRole('VETERINAIRE');
        $profile = $profileOf($user);

        $type = strtoupper((string) ($_POST['type'] ?? ''));
        if (!in_array($type, ['DIPLOMA', 'ORDER_CARD'], true)) {
            Http::fail('Type attendu : DIPLOMA ou ORDER_CARD.', 400);
        }

        $file = $_FILES['file'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            // Un dépassement de `upload_max_filesize` remonte ici : le message
            // doit rester actionnable pour le praticien.
            $code = is_array($file) ? (int) ($file['error'] ?? -1) : -1;
            $message = in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                ? 'Fichier trop volumineux : 5 Mo maximum.'
                : 'Aucun fichier reçu.';
            Http::fail($message, 400);
        }

        if ((int) $file['size'] > $maxBytes) {
            Http::fail('Fichier trop volumineux : 5 Mo maximum.', 400);
        }

        // Le type déclaré par le client n'est pas digne de confiance : on relit
        // le contenu réel du fichier.
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) $finfo->file($file['tmp_name']);
        if (!isset($allowed[$mimeType])) {
            Http::fail('Formats acceptés : JPG, PNG ou PDF.', 400);
        }

        $dir = dirname(__DIR__, 2) . '/uploads/credentials';
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            error_log('[credentials] création du répertoire impossible : ' . $dir);
            Http::fail('Dépôt impossible pour le moment.', 500);
        }

        $filename = bin2hex(random_bytes(16)) . $allowed[$mimeType];
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
            error_log('[credentials] déplacement du fichier impossible');
            Http::fail('Dépôt impossible pour le moment.', 500);
        }

        // Une seule pièce courante par type : le dépôt remplace la précédente.
        $previous = Db::one(
            'SELECT * FROM `VetCredential` WHERE `vetProfileId` = ? AND `type` = ?',
            [$profile['id'], $type]
        );
        if ($previous !== null) {
            Db::run('DELETE FROM `VetCredential` WHERE `id` = ?', [$previous['id']]);
            $old = dirname(__DIR__, 2) . '/uploads/' . ltrim(str_replace('/uploads/', '', (string) $previous['fileUrl']), '/');
            if (is_file($old)) {
                @unlink($old);
            }
        }

        $id = Db::insert('VetCredential', [
            'vetProfileId' => $profile['id'],
            'type'         => $type,
            'fileUrl'      => '/uploads/credentials/' . $filename,
            'mimeType'     => $mimeType,
            'sizeBytes'    => (int) $file['size'],
            'originalName' => (string) ($file['name'] ?? ''),
            'createdAt'    => Db::now(),
        ], false);

        Http::ok($shape(Db::one('SELECT * FROM `VetCredential` WHERE `id` = ?', [$id])), 201);
    });

    $r->delete('/vet-credentials/{id}', static function (array $args) use ($profileOf): void {
        $user    = Auth::requireRole('VETERINAIRE');
        $profile = $profileOf($user);

        $credential = Db::one('SELECT * FROM `VetCredential` WHERE `id` = ?', [$args['id']]);
        if ($credential === null || $credential['vetProfileId'] !== $profile['id']) {
            Http::fail('Pièce introuvable.', 404, 'NOT_FOUND');
        }

        // Une fois le compte validé, les pièces qui ont fondé la décision
        // doivent rester consultables.
        if ($profile['verification'] === 'APPROVED') {
            Http::fail('Compte déjà validé : les pièces ne peuvent plus être retirées.', 409);
        }

        Db::run('DELETE FROM `VetCredential` WHERE `id` = ?', [$credential['id']]);
        $path = dirname(__DIR__, 2) . '/uploads/' . ltrim(str_replace('/uploads/', '', (string) $credential['fileUrl']), '/');
        if (is_file($path)) {
            @unlink($path);
        }

        Http::ok(['deleted' => true]);
    });
};
