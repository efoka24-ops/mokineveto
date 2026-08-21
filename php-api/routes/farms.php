<?php

declare(strict_types=1);

/** Exploitations de l'éleveur (SFD §4.13, multi-élevage). */

return static function (Router $r): void {

    $shape = static fn (array $f): array => [
        'id'        => $f['id'],
        'userId'    => $f['userId'],
        'name'      => $f['name'],
        'region'    => $f['region'],
        'isDefault' => (bool) $f['isDefault'],
    ];

    $r->get('/farms', static function () use ($shape): void {
        $user = Auth::require();
        $rows = Db::all(
            'SELECT * FROM `Farm` WHERE `userId` = ? ORDER BY `isDefault` DESC, `createdAt` ASC',
            [$user['id']]
        );
        Http::ok(array_map($shape, $rows));
    });

    $r->post('/farms', static function () use ($shape): void {
        $user = Auth::require();

        $name = trim((string) Http::input('name', ''));
        if ($name === '') {
            Http::fail("Le nom de l'exploitation est requis.", 400);
        }

        $regions = ['ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
                    'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST'];
        $region = (string) Http::input('region', '');
        if (!in_array($region, $regions, true)) {
            Http::fail('Région invalide.', 400);
        }

        // La toute première exploitation devient l'exploitation par défaut.
        $count = (int) Db::one('SELECT COUNT(*) AS n FROM `Farm` WHERE `userId` = ?', [$user['id']])['n'];

        $id = Db::insert('Farm', [
            'userId'    => $user['id'],
            'name'      => $name,
            'region'    => $region,
            'isDefault' => $count === 0 ? 1 : 0,
        ]);

        Http::ok($shape(Db::one('SELECT * FROM `Farm` WHERE `id` = ?', [$id])), 201);
    });
};
