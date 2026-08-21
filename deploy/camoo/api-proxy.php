<?php
/**
 * Relais HTTP vers l'API MokineVeto (Camoo, hébergement mutualisé).
 *
 * L'hébergement n'offre ni Passenger ni sélecteur Node.js : rien ne relie
 * nativement le serveur web à un processus Node. Ce contrôleur frontal reçoit
 * les requêtes publiques et les retransmet au processus Node qui écoute sur la
 * boucle locale.
 *
 * Limite connue et assumée : un relais PHP ne transporte pas les WebSockets.
 * socket.io doit être forcé en transport long-polling, ce qui dégrade le temps
 * réel sans le supprimer.
 *
 * Déposer ce fichier dans public_html/api/ avec le .htaccess fourni.
 */

declare(strict_types=1);

/** Port d'écoute du processus Node, aligné sur PORT dans mokineveto-api/.env */
const UPSTREAM = 'http://127.0.0.1:31380';

/** Au-delà, on considère l'API en panne plutôt que de laisser le client attendre. */
const TIMEOUT_SECONDS = 30;

// ─── Chemin demandé ────────────────────────────────────────────────────────
// .htaccess passe le chemin restant dans le paramètre `__path`.
$path = isset($_GET['__path']) ? '/' . ltrim((string) $_GET['__path'], '/') : '/';

$query = $_GET;
unset($query['__path']);
$queryString = $query ? '?' . http_build_query($query) : '';

$target = UPSTREAM . $path . $queryString;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ─── En-têtes entrants ─────────────────────────────────────────────────────
// Hôte et encodage sont recalculés par le transport : les retransmettre
// produirait des réponses incohérentes.
$skip = ['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding'];
$headers = [];

foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') !== 0) {
        continue;
    }
    $name = strtolower(str_replace('_', '-', substr($key, 5)));
    if (in_array($name, $skip, true)) {
        continue;
    }
    $headers[$name] = $value;
}

if (!empty($_SERVER['CONTENT_TYPE'])) {
    $headers['content-type'] = $_SERVER['CONTENT_TYPE'];
}

// Conserver l'adresse réelle du client : le backend journalise et limite le
// débit par origine, il ne doit pas voir l'adresse du relais.
$forwardedFor = $_SERVER['REMOTE_ADDR'] ?? '';
if ($forwardedFor !== '') {
    $existing = $headers['x-forwarded-for'] ?? '';
    $headers['x-forwarded-for'] = $existing !== '' ? $existing . ', ' . $forwardedFor : $forwardedFor;
}
$headers['x-forwarded-proto'] = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

$body = in_array($method, ['GET', 'HEAD'], true) ? null : file_get_contents('php://input');

// ─── Transmission ──────────────────────────────────────────────────────────

/** Envoie via cURL lorsque l'extension est disponible. */
function relayWithCurl(string $target, string $method, array $headers, ?string $body): array
{
    $ch = curl_init($target);
    $flat = [];
    foreach ($headers as $name => $value) {
        $flat[] = $name . ': ' . $value;
    }

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $flat,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER         => true,
        CURLOPT_TIMEOUT        => TIMEOUT_SECONDS,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    if ($body !== null && $body !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return ['error' => $err];
    }

    $status     = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    return [
        'status'  => $status,
        'headers' => substr($raw, 0, $headerSize),
        'body'    => substr($raw, $headerSize),
    ];
}

/** Repli sans cURL : contexte de flux, autorisé par allow_url_fopen. */
function relayWithStream(string $target, string $method, array $headers, ?string $body): array
{
    $flat = '';
    foreach ($headers as $name => $value) {
        $flat .= $name . ': ' . $value . "\r\n";
    }

    $context = stream_context_create([
        'http' => [
            'method'        => $method,
            'header'        => $flat,
            'content'       => $body ?? '',
            'timeout'       => TIMEOUT_SECONDS,
            'ignore_errors' => true,
        ],
    ]);

    $result = @file_get_contents($target, false, $context);
    if ($result === false) {
        return ['error' => 'connexion au processus API impossible'];
    }

    $status = 200;
    $raw    = '';
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
            $status = (int) $m[1];
            $raw    = '';
            continue;
        }
        $raw .= $line . "\r\n";
    }

    return ['status' => $status, 'headers' => $raw, 'body' => $result];
}

$response = function_exists('curl_init')
    ? relayWithCurl($target, $method, $headers, $body)
    : relayWithStream($target, $method, $headers, $body);

// ─── Réponse ───────────────────────────────────────────────────────────────

if (isset($response['error'])) {
    // Le processus Node ne répond pas. On renvoie un 503 explicite plutôt
    // qu'une erreur PHP : le client mobile sait présenter un service
    // indisponible, pas une trace serveur.
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Retry-After: 15');
    echo json_encode([
        'success' => false,
        'error'   => 'Service temporairement indisponible. Réessayez dans un instant.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($response['status']);

// Les en-têtes de transport appartiennent à la connexion PHP↔client : les
// recopier depuis l'amont produirait des réponses tronquées.
$dropped = ['transfer-encoding', 'connection', 'content-length', 'content-encoding', 'keep-alive'];

foreach (preg_split('/\r\n|\n/', (string) $response['headers']) as $line) {
    if (strpos($line, ':') === false) {
        continue;
    }
    [$name, $value] = explode(':', $line, 2);
    if (in_array(strtolower(trim($name)), $dropped, true)) {
        continue;
    }
    header(trim($name) . ': ' . trim($value), false);
}

echo $response['body'];
