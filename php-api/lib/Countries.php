<?php

declare(strict_types=1);

/**
 * Pays supportés et ce qui varie entre eux : régions d'exploitation,
 * langue par défaut, devise de paiement.
 *
 * Source unique de vérité, exposée telle quelle au mobile par
 * `GET /meta/countries` — l'app ne code en dur aucune liste de régions,
 * elle s'adapte au pays choisi à l'inscription.
 */
final class Countries
{
    private const REGISTRY = [
        'CM' => [
            'label'    => 'Cameroun',
            'language' => 'fr',
            'currency' => 'XAF',
            'regions'  => [
                'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
                'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
            ],
        ],
        'RW' => [
            'label'    => 'Rwanda',
            'language' => 'rw',
            'currency' => 'RWF',
            // Provinces du Rwanda (niveau administratif 1).
            'regions'  => [
                'KIGALI', 'NORD', 'SUD', 'EST', 'OUEST',
            ],
        ],
    ];

    public const DEFAULT = 'CM';

    public static function exists(string $code): bool
    {
        return isset(self::REGISTRY[strtoupper($code)]);
    }

    /** @return array{label:string,language:string,currency:string,regions:string[]} */
    public static function get(string $code): array
    {
        return self::REGISTRY[strtoupper($code)] ?? self::REGISTRY[self::DEFAULT];
    }

    /** @return string[] */
    public static function regions(string $code): array
    {
        return self::get($code)['regions'];
    }

    public static function defaultRegion(string $code): string
    {
        return self::regions($code)[0];
    }

    public static function language(string $code): string
    {
        return self::get($code)['language'];
    }

    public static function currency(string $code): string
    {
        return self::get($code)['currency'];
    }

    /** Représentation publique complète, pour le sélecteur pays du mobile. */
    public static function all(): array
    {
        $out = [];
        foreach (self::REGISTRY as $code => $data) {
            $out[] = [
                'code'     => $code,
                'label'    => $data['label'],
                'language' => $data['language'],
                'currency' => $data['currency'],
                'regions'  => $data['regions'],
            ];
        }
        return $out;
    }
}
