<?php

declare(strict_types=1);

/**
 * Identifiants de ligne.
 *
 * Le backend remplacé utilisait des `cuid` : des chaînes de 25 caractères
 * commençant par « c ». On conserve le même format et la même longueur, les
 * identifiants existants circulant déjà dans l'application mobile et dans les
 * données en production.
 */
final class Id
{
    private static int $counter = 0;

    public static function generate(): string
    {
        $timestamp = base_convert((string) (int) (microtime(true) * 1000), 10, 36);
        $counter   = str_pad(base_convert((string) (self::$counter++ % 1679616), 10, 36), 4, '0', STR_PAD_LEFT);
        $random    = substr(bin2hex(random_bytes(8)), 0, 12);

        return 'c' . substr($timestamp . $counter . $random, 0, 24);
    }
}
