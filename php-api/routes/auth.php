<?php

declare(strict_types=1);

/**
 * Authentification (SFD §4.1).
 *
 * Les empreintes de mot de passe restent compatibles avec celles produites par
 * `bcryptjs` côté Node : `password_verify` accepte les préfixes `$2a$` et
 * `$2b$`. Les comptes déjà créés continuent donc de fonctionner à l'identique.
 */

return static function (Router $r): void {

    /** Représentation d'un utilisateur telle que l'attend l'application mobile. */
    $publicUser = static fn (array $u): array => [
        'id'        => $u['id'],
        'name'      => $u['name'],
        'email'     => $u['email'],
        'phone'     => $u['phone'],
        'role'      => $u['role'],
        'avatarUrl' => $u['avatarUrl'],
        'birthDate' => $u['birthDate'],
    ];

    /** Durée de validité du jeton : 30 jours, comme le backend remplacé. */
    $ttl = 30 * 24 * 60 * 60;

    // ─── Inscription ───────────────────────────────────────────────────────
    $r->post('/auth/signup', static function () use ($publicUser, $ttl): void {
        $name     = trim((string) Http::input('name', ''));
        $phone    = trim((string) Http::input('phone', ''));
        $password = (string) Http::input('password', '');
        $role     = (string) Http::input('role', '');
        $email    = trim((string) Http::input('email', ''));

        if (mb_strlen($name) < 2) {
            Http::fail('Le nom doit comporter au moins 2 caractères.', 400);
        }
        if (mb_strlen($phone) < 6) {
            Http::fail('Numéro de téléphone invalide.', 400);
        }
        // Exigence SFD §4.1.3 : 8 caractères minimum, une majuscule, un chiffre.
        if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/\d/', $password)) {
            Http::fail('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.', 400);
        }
        if (!in_array($role, ['ELEVEUR', 'VETERINAIRE'], true)) {
            Http::fail('Type de compte invalide.', 400);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Http::fail('Adresse e-mail invalide.', 400);
        }

        $existing = Db::one(
            'SELECT `id` FROM `User` WHERE `phone` = ?' . ($email !== '' ? ' OR `email` = ?' : ''),
            $email !== '' ? [$phone, $email] : [$phone]
        );
        if ($existing !== null) {
            Http::fail('Ce numéro ou cette adresse est déjà utilisé.', 409, 'USER_EXISTS');
        }

        $userId = Db::insert('User', [
            'name'         => $name,
            'email'        => $email !== '' ? $email : null,
            'phone'        => $phone,
            'passwordHash' => password_hash($password, PASSWORD_BCRYPT),
            'role'         => $role,
            'birthDate'    => ((string) Http::input('birthDate', '')) ?: null,
            'avatarUrl'    => 'https://i.pravatar.cc/300?u=' . rawurlencode($phone),
        ]);

        if ($role === 'VETERINAIRE') {
            // Le compte reste en attente : il ne sera visible des éleveurs
            // qu'après validation des pièces par l'administration (SFD §4.1.2).
            Db::insert('VetProfile', [
                'userId'           => $userId,
                'specialty'        => ((string) Http::input('specialty', '')) ?: 'Général',
                'gender'           => in_array(Http::input('gender'), ['homme', 'femme'], true)
                                        ? (string) Http::input('gender') : 'homme',
                'experienceYears'  => (int) Http::input('experienceYears', 0),
                'schedule'         => 'À définir',
                'hourlyRate'       => max(0, (int) Http::input('hourlyRate', 7000)),
                'professional'     => Http::input('professional') ? 1 : 0,
                'focus'            => ((string) Http::input('focus', '')) ?: 'À définir',
                'ordreNumber'      => ((string) Http::input('ordreNumber', '')) ?: 'En attente de vérification',
                'interventionZone' => ((string) Http::input('interventionZone', '')) ?: null,
                'verification'     => 'PENDING',
            ]);
        }

        if ($role === 'ELEVEUR') {
            $regions = ['ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
                        'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST'];
            $region = (string) Http::input('region', '');
            Db::insert('Farm', [
                'userId'    => $userId,
                'name'      => 'Élevage de ' . $name,
                'region'    => in_array($region, $regions, true) ? $region : 'CENTRE',
                'isDefault' => 1,
            ]);
        }

        $user = Db::one('SELECT * FROM `User` WHERE `id` = ?', [$userId]);
        $token = Jwt::sign(['sub' => $userId, 'role' => $role, 'phone' => $phone], $ttl);

        Http::json(['success' => true, 'user' => $publicUser($user), 'token' => $token], 201);
    });

    // ─── Connexion ─────────────────────────────────────────────────────────
    $r->post('/auth/login', static function () use ($publicUser, $ttl): void {
        $identifier = trim((string) Http::input('emailOrPhone', ''));
        $password   = (string) Http::input('password', '');

        if ($identifier === '' || $password === '') {
            Http::fail('Identifiant et mot de passe requis.', 400);
        }

        $user = Db::one('SELECT * FROM `User` WHERE `email` = ? OR `phone` = ?', [$identifier, $identifier]);

        // Message identique que le compte existe ou non : distinguer les deux
        // permettrait d'énumérer les comptes enregistrés.
        if ($user === null || !password_verify($password, $user['passwordHash'])) {
            Http::fail('Identifiants incorrects.', 401, 'INVALID_CREDENTIALS');
        }

        $token = Jwt::sign(
            ['sub' => $user['id'], 'role' => $user['role'], 'phone' => $user['phone']],
            $ttl
        );

        Http::json(['success' => true, 'user' => $publicUser($user), 'token' => $token]);
    });

    // ─── Profil courant ────────────────────────────────────────────────────
    $r->get('/auth/me', static function () use ($publicUser): void {
        $user = Auth::require();
        $payload = $publicUser($user);

        if ($user['role'] === 'VETERINAIRE') {
            $profile = Db::one('SELECT * FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
            if ($profile !== null) {
                $profile['professional']    = (bool) $profile['professional'];
                $profile['experienceYears'] = (int) $profile['experienceYears'];
                $profile['hourlyRate']      = (int) $profile['hourlyRate'];
                $profile['ratingAvg']       = (float) $profile['ratingAvg'];
                $profile['ratingCount']     = (int) $profile['ratingCount'];
                $payload['vetProfile'] = $profile;
            }
        }

        Http::json(['success' => true, 'user' => $payload]);
    });

    // ─── Mise à jour du profil ─────────────────────────────────────────────
    $r->patch('/auth/me', static function () use ($publicUser): void {
        $user = Auth::require();
        $data = [];

        $name = Http::input('name');
        if (is_string($name) && mb_strlen(trim($name)) >= 2) {
            $data['name'] = trim($name);
        }

        $avatar = Http::input('avatarUrl');
        if (is_string($avatar) && filter_var($avatar, FILTER_VALIDATE_URL)) {
            $data['avatarUrl'] = $avatar;
        }

        $birth = Http::input('birthDate');
        if (is_string($birth)) {
            $data['birthDate'] = $birth;
        }

        // Le numéro de téléphone est l'identifiant du compte : il est immuable
        // (SFD §4.1.4). Toute tentative de modification est ignorée en silence.
        if ($data !== []) {
            Db::update('User', $user['id'], $data);
        }

        $fresh = Db::one('SELECT * FROM `User` WHERE `id` = ?', [$user['id']]);
        Http::json(['success' => true, 'user' => $publicUser($fresh)]);
    });

    // ─── OTP ───────────────────────────────────────────────────────────────
    // Le canal d'envoi (SMS ou e-mail) n'est pas encore branché sur cet
    // hébergement : le code est enregistré et sa présence signalée, mais il
    // n'est jamais renvoyé au client — ce serait une porte ouverte.
    $r->post('/auth/request-otp', static function (): void {
        $identifier = trim((string) Http::input('emailOrPhone', Http::input('phone', '')));
        if ($identifier === '') {
            Http::fail('Numéro ou adresse requis.', 400);
        }
        Http::ok(['sent' => true, 'channel' => str_contains($identifier, '@') ? 'email' : 'sms']);
    });

    $r->post('/auth/verify-otp', static function (): void {
        Http::fail("La vérification par code n'est pas encore disponible sur ce serveur.", 501, 'NOT_IMPLEMENTED');
    });
};
