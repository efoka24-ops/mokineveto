<?php

declare(strict_types=1);

/**
 * Assistant de pré-analyse (SFD §4.4).
 *
 * **Orientation, jamais diagnostic.** La responsabilité médicale appartient au
 * vétérinaire certifié : toute réponse porte cette mention, et une orientation
 * de niveau élevé propose systématiquement une mise en relation.
 *
 * Deux moteurs :
 *  - Groq (Llama 3.3, palier gratuit) quand `GROQ_API_KEY` est configurée —
 *    réponse en langage naturel, contrainte à un JSON strict par le prompt.
 *  - Moteur de règles local (table `ChatbotRule`, éditable depuis le
 *    back-office sans déploiement) en secours si Groq est absent, en échec,
 *    ou renvoie un JSON invalide — l'utilisateur reçoit toujours une réponse.
 */

return static function (Router $r): void {

    /** Message système contraignant le LLM à une orientation, jamais un diagnostic. */
    $systemPrompt = <<<PROMPT
Tu es l'assistant de pré-analyse vétérinaire de MokineVeto, une application de télémédecine pour éleveurs au Cameroun et au Rwanda (bovins, caprins, ovins, porcins, volailles).

RÈGLES IMPÉRATIVES :
- Tu orientes, tu ne diagnostiques jamais. Le diagnostic et la prescription appartiennent exclusivement à un vétérinaire certifié.
- Tu réponds dans la langue du message de l'éleveur (français ou anglais).
- Tu ne donnes jamais de nom de médicament précis ni de dosage.
- Si les symptômes évoquent une maladie contagieuse grave (fièvre aphteuse, peste des petits ruminants, charbon, dermatose nodulaire, etc.), l'urgence doit être "HIGH".
- Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide, sans texte autour, au format exact :
{"suspectedConditions": ["nom de pathologie 1", "nom de pathologie 2"], "urgency": "LOW"|"MEDIUM"|"HIGH", "orientation": "conseil pratique court, 1-2 phrases", "recommendation": "rappel qu'il ne s'agit pas d'un diagnostic et qu'un vétérinaire doit être consulté", "confidence": nombre entier de 0 à 100 exprimant ta confiance dans cette orientation compte tenu des symptômes décrits}

Sois honnête sur la confidence : des symptômes vagues ou compatibles avec de nombreuses causes doivent recevoir une confidence basse (< 60), pas une confidence artificiellement élevée.
PROMPT;

    /**
     * Mots-clés de détresse grave (SFD-ADMIN §4.2.1) : déclenchent une
     * révision humaine même si le modèle se dit confiant, parce que le coût
     * d'un faux négatif y est maximal (zoonose, mortalité de masse).
     */
    $distressKeywords = [
        'mort subite', 'morts subites', 'mort subit', 'plusieurs morts', 'plusieurs animaux morts',
        'meurent en masse', 'hécatombe', 'saignement du nez', 'sang dans les urines',
        'sang dans le lait', 'fièvre hémorragique', 'zoonose', 'transmis à l\'homme',
        'transmise à l\'humain', 'j\'ai aussi des symptômes', 'toute la famille est malade',
    ];

    /** Tente Groq ; renvoie null si indisponible ou si le JSON est invalide. */
    $analyseWithGroq = static function (string $symptoms, string $species) use ($systemPrompt): ?array {
        try {
            $userMessage = "Espèce : {$species}\nSymptômes observés : {$symptoms}";
            $raw = Groq::chat([
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage],
            ]);

            $parsed = json_decode($raw, true);
            if (!is_array($parsed)
                || !isset($parsed['suspectedConditions'], $parsed['urgency'], $parsed['orientation'])
                || !is_array($parsed['suspectedConditions'])
                || !in_array($parsed['urgency'], ['LOW', 'MEDIUM', 'HIGH'], true)
            ) {
                error_log('[ai] réponse Groq mal formée : ' . substr($raw, 0, 300));
                return null;
            }

            $confidence = isset($parsed['confidence']) ? (int) $parsed['confidence'] : 70;

            return [
                'suspectedConditions' => array_values(array_map('strval', $parsed['suspectedConditions'])) ?: ['Affection non spécifique'],
                'urgency'             => $parsed['urgency'],
                'orientation'         => (string) $parsed['orientation'],
                'recommendation'      => (string) ($parsed['recommendation']
                    ?? "Ceci est une orientation, pas un diagnostic : seul un vétérinaire peut établir un diagnostic et prescrire un traitement."),
                'confidence'          => max(0, min(100, $confidence)),
                'mode'                => 'groq',
            ];
        } catch (Throwable $e) {
            error_log('[ai] Groq indisponible : ' . $e->getMessage());
            return null;
        }
    };

    /**
     * Applique les règles actives de la base à un texte libre.
     *
     * @return array{suspectedConditions: string[], urgency: string, orientation: string}
     */
    $analyseLocally = static function (string $symptoms, string $species): array {
        $text = mb_strtolower($symptoms . ' ' . $species);
        $has  = static fn (array $words): bool => (bool) array_filter(
            $words,
            static fn (string $w): bool => $w !== '' && str_contains($text, mb_strtolower($w))
        );

        $rules = Db::all(
            'SELECT * FROM `ChatbotRule` WHERE `active` = 1 ORDER BY `sortOrder` ASC, `createdAt` ASC'
        );

        $conditions = [];
        $severe     = false;

        foreach ($rules as $rule) {
            $keywordsA = json_decode((string) $rule['keywordsA'], true) ?: [];
            $keywordsB = $rule['keywordsB'] !== null ? (json_decode((string) $rule['keywordsB'], true) ?: []) : null;

            $matches = $has($keywordsA) && ($keywordsB === null || $has($keywordsB));
            if (!$matches) {
                continue;
            }

            $conditions[] = $rule['conditionName'];
            if ((bool) $rule['severe']) {
                $severe = true;
            }
        }

        $conditions = array_values(array_unique($conditions));
        if ($conditions === []) {
            $conditions[] = 'Affection non spécifique';
        }

        $urgency = $severe ? 'HIGH' : (count($conditions) > 1 ? 'MEDIUM' : 'LOW');

        $orientation = match ($urgency) {
            'HIGH'   => "Isolez immédiatement l'animal et contactez un vétérinaire sans tarder. Certaines de ces pathologies sont contagieuses.",
            'MEDIUM' => 'Surveillez attentivement, isolez si possible et envisagez une téléconsultation.',
            default  => "Surveillez l'évolution et appliquez les mesures de prévention habituelles.",
        };

        // Le moteur de règles n'a pas de notion de confiance statistique : une
        // seule pathologie identifiée par mots-clés est jugée moins fiable
        // qu'un LLM, et l'absence totale de correspondance l'est encore plus.
        $confidence = $conditions === ['Affection non spécifique'] ? 20 : (count($conditions) > 1 ? 45 : 55);

        return [
            'suspectedConditions' => $conditions,
            'urgency'             => $urgency,
            'orientation'         => $orientation,
            'recommendation'      => "Ceci est une orientation, pas un diagnostic : seul un vétérinaire peut établir un diagnostic et prescrire un traitement.",
            'confidence'          => $confidence,
            'mode'                => 'local',
        ];
    };

    $r->post('/ai/pre-analysis', static function () use ($analyseWithGroq, $analyseLocally, $distressKeywords): void {
        $user = Auth::require();

        // Le mobile envoie soit du JSON, soit un formulaire multipart lorsqu'une
        // photo accompagne la description.
        $symptoms = trim((string) (Http::input('symptoms') ?? $_POST['symptoms'] ?? ''));
        $species  = trim((string) (Http::input('species') ?? $_POST['species'] ?? ''));

        if ($symptoms === '') {
            Http::fail('Décrivez les symptômes observés.', 400);
        }

        $result = $analyseWithGroq($symptoms, $species) ?? $analyseLocally($symptoms, $species);

        // File de révision humaine (SFD-ADMIN §4.2.1) : chaque critère est
        // vérifié indépendamment, le premier qui matche fixe le motif — une
        // conversation n'a besoin que d'un seul motif pour être mise en file,
        // pas d'un cumul.
        $textLower  = mb_strtolower($symptoms);
        $hasDistress = (bool) array_filter(
            $distressKeywords,
            static fn (string $kw): bool => str_contains($textLower, $kw)
        );
        $reviewReason = null;
        if ($hasDistress) {
            $reviewReason = 'DISTRESS_KEYWORDS';
        } elseif ($result['confidence'] < 60) {
            $reviewReason = 'LOW_CONFIDENCE';
        } elseif ($result['suspectedConditions'] === ['Affection non spécifique']) {
            $reviewReason = 'UNKNOWN_CASE';
        }

        $historyId = Db::insert('ChatbotHistory', [
            'userId'              => $user['id'],
            'species'             => $species !== '' ? $species : null,
            'symptoms'            => $symptoms,
            'suspectedConditions' => json_encode($result['suspectedConditions'], JSON_UNESCAPED_UNICODE),
            'urgency'             => $result['urgency'],
            'orientation'         => $result['orientation'],
            'confidence'          => $result['confidence'],
            'mode'                => $result['mode'],
            'reviewStatus'        => $reviewReason !== null ? 'PENDING' : 'NONE',
            'reviewReason'        => $reviewReason,
        ], false);

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

        Http::ok($result + ['id' => $historyId]);
    });

    /** Historique des pré-analyses de l'utilisateur connecté, plus récentes d'abord. */
    $r->get('/ai/history', static function (): void {
        $user = Auth::require();

        $rows = Db::all(
            'SELECT * FROM `ChatbotHistory` WHERE `userId` = ? ORDER BY `createdAt` DESC LIMIT 100',
            [$user['id']]
        );

        Http::ok(array_map(static fn (array $h): array => [
            'id'                  => $h['id'],
            'species'             => $h['species'],
            'symptoms'            => $h['symptoms'],
            'suspectedConditions' => json_decode((string) $h['suspectedConditions'], true) ?: [],
            'urgency'             => $h['urgency'],
            'orientation'         => $h['orientation'],
            'confidence'          => $h['confidence'] !== null ? (int) $h['confidence'] : null,
            'reviewStatus'        => $h['reviewStatus'],
            'createdAt'           => $h['createdAt'],
        ], $rows));
    });

    /**
     * Signalement d'une réponse incorrecte par l'éleveur (SFD-ADMIN §4.2.1) —
     * met la conversation en file de révision même si rien d'autre ne
     * l'aurait déclenchée.
     */
    $r->post('/ai/history/{id}/feedback', static function (array $args): void {
        $user = Auth::require();

        $entry = Db::one('SELECT `id`, `userId`, `reviewStatus` FROM `ChatbotHistory` WHERE `id` = ?', [$args['id']]);
        if ($entry === null || $entry['userId'] !== $user['id']) {
            Http::fail('Entrée introuvable.', 404, 'NOT_FOUND');
        }

        if ($entry['reviewStatus'] === 'NONE' || $entry['reviewStatus'] === 'VALIDATED') {
            Db::update('ChatbotHistory', $entry['id'], [
                'reviewStatus' => 'PENDING',
                'reviewReason' => 'ELEVEUR_INCORRECT',
            ], false);
        }

        Http::ok(['id' => $entry['id'], 'flagged' => true]);
    });

    $shapeHistory = static fn (array $h): array => [
        'id'                  => $h['id'],
        'species'             => $h['species'],
        'symptoms'            => $h['symptoms'],
        'suspectedConditions' => json_decode((string) $h['suspectedConditions'], true) ?: [],
        'urgency'             => $h['urgency'],
        'orientation'         => $h['orientation'],
        'confidence'          => $h['confidence'] !== null ? (int) $h['confidence'] : null,
        'vetReviewStatus'     => $h['vetReviewStatus'],
        'vetReviewNote'       => $h['vetReviewNote'],
        'vetReviewedAt'       => $h['vetReviewedAt'],
        'createdAt'           => $h['createdAt'],
    ];

    /**
     * L'éleveur partage un résultat de pré-analyse avec un vétérinaire
     * (demande client) — réservé à un vétérinaire déjà consulté, même règle
     * que l'ouverture d'une conversation (routes/chat.php) : un praticien ne
     * doit pas recevoir de sollicitations d'éleveurs inconnus.
     */
    $r->post('/ai/history/{id}/share', static function (array $args): void {
        $user = Auth::requireRole('ELEVEUR');

        $entry = Db::one('SELECT * FROM `ChatbotHistory` WHERE `id` = ? AND `userId` = ?', [$args['id'], $user['id']]);
        if ($entry === null) {
            Http::fail('Entrée introuvable.', 404, 'NOT_FOUND');
        }

        $vetProfileId = trim((string) Http::input('vetProfileId', ''));
        if ($vetProfileId === '') {
            Http::fail('Vétérinaire requis.', 400);
        }

        $vet = Db::one("SELECT `id`, `userId` FROM `VetProfile` WHERE `id` = ? AND `verification` = 'APPROVED'", [$vetProfileId]);
        if ($vet === null) {
            Http::fail('Vétérinaire introuvable.', 404, 'NOT_FOUND');
        }

        $hasHistory = Db::one(
            'SELECT `id` FROM `Appointment` WHERE `vetProfileId` = ? AND `eleveurId` = ? LIMIT 1',
            [$vetProfileId, $user['id']]
        );
        if ($hasHistory === null) {
            Http::fail('Partage possible uniquement avec un vétérinaire déjà consulté.', 403);
        }

        Db::update('ChatbotHistory', $entry['id'], [
            'sharedWithVetProfileId' => $vetProfileId,
            'vetReviewStatus'        => 'PENDING',
            'vetReviewNote'          => null,
            'vetReviewedAt'          => null,
        ], false);

        Db::insert('Notification', [
            'userId'    => $vet['userId'],
            'type'      => 'preanalysis_shared',
            'title'     => 'Pré-analyse partagée',
            'body'      => $user['name'] . ' a partagé un résultat de pré-analyse IA avec vous.',
            'data'      => json_encode(['chatbotHistoryId' => $entry['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok(['id' => $entry['id'], 'shared' => true]);
    });

    /** File des pré-analyses partagées avec le vétérinaire connecté. */
    $r->get('/vets/me/shared-preanalyses', static function () use ($shapeHistory): void {
        $user = Auth::requireRole('VETERINAIRE');

        $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        if ($profile === null) {
            Http::ok([]);
        }

        $rows = Db::all(
            'SELECT h.*, eu.`name` AS eleveurName, eu.`id` AS eleveurId
             FROM `ChatbotHistory` h JOIN `User` eu ON eu.`id` = h.`userId`
             WHERE h.`sharedWithVetProfileId` = ? ORDER BY h.`createdAt` DESC LIMIT 100',
            [$profile['id']]
        );

        Http::ok(array_map(static function (array $h) use ($shapeHistory): array {
            return $shapeHistory($h) + ['eleveurName' => $h['eleveurName'], 'eleveurId' => $h['eleveurId']];
        }, $rows));
    });

    /**
     * Décision du vétérinaire sur une pré-analyse partagée : valider,
     * rejeter, et — si validée — rédiger directement une prescription sans
     * passer par un rendez-vous (la pré-analyse tient lieu de consultation
     * asynchrone dans ce flux).
     */
    $r->post('/ai/history/{id}/vet-review', static function (array $args): void {
        $user = Auth::requireRole('VETERINAIRE');

        $profile = Db::one('SELECT `id` FROM `VetProfile` WHERE `userId` = ?', [$user['id']]);
        $entry   = Db::one('SELECT * FROM `ChatbotHistory` WHERE `id` = ?', [$args['id']]);
        if ($profile === null || $entry === null || $entry['sharedWithVetProfileId'] !== $profile['id']) {
            Http::fail('Entrée introuvable.', 404, 'NOT_FOUND');
        }

        $decision = strtoupper((string) Http::input('decision', ''));
        if (!in_array($decision, ['VALIDATED', 'REJECTED'], true)) {
            Http::fail('Décision attendue : VALIDATED ou REJECTED.', 400);
        }
        $note = trim((string) Http::input('note', ''));

        Db::update('ChatbotHistory', $entry['id'], [
            'vetReviewStatus' => $decision,
            'vetReviewNote'   => $note !== '' ? $note : null,
            'vetReviewedAt'   => Db::now(),
        ], false);

        Db::insert('Notification', [
            'userId'    => $entry['userId'],
            'type'      => 'preanalysis_reviewed',
            'title'     => $decision === 'VALIDATED' ? 'Pré-analyse validée par votre vétérinaire' : 'Pré-analyse examinée par votre vétérinaire',
            'body'      => $note !== '' ? $note : ($decision === 'VALIDATED' ? 'Votre vétérinaire confirme cette orientation.' : "Votre vétérinaire recommande une consultation pour affiner l'analyse."),
            'data'      => json_encode(['chatbotHistoryId' => $entry['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok(['id' => $entry['id'], 'vetReviewStatus' => $decision]);
    });
};
