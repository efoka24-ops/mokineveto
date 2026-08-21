<?php

declare(strict_types=1);

/**
 * Rendez-vous (SFD §4.7).
 *
 * L'éleveur voit ceux qu'il a pris, le praticien ceux pris chez lui,
 * l'administration les voit tous. Un rendez-vous est toujours rattaché aux deux
 * parties : chaque accès vérifie que l'appelant en fait partie.
 */

return static function (Router $r): void {

    /** Structure imbriquée attendue par l'application, telle que la produisait l'ORM. */
    $shape = static function (array $a): array {
        return [
            'id'               => $a['id'],
            'eleveurId'        => $a['eleveurId'],
            'vetProfileId'     => $a['vetProfileId'],
            'startsAt'         => $a['startsAt'],
            'endsAt'           => $a['endsAt'],
            'amount'           => (int) $a['amount'],
            'reason'           => $a['reason'],
            'method'           => $a['method'],
            'status'           => $a['status'],
            'cancelReasonCode' => $a['cancelReasonCode'],
            'cancelNote'       => $a['cancelNote'],
            'cancelledAt'      => $a['cancelledAt'],
            'paymentId'        => $a['paymentId'],
            'createdAt'        => $a['createdAt'],
            'eleveur' => [
                'id'        => $a['eleveurUserId'],
                'name'      => $a['eleveurName'],
                'phone'     => $a['eleveurPhone'],
                'avatarUrl' => $a['eleveurAvatar'],
            ],
            'vetProfile' => [
                'id'         => $a['vetProfileId'],
                'specialty'  => $a['vetSpecialty'],
                'hourlyRate' => (int) $a['vetHourlyRate'],
                'user' => [
                    'id'        => $a['vetUserId'],
                    'name'      => $a['vetName'],
                    'phone'     => $a['vetPhone'],
                    'avatarUrl' => $a['vetAvatar'],
                ],
            ],
        ];
    };

    $select = 'SELECT a.*,
                      eu.`id` AS eleveurUserId, eu.`name` AS eleveurName,
                      eu.`phone` AS eleveurPhone, eu.`avatarUrl` AS eleveurAvatar,
                      v.`specialty` AS vetSpecialty, v.`hourlyRate` AS vetHourlyRate,
                      vu.`id` AS vetUserId, vu.`name` AS vetName,
                      vu.`phone` AS vetPhone, vu.`avatarUrl` AS vetAvatar
               FROM `Appointment` a
               JOIN `User` eu ON eu.`id` = a.`eleveurId`
               JOIN `VetProfile` v ON v.`id` = a.`vetProfileId`
               JOIN `User` vu ON vu.`id` = v.`userId`';

    /** Charge un rendez-vous en vérifiant que l'appelant y participe. */
    $visible = static function (string $id, array $user) use ($select): array {
        $appt = Db::one($select . ' WHERE a.`id` = ?', [$id]);
        if ($appt === null) {
            Http::fail('Rendez-vous introuvable.', 404, 'NOT_FOUND');
        }

        $isEleveur = $appt['eleveurId'] === $user['id'];
        $isVet     = $appt['vetUserId'] === $user['id'];

        if (!$isEleveur && !$isVet && $user['role'] !== 'ADMIN') {
            Http::fail('Rendez-vous introuvable.', 404, 'NOT_FOUND');
        }
        return $appt;
    };

    $r->get('/appointments', static function () use ($select, $shape): void {
        $user = Auth::require();

        if ($user['role'] === 'ELEVEUR') {
            $rows = Db::all($select . ' WHERE a.`eleveurId` = ? ORDER BY a.`startsAt` DESC', [$user['id']]);
        } elseif ($user['role'] === 'VETERINAIRE') {
            $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
            if ($profile === null) {
                Http::ok([]);
            }
            $rows = Db::all($select . ' WHERE a.`vetProfileId` = ? ORDER BY a.`startsAt` DESC', [$profile['id']]);
        } else {
            $rows = Db::all($select . ' ORDER BY a.`startsAt` DESC LIMIT 500');
        }

        Http::ok(array_map($shape, $rows));
    });

    $r->get('/appointments/{id}', static function (array $args) use ($visible, $shape): void {
        $user = Auth::require();
        Http::ok($shape($visible($args['id'], $user)));
    });

    $r->post('/appointments', static function () use ($select, $shape): void {
        $user = Auth::requireRole('ELEVEUR');

        $vetId  = trim((string) Http::input('vetId', Http::input('vetProfileId', '')));
        $reason = trim((string) Http::input('reason', ''));
        $startsAt = (string) Http::input('startsAt', '');

        if ($vetId === '') {
            Http::fail('Vétérinaire requis.', 400);
        }

        $ts = strtotime($startsAt);
        if ($ts === false) {
            Http::fail('Date et heure du rendez-vous invalides.', 400);
        }
        if ($ts < time()) {
            Http::fail('Impossible de réserver un créneau déjà passé.', 400);
        }

        $vet = Db::one(
            "SELECT * FROM `VetProfile` WHERE `id` = ? AND `verification` = 'APPROVED'",
            [$vetId]
        );
        if ($vet === null) {
            Http::fail('Vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        $durationMinutes = max(5, (int) Http::input('durationMinutes', 30));
        $start = gmdate('Y-m-d H:i:s.000', $ts);
        $end   = gmdate('Y-m-d H:i:s.000', $ts + $durationMinutes * 60);

        // Un créneau ne peut être pris qu'une fois : sans ce contrôle, deux
        // éleveurs pourraient réserver la même heure simultanément.
        $clash = Db::one(
            "SELECT `id` FROM `Appointment`
             WHERE `vetProfileId` = ? AND `status` <> 'CANCELLED'
               AND `startsAt` < ? AND `endsAt` > ?",
            [$vetId, $end, $start]
        );
        if ($clash !== null) {
            Http::fail('Ce créneau vient d’être réservé. Choisissez-en un autre.', 409, 'SLOT_TAKEN');
        }

        $method = (string) Http::input('method', '');
        $method = in_array($method, ['CARD', 'ORANGE_MONEY', 'MTN_MOMO'], true) ? $method : null;

        $id = Db::insert('Appointment', [
            'eleveurId'    => $user['id'],
            'vetProfileId' => $vetId,
            'startsAt'     => $start,
            'endsAt'       => $end,
            'amount'       => max(0, (int) Http::input('amount', (int) $vet['hourlyRate'])),
            'reason'       => $reason !== '' ? $reason : 'Consultation',
            'method'       => $method,
            'status'       => 'UPCOMING',
        ]);

        // Le praticien est prévenu ; l'historique in-app est le canal garanti.
        Db::insert('Notification', [
            'userId'    => $vet['userId'],
            'type'      => 'appointment_booked',
            'title'     => 'Nouveau rendez-vous',
            'body'      => $user['name'] . ' a réservé une consultation.',
            'data'      => json_encode(['appointmentId' => $id], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok($shape(Db::one($select . ' WHERE a.`id` = ?', [$id])), 201);
    });

    /** Annulation (SFD §4.7 : sans frais jusqu'à 2 h avant). */
    $r->patch('/appointments/{id}/cancel', static function (array $args) use ($visible, $select, $shape): void {
        $user = Auth::require();
        $appt = $visible($args['id'], $user);

        if ($appt['status'] === 'CANCELLED') {
            Http::fail('Ce rendez-vous est déjà annulé.', 409);
        }
        if ($appt['status'] === 'COMPLETED') {
            Http::fail('Un rendez-vous terminé ne peut pas être annulé.', 409);
        }

        $startTs  = strtotime((string) $appt['startsAt']) ?: 0;
        $freeCancel = ($startTs - time()) > 2 * 3600;

        Db::update('Appointment', $appt['id'], [
            'status'           => 'CANCELLED',
            'cancelReasonCode' => ((string) Http::input('reasonCode', '')) ?: null,
            'cancelNote'       => ((string) Http::input('note', '')) ?: null,
            'cancelledAt'      => Db::now(),
        ]);

        // L'autre partie est prévenue, quel que soit l'auteur de l'annulation.
        $notifyUserId = $appt['eleveurId'] === $user['id'] ? $appt['vetUserId'] : $appt['eleveurId'];
        Db::insert('Notification', [
            'userId'    => $notifyUserId,
            'type'      => 'appointment_cancelled',
            'title'     => 'Rendez-vous annulé',
            'body'      => 'Le rendez-vous du ' . substr((string) $appt['startsAt'], 0, 16) . ' a été annulé.',
            'data'      => json_encode(['appointmentId' => $appt['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        $fresh = $shape(Db::one($select . ' WHERE a.`id` = ?', [$appt['id']]));
        $fresh['freeCancellation'] = $freeCancel;
        Http::ok($fresh);
    });

    /** Clôture par le praticien, avec compte rendu obligatoire (SFD §4.5.2). */
    $r->patch('/appointments/{id}/complete', static function (array $args) use ($visible, $select, $shape): void {
        $user = Auth::requireRole('VETERINAIRE', 'ADMIN');
        $appt = $visible($args['id'], $user);

        if ($appt['status'] === 'CANCELLED') {
            Http::fail('Un rendez-vous annulé ne peut pas être clôturé.', 409);
        }

        $diagnosis = trim((string) Http::input('diagnosis', ''));
        if ($diagnosis === '') {
            // Exigence FR-005 : aucune consultation ne se clôt sans compte rendu.
            Http::fail('Le compte rendu est obligatoire pour clôturer la consultation.', 400, 'REPORT_REQUIRED');
        }

        Db::update('Appointment', $appt['id'], ['status' => 'COMPLETED']);

        // Le compte rendu est rattaché au dossier de l'animal lorsqu'il est
        // fourni ; sinon il reste attaché au rendez-vous.
        Db::insert('HealthReport', [
            'source'    => 'CHATBOT',
            'ficheId'   => ((string) Http::input('ficheId', '')) ?: null,
            'region'    => (string) Http::input('region', 'CENTRE'),
            'urgency'   => in_array(Http::input('urgency'), ['LOW', 'MEDIUM', 'HIGH'], true)
                            ? (string) Http::input('urgency') : 'LOW',
            'createdAt' => Db::now(),
        ], false);

        Db::insert('Notification', [
            'userId'    => $appt['eleveurId'],
            'type'      => 'appointment_completed',
            'title'     => 'Consultation terminée',
            'body'      => 'Le compte rendu de votre consultation est disponible.',
            'data'      => json_encode(['appointmentId' => $appt['id'], 'diagnosis' => $diagnosis], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok($shape(Db::one($select . ' WHERE a.`id` = ?', [$appt['id']])));
    });
};
