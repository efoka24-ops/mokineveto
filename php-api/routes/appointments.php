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

    $getPrices = static function (): array {
        $rows = Db::all(
            "SELECT `key`, `value` FROM `PlatformConfig` WHERE `key` IN ('priceCallFcfa', 'priceVideoFcfa', 'pricePerKmFcfa')"
        );
        return array_column($rows, 'value', 'key');
    };

    /** Même formule que /vets/nearby — un seul endroit pour ne pas la faire diverger. */
    $haversineKm = static function (float $lat1, float $lng1, float $lat2, float $lng2): float {
        $earthRadiusKm = 6371.0;
        $rLat1 = deg2rad($lat1);
        $rLat2 = deg2rad($lat2);
        $dLat  = deg2rad($lat2 - $lat1);
        $dLng  = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos($rLat1) * cos($rLat2) * sin($dLng / 2) ** 2;
        return round($earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    };

    /** Grille tarifaire publique — le mobile l'affiche avant réservation sans deviner les prix. */
    $r->get('/appointments/pricing', static function () use ($getPrices): void {
        $prices = $getPrices();

        Http::ok([
            'call'     => (int) ($prices['priceCallFcfa'] ?? 5600),
            'video'    => (int) ($prices['priceVideoFcfa'] ?? 15000),
            'perKm'    => (int) ($prices['pricePerKmFcfa'] ?? 125),
            'currency' => 'FCFA',
        ]);
    });

    /**
     * Estimation du tarif terrain avant réservation — le mobile l'appelle
     * pour afficher un prix réel plutôt qu'un placeholder, sans dupliquer le
     * calcul de distance appliqué à la réservation elle-même.
     */
    $r->get('/appointments/pricing/field-estimate', static function () use ($getPrices, $haversineKm): void {
        $user = Auth::requireRole('ELEVEUR');

        $vetId  = (string) Http::query('vetId', '');
        $farmId = (string) Http::query('farmId', '');
        if ($vetId === '') {
            Http::fail('Vétérinaire requis.', 400);
        }

        $vet = Db::one('SELECT `lat`, `lng` FROM `VetProfile` WHERE `id` = ?', [$vetId]);
        $farm = $farmId !== ''
            ? Db::one('SELECT `lat`, `lng` FROM `Farm` WHERE `id` = ? AND `userId` = ?', [$farmId, $user['id']])
            : Db::one('SELECT `lat`, `lng` FROM `Farm` WHERE `userId` = ? ORDER BY `isDefault` DESC LIMIT 1', [$user['id']]);

        if ($vet === null || $farm === null || $vet['lat'] === null || $vet['lng'] === null
            || $farm['lat'] === null || $farm['lng'] === null
        ) {
            Http::ok(['available' => false]);
        }

        $distanceKm = $haversineKm((float) $vet['lat'], (float) $vet['lng'], (float) $farm['lat'], (float) $farm['lng']);
        $prices = $getPrices();
        $amount = (int) round($distanceKm * (int) ($prices['pricePerKmFcfa'] ?? 125));

        Http::ok(['available' => true, 'distanceKm' => $distanceKm, 'amount' => $amount, 'currency' => 'FCFA']);
    });

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
            'consultationType' => $a['consultationType'] ?? 'VIDEO',
            'distanceKm'       => $a['distanceKm'] !== null ? (float) $a['distanceKm'] : null,
            'status'           => $a['status'],
            'cancelReasonCode' => $a['cancelReasonCode'],
            'cancelNote'       => $a['cancelNote'],
            'cancelledAt'      => $a['cancelledAt'],
            'paymentId'        => $a['paymentId'],
            'createdAt'        => $a['createdAt'],
            'hasReview'        => $a['reviewId'] !== null,
            'review'           => $a['reviewId'] !== null
                ? ['id' => $a['reviewId'], 'stars' => (int) $a['reviewStars'], 'comment' => $a['reviewComment']]
                : null,
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
                      vu.`phone` AS vetPhone, vu.`avatarUrl` AS vetAvatar,
                      r.`id` AS reviewId, r.`stars` AS reviewStars, r.`comment` AS reviewComment
               FROM `Appointment` a
               JOIN `User` eu ON eu.`id` = a.`eleveurId`
               JOIN `VetProfile` v ON v.`id` = a.`vetProfileId`
               JOIN `User` vu ON vu.`id` = v.`userId`
               LEFT JOIN `Review` r ON r.`appointmentId` = a.`id`';

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

        // Tarification par type de consultation (SFD-ADMIN §15.3) : le montant
        // vient toujours du serveur, jamais du client — un éleveur qui
        // manipulerait la requête ne peut pas se fixer son propre prix.
        $consultationType = strtoupper((string) Http::input('consultationType', 'VIDEO'));
        if (!in_array($consultationType, ['CALL', 'VIDEO', 'FIELD'], true)) {
            Http::fail('Type de consultation invalide : CALL, VIDEO ou FIELD.', 400);
        }

        $configRows = Db::all(
            "SELECT `key`, `value` FROM `PlatformConfig` WHERE `key` IN ('priceCallFcfa', 'priceVideoFcfa', 'pricePerKmFcfa')"
        );
        $prices = array_column($configRows, 'value', 'key');

        $distanceKm = null;
        if ($consultationType === 'FIELD') {
            $farmId = trim((string) Http::input('farmId', ''));
            $farm   = $farmId !== ''
                ? Db::one('SELECT `lat`, `lng` FROM `Farm` WHERE `id` = ? AND `userId` = ?', [$farmId, $user['id']])
                : Db::one('SELECT `lat`, `lng` FROM `Farm` WHERE `userId` = ? ORDER BY `isDefault` DESC LIMIT 1', [$user['id']]);

            if ($farm === null || $farm['lat'] === null || $farm['lng'] === null
                || $vet['lat'] === null || $vet['lng'] === null
            ) {
                Http::fail(
                    "Localisation manquante : la consultation terrain nécessite la position de l'exploitation et celle du vétérinaire.",
                    400,
                    'LOCATION_REQUIRED'
                );
            }

            // Haversine — même formule que /vets/nearby, en PHP plutôt qu'en
            // SQL ici car les deux points viennent de deux requêtes séparées.
            $earthRadiusKm = 6371.0;
            $lat1 = deg2rad((float) $vet['lat']);
            $lat2 = deg2rad((float) $farm['lat']);
            $dLat = deg2rad((float) $farm['lat'] - (float) $vet['lat']);
            $dLng = deg2rad((float) $farm['lng'] - (float) $vet['lng']);
            $a = sin($dLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($dLng / 2) ** 2;
            $distanceKm = round($earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
        }

        $amount = match ($consultationType) {
            'CALL'  => (int) ($prices['priceCallFcfa'] ?? 5600),
            'VIDEO' => (int) ($prices['priceVideoFcfa'] ?? 15000),
            'FIELD' => (int) round((float) $distanceKm * (int) ($prices['pricePerKmFcfa'] ?? 125)),
        };

        $id = Db::insert('Appointment', [
            'eleveurId'        => $user['id'],
            'vetProfileId'     => $vetId,
            'startsAt'         => $start,
            'endsAt'           => $end,
            'amount'           => $amount,
            'reason'           => $reason !== '' ? $reason : 'Consultation',
            'method'           => $method,
            'status'           => 'UPCOMING',
            'consultationType' => $consultationType,
            'distanceKm'       => $distanceKm,
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

    /**
     * Avis de l'éleveur sur la consultation (SFD §4.7). Un seul avis par
     * rendez-vous (contrainte d'unicité sur `appointmentId`), et seulement
     * après clôture — noter une consultation qui n'a pas eu lieu n'a pas de
     * sens.
     */
    $r->post('/appointments/{id}/review', static function (array $args) use ($visible): void {
        $user = Auth::require();
        $appt = $visible($args['id'], $user);

        if ($appt['eleveurId'] !== $user['id']) {
            Http::fail("Seul l'éleveur concerné peut laisser un avis.", 403);
        }
        if ($appt['status'] !== 'COMPLETED') {
            Http::fail('Seule une consultation terminée peut être notée.', 409);
        }
        if ($appt['reviewId'] !== null) {
            Http::fail('Cette consultation a déjà été notée.', 409, 'ALREADY_REVIEWED');
        }

        $stars = (int) Http::input('stars', 0);
        if ($stars < 1 || $stars > 5) {
            Http::fail('La note doit être comprise entre 1 et 5 étoiles.', 400);
        }
        $comment = trim((string) Http::input('comment', ''));

        Db::insert('Review', [
            'appointmentId' => $appt['id'],
            'vetProfileId'  => $appt['vetProfileId'],
            'eleveurId'     => $user['id'],
            'stars'         => $stars,
            'comment'       => $comment !== '' ? $comment : null,
        ]);

        // Moyenne recalculée sur les avis non masqués : un avis modéré (masqué
        // par l'administration) ne doit plus peser sur la note publique.
        $agg = Db::one(
            'SELECT COUNT(*) AS n, COALESCE(AVG(`stars`), 0) AS avg
             FROM `Review` WHERE `vetProfileId` = ? AND `hidden` = 0',
            [$appt['vetProfileId']]
        );
        Db::update('VetProfile', $appt['vetProfileId'], [
            'ratingCount' => (int) ($agg['n'] ?? 0),
            'ratingAvg'   => round((float) ($agg['avg'] ?? 0), 2),
        ]);

        Http::ok(['id' => $appt['id'], 'stars' => $stars, 'comment' => $comment ?: null], 201);
    });

    /**
     * Ouverture d'un litige par l'une ou l'autre partie (SFD-ADMIN §5.2).
     * Un seul litige ouvert à la fois par rendez-vous.
     */
    $r->post('/appointments/{id}/dispute', static function (array $args) use ($visible): void {
        $user = Auth::require();
        $appt = $visible($args['id'], $user);

        $isEleveur = $appt['eleveurId'] === $user['id'];
        $isVet     = $appt['vetUserId'] === $user['id'];
        if (!$isEleveur && !$isVet) {
            Http::fail('Seules les parties du rendez-vous peuvent ouvrir un litige.', 403);
        }

        $existing = Db::one("SELECT `id` FROM `Dispute` WHERE `appointmentId` = ? AND `status` = 'OPEN'", [$appt['id']]);
        if ($existing !== null) {
            Http::fail('Un litige est déjà ouvert pour ce rendez-vous.', 409, 'ALREADY_OPEN');
        }

        $reason = trim((string) Http::input('reason', ''));
        if ($reason === '') {
            Http::fail('Le motif du litige est requis.', 400);
        }
        $description = trim((string) Http::input('description', ''));

        $id = Db::insert('Dispute', [
            'appointmentId' => $appt['id'],
            'eleveurId'     => $appt['eleveurId'],
            'vetProfileId'  => $appt['vetProfileId'],
            'openedByRole'  => $isEleveur ? 'ELEVEUR' : 'VETERINAIRE',
            'reason'        => $reason,
            'description'   => $description !== '' ? $description : null,
        ], false);

        Http::ok(['id' => $id, 'status' => 'OPEN'], 201);
    });

    $shapePrescription = static fn (array $p): array => [
        'id'            => $p['id'],
        'appointmentId' => $p['appointmentId'],
        'vetProfileId'  => $p['vetProfileId'],
        'eleveurId'     => $p['eleveurId'],
        'medications'   => json_decode((string) $p['medications'], true) ?: [],
        'instructions'  => $p['instructions'],
        'createdAt'     => $p['createdAt'],
    ];

    /**
     * Prescription rédigée par le vétérinaire après consultation (terrain,
     * appel ou vidéo). Une seule par rendez-vous — la contrainte unique sur
     * `appointmentId` l'impose déjà en base.
     */
    $r->post('/appointments/{id}/prescription', static function (array $args) use ($visible, $shapePrescription): void {
        $user = Auth::requireRole('VETERINAIRE');
        $appt = $visible($args['id'], $user);

        $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($profile === null || $appt['vetProfileId'] !== $profile['id']) {
            Http::fail('Rendez-vous introuvable.', 404, 'NOT_FOUND');
        }
        if ($appt['status'] !== 'COMPLETED') {
            Http::fail('Seule une consultation terminée peut donner lieu à une prescription.', 409);
        }

        $existing = Db::one('SELECT `id` FROM `Prescription` WHERE `appointmentId` = ?', [$appt['id']]);
        if ($existing !== null) {
            Http::fail('Une prescription existe déjà pour ce rendez-vous.', 409, 'ALREADY_EXISTS');
        }

        $medications = Http::input('medications', []);
        if (!is_array($medications) || $medications === []) {
            Http::fail('Au moins un médicament est requis (nom, posologie, voie).', 400);
        }
        $instructions = trim((string) Http::input('instructions', ''));

        $id = Db::insert('Prescription', [
            'appointmentId' => $appt['id'],
            'vetProfileId'  => $profile['id'],
            'eleveurId'     => $appt['eleveurId'],
            'medications'   => json_encode(array_values($medications), JSON_UNESCAPED_UNICODE),
            'instructions'  => $instructions !== '' ? $instructions : null,
        ], false);

        Db::insert('Notification', [
            'userId'    => $appt['eleveurId'],
            'type'      => 'prescription_issued',
            'title'     => 'Prescription disponible',
            'body'      => 'Votre vétérinaire a délivré une prescription suite à votre consultation.',
            'data'      => json_encode(['appointmentId' => $appt['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok($shapePrescription(Db::one('SELECT * FROM `Prescription` WHERE `id` = ?', [$id])), 201);
    });

    $r->get('/appointments/{id}/prescription', static function (array $args) use ($visible, $shapePrescription): void {
        $user = Auth::require();
        $appt = $visible($args['id'], $user);

        $prescription = Db::one('SELECT * FROM `Prescription` WHERE `appointmentId` = ?', [$appt['id']]);
        if ($prescription === null) {
            Http::fail('Aucune prescription pour ce rendez-vous.', 404, 'NOT_FOUND');
        }

        Http::ok($shapePrescription($prescription));
    });
};
