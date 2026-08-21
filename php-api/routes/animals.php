<?php

declare(strict_types=1);

/**
 * Cheptel et dossier médical animal (SFD §4.6, §4.13).
 *
 * Chaque accès vérifie que l'animal appartient bien à l'appelant : le dossier
 * médical est une donnée sensible et ne se consulte pas par simple connaissance
 * d'un identifiant (SFD §7.1).
 */

return static function (Router $r): void {

    $shapeEvent = static fn (array $e): array => [
        'id'        => $e['id'],
        'type'      => $e['type'],
        'label'     => $e['label'],
        'date'      => $e['date'],
        'nextDueAt' => $e['nextDueAt'],
        'ficheId'   => $e['ficheId'],
    ];

    $shape = static function (array $a, array $events = []) use ($shapeEvent): array {
        return [
            'id'           => $a['id'],
            'userId'       => $a['userId'],
            'farmId'       => $a['farmId'],
            'name'         => $a['name'],
            'species'      => $a['species'],
            'breed'        => $a['breed'],
            'sex'          => $a['sex'],
            'age'          => $a['age'],
            'robe'         => $a['robe'],
            'healthEvents' => array_map($shapeEvent, $events),
        ];
    };

    /** Charge un animal en s'assurant qu'il appartient à l'appelant. */
    $owned = static function (string $id, array $user): array {
        $animal = Db::one('SELECT * FROM `Animal` WHERE `id` = ?', [$id]);
        if ($animal === null || $animal['userId'] !== $user['id']) {
            // Même réponse dans les deux cas : distinguer « inexistant » de
            // « appartient à un autre » révélerait l'existence de la fiche.
            Http::fail('Animal introuvable.', 404, 'NOT_FOUND');
        }
        return $animal;
    };

    $r->get('/animals', static function () use ($shape): void {
        $user = Auth::require();

        $sql    = 'SELECT * FROM `Animal` WHERE `userId` = ?';
        $params = [$user['id']];

        $farmId = Http::query('farmId');
        if (is_string($farmId) && $farmId !== '') {
            $sql     .= ' AND `farmId` = ?';
            $params[] = $farmId;
        }

        $animals = Db::all($sql . ' ORDER BY `createdAt` DESC', $params);
        if ($animals === []) {
            Http::ok([]);
        }

        // Une seule requête pour tous les événements, plutôt qu'une par animal.
        $ids          = array_column($animals, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $events       = Db::all(
            "SELECT * FROM `HealthEvent` WHERE `animalId` IN ($placeholders) ORDER BY `createdAt` DESC",
            $ids
        );

        $byAnimal = [];
        foreach ($events as $e) {
            $byAnimal[$e['animalId']][] = $e;
        }

        Http::ok(array_map(
            static fn (array $a): array => $shape($a, $byAnimal[$a['id']] ?? []),
            $animals
        ));
    });

    $r->post('/animals', static function () use ($shape): void {
        $user = Auth::require();

        $name    = trim((string) Http::input('name', ''));
        $species = trim((string) Http::input('species', ''));
        $sex     = (string) Http::input('sex', '');

        // Minimum exigé par la SFD §4.13 pour un ajout rapide.
        if ($species === '') {
            Http::fail("L'espèce est requise.", 400);
        }
        if (!in_array($sex, ['M', 'F'], true)) {
            Http::fail('Le sexe doit être M ou F.', 400);
        }

        $farmId = Http::input('farmId');
        if (is_string($farmId) && $farmId !== '') {
            $farm = Db::one('SELECT `id` FROM `Farm` WHERE `id` = ? AND `userId` = ?', [$farmId, $user['id']]);
            if ($farm === null) {
                Http::fail('Exploitation introuvable.', 404, 'NOT_FOUND');
            }
        } else {
            $default = Db::one(
                'SELECT `id` FROM `Farm` WHERE `userId` = ? ORDER BY `isDefault` DESC, `createdAt` ASC LIMIT 1',
                [$user['id']]
            );
            $farmId = $default['id'] ?? null;
        }

        $id = Db::insert('Animal', [
            'userId'  => $user['id'],
            'farmId'  => $farmId,
            'name'    => $name !== '' ? $name : 'Sans nom',
            'species' => $species,
            'breed'   => (string) Http::input('breed', ''),
            'sex'     => $sex,
            'age'     => (string) Http::input('age', ''),
            'robe'    => (string) Http::input('robe', ''),
        ]);

        Http::ok($shape(Db::one('SELECT * FROM `Animal` WHERE `id` = ?', [$id])), 201);
    });

    $r->patch('/animals/{id}', static function (array $args) use ($owned, $shape): void {
        $user   = Auth::require();
        $animal = $owned($args['id'], $user);

        $data = [];
        foreach (['name', 'species', 'breed', 'age', 'robe'] as $field) {
            $value = Http::input($field);
            if (is_string($value) && $value !== '') {
                $data[$field] = $value;
            }
        }
        $sex = Http::input('sex');
        if (in_array($sex, ['M', 'F'], true)) {
            $data['sex'] = $sex;
        }

        Db::update('Animal', $animal['id'], $data);
        Http::ok($shape(Db::one('SELECT * FROM `Animal` WHERE `id` = ?', [$animal['id']])));
    });

    /** Ajout d'un événement de santé au dossier (SFD §4.6.2). */
    $r->post('/animals/{id}/health-events', static function (array $args) use ($owned, $shapeEvent): void {
        $user   = Auth::require();
        $animal = $owned($args['id'], $user);

        $type = (string) Http::input('type', 'AUTRE');
        if (!in_array($type, ['VACCIN', 'VERMIFUGE', 'TRAITEMENT', 'AUTRE'], true)) {
            $type = 'AUTRE';
        }

        $label = trim((string) Http::input('label', ''));
        if ($label === '') {
            Http::fail("L'intitulé de l'événement est requis.", 400);
        }

        $nextDue = Http::input('nextDueAt');
        if (is_string($nextDue) && $nextDue !== '') {
            $ts      = strtotime($nextDue);
            $nextDue = $ts === false ? null : gmdate('Y-m-d H:i:s.000', $ts);
        } else {
            $nextDue = null;
        }

        // `HealthEvent` ne porte pas de colonne `updatedAt` : pas d'horodatage
        // automatique de mise à jour sur cette table.
        $id = Db::insert('HealthEvent', [
            'animalId'  => $animal['id'],
            'type'      => $type,
            'label'     => $label,
            'date'      => (string) Http::input('date', gmdate('d/m/Y')),
            'nextDueAt' => $nextDue,
            'ficheId'   => ((string) Http::input('ficheId', '')) ?: null,
            'createdAt' => Db::now(),
        ], false);

        Http::ok($shapeEvent(Db::one('SELECT * FROM `HealthEvent` WHERE `id` = ?', [$id])), 201);
    });
};
