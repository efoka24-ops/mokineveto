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
 * Déploiement : ce répertoire EST la racine du sous-domaine
 * `mokineveto-app.trugroup.cm` (répertoire `mokineveto-app` du compte). Les
 * chemins publics sont donc `/health`, `/auth/login`… sans préfixe.
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

// Le fichier d'environnement.
//
// L'idéal serait de le placer au-dessus de la racine web. Ce n'est pas possible
// ici : le compte FTP est enraciné SUR `public_html`, il n'existe aucun
// répertoire accessible au-dessus. Le fichier vit donc dans le répertoire de
// l'application, et sa protection repose sur les règles de refus du .htaccess.
//
// Risque résiduel assumé : si le .htaccess venait à être ignoré, les
// identifiants seraient exposés. À corriger dès que le compte disposera d'un
// répertoire hors racine web (VPS, ou compte non enraciné sur public_html).
Config::load(__DIR__ . '/.env');

date_default_timezone_set('UTC');

// ─── En-têtes de sécurité (SFD §7.2) ───────────────────────────────────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header_remove('X-Powered-By');

// ─── CORS ──────────────────────────────────────────────────────────────────
// L'application mobile n'envoie pas d'origine ; le back-office web, si.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Max-Age: 86400');

if (Http::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Surcharge de méthode.
 *
 * L'hébergement bloque PATCH, PUT et DELETE au niveau du serveur web : la
 * requête est rejetée en 403 avant d'atteindre PHP. Le client envoie donc un
 * POST portant l'en-tête `X-HTTP-Method-Override`, et l'API rétablit ici la
 * méthode réelle. Le contrat REST est préservé côté application.
 *
 * La surcharge n'est acceptée que sur un POST : l'autoriser sur un GET
 * permettrait de déclencher une écriture depuis un simple lien.
 */
$method = Http::method();
if ($method === 'POST') {
    $override = strtoupper((string) (Http::header('X-HTTP-Method-Override') ?? $_GET['_method'] ?? ''));
    if (in_array($override, ['PATCH', 'PUT', 'DELETE'], true)) {
        $method = $override;
    }
}

// ─── Chemin demandé ────────────────────────────────────────────────────────
$path = (string) ($_GET['__path'] ?? '');
$path = '/' . trim($path, '/');
if ($path === '/') {
    $path = '/';
}

$router = new Router();

foreach (['auth', 'vets', 'farms', 'animals', 'appointments', 'chat', 'alerts', 'notifications', 'credentials', 'weather'] as $group) {
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
    $router->dispatch($method, $path);
} catch (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Http::fail('Une erreur interne est survenue.', 500, 'INTERNAL_ERROR');
}
