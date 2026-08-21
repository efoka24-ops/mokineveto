<?php

declare(strict_types=1);

/**
 * Jetons JWT, algorithme HS256.
 *
 * Implémentation sans dépendance : l'hébergement mutualisé ne permet pas
 * d'exécuter Composer de façon fiable (limite de processus). Les jetons émis
 * sont interchangeables avec ceux du backend Node remplacé — même algorithme,
 * mêmes revendications — afin que les sessions ouvertes restent valides.
 */
final class Jwt
{
    private static function b64UrlEncode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $encoded): string
    {
        $padded = strtr($encoded, '-_', '+/');
        $remainder = strlen($padded) % 4;
        if ($remainder !== 0) {
            $padded .= str_repeat('=', 4 - $remainder);
        }
        $decoded = base64_decode($padded, true);
        return $decoded === false ? '' : $decoded;
    }

    /** @param array<string, mixed> $claims */
    public static function sign(array $claims, int $ttlSeconds): string
    {
        $now = time();
        $payload = $claims + ['iat' => $now, 'exp' => $now + $ttlSeconds];

        $header  = self::b64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
        $body    = self::b64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $signing = $header . '.' . $body;

        $signature = self::b64UrlEncode(hash_hmac('sha256', $signing, Config::jwtSecret(), true));

        return $signing . '.' . $signature;
    }

    /**
     * Vérifie un jeton et renvoie ses revendications, ou null s'il est invalide.
     * Toute anomalie — signature, structure, expiration — renvoie null : on ne
     * distingue pas les causes, pour ne rien apprendre à un attaquant.
     */
    public static function verify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $body, $signature] = $parts;

        $expected = self::b64UrlEncode(hash_hmac('sha256', $header . '.' . $body, Config::jwtSecret(), true));
        // Comparaison à temps constant : une comparaison naïve laisserait fuir
        // la signature attendue par mesure de temps.
        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $claims = json_decode(self::b64UrlDecode($body), true);
        if (!is_array($claims)) {
            return null;
        }
        if (isset($claims['exp']) && time() >= (int) $claims['exp']) {
            return null;
        }

        return $claims;
    }
}
