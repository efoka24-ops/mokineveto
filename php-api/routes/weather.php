<?php

declare(strict_types=1);

/**
 * Météo locale et risque épizootique (SFD §4.2).
 *
 * La clé du fournisseur reste côté serveur : l'embarquer dans l'application la
 * rendrait extractible du binaire livré (SC-024).
 *
 * Best-effort : sans clé configurée ou en cas de panne du fournisseur, la route
 * répond 200 avec `available: false` plutôt qu'une erreur. Le tableau de bord
 * doit rester utilisable sans météo.
 */

return static function (Router $r): void {

    /**
     * Évalue le risque épizootique à partir des conditions courantes.
     *
     * La SFD §4.2 cite deux facteurs : chaleur extrême et inondation. On y
     * ajoute l'humidité, qui conditionne la prolifération des insectes vecteurs
     * (trypanosomiase, fièvre de la vallée du Rift), pathologies retenues au
     * §4.4.4.
     *
     * Ces seuils sont des heuristiques d'orientation, à réviser avec un
     * vétérinaire épidémiologiste. Ils ne constituent pas un avis médical.
     */
    $assess = static function (?float $temp, ?int $humidity, ?float $rain): array {
        $reasons = [];
        $score   = 0;

        if ($temp !== null) {
            if ($temp >= 40) {
                $score += 2;
                $reasons[] = 'Chaleur extrême : risque de stress thermique et de déshydratation du troupeau.';
            } elseif ($temp >= 35) {
                $score += 1;
                $reasons[] = "Forte chaleur : surveillez l'abreuvement et l'ombrage.";
            }
        }

        if ($rain !== null) {
            if ($rain >= 20) {
                $score += 2;
                $reasons[] = "Pluies intenses : risque d'inondation et de contamination des points d'eau.";
            } elseif ($rain >= 7) {
                $score += 1;
                $reasons[] = "Pluies soutenues : surveillez l'état des pâturages et des abreuvoirs.";
            }
        }

        if ($humidity !== null && $humidity >= 80) {
            $score += 1;
            $reasons[] = 'Humidité élevée : conditions favorables aux insectes vecteurs.';
        }

        $risk = $score >= 3 ? 'HIGH' : ($score >= 1 ? 'MODERATE' : 'LOW');
        if ($risk === 'LOW') {
            $reasons[] = 'Conditions climatiques sans facteur de risque particulier.';
        }

        return ['risk' => $risk, 'reasons' => $reasons];
    };

    $r->get('/weather', static function () use ($assess): void {
        Auth::require();

        $lat = filter_var(Http::query('lat'), FILTER_VALIDATE_FLOAT);
        $lon = filter_var(Http::query('lon'), FILTER_VALIDATE_FLOAT);

        if ($lat === false || $lon === false || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
            Http::fail('Coordonnées lat et lon requises.', 400);
        }

        $unavailable = ['available' => false, 'risk' => 'LOW', 'reasons' => []];

        $key = Config::get('OPENWEATHER_API_KEY', '');
        if ($key === null || $key === '') {
            Http::ok($unavailable);
        }

        $url = sprintf(
            '%s/weather?lat=%F&lon=%F&units=metric&lang=fr&appid=%s',
            rtrim((string) Config::get('OPENWEATHER_BASE_URL', 'https://api.openweathermap.org/data/2.5'), '/'),
            $lat,
            $lon,
            rawurlencode($key)
        );

        $context = stream_context_create([
            'http' => ['timeout' => 6, 'ignore_errors' => true],
        ]);
        $raw = @file_get_contents($url, false, $context);

        if ($raw === false) {
            Http::ok($unavailable);
        }

        $json = json_decode($raw, true);
        if (!is_array($json) || !isset($json['main'])) {
            Http::ok($unavailable);
        }

        $temp     = isset($json['main']['temp']) ? (float) $json['main']['temp'] : null;
        $humidity = isset($json['main']['humidity']) ? (int) $json['main']['humidity'] : null;
        $rain     = isset($json['rain']['1h']) ? (float) $json['rain']['1h'] : null;

        ['risk' => $risk, 'reasons' => $reasons] = $assess($temp, $humidity, $rain);

        Http::ok([
            'available'   => true,
            'place'       => $json['name'] ?? null,
            'temperature' => $temp,
            'feelsLike'   => isset($json['main']['feels_like']) ? (float) $json['main']['feels_like'] : null,
            'humidity'    => $humidity,
            'rain1h'      => $rain,
            'description' => $json['weather'][0]['description'] ?? null,
            'icon'        => $json['weather'][0]['icon'] ?? null,
            'risk'        => $risk,
            'reasons'     => $reasons,
        ]);
    });
};
