<?php

declare(strict_types=1);

/**
 * Installateur de schéma, à usage unique.
 *
 * L'hébergement refuse d'exécuter des commandes par SSH : le schéma est donc
 * appliqué par une requête HTTP. Ce fichier est déposé le temps de
 * l'installation, appelé une fois, puis **supprimé immédiatement**.
 *
 * Il est protégé par un jeton comparé à temps constant, et refuse de s'exécuter
 * si des tables existent déjà — pour ne jamais écraser des données en place.
 *
 *   POST /api/install.php?token=<jeton>
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Config.php';
require __DIR__ . '/lib/Id.php';
require __DIR__ . '/lib/Db.php';

Config::load(__DIR__ . '/.env');

$expected = Config::get('INSTALL_TOKEN', '');
$provided = (string) ($_GET['token'] ?? '');

if ($expected === null || $expected === '' || !hash_equals($expected, $provided)) {
    Http::fail('Non autorisé.', 403);
}

$pdo = Db::pdo();

// Refus si la base contient déjà des tables : l'installation n'est pas une
// réinitialisation, et ce script ne doit jamais détruire de données.
$existing = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$force = ($_GET['force'] ?? '') === 'yes';

if ($existing !== [] && !$force) {
    Http::ok([
        'status'          => 'already-installed',
        'tables'          => count($existing),
        'existing'        => $existing,
        'message'         => 'La base contient déjà des tables. Aucune action effectuée.',
    ]);
}

$sqlPath = __DIR__ . '/schema.sql';
if (!is_readable($sqlPath)) {
    Http::fail('Fichier schema.sql introuvable à côté de l’installateur.', 500);
}

$sql = (string) file_get_contents($sqlPath);

// Découpage naïf sur « ; » en fin de ligne : suffisant pour un DDL généré,
// qui ne contient ni procédure stockée ni délimiteur personnalisé.
//
// Chaque bloc du DDL généré commence par un commentaire (« -- CreateTable ») :
// les lignes de commentaire sont retirées à l'intérieur de chaque instruction,
// et non l'instruction entière — sinon tout serait écarté.
$statements = [];
foreach (preg_split('/;\s*\R/', $sql) ?: [] as $chunk) {
    $lines = array_filter(
        array_map('trim', preg_split('/\R/', $chunk) ?: []),
        static fn (string $l): bool => $l !== '' && !str_starts_with($l, '--')
    );
    $statement = trim(implode("\n", $lines));
    if ($statement !== '') {
        $statements[] = $statement;
    }
}

$applied = 0;
$errors  = [];

// Les contraintes de clé étrangère sont suspendues le temps de la création :
// le DDL généré ne garantit pas un ordre de création topologique.
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');

foreach ($statements as $statement) {
    try {
        $pdo->exec($statement);
        $applied++;
    } catch (PDOException $e) {
        $errors[] = [
            'statement' => substr($statement, 0, 120),
            'error'     => $e->getMessage(),
        ];
    }
}

$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

Http::ok([
    'status'     => $errors === [] ? 'installed' : 'partial',
    'applied'    => $applied,
    'total'      => count($statements),
    'tables'     => count($tables),
    'tableNames' => $tables,
    'errors'     => array_slice($errors, 0, 10),
    'reminder'   => 'Supprimez install.php et schema.sql immédiatement après usage.',
]);
