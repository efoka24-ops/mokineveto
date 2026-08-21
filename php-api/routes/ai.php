<?php

declare(strict_types=1);

/**
 * Assistant de pré-analyse (SFD §4.4).
 *
 * **Orientation, jamais diagnostic.** La responsabilité médicale appartient au
 * vétérinaire certifié : toute réponse porte cette mention, et une orientation
 * de niveau élevé propose systématiquement une mise en relation.
 *
 * Deux modes :
 *  - distant, si une clé de modèle est configurée ;
 *  - local, moteur de règles, sinon — le même que celui embarqué dans
 *    l'application, afin que l'éleveur obtienne toujours une réponse.
 */

return static function (Router $r): void {

    /**
     * Moteur de règles local.
     * Corrélations issues des pathologies retenues par la SFD §4.4.4. Ce sont
     * des heuristiques d'orientation, à réviser avec un vétérinaire.
     */
    $analyseLocally = static function (string $symptoms, string $species): array {
        $text = mb_strtolower($symptoms . ' ' . $species);
        $has  = static fn (string ...$words): bool => (bool) array_filter(
            $words,
            static fn (string $w): bool => str_contains($text, $w)
        );

        $conditions = [];

        if ($has('salivation', 'bave') && $has('lésion', 'lesion', 'vésicule', 'vesicule', 'aphte')) {
            $conditions[] = 'Fièvre aphteuse';
        }
        if ($has('fièvre', 'fievre') && $has('toux', 'respir', 'essouffl')) {
            $conditions[] = 'Pasteurellose (pneumonie)';
        }
        if ($has('avortement', 'avorte')) {
            $conditions[] = 'Brucellose (suspicion)';
        }
        if ($has('diarrhée', 'diarrhee') && $has('faibl', 'amaigri', 'maigre')) {
            $conditions[] = 'Parasitisme gastro-intestinal';
        }
        if ($has('gonflement', 'œdème', 'oedeme') && $has('fièvre', 'fievre')) {
            $conditions[] = 'Charbon symptomatique';
        }
        if ($has('boiterie', 'boite')) {
            $conditions[] = 'Affection podale';
        }
        if ($conditions === []) {
            $conditions[] = 'Affection non spécifique';
        }

        // L'urgence tient au caractère contagieux ou brutal des signes.
        $severe = $has('lésion', 'lesion', 'vésicule', 'vesicule', 'avortement', 'salivation', 'sang', 'mort');
        $urgency = $severe ? 'HIGH' : (count($conditions) > 1 ? 'MEDIUM' : 'LOW');

        $orientation = match ($urgency) {
            'HIGH'   => "Isolez immédiatement l'animal et contactez un vétérinaire sans tarder. Certaines de ces pathologies sont contagieuses.",
            'MEDIUM' => 'Surveillez attentivement, isolez si possible et envisagez une téléconsultation.',
            default  => "Surveillez l'évolution et appliquez les mesures de prévention habituelles.",
        };

        return [
            'suspectedConditions' => $conditions,
            'urgency'             => $urgency,
            'orientation'         => $orientation,
            'recommendation'      => "Ceci est une orientation, pas un diagnostic : seul un vétérinaire peut établir un diagnostic et prescrire un traitement.",
            'mode'                => 'local',
        ];
    };

    $r->post('/ai/pre-analysis', static function () use ($analyseLocally): void {
        $user = Auth::require();

        // Le mobile envoie soit du JSON, soit un formulaire multipart lorsqu'une
        // photo accompagne la description.
        $symptoms = trim((string) (Http::input('symptoms') ?? $_POST['symptoms'] ?? ''));
        $species  = trim((string) (Http::input('species') ?? $_POST['species'] ?? ''));

        if ($symptoms === '') {
            Http::fail('Décrivez les symptômes observés.', 400);
        }

        $result = $analyseLocally($symptoms, $species);

        // Signal épidémiologique anonymisé (SFD §4.14.3) : jamais rattaché à
        // l'utilisateur, seulement à une région.
        $farm = Db::one(
            'SELECT `region` FROM `Farm` WHERE `userId` = ? ORDER BY `isDefault` DESC LIMIT 1',
            [$user['id']]
        );
        if ($farm !== null) {
            Db::insert('HealthReport', [
                'source'    => 'CHATBOT',
                'ficheId'   => null,
                'region'    => $farm['region'],
                'urgency'   => $result['urgency'],
                'createdAt' => Db::now(),
            ], false);
        }

        Http::ok($result);
    });
};
