<?php

declare(strict_types=1);

/**
 * Client de la passerelle de paiement mobile money apisungku.
 *
 * apisungku relaie vers pawaPay et nous notifie par webhook signé (voir
 * routes/payments.php). Ce client ne fait qu'initier le dépôt ; il ne
 * connaît ni le statut final ni la logique métier qui en découle — la
 * transaction locale reste `PENDING` jusqu'au webhook.
 *
 * Issue indéterminée (timeout, 5xx) : on ne sait pas si l'argent a bougé,
 * la transaction reste `PENDING` chez nous comme chez apisungku, et sera
 * réconciliée par leur propre tâche cron.
 */
final class SungkuUnavailable extends RuntimeException
{
}

/** apisungku a répondu clairement en refusant la demande. */
final class SungkuRejected extends RuntimeException
{
    public function __construct(public readonly int $httpStatus, string $message)
    {
        parent::__construct($message);
    }
}

final class Sungku
{
    /**
     * @param array{amount:string,currency:string,phoneNumber:string,reference?:string,description?:string,customerMessage?:string,metadata?:array} $body
     * @throws SungkuUnavailable|SungkuRejected
     */
    public static function initiateDeposit(array $body): array
    {
        return self::request('POST', '/api/partners/deposits', $body);
    }

    private static function request(string $method, string $path, ?array $body = null): array
    {
        $apiKey = Config::sungkuApiKey();
        if ($apiKey === null || $apiKey === '') {
            throw new SungkuUnavailable('SUNGKU_API_KEY non configurée.');
        }

        $url     = Config::sungkuBaseUrl() . $path;
        $payload = $body === null ? null : json_encode($body, JSON_UNESCAPED_UNICODE);

        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'X-Api-Key: ' . $apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT_MS     => 15000,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        if ($payload !== null) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, $payload);
        }

        $raw    = curl_exec($curl);
        $erreur = curl_error($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        if ($raw === false) {
            throw new SungkuUnavailable("Appel $method $path interrompu avant réponse : $erreur");
        }

        $parsed = $raw === '' ? [] : (json_decode((string) $raw, true) ?? []);

        if ($status >= 500 || $status === 429) {
            throw new SungkuUnavailable("apisungku a répondu $status sur $method $path.");
        }
        if ($status < 200 || $status >= 300) {
            $message = is_array($parsed) ? (string) ($parsed['error'] ?? "HTTP $status") : "HTTP $status";
            throw new SungkuRejected($status, $message);
        }

        return is_array($parsed) ? $parsed : [];
    }

    /**
     * Vérifie la signature HMAC d'un webhook entrant apisungku.
     * Comparaison à temps constant ; refuse si le secret n'est pas configuré.
     */
    public static function verifyWebhookSignature(string $rawBody, string $timestamp, string $signatureHeader): bool
    {
        $secret = Config::sungkuWebhookSecret();
        if ($secret === null || $secret === '') {
            return false;
        }

        $expected = 'sha256=' . hash_hmac('sha256', "$timestamp.$rawBody", $secret);
        return hash_equals($expected, $signatureHeader);
    }
}
