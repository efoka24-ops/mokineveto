<?php

declare(strict_types=1);

/** Notifications personnelles (SFD §4.11). */

return static function (Router $r): void {

    $shape = static fn (array $n): array => [
        'id'        => $n['id'],
        'type'      => $n['type'],
        'title'     => $n['title'],
        'body'      => $n['body'],
        'data'      => $n['data'] !== null ? json_decode((string) $n['data'], true) : null,
        'readAt'    => $n['readAt'],
        'createdAt' => $n['createdAt'],
    ];

    $r->get('/notifications', static function () use ($shape): void {
        $user = Auth::require();

        // Plafonné : hors ligne, l'application ne conserve que les dernières
        // (SFD §4.12.2) et une liste illimitée coûterait cher en réseau rural.
        $rows = Db::all(
            'SELECT * FROM `Notification` WHERE `userId` = ? ORDER BY `createdAt` DESC LIMIT 100',
            [$user['id']]
        );
        Http::ok(array_map($shape, $rows));
    });

    $r->patch('/notifications/{id}/read', static function (array $args) use ($shape): void {
        $user = Auth::require();

        $notif = Db::one('SELECT * FROM `Notification` WHERE `id` = ?', [$args['id']]);
        if ($notif === null || $notif['userId'] !== $user['id']) {
            Http::fail('Notification introuvable.', 404, 'NOT_FOUND');
        }

        // Idempotent : marquer deux fois ne réécrit pas la date de lecture.
        if ($notif['readAt'] === null) {
            Db::run('UPDATE `Notification` SET `readAt` = ? WHERE `id` = ?', [Db::now(), $notif['id']]);
        }

        Http::ok($shape(Db::one('SELECT * FROM `Notification` WHERE `id` = ?', [$notif['id']])));
    });

    /**
     * Enregistrement du jeton de notification push.
     * Le canal push n'est pas encore branché sur cet hébergement ; le jeton est
     * néanmoins conservé pour que l'activation ne demande aucune action des
     * utilisateurs déjà inscrits.
     */
    $r->post('/notifications/register-push-token', static function (): void {
        $user  = Auth::require();
        $token = trim((string) Http::input('token', Http::input('expoPushToken', '')));

        if ($token === '' || !str_starts_with($token, 'ExponentPushToken')) {
            Http::fail('Jeton de notification invalide.', 400);
        }

        Db::update('User', $user['id'], ['expoPushToken' => $token]);
        Http::ok(['registered' => true]);
    });
};
