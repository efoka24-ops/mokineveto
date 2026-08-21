<?php

declare(strict_types=1);

/**
 * Entrée et sortie HTTP.
 *
 * Le format des réponses reproduit exactement celui du backend Node qu'il
 * remplace — `{ success, data }` ou `{ success, error }` — afin que
 * l'application mobile n'ait aucune ligne à changer.
 */
final class Http
{
    /** Corps JSON de la requête, décodé une seule fois. */
    private static ?array $body = null;

    public static function body(): array
    {
        if (self::$body !== null) {
            return self::$body;
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return self::$body = [];
        }

        $decoded = json_decode($raw, true);
        return self::$body = is_array($decoded) ? $decoded : [];
    }

    /** Champ du corps, avec valeur de repli. */
    public static function input(string $key, mixed $default = null): mixed
    {
        $body = self::body();
        return array_key_exists($key, $body) ? $body[$key] : $default;
    }

    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public static function json(mixed $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok(mixed $data = null, int $status = 200): never
    {
        $payload = ['success' => true];
        if ($data !== null) {
            $payload['data'] = $data;
        }
        self::json($payload, $status);
    }

    /**
     * Erreur présentable à l'utilisateur final.
     *
     * Le message part tel quel vers le mobile : il doit rester en français,
     * compréhensible, et ne jamais laisser filtrer de détail technique.
     */
    public static function fail(string $message, int $status = 400, ?string $code = null): never
    {
        $error = $code === null ? $message : ['code' => $code, 'message' => $message];
        self::json(['success' => false, 'error' => $error], $status);
    }

    /** En-tête de requête, insensible à la casse. */
    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $_SERVER[$key] ?? null;
    }

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /** Adresse réelle du client, en tenant compte d'un éventuel relais. */
    public static function clientIp(): string
    {
        $forwarded = self::header('X-Forwarded-For');
        if ($forwarded !== null && $forwarded !== '') {
            $first = trim(explode(',', $forwarded)[0]);
            if ($first !== '') {
                return $first;
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
