<?php

declare(strict_types=1);

/**
 * Alertes sanitaires régionales (SFD §4.2, §4.11).
 *
 * Un éleveur reçoit les alertes nationales et celles visant les régions où il
 * détient une exploitation. Les alertes expirées sont écartées.
 */

return static function (Router $r): void {

    $shape = static fn (array $a): array => [
        'id'        => $a['id'],
        'type'      => $a['type'],
        'title'     => $a['title'],
        'body'      => $a['body'],
        'region'    => $a['region'],
        'severity'  => $a['severity'],
        'createdAt' => $a['createdAt'],
        'expiresAt' => $a['expiresAt'],
    ];

    $r->get('/alerts', static function () use ($shape): void {
        $user = Auth::require();

        $regions = array_column(
            Db::all('SELECT DISTINCT `region` FROM `Farm` WHERE `userId` = ?', [$user['id']]),
            'region'
        );

        $now = Db::now();

        if ($regions === []) {
            $rows = Db::all(
                'SELECT * FROM `Alert`
                 WHERE `region` IS NULL AND (`expiresAt` IS NULL OR `expiresAt` > ?)
                 ORDER BY `createdAt` DESC',
                [$now]
            );
        } else {
            $placeholders = implode(',', array_fill(0, count($regions), '?'));
            $rows = Db::all(
                "SELECT * FROM `Alert`
                 WHERE (`region` IS NULL OR `region` IN ($placeholders))
                   AND (`expiresAt` IS NULL OR `expiresAt` > ?)
                 ORDER BY `createdAt` DESC",
                [...$regions, $now]
            );
        }

        Http::ok(array_map($shape, $rows));
    });

    /** Diffusion d'une alerte — réservée à l'administration (SFD §4.14). */
    $r->post('/alerts', static function () use ($shape): void {
        $admin = Auth::requireRole('ADMIN');

        $title = trim((string) Http::input('title', ''));
        $body  = trim((string) Http::input('body', ''));
        if ($title === '' || $body === '') {
            Http::fail('Titre et corps de l’alerte requis.', 400);
        }

        $type = (string) Http::input('type', 'EPIDEMIC');
        if (!in_array($type, ['EPIDEMIC', 'REMINDER', 'SYSTEM'], true)) {
            $type = 'EPIDEMIC';
        }

        $severity = (string) Http::input('severity', 'INFO');
        if (!in_array($severity, ['INFO', 'WARNING', 'CRITICAL'], true)) {
            $severity = 'INFO';
        }

        // Toutes les régions valides, tous pays confondus : une alerte peut
        // cibler indifféremment une région camerounaise ou rwandaise.
        $allRegions = array_merge(...array_map(
            static fn (array $c): array => $c['regions'],
            Countries::all()
        ));
        $region = (string) Http::input('region', '');
        $region = in_array($region, $allRegions, true) ? $region : null;

        $expires = Http::input('expiresAt');
        if (is_string($expires) && $expires !== '') {
            $ts      = strtotime($expires);
            $expires = $ts === false ? null : gmdate('Y-m-d H:i:s.000', $ts);
        } else {
            $expires = null;
        }

        $id = Db::insert('Alert', [
            'type'        => $type,
            'title'       => $title,
            'body'        => $body,
            'region'      => $region,
            'ficheId'     => ((string) Http::input('ficheId', '')) ?: null,
            'severity'    => $severity,
            'createdById' => $admin['id'],
            'expiresAt'   => $expires,
        ], false);

        Db::run('UPDATE `Alert` SET `createdAt` = ? WHERE `id` = ?', [Db::now(), $id]);

        // Notification personnelle aux détenteurs concernés. L'envoi push et
        // e-mail n'est pas encore branché sur cet hébergement : l'historique
        // in-app reste le canal garanti (SFD §4.11).
        $targets = $region === null
            ? Db::all('SELECT `id` FROM `User`')
            : Db::all('SELECT DISTINCT u.`id` FROM `User` u JOIN `Farm` f ON f.`userId` = u.`id` WHERE f.`region` = ?', [$region]);

        foreach ($targets as $t) {
            Db::insert('Notification', [
                'userId'    => $t['id'],
                'type'      => 'ALERT',
                'title'     => $title,
                'body'      => $body,
                'createdAt' => Db::now(),
            ], false);
        }

        Http::ok($shape(Db::one('SELECT * FROM `Alert` WHERE `id` = ?', [$id])), 201);
    });

    /**
     * Vue admin : toutes les alertes actives, indépendamment des
     * exploitations de l'appelant — un admin n'a pas de ferme, la logique de
     * filtrage par région de `/alerts` ne s'applique pas à son cas d'usage.
     */
    $r->get('/admin/alerts', static function () use ($shape): void {
        Auth::requireRole('ADMIN');

        $rows = Db::all(
            "SELECT * FROM `Alert` WHERE `expiresAt` IS NULL OR `expiresAt` > ? ORDER BY `createdAt` DESC",
            [Db::now()]
        );

        Http::ok(array_map($shape, $rows));
    });

    /**
     * Clôture d'une alerte — réservée à l'administration. Une alerte
     * régionale reste sciemment sans "vu" personnel (un risque sanitaire ne
     * disparaît pas parce qu'un éleveur a ouvert l'écran une fois) ; c'est
     * l'admin qui la retire quand le foyer est contenu ou l'information
     * caduque.
     */
    $r->delete('/alerts/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $alert = Db::one('SELECT `id` FROM `Alert` WHERE `id` = ?', [$args['id']]);
        if ($alert === null) {
            Http::fail('Alerte introuvable.', 404, 'NOT_FOUND');
        }

        Db::run('DELETE FROM `Alert` WHERE `id` = ?', [$alert['id']]);

        Http::ok(['id' => $alert['id'], 'deleted' => true]);
    });
};
