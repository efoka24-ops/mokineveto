<?php

declare(strict_types=1);

/**
 * Fiches pathologiques (SFD §4.4.4).
 *
 * Base de connaissances consultable, alimentant l'assistant de pré-analyse.
 * Le détail complet — observations de terrain, prévention, informations
 * vétérinaires — est réservé aux fiches débloquées ; la description reste
 * toujours accessible pour que l'éleveur sache de quoi il s'agit avant de payer.
 */

return static function (Router $r): void {

    /** Décode la liste d'espèces, stockée en JSON depuis le passage à MySQL. */
    $species = static function (mixed $raw): array {
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    };

    $summary = static fn (array $f, bool $unlocked) => [
        'id'          => $f['id'],
        'name'        => $f['name'],
        'species'     => $f['speciesList'],
        'contagious'  => (bool) $f['contagious'],
        'description' => $f['description'],
        'unlocked'    => $unlocked,
    ];

    $r->get('/fiches', static function () use ($species, $summary): void {
        $user = Auth::user();

        $sql    = 'SELECT * FROM `Fiche`';
        $params = [];

        $search = Http::query('q');
        if (is_string($search) && trim($search) !== '') {
            $sql     .= ' WHERE `name` LIKE ?';
            $params[] = '%' . trim($search) . '%';
        }

        $rows = Db::all($sql . ' ORDER BY `name` ASC', $params);

        // Les déblocages sont chargés en une fois plutôt qu'une requête par fiche.
        $unlocked = [];
        if ($user !== null) {
            $unlocked = array_flip(array_column(
                Db::all('SELECT `ficheId` FROM `FicheUnlock` WHERE `userId` = ?', [$user['id']]),
                'ficheId'
            ));
        }

        Http::ok(array_map(static function (array $f) use ($species, $summary, $unlocked): array {
            $f['speciesList'] = $species($f['species']);
            return $summary($f, isset($unlocked[$f['id']]));
        }, $rows));
    });

    $r->get('/fiches/{id}', static function (array $args) use ($species): void {
        $user  = Auth::user();
        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$args['id']]);

        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        $isUnlocked = false;
        if ($user !== null) {
            $isUnlocked = Db::one(
                'SELECT `id` FROM `FicheUnlock` WHERE `userId` = ? AND `ficheId` = ?',
                [$user['id'], $fiche['id']]
            ) !== null;
        }

        $payload = [
            'id'          => $fiche['id'],
            'name'        => $fiche['name'],
            'species'     => $species($fiche['species']),
            'contagious'  => (bool) $fiche['contagious'],
            'description' => $fiche['description'],
            'unlocked'    => $isUnlocked,
        ];

        // Le contenu approfondi n'est joint que si la fiche est débloquée.
        if ($isUnlocked) {
            $payload['fieldObs']   = $fiche['fieldObs'];
            $payload['prevention'] = $fiche['prevention'];
            $payload['vetInfo']    = $fiche['vetInfo'];
        }

        Http::ok($payload);
    });

    /** Création et mise à jour réservées à l'administration (SFD §4.4.4). */
    $r->post('/fiches', static function () use ($species): void {
        Auth::requireRole('ADMIN');

        $name = trim((string) Http::input('name', ''));
        if ($name === '') {
            Http::fail('Le nom de la pathologie est requis.', 400);
        }

        $list = Http::input('species', []);
        if (!is_array($list)) {
            $list = [];
        }

        $id = Db::insert('Fiche', [
            'name'        => $name,
            'species'     => json_encode(array_values($list), JSON_UNESCAPED_UNICODE),
            'contagious'  => Http::input('contagious') ? 1 : 0,
            'description' => (string) Http::input('description', ''),
            'fieldObs'    => (string) Http::input('fieldObs', ''),
            'prevention'  => (string) Http::input('prevention', ''),
            'vetInfo'     => (string) Http::input('vetInfo', ''),
        ]);

        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$id]);
        Http::ok([
            'id'      => $fiche['id'],
            'name'    => $fiche['name'],
            'species' => $species($fiche['species']),
        ], 201);
    });

    $r->patch('/fiches/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $fiche = Db::one('SELECT `id` FROM `Fiche` WHERE `id` = ?', [$args['id']]);
        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        $data = [];
        foreach (['name', 'description', 'fieldObs', 'prevention', 'vetInfo'] as $field) {
            $value = Http::input($field);
            if (is_string($value) && $value !== '') {
                $data[$field] = $value;
            }
        }
        if (Http::input('contagious') !== null) {
            $data['contagious'] = Http::input('contagious') ? 1 : 0;
        }
        $list = Http::input('species');
        if (is_array($list)) {
            $data['species'] = json_encode(array_values($list), JSON_UNESCAPED_UNICODE);
        }

        Db::update('Fiche', $args['id'], $data);
        Http::ok(['updated' => true]);
    });
};
