<?php

declare(strict_types=1);

/**
 * Fiches pathologiques (SFD §4.4.4).
 *
 * Base de connaissances consultable, alimentant l'assistant de pré-analyse.
 * Le détail complet — observations de terrain, prévention, informations
 * vétérinaires — est réservé aux fiches débloquées ; la description reste
 * toujours accessible pour que l'éleveur sache de quoi il s'agit avant de payer.
 */

return static function (Router $r): void {

    /** Décode la liste d'espèces, stockée en JSON depuis le passage à MySQL. */
    $species = static function (mixed $raw): array {
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    };

    $summary = static fn (array $f, bool $unlocked) => [
        'id'          => $f['id'],
        'name'        => $f['name'],
        'species'     => $f['speciesList'],
        'contagious'  => (bool) $f['contagious'],
        'description' => $f['description'],
        'status'      => $f['status'] ?? 'ACTIVE',
        'unlocked'    => $unlocked,
    ];

    $r->get('/fiches', static function () use ($species, $summary): void {
        $user = Auth::user();

        // Une fiche archivée reste consultable par qui a le droit de gérer la
        // base (admin/vétérinaire), mais n'est plus servie au fil normal
        // (chatbot, éleveur) — elle a été remplacée ou jugée obsolète.
        $canSeeArchived = $user !== null && in_array($user['role'], ['ADMIN', 'VETERINAIRE'], true);

        $sql    = 'SELECT * FROM `Fiche`';
        $where  = $canSeeArchived ? [] : ["`status` = 'ACTIVE'"];
        $params = [];

        $search = Http::query('q');
        if (is_string($search) && trim($search) !== '') {
            $where[]  = '`name` LIKE ?';
            $params[] = '%' . trim($search) . '%';
        }
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $rows = Db::all($sql . ' ORDER BY `name` ASC', $params);

        // Les déblocages sont chargés en une fois plutôt qu'une requête par fiche.
        $unlocked = [];
        if ($user !== null) {
            $unlocked = array_flip(array_column(
                Db::all('SELECT `ficheId` FROM `FicheUnlock` WHERE `userId` = ?', [$user['id']]),
                'ficheId'
            ));
        }

        Http::ok(array_map(static function (array $f) use ($species, $summary, $unlocked): array {
            $f['speciesList'] = $species($f['species']);
            return $summary($f, isset($unlocked[$f['id']]));
        }, $rows));
    });

    // ─── Export / Import en lot (SFD-ADMIN §4.1.2) ──────────────────────────
    // Enregistré avant `/fiches/{id}` : un routeur qui matche dans l'ordre
    // d'enregistrement traiterait sinon "export" comme un identifiant de fiche.

    $EXPORT_FIELDS = [
        'name', 'nameEn', 'nameRw', 'oieCode', 'species', 'contagious', 'description',
        'fieldObs', 'prevention', 'vetInfo', 'transmissionMode', 'incubationPeriod',
        'mortalityRate', 'vaccinesAvailable', 'withdrawalPeriodDays', 'sources', 'status',
    ];

    $r->get('/fiches/export', static function () use ($EXPORT_FIELDS): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $rows   = Db::all('SELECT * FROM `Fiche` ORDER BY `name` ASC');
        $format = (string) Http::query('format', 'json');

        $shaped = array_map(static function (array $f) use ($EXPORT_FIELDS): array {
            $out = [];
            foreach ($EXPORT_FIELDS as $field) {
                $out[$field] = $f[$field];
            }
            return $out;
        }, $rows);

        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="fiches-mokineveto.csv"');
            $out = fopen('php://output', 'w');
            fputcsv($out, $EXPORT_FIELDS);
            foreach ($shaped as $row) {
                fputcsv($out, array_map(static fn ($v): string => (string) $v, $row));
            }
            fclose($out);
            exit;
        }

        Http::ok($shaped);
    });

    /**
     * Import en lot depuis un tableau JSON (même structure qu'à l'export) ou
     * un CSV déjà parsé côté client. Chaque ligne valide devient une nouvelle
     * fiche ; une ligne sans nom est ignorée plutôt que de faire échouer tout
     * le lot.
     */
    $r->post('/fiches/import', static function (): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $rows = Http::input('rows', []);
        if (!is_array($rows) || $rows === []) {
            Http::fail('Aucune ligne à importer.', 400);
        }

        $imported = 0;
        $skipped  = 0;
        foreach ($rows as $row) {
            if (!is_array($row) || trim((string) ($row['name'] ?? '')) === '') {
                $skipped++;
                continue;
            }

            $speciesList = $row['species'] ?? [];
            if (is_string($speciesList)) {
                $speciesList = array_values(array_filter(array_map('trim', explode(',', $speciesList))));
            }
            if (!is_array($speciesList)) {
                $speciesList = [];
            }

            Db::insert('Fiche', [
                'name'                 => trim((string) $row['name']),
                'nameEn'               => ((string) ($row['nameEn'] ?? '')) ?: null,
                'nameRw'               => ((string) ($row['nameRw'] ?? '')) ?: null,
                'oieCode'              => ((string) ($row['oieCode'] ?? '')) ?: null,
                'species'              => json_encode(array_values($speciesList), JSON_UNESCAPED_UNICODE),
                'contagious'           => !empty($row['contagious']) ? 1 : 0,
                'description'          => (string) ($row['description'] ?? ''),
                'fieldObs'             => (string) ($row['fieldObs'] ?? ''),
                'prevention'           => (string) ($row['prevention'] ?? ''),
                'vetInfo'              => (string) ($row['vetInfo'] ?? ''),
                'transmissionMode'     => ((string) ($row['transmissionMode'] ?? '')) ?: null,
                'incubationPeriod'     => ((string) ($row['incubationPeriod'] ?? '')) ?: null,
                'mortalityRate'        => ((string) ($row['mortalityRate'] ?? '')) ?: null,
                'vaccinesAvailable'    => ((string) ($row['vaccinesAvailable'] ?? '')) ?: null,
                'withdrawalPeriodDays' => isset($row['withdrawalPeriodDays']) && $row['withdrawalPeriodDays'] !== '' ? (int) $row['withdrawalPeriodDays'] : null,
                'sources'              => ((string) ($row['sources'] ?? '')) ?: null,
                'status'               => 'ACTIVE',
                'version'              => 1,
            ]);
            $imported++;
        }

        Http::ok(['imported' => $imported, 'skipped' => $skipped]);
    });

    /**
     * Détection de doublons (SFD-ADMIN §4.1.2). Sans modèle d'embeddings
     * disponible sur cet hébergement, la « similarité cosinus » demandée est
     * approximée par un indice de Jaccard sur les mots du nom — moins fin
     * qu'un vrai embedding sémantique, mais honnête sur ce qu'il mesure
     * réellement (chevauchement lexical, pas de sens).
     */
    $r->get('/fiches/duplicates', static function (): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $rows = Db::all("SELECT `id`, `name` FROM `Fiche` WHERE `status` = 'ACTIVE'");
        $tokenize = static fn (string $s): array => array_values(array_unique(array_filter(
            preg_split('/[^\p{L}0-9]+/u', mb_strtolower($s)) ?: []
        )));

        $pairs = [];
        $n = count($rows);
        for ($i = 0; $i < $n; $i++) {
            $a = $tokenize($rows[$i]['name']);
            if ($a === []) {
                continue;
            }
            for ($j = $i + 1; $j < $n; $j++) {
                $b = $tokenize($rows[$j]['name']);
                if ($b === []) {
                    continue;
                }
                $intersection = count(array_intersect($a, $b));
                $union        = count(array_unique(array_merge($a, $b)));
                $similarity   = $union > 0 ? $intersection / $union : 0;
                if ($similarity >= 0.6) {
                    $pairs[] = [
                        'a'          => $rows[$i],
                        'b'          => $rows[$j],
                        'similarity' => round($similarity, 2),
                    ];
                }
            }
        }

        usort($pairs, static fn (array $x, array $y): int => $y['similarity'] <=> $x['similarity']);

        Http::ok($pairs);
    });

    // ─── Q&A vétérinaire (SFD-ADMIN §4.1.1) ──────────────────────────────────

    $shapeQnA = static fn (array $q): array => [
        'id'         => $q['id'],
        'questionFr' => $q['questionFr'],
        'questionEn' => $q['questionEn'],
        'questionRw' => $q['questionRw'],
        'answer'     => $q['answer'],
        'tags'       => json_decode((string) $q['tags'], true) ?: [],
        'usageCount' => (int) $q['usageCount'],
        'active'     => (bool) $q['active'],
        'createdAt'  => $q['createdAt'],
    ];

    $r->get('/fiches/qna', static function () use ($shapeQnA): void {
        $user = Auth::user();
        $onlyActive = $user === null || !in_array($user['role'], ['ADMIN', 'VETERINAIRE'], true);

        $sql = 'SELECT * FROM `KnowledgeQnA`' . ($onlyActive ? " WHERE `active` = 1" : '') . ' ORDER BY `usageCount` DESC, `createdAt` DESC';
        Http::ok(array_map($shapeQnA, Db::all($sql)));
    });

    $r->post('/fiches/qna', static function () use ($shapeQnA): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $questionFr = trim((string) Http::input('questionFr', ''));
        $answer     = trim((string) Http::input('answer', ''));
        if ($questionFr === '' || $answer === '') {
            Http::fail('La question (français) et la réponse sont requises.', 400);
        }

        $tags = Http::input('tags', []);
        if (!is_array($tags)) {
            $tags = [];
        }

        $id = Db::insert('KnowledgeQnA', [
            'questionFr' => $questionFr,
            'questionEn' => ((string) Http::input('questionEn', '')) ?: null,
            'questionRw' => ((string) Http::input('questionRw', '')) ?: null,
            'answer'     => $answer,
            'tags'       => json_encode(array_values($tags), JSON_UNESCAPED_UNICODE),
            'active'     => 1,
        ]);

        Http::ok($shapeQnA(Db::one('SELECT * FROM `KnowledgeQnA` WHERE `id` = ?', [$id])), 201);
    });

    $r->patch('/fiches/qna/{id}', static function (array $args) use ($shapeQnA): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $qna = Db::one('SELECT `id` FROM `KnowledgeQnA` WHERE `id` = ?', [$args['id']]);
        if ($qna === null) {
            Http::fail('Q&A introuvable.', 404, 'NOT_FOUND');
        }

        $patch = [];
        foreach (['questionFr', 'questionEn', 'questionRw', 'answer'] as $field) {
            $value = Http::input($field);
            if (is_string($value) && $value !== '') {
                $patch[$field] = $value;
            }
        }
        if (Http::input('tags') !== null && is_array(Http::input('tags'))) {
            $patch['tags'] = json_encode(array_values(Http::input('tags')), JSON_UNESCAPED_UNICODE);
        }
        if (Http::input('active') !== null) {
            $patch['active'] = Http::input('active') ? 1 : 0;
        }

        if ($patch !== []) {
            Db::update('KnowledgeQnA', $qna['id'], $patch);
        }

        Http::ok($shapeQnA(Db::one('SELECT * FROM `KnowledgeQnA` WHERE `id` = ?', [$qna['id']])));
    });

    $r->delete('/fiches/qna/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $qna = Db::one('SELECT `id` FROM `KnowledgeQnA` WHERE `id` = ?', [$args['id']]);
        if ($qna === null) {
            Http::fail('Q&A introuvable.', 404, 'NOT_FOUND');
        }

        Db::run('DELETE FROM `KnowledgeQnA` WHERE `id` = ?', [$qna['id']]);
        Http::ok(['id' => $qna['id'], 'deleted' => true]);
    });

    $r->get('/fiches/{id}', static function (array $args) use ($species): void {
        $user  = Auth::user();
        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$args['id']]);

        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        // Un vétérinaire ou un administrateur peut créer et modifier les
        // fiches : leur faire payer l'accès à la base qu'ils alimentent
        // eux-mêmes n'aurait pas de sens. Le paiement ne s'applique qu'à
        // l'éleveur, seul profil qui consomme la fiche sans y contribuer.
        $isUnlocked = false;
        if ($user !== null) {
            $isUnlocked = in_array($user['role'], ['ADMIN', 'VETERINAIRE'], true)
                || Db::one(
                    'SELECT `id` FROM `FicheUnlock` WHERE `userId` = ? AND `ficheId` = ?',
                    [$user['id'], $fiche['id']]
                ) !== null;
        }

        $payload = [
            'id'          => $fiche['id'],
            'name'        => $fiche['name'],
            'species'     => $species($fiche['species']),
            'contagious'  => (bool) $fiche['contagious'],
            'description' => $fiche['description'],
            'status'      => $fiche['status'],
            'unlocked'    => $isUnlocked,
        ];

        // Le contenu approfondi n'est joint que si la fiche est débloquée.
        if ($isUnlocked) {
            $payload['fieldObs']             = $fiche['fieldObs'];
            $payload['prevention']           = $fiche['prevention'];
            $payload['vetInfo']              = $fiche['vetInfo'];
            $payload['nameEn']               = $fiche['nameEn'];
            $payload['nameRw']               = $fiche['nameRw'];
            $payload['oieCode']              = $fiche['oieCode'];
            $payload['transmissionMode']     = $fiche['transmissionMode'];
            $payload['incubationPeriod']     = $fiche['incubationPeriod'];
            $payload['mortalityRate']        = $fiche['mortalityRate'];
            $payload['vaccinesAvailable']    = $fiche['vaccinesAvailable'];
            $payload['withdrawalPeriodDays'] = $fiche['withdrawalPeriodDays'] !== null ? (int) $fiche['withdrawalPeriodDays'] : null;
            $payload['sources']              = $fiche['sources'];
            $payload['version']              = (int) $fiche['version'];
        }

        Http::ok($payload);
    });

    /**
     * Création, modification et suppression : administration ou vétérinaire
     * (SFD §4.4.4). Un praticien connaît le terrain aussi bien qu'un admin ;
     * rien ne justifie de le limiter à la seule consultation.
     */
    $r->post('/fiches', static function () use ($species): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $name = trim((string) Http::input('name', ''));
        if ($name === '') {
            Http::fail('Le nom de la pathologie est requis.', 400);
        }

        $list = Http::input('species', []);
        if (!is_array($list)) {
            $list = [];
        }

        $id = Db::insert('Fiche', [
            'name'                 => $name,
            'nameEn'               => ((string) Http::input('nameEn', '')) ?: null,
            'nameRw'               => ((string) Http::input('nameRw', '')) ?: null,
            'oieCode'              => ((string) Http::input('oieCode', '')) ?: null,
            'species'              => json_encode(array_values($list), JSON_UNESCAPED_UNICODE),
            'contagious'           => Http::input('contagious') ? 1 : 0,
            'description'          => (string) Http::input('description', ''),
            'fieldObs'             => (string) Http::input('fieldObs', ''),
            'prevention'           => (string) Http::input('prevention', ''),
            'vetInfo'              => (string) Http::input('vetInfo', ''),
            'transmissionMode'     => ((string) Http::input('transmissionMode', '')) ?: null,
            'incubationPeriod'     => ((string) Http::input('incubationPeriod', '')) ?: null,
            'mortalityRate'        => ((string) Http::input('mortalityRate', '')) ?: null,
            'vaccinesAvailable'    => ((string) Http::input('vaccinesAvailable', '')) ?: null,
            'withdrawalPeriodDays' => Http::input('withdrawalPeriodDays') !== null ? (int) Http::input('withdrawalPeriodDays') : null,
            'sources'              => ((string) Http::input('sources', '')) ?: null,
            'status'               => 'ACTIVE',
            'version'              => 1,
        ]);

        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$id]);
        Http::ok([
            'id'      => $fiche['id'],
            'name'    => $fiche['name'],
            'species' => $species($fiche['species']),
        ], 201);
    });

    $r->patch('/fiches/{id}', static function (array $args): void {
        $user = Auth::requireRole('ADMIN', 'VETERINAIRE');

        $fiche = Db::one('SELECT * FROM `Fiche` WHERE `id` = ?', [$args['id']]);
        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        $data = [];
        foreach ([
            'name', 'nameEn', 'nameRw', 'oieCode', 'description', 'fieldObs', 'prevention', 'vetInfo',
            'transmissionMode', 'incubationPeriod', 'mortalityRate', 'vaccinesAvailable', 'sources',
        ] as $field) {
            $value = Http::input($field);
            if (is_string($value) && $value !== '') {
                $data[$field] = $value;
            }
        }
        if (Http::input('withdrawalPeriodDays') !== null) {
            $data['withdrawalPeriodDays'] = (int) Http::input('withdrawalPeriodDays');
        }
        if (Http::input('contagious') !== null) {
            $data['contagious'] = Http::input('contagious') ? 1 : 0;
        }
        $list = Http::input('species');
        if (is_array($list)) {
            $data['species'] = json_encode(array_values($list), JSON_UNESCAPED_UNICODE);
        }

        if ($data === []) {
            Http::ok(['updated' => false]);
        }

        // Versionnage (SFD-ADMIN §4.1.2) : l'état précédent est archivé avant
        // d'appliquer la modification, jamais après — une écriture qui
        // échouerait en cours de route ne doit jamais laisser une version
        // fantôme sans fiche correspondante.
        Db::insert('FicheVersion', [
            'ficheId'        => $fiche['id'],
            'version'        => (int) $fiche['version'],
            'snapshot'       => json_encode($fiche, JSON_UNESCAPED_UNICODE),
            'editedByUserId' => $user['id'],
            'editedByName'   => $user['name'],
        ], false);

        $data['version'] = (int) $fiche['version'] + 1;

        Db::update('Fiche', $args['id'], $data);
        Http::ok(['updated' => true, 'version' => $data['version']]);
    });

    /** Archivage / désarchivage (SFD-ADMIN §4.1.2) : retire une fiche du fil normal sans la supprimer. */
    $r->patch('/fiches/{id}/status', static function (array $args): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $fiche = Db::one('SELECT `id`, `status` FROM `Fiche` WHERE `id` = ?', [$args['id']]);
        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        $status = strtoupper((string) Http::input('status', ''));
        if (!in_array($status, ['ACTIVE', 'ARCHIVED'], true)) {
            Http::fail('Statut attendu : ACTIVE ou ARCHIVED.', 400);
        }

        Db::update('Fiche', $fiche['id'], ['status' => $status]);
        Http::ok(['id' => $fiche['id'], 'status' => $status]);
    });

    /** Historique des versions d'une fiche (SFD-ADMIN §4.1.2). */
    $r->get('/fiches/{id}/versions', static function (array $args): void {
        Auth::requireRole('ADMIN', 'VETERINAIRE');

        $versions = Db::all(
            'SELECT `id`, `version`, `snapshot`, `editedByName`, `createdAt`
             FROM `FicheVersion` WHERE `ficheId` = ? ORDER BY `version` DESC',
            [$args['id']]
        );

        Http::ok(array_map(static fn (array $v): array => [
            'id'           => $v['id'],
            'version'      => (int) $v['version'],
            'snapshot'     => json_decode((string) $v['snapshot'], true),
            'editedByName' => $v['editedByName'],
            'createdAt'    => $v['createdAt'],
        ], $versions));
    });

    /** Suppression réservée à l'administration : un vétérinaire peut alimenter
     * la base, pas en retirer le travail d'un autre praticien. */
    $r->delete('/fiches/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $fiche = Db::one('SELECT `id` FROM `Fiche` WHERE `id` = ?', [$args['id']]);
        if ($fiche === null) {
            Http::fail('Fiche introuvable.', 404, 'NOT_FOUND');
        }

        // Une fiche débloquée par un éleveur reste facturée : on supprime la
        // fiche, pas l'historique des déblocages qui la référence.
        Db::run('DELETE FROM `Fiche` WHERE `id` = ?', [$fiche['id']]);

        Http::ok(['id' => $fiche['id'], 'deleted' => true]);
    });
};
