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
            'SELECT `id`, `name`, `email`, `phone`, `role`, `avatarUrl`, `birthDate`
             FROM `User` WHERE `id` = ?',
            [$claims['sub']]
        );

        return self::$user = $user;
    }

    /** Exige une requête authentifiée ; interrompt avec 401 sinon. */
    public static function require(): array
    {
        $user = self::user();
        if ($user === null) {
            Http::fail('Session expirée. Reconnectez-vous.', 401, 'UNAUTHORIZED');
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
}
