<?php

declare(strict_types=1);

/**
 * Annuaire vétérinaire (SFD §4.10).
 *
 * Seuls les praticiens dont le compte a été validé par l'administration sont
 * exposés : un dossier en attente ou refusé ne doit jamais apparaître à un
 * éleveur (SFD §4.1.2).
 */

return static function (Router $r): void {

    /** Forme attendue par l'application mobile — identique au backend remplacé. */
    $shape = static fn (array $v): array => [
        'id'              => $v['id'],
        'name'            => $v['userName'],
        'specialty'       => $v['specialty'],
        'gender'          => $v['gender'],
        'rating'          => (float) $v['ratingAvg'],
        'reviews'         => (int) $v['ratingCount'],
        'experienceYears' => (int) $v['experienceYears'],
        'schedule'        => $v['schedule'],
        'hourlyRate'      => (int) $v['hourlyRate'],
        'photo'           => $v['avatarUrl'] ?: 'https://i.pravatar.cc/300?u=' . rawurlencode((string) $v['phone']),
        'professional'    => (bool) $v['professional'],
        'focus'           => $v['focus'],
        'ordreNumber'     => $v['ordreNumber'],
        'availability'    => $v['availability'] ?? 'DISPONIBLE',
        // Badge de fidélité (SFD §4.7) : seuil fixe, recalculé à la volée —
        // pas de colonne dédiée, rien à faire suivre si les seuils changent.
        'certifiedBadge'  => (float) $v['ratingAvg'] >= 4 && (int) $v['ratingCount'] >= 50,
    ];

    $select = 'SELECT v.*, u.`name` AS userName, u.`avatarUrl`, u.`phone`
               FROM `VetProfile` v
               JOIN `User` u ON u.`id` = v.`userId`';

    /**
     * Profil du vétérinaire connecté, quel que soit son statut de
     * vérification — contrairement à `/vets/{id}`, réservée aux profils
     * APPROVED : un praticien encore PENDING doit pouvoir voir son propre
     * statut dans son tableau de bord.
     *
     * Déclarée avant `/vets/{id}`, sans quoi « me » serait pris pour un
     * identifiant.
     */
    $r->get('/vets/me', static function () use ($select, $shape): void {
        $user = Auth::requireRole('VETERINAIRE');

        $vet = Db::one($select . ' WHERE v.`userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        Http::ok($shape($vet) + [
            'verification' => $vet['verification'],
            'credentialsComplete' => count(Db::all(
                "SELECT DISTINCT `type` FROM `VetCredential` WHERE `vetProfileId` = ?",
                [$vet['id']]
            )) >= 2,
        ]);
    });

    /**
     * Disponibilité en temps réel (SFD §4.1.2) : le praticien la change
     * lui-même, contrairement à la vérification qui reste du ressort de
     * l'administration.
     */
    $r->patch('/vets/me/availability', static function () use ($select, $shape): void {
        $user = Auth::requireRole('VETERINAIRE');

        $availability = strtoupper((string) Http::input('availability', ''));
        if (!in_array($availability, ['DISPONIBLE', 'OCCUPE', 'ABSENT'], true)) {
            Http::fail('Disponibilité invalide.', 400);
        }

        $vet = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        Db::update('VetProfile', $vet['id'], ['availability' => $availability]);

        Http::ok($shape(Db::one($select . ' WHERE v.`id` = ?', [$vet['id']])));
    });

    /** Position du praticien, capturée depuis son téléphone (SFD §4.2 — géolocalisation). */
    $r->patch('/vets/me/location', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $lat = Http::input('lat');
        $lng = Http::input('lng');
        if (!is_numeric($lat) || !is_numeric($lng)) {
            Http::fail('Coordonnées invalides.', 400);
        }

        $vet = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        Db::update('VetProfile', $vet['id'], ['lat' => (float) $lat, 'lng' => (float) $lng]);

        Http::ok(['saved' => true]);
    });

    /**
     * Vétérinaires les plus proches d'une position donnée (SFD §4.2 — « 3
     * vétérinaires disponibles les plus proches »). Distance à vol d'oiseau
     * (Haversine) : suffisant pour trier un annuaire, pas pour un itinéraire.
     */
    $r->get('/vets/nearby', static function () use ($shape): void {
        $lat = Http::query('lat');
        $lng = Http::query('lng');
        if (!is_numeric($lat) || !is_numeric($lng)) {
            Http::fail('Position requise (lat, lng).', 400);
        }
        $limit = max(1, min(20, (int) Http::query('limit', '3')));

        // Formule de la haversine en SQL : rayon terrestre moyen 6371 km.
        $rows = Db::all(
            "SELECT v.*, u.`name` AS userName, u.`avatarUrl`, u.`phone`,
                    (6371 * ACOS(
                        COS(RADIANS(?)) * COS(RADIANS(v.`lat`)) * COS(RADIANS(v.`lng`) - RADIANS(?))
                        + SIN(RADIANS(?)) * SIN(RADIANS(v.`lat`))
                    )) AS distanceKm
             FROM `VetProfile` v
             JOIN `User` u ON u.`id` = v.`userId`
             WHERE v.`verification` = 'APPROVED' AND v.`lat` IS NOT NULL AND v.`lng` IS NOT NULL
             ORDER BY distanceKm ASC
             LIMIT $limit",
            [(float) $lat, (float) $lng, (float) $lat]
        );

        Http::ok(array_map(
            static fn (array $v): array => $shape($v) + ['distanceKm' => round((float) $v['distanceKm'], 1)],
            $rows
        ));
    });

    /**
     * Agenda du praticien : disponibilité configurable par jour de la
     * semaine (SFD §4.2 — « créneaux ouverts/fermés par plage horaire »).
     */
    $r->get('/vets/me/schedule', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $vet = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        $rows = Db::all(
            'SELECT `dayOfWeek`, `startTime`, `endTime`, `slotMinutes` FROM `Availability` WHERE `vetProfileId` = ?',
            [$vet['id']]
        );
        $byDay = [];
        foreach ($rows as $row) {
            $byDay[(int) $row['dayOfWeek']] = $row;
        }

        // 0 = lundi … 6 = dimanche (convention déjà utilisée par /vets/{id}/availability).
        $schedule = [];
        for ($day = 0; $day < 7; $day++) {
            $schedule[] = [
                'dayOfWeek'   => $day,
                'open'        => isset($byDay[$day]),
                'startTime'   => $byDay[$day]['startTime'] ?? null,
                'endTime'     => $byDay[$day]['endTime'] ?? null,
                'slotMinutes' => isset($byDay[$day]['slotMinutes']) ? (int) $byDay[$day]['slotMinutes'] : 30,
            ];
        }

        Http::ok($schedule);
    });

    $r->post('/vets/me/schedule', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $vet = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        $dayOfWeek = (int) Http::input('dayOfWeek', -1);
        if ($dayOfWeek < 0 || $dayOfWeek > 6) {
            Http::fail('Jour de la semaine invalide.', 400);
        }

        $existing = Db::one(
            'SELECT `id` FROM `Availability` WHERE `vetProfileId` = ? AND `dayOfWeek` = ?',
            [$vet['id'], $dayOfWeek]
        );

        // Un jour « fermé » n'a pas de créneau : on retire la ligne plutôt que
        // de la garder avec des horaires qui ne voudraient rien dire.
        if (!Http::input('open', true)) {
            if ($existing !== null) {
                Db::run('DELETE FROM `Availability` WHERE `id` = ?', [$existing['id']]);
            }
            Http::ok(['dayOfWeek' => $dayOfWeek, 'open' => false]);
        }

        $startTime   = (string) Http::input('startTime', '08:00');
        $endTime     = (string) Http::input('endTime', '17:00');
        $slotMinutes = max(5, (int) Http::input('slotMinutes', 30));

        if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime) || $startTime >= $endTime) {
            Http::fail('Plage horaire invalide : l\'heure de fin doit suivre l\'heure de début.', 400);
        }

        if ($existing !== null) {
            Db::update('Availability', $existing['id'], [
                'startTime'   => $startTime,
                'endTime'     => $endTime,
                'slotMinutes' => $slotMinutes,
            ]);
        } else {
            Db::insert('Availability', [
                'vetProfileId' => $vet['id'],
                'dayOfWeek'    => $dayOfWeek,
                'startTime'    => $startTime,
                'endTime'      => $endTime,
                'slotMinutes'  => $slotMinutes,
            ]);
        }

        Http::ok(['dayOfWeek' => $dayOfWeek, 'open' => true, 'startTime' => $startTime, 'endTime' => $endTime, 'slotMinutes' => $slotMinutes]);
    });

    /**
     * Statistiques du mois pour le praticien connecté (SFD §4.2 — « CA
     * généré, nombre de consultations, maladies les plus diagnostiquées »).
     */
    $r->get('/vets/me/stats', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $vet = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($vet === null) {
            Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        $counts = Db::one(
            "SELECT
                COUNT(*) AS total,
                SUM(a.`status` = 'UPCOMING')  AS upcoming,
                SUM(a.`status` = 'COMPLETED') AS completed
             FROM `Appointment` a WHERE a.`vetProfileId` = ?",
            [$vet['id']]
        );

        // Revenus : uniquement les paiements confirmés, jamais une estimation
        // sur des rendez-vous encore en attente de paiement.
        $revenue = Db::one(
            "SELECT COALESCE(SUM(p.`amount`), 0) AS gross
             FROM `Payment` p
             JOIN `Appointment` a ON a.`paymentId` = p.`id`
             WHERE a.`vetProfileId` = ? AND p.`status` = 'SUCCEEDED'",
            [$vet['id']]
        );
        $gross = (int) ($revenue['gross'] ?? 0);

        $thisMonth = Db::one(
            "SELECT COALESCE(SUM(p.`amount`), 0) AS gross
             FROM `Payment` p
             JOIN `Appointment` a ON a.`paymentId` = p.`id`
             WHERE a.`vetProfileId` = ? AND p.`status` = 'SUCCEEDED'
               AND YEAR(a.`startsAt`) = YEAR(CURDATE()) AND MONTH(a.`startsAt`) = MONTH(CURDATE())",
            [$vet['id']]
        );

        Http::ok([
            'consultations' => [
                'total'     => (int) ($counts['total'] ?? 0),
                'upcoming'  => (int) ($counts['upcoming'] ?? 0),
                'completed' => (int) ($counts['completed'] ?? 0),
            ],
            'revenue' => [
                'grossTotal'     => $gross,
                'netTotal'       => (int) round($gross * 0.85),
                'grossThisMonth' => (int) ($thisMonth['gross'] ?? 0),
                'netThisMonth'   => (int) round(((int) ($thisMonth['gross'] ?? 0)) * 0.85),
                'commissionRate' => 0.15,
            ],
        ]);
    });

    /**
     * Carte épidémiologique, vue praticien (SFD §4.2). Même agrégat que le
     * back-office (`/admin/epidemiology`) : l'« interventionZone » du
     * praticien est un texte libre, pas une région structurée, donc rien ne
     * permet de la filtrer plus finement pour l'instant.
     *
     * Filtré par pays du praticien : les régions structurées (`Countries.php`)
     * ne se recoupent pas d'un pays à l'autre, donc un vétérinaire ne doit
     * jamais voir de signalements d'un autre pays dans sa zone d'opérations.
     */
    $r->get('/vets/me/epidemiology', static function (): void {
        $user = Auth::requireRole('VETERINAIRE');

        $since = gmdate('Y-m-d\TH:i:s\Z', strtotime('-90 days'));
        $myRegions = Countries::regions($user['country']);

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
            if ($region === '' || !in_array($region, $myRegions, true)) {
                continue;
            }
            if (!isset($aggregate[$region])) {
                $aggregate[$region] = ['region' => $region, 'total' => 0, 'high' => 0];
            }
            $aggregate[$region]['total']++;
            if ($row['urgency'] === 'HIGH') {
                $aggregate[$region]['high']++;
            }
        }

        usort($aggregate, static fn (array $a, array $b): int => $b['total'] <=> $a['total']);

        Http::ok(array_values($aggregate));
    });

    // Déclarée avant `/vets/{id}`, sans quoi « specialties » serait pris pour
    // un identifiant.
    $r->get('/vets/specialties', static function (): void {
        $rows = Db::all(
            "SELECT DISTINCT `specialty` FROM `VetProfile`
             WHERE `verification` = 'APPROVED' AND `specialty` <> ''
             ORDER BY `specialty`"
        );
        Http::ok(array_column($rows, 'specialty'));
    });

    $r->get('/vets', static function () use ($select, $shape): void {
        $where  = ["v.`verification` = 'APPROVED'"];
        $params = [];

        $gender = Http::query('gender');
        if (is_string($gender) && in_array($gender, ['homme', 'femme'], true)) {
            $where[]  = 'v.`gender` = ?';
            $params[] = $gender;
        }

        $specialty = Http::query('specialty');
        if (is_string($specialty) && $specialty !== '') {
            $where[]  = 'v.`specialty` = ?';
            $params[] = $specialty;
        }

        $order = Http::query('topRated') === 'true'
            ? 'v.`ratingAvg` DESC'
            : 'v.`createdAt` DESC';

        $rows = Db::all($select . ' WHERE ' . implode(' AND ', $where) . " ORDER BY $order", $params);
        Http::ok(array_map($shape, $rows));
    });

    $r->get('/vets/{id}', static function (array $a) use ($select, $shape): void {
        $vet = Db::one($select . " WHERE v.`id` = ? AND v.`verification` = 'APPROVED'", [$a['id']]);
        if ($vet === null) {
            Http::fail('Vétérinaire introuvable.', 404, 'NOT_FOUND');
        }
        Http::ok($shape($vet));
    });

    /**
     * Créneaux d'une journée.
     *
     * Les créneaux déjà réservés sont retirés : proposer un horaire pris
     * enverrait l'éleveur vers un échec de réservation.
     */
    $r->get('/vets/{id}/availability', static function (array $a): void {
        $date = (string) Http::query('date', '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            Http::fail('Date attendue au format AAAA-MM-JJ.', 400);
        }

        // Prisma stocke 0 = lundi … 6 = dimanche ; `w` de PHP donne 0 = dimanche.
        $weekday = ((int) (new DateTimeImmutable($date))->format('w') + 6) % 7;

        $slot = Db::one(
            'SELECT `startTime`, `endTime`, `slotMinutes`
             FROM `Availability` WHERE `vetProfileId` = ? AND `dayOfWeek` = ?',
            [$a['id'], $weekday]
        );
        if ($slot === null) {
            Http::ok([]);
        }

        // Les rendez-vous sont horodatés par `startsAt` : on compare la partie
        // date, et on ne retient que l'heure de début pour l'exclusion.
        $taken = array_column(
            Db::all(
                "SELECT DATE_FORMAT(`startsAt`, '%H:%i') AS `time` FROM `Appointment`
                 WHERE `vetProfileId` = ? AND DATE(`startsAt`) = ? AND `status` <> 'CANCELLED'",
                [$a['id'], $date]
            ),
            'time'
        );

        $step  = max(5, (int) $slot['slotMinutes']);
        $start = new DateTimeImmutable($date . ' ' . $slot['startTime']);
        $end   = new DateTimeImmutable($date . ' ' . $slot['endTime']);

        $slots = [];
        for ($t = $start; $t < $end; $t = $t->modify("+$step minutes")) {
            $label = $t->format('H:i');
            if (!in_array($label, $taken, true)) {
                $slots[] = $label;
            }
        }

        Http::ok($slots);
    });
};
