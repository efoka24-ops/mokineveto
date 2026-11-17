<?php

declare(strict_types=1);

/**
 * Authentification et contrôle de rôle.
 *
 * Le porteur du jeton est résolu en utilisateur complet à chaque requête : un
 * compte suspendu ou supprimé cesse d'être servi immédiatement, sans attendre
 * l'expiration de son jeton.
 */
final class Auth
{
    private static ?array $user = null;
    private static bool $resolved = false;

    /** Utilisateur courant, ou null si la requête est anonyme. */
    public static function user(): ?array
    {
        if (self::$resolved) {
            return self::$user;
        }
        self::$resolved = true;

        $header = Http::header('Authorization');
        if ($header === null || !preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return self::$user = null;
        }

        $claims = Jwt::verify(trim($m[1]));
        if ($claims === null || empty($claims['sub'])) {
            return self::$user = null;
        }

        $user = Db::one(
            'SELECT `id`, `name`, `email`, `phone`, `role`, `country`, `avatarUrl`, `birthDate`,
                    `status`, `statusReason`, `suspendedUntil`, `adminRole`
             FROM `User` WHERE `id` = ?',
            [$claims['sub']]
        );

        // Une suspension temporaire expirée redevient un compte actif sans
        // intervention manuelle.
        if ($user !== null && $user['status'] === 'SUSPENDED'
            && $user['suspendedUntil'] !== null
            && strtotime((string) $user['suspendedUntil']) <= time()
        ) {
            Db::update('User', $user['id'], ['status' => 'ACTIVE', 'statusReason' => null, 'suspendedUntil' => null]);
            $user['status'] = 'ACTIVE';
        }

        return self::$user = $user;
    }

    /** Exige une requête authentifiée et un compte non suspendu/banni ; interrompt sinon. */
    public static function require(): array
    {
        $user = self::user();
        if ($user === null) {
            Http::fail('Session expirée. Reconnectez-vous.', 401, 'UNAUTHORIZED');
        }
        if ($user['status'] === 'BANNED') {
            Http::fail('Ce compte a été banni.', 403, 'ACCOUNT_BANNED');
        }
        if ($user['status'] === 'SUSPENDED') {
            Http::fail('Ce compte est suspendu' . ($user['statusReason'] ? ' : ' . $user['statusReason'] : '.'), 403, 'ACCOUNT_SUSPENDED');
        }
        return $user;
    }

    /** Exige un rôle parmi ceux passés ; interrompt avec 403 sinon. */
    public static function requireRole(string ...$roles): array
    {
        $user = self::require();
        if (!in_array($user['role'], $roles, true)) {
            Http::fail("Vous n'avez pas les droits nécessaires.", 403, 'FORBIDDEN');
        }
        return $user;
    }

    /**
     * Exige que l'administrateur ait l'un des rôles délégués passés.
     * `adminRole` NULL vaut accès complet (comptes créés avant la
     * délégation des rôles, rétro-compatibilité).
     */
    public static function requireAdminRole(string ...$adminRoles): array
    {
        $user = self::requireRole('ADMIN');
        if ($user['adminRole'] !== null && !in_array($user['adminRole'], $adminRoles, true)) {
            Http::fail("Votre rôle administrateur n'a pas accès à cette fonctionnalité.", 403, 'FORBIDDEN');
        }
        return $user;
    }
}
