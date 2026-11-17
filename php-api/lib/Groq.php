<?php

declare(strict_types=1);

/**
 * Client pour l'API Groq (https://console.groq.com), palier gratuit.
 *
 * Groq héberge des modèles ouverts (Llama, Mixtral) et expose une API
 * compatible avec le format OpenAI Chat Completions. PHP orchestre ici un
 * simple appel HTTP : aucune inférence ni GPU géré par cet hébergement.
 */
final class Groq
{
    private const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
    // Modèle « raisonneur » open source (OpenAI gpt-oss, hébergé par Groq) :
    // seul modèle texte disponible sur ce compte gratuit au moment de
    // l'intégration (vérifié via GET /openai/v1/models). Consomme des tokens
    // de raisonnement avant la réponse finale — d'où un budget élevé.
    private const MODEL = 'openai/gpt-oss-120b';

    /** Lève une exception si la clé est absente ou si l'appel échoue. */
    public static function chat(array $messages, float $temperature = 0.2, int $maxTokens = 1200): string
    {
        $apiKey = Config::groqApiKey();
        if ($apiKey === null) {
            throw new RuntimeException('GROQ_API_KEY absente.');
        }

        $ch = curl_init(self::ENDPOINT);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model'           => self::MODEL,
                'messages'        => $messages,
                'temperature'     => $temperature,
                'max_tokens'      => $maxTokens,
                'response_format' => ['type' => 'json_object'],
            ], JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 20,
        ]);

        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);

        if ($body === false || $error !== '') {
            throw new RuntimeException("Appel Groq impossible : $error");
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException("Groq a répondu $status : " . substr((string) $body, 0, 300));
        }

        $decoded = json_decode((string) $body, true);
        $content = $decoded['choices'][0]['message']['content'] ?? null;
        if (!is_string($content) || $content === '') {
            throw new RuntimeException('Réponse Groq vide ou mal formée.');
        }

        return $content;
    }
}
