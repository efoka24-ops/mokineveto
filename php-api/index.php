<?php

declare(strict_types=1);

/**
 * MokineVeto API — contrôleur frontal.
 *
 * Remplace le backend Node/Express sur l'hébergement mutualisé Camoo, qui ne
 * peut pas maintenir un processus long en vie. Le contrat HTTP est identique à
 * celui du backend remplacé — mêmes chemins, mêmes formats JSON — afin que
 * l'application mobile n'ait aucune modification à subir.
 *
 * Déploiement : ce répertoire est déposé dans `public_html/api/`, et le fichier
 * `.env` **au-dessus** de la racine web.
 */

// En production, une trace PHP renvoyée au client exposerait des chemins et des
// requêtes : on journalise sans jamais afficher.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Config.php';
require __DIR__ . '/lib/Id.php';
require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Jwt.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/Router.php';

// Le fichier d'environnement vit hors de la racine web : aucune URL ne peut
// l'atteindre, même en cas de mauvaise configuration d'Apache.
Config::load(dirname(__DIR__, 2) . '/mokineveto.env');

date_default_timezone_set('UTC');

// ─── En-têtes de sécurité (SFD §7.2) ───────────────────────────────────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header_remove('X-Powered-By');

// ─── CORS ──────────────────────────────────────────────────────────────────
// L'application mobile n'envoie pas d'origine ; le back-office web, si.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Max-Age: 86400');

if (Http::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Chemin demandé ────────────────────────────────────────────────────────
$path = (string) ($_GET['__path'] ?? '');
$path = '/' . trim($path, '/');
if ($path === '/') {
    $path = '/';
}

$router = new Router();

foreach (['auth', 'vets', 'farms', 'animals', 'alerts', 'notifications', 'credentials', 'weather'] as $group) {
    (require __DIR__ . "/routes/$group.php")($router);
}

// Sonde de disponibilité : utilisée par la supervision et par le diagnostic.
$router->get('/health', static function (): void {
    $db = 'down';
    try {
        Db::one('SELECT 1 AS ok');
        $db = 'up';
    } catch (Throwable) {
        // L'état dégradé est une information, pas une erreur à propager.
    }
    Http::ok(['status' => 'ok', 'database' => $db, 'time' => gmdate('c')]);
});

try {
    $router->dispatch(Http::method(), $path);
} catch (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Http::fail('Une erreur interne est survenue.', 500, 'INTERNAL_ERROR');
}
