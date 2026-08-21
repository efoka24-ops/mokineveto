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
    ];

    $select = 'SELECT v.*, u.`name` AS userName, u.`avatarUrl`, u.`phone`
               FROM `VetProfile` v
               JOIN `User` u ON u.`id` = v.`userId`';

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

        $taken = array_column(
            Db::all(
                "SELECT `time` FROM `Appointment`
                 WHERE `vetProfileId` = ? AND `date` = ? AND `status` <> 'CANCELLED'",
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
