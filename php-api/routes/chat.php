<?php

declare(strict_types=1);

/**
 * Messagerie éleveur ↔ vétérinaire (SFD §4.8).
 *
 * Le backend Node remplacé diffusait les messages par socket.io. PHP n'a pas
 * d'équivalent sur cet hébergement : l'application récupère les messages par
 * interrogation périodique. Le paramètre `since` permet de ne demander que les
 * messages postérieurs à un instant donné, pour limiter le trafic sur des
 * connexions rurales.
 *
 * Le chiffrement de bout en bout exigé par la SFD §7.1 n'est pas encore en
 * place : il fait l'objet de la phase 1 du plan et suppose un schéma d'échange
 * de clés qui reste à arrêter (T019).
 */

return static function (Router $r): void {

    $shapeMessage = static fn (array $m): array => [
        'id'             => $m['id'],
        'conversationId' => $m['conversationId'],
        'senderId'       => $m['senderId'],
        'text'           => $m['text'],
        'readAt'         => $m['readAt'],
        'createdAt'      => $m['createdAt'],
    ];

    /**
     * Résout l'identité de l'appelant côté conversation.
     * Un praticien est repéré par son profil, un éleveur par son compte.
     */
    $participantOf = static function (array $user): array {
        if ($user['role'] === 'VETERINAIRE') {
            $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
            if ($profile === null) {
                Http::fail('Profil vétérinaire introuvable.', 404, 'NOT_FOUND');
            }
            return ['role' => 'VET', 'vetProfileId' => $profile['id']];
        }
        return ['role' => 'ELEVEUR', 'userId' => $user['id']];
    };

    /** Charge une conversation en vérifiant que l'appelant y participe. */
    $accessible = static function (string $id, array $me): array {
        $conv = Db::one('SELECT * FROM `Conversation` WHERE `id` = ?', [$id]);
        if ($conv === null) {
            Http::fail('Conversation introuvable.', 404, 'NOT_FOUND');
        }

        $ok = $me['role'] === 'VET'
            ? $conv['vetProfileId'] === $me['vetProfileId']
            : $conv['eleveurId'] === $me['userId'];

        if (!$ok) {
            Http::fail('Conversation introuvable.', 404, 'NOT_FOUND');
        }
        return $conv;
    };

    $r->get('/chat/conversations', static function () use ($participantOf): void {
        $user = Auth::require();
        $me   = $participantOf($user);

        // Le dernier message et le nombre de non-lus sont calculés en base :
        // les remonter message par message serait coûteux à l'affichage.
        $sql = 'SELECT c.*,
                       v.`specialty` AS vetSpecialty,
                       vu.`id` AS vetUserId, vu.`name` AS vetName, vu.`avatarUrl` AS vetAvatar,
                       eu.`id` AS eleveurUserId, eu.`name` AS eleveurName, eu.`avatarUrl` AS eleveurAvatar,
                       (SELECT m.`text` FROM `Message` m WHERE m.`conversationId` = c.`id`
                         ORDER BY m.`createdAt` DESC LIMIT 1) AS lastText,
                       (SELECT COUNT(*) FROM `Message` m WHERE m.`conversationId` = c.`id`
                         AND m.`readAt` IS NULL AND m.`senderId` <> ?) AS unread
                FROM `Conversation` c
                LEFT JOIN `VetProfile` v ON v.`id` = c.`vetProfileId`
                LEFT JOIN `User` vu ON vu.`id` = v.`userId`
                JOIN `User` eu ON eu.`id` = c.`eleveurId`';

        if ($me['role'] === 'VET') {
            $rows = Db::all($sql . ' WHERE c.`vetProfileId` = ? ORDER BY c.`lastMessageAt` DESC',
                [$user['id'], $me['vetProfileId']]);
        } else {
            $rows = Db::all($sql . ' WHERE c.`eleveurId` = ? ORDER BY c.`lastMessageAt` DESC',
                [$user['id'], $me['userId']]);
        }

        Http::ok(array_map(static fn (array $c): array => [
            'id'            => $c['id'],
            'eleveurId'     => $c['eleveurId'],
            'vetProfileId'  => $c['vetProfileId'],
            'lastMessageAt' => $c['lastMessageAt'],
            'lastMessage'   => $c['lastText'],
            'unreadCount'   => (int) $c['unread'],
            'createdAt'     => $c['createdAt'],
            'vet' => [
                'id'        => $c['vetUserId'],
                'name'      => $c['vetName'],
                'avatarUrl' => $c['vetAvatar'],
                'specialty' => $c['vetSpecialty'],
            ],
            'eleveur' => [
                'id'        => $c['eleveurUserId'],
                'name'      => $c['eleveurName'],
                'avatarUrl' => $c['eleveurAvatar'],
            ],
        ], $rows));
    });

    /** Ouvre une conversation, ou renvoie celle qui existe déjà. */
    $r->post('/chat/conversations', static function (): void {
        $user  = Auth::requireRole('ELEVEUR');
        $vetId = trim((string) Http::input('vetId', Http::input('vetProfileId', '')));

        if ($vetId === '') {
            Http::fail('Vétérinaire requis.', 400);
        }

        $existing = Db::one(
            'SELECT * FROM `Conversation` WHERE `eleveurId` = ? AND `vetProfileId` = ?',
            [$user['id'], $vetId]
        );
        if ($existing !== null) {
            Http::ok(['id' => $existing['id'], 'created' => false]);
        }

        $id = Db::insert('Conversation', [
            'eleveurId'    => $user['id'],
            'vetProfileId' => $vetId,
            'createdAt'    => Db::now(),
        ], false);

        Http::ok(['id' => $id, 'created' => true], 201);
    });

    $r->get('/chat/conversations/{id}', static function (array $args) use ($participantOf, $accessible, $shapeMessage): void {
        $user = Auth::require();
        $me   = $participantOf($user);
        $conv = $accessible($args['id'], $me);

        $sql    = 'SELECT * FROM `Message` WHERE `conversationId` = ?';
        $params = [$conv['id']];

        // Interrogation incrémentale : seuls les messages plus récents que
        // `since` sont renvoyés.
        $since = Http::query('since');
        if (is_string($since) && $since !== '') {
            $ts = strtotime($since);
            if ($ts !== false) {
                $sql     .= ' AND `createdAt` > ?';
                $params[] = gmdate('Y-m-d H:i:s.000', $ts);
            }
        }

        $messages = Db::all($sql . ' ORDER BY `createdAt` ASC LIMIT 200', $params);

        // Les messages reçus sont marqués lus à la consultation.
        Db::run(
            'UPDATE `Message` SET `readAt` = ?
             WHERE `conversationId` = ? AND `senderId` <> ? AND `readAt` IS NULL',
            [Db::now(), $conv['id'], $user['id']]
        );

        Http::ok([
            'id'       => $conv['id'],
            'messages' => array_map($shapeMessage, $messages),
        ]);
    });

    $r->post('/chat/conversations/{id}/messages', static function (array $args) use ($participantOf, $accessible, $shapeMessage): void {
        $user = Auth::require();
        $me   = $participantOf($user);
        $conv = $accessible($args['id'], $me);

        $text = trim((string) Http::input('text', ''));
        if ($text === '') {
            Http::fail('Message vide.', 400);
        }
        if (mb_strlen($text) > 4000) {
            Http::fail('Message trop long : 4000 caractères maximum.', 400);
        }

        $now = Db::now();
        $id  = Db::insert('Message', [
            'conversationId' => $conv['id'],
            'senderId'       => $user['id'],
            'text'           => $text,
            'createdAt'      => $now,
        ], false);

        Db::run('UPDATE `Conversation` SET `lastMessageAt` = ? WHERE `id` = ?', [$now, $conv['id']]);

        Http::ok($shapeMessage(Db::one('SELECT * FROM `Message` WHERE `id` = ?', [$id])), 201);
    });
};
