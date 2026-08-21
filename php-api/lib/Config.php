<?php

declare(strict_types=1);

/**
 * Configuration, lue depuis un fichier .env placé HORS de la racine web.
 *
 * Les identifiants ne doivent jamais être servis par Apache : le fichier vit
 * au-dessus de public_html et n'est donc pas atteignable par une URL.
 */
final class Config
{
    private static ?array $env = null;

    public static function load(string $path): void
    {
        if (!is_readable($path)) {
            error_log("[config] fichier d'environnement introuvable : $path");
            self::$env = [];
            return;
        }

        $env = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $value = trim($value);
            // Retire les guillemets encadrants éventuels.
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && $value[-1] === $value[0]) {
                $value = substr($value, 1, -1);
            }
            $env[trim($key)] = $value;
        }
        self::$env = $env;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = self::$env[$key] ?? getenv($key) ?: null;
        return $value !== null && $value !== '' ? $value : $default;
    }

    public static function db(): array
    {
        return [
            'host' => self::get('DB_HOST', '127.0.0.1'),
            'port' => (int) self::get('DB_PORT', '3306'),
            'name' => self::get('DB_NAME', ''),
            'user' => self::get('DB_USER', ''),
            'pass' => self::get('DB_PASS', ''),
        ];
    }

    public static function jwtSecret(): string
    {
        $secret = self::get('JWT_SECRET', '');
        if ($secret === null || strlen($secret) < 32) {
            // Un secret faible rendrait les jetons forgeables : on refuse de
            // démarrer plutôt que de servir une authentification illusoire.
            error_log('[config] JWT_SECRET absent ou trop court');
            Http::fail('Service mal configuré.', 500);
        }
        return $secret;
    }

    public static function isProduction(): bool
    {
        return self::get('APP_ENV', 'production') === 'production';
    }
}
