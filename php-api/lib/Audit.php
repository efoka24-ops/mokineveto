<?php

declare(strict_types=1);

/**
 * Journal d'audit (SFD-ADMIN §16) — append-only : aucune route de
 * modification ou de suppression n'existe côté API pour cette table.
 */
final class Audit
{
    public static function log(
        string $action,
        string $resourceType,
        ?string $resourceId = null,
        mixed $before = null,
        mixed $after = null,
        ?string $justification = null
    ): void {
        $actor = Auth::user();
        $now   = Db::now();

        $valueBefore = $before !== null ? json_encode($before, JSON_UNESCAPED_UNICODE) : null;
        $valueAfter  = $after !== null ? json_encode($after, JSON_UNESCAPED_UNICODE) : null;

        // Chaînage SHA-256 : chaque entrée intègre le hash de la précédente,
        // rendant toute altération rétroactive détectable (SFD-ADMIN §16.1).
        // Ordonné par `seq` (auto-increment), pas par `createdAt` : l'horloge
        // de cet hébergement mutualisé a été observée en dérive (l'ordre
        // d'écriture réel, lui, est garanti par l'auto-increment MySQL).
        // `createdAt` est délibérément absent du hash : son aller-retour par
        // une colonne DATETIME(3) n'est pas garanti octet-pour-octet identique
        // à la chaîne PHP d'origine, et `id` (aléatoire) suffit déjà à rendre
        // chaque entrée unique dans la chaîne.
        // Verrou table le temps de lire le dernier hash et d'insérer le
        // suivant : deux requêtes concurrentes (ex. requête rejouée par un
        // proxy en amont) lisant le même "dernier hash" avant que l'une des
        // deux n'ait validé casseraient sinon la chaîne silencieusement.
        $pdo = Db::pdo();
        $pdo->exec('LOCK TABLES `AuditLog` WRITE');
        try {
            $id   = Id::generate();
            $prev = Db::one('SELECT `hash` FROM `AuditLog` ORDER BY `seq` DESC LIMIT 1')['hash'] ?? null;
            $hash = hash('sha256', implode('|', [
                $id, (string) ($actor['id'] ?? ''), $action, $resourceType,
                (string) $resourceId, (string) $valueBefore, (string) $valueAfter,
                (string) $justification, (string) $prev,
            ]));

            Db::insert('AuditLog', [
                'id'            => $id,
                'actorId'       => $actor['id'] ?? null,
                'actorName'     => $actor['name'] ?? null,
                'actorRole'     => $actor['role'] ?? null,
                'actorIp'       => Http::clientIp(),
                'action'        => $action,
                'resourceType'  => $resourceType,
                'resourceId'    => $resourceId,
                'valueBefore'   => $valueBefore,
                'valueAfter'    => $valueAfter,
                'justification' => $justification,
                'createdAt'     => $now,
                'hashPrevious'  => $prev,
                'hash'          => $hash,
            ], false);
        } finally {
            $pdo->exec('UNLOCK TABLES');
        }
    }

    /**
     * Recalcule la chaîne complète et compare au hash stocké. Renvoie la
     * première entrée altérée, ou null si la chaîne est intègre.
     */
    public static function verifyChain(): ?array
    {
        $rows = Db::all('SELECT * FROM `AuditLog` ORDER BY `seq` ASC');
        $prev = null;
        foreach ($rows as $row) {
            $expected = hash('sha256', implode('|', [
                $row['id'], (string) $row['actorId'], (string) $row['action'], (string) $row['resourceType'],
                (string) $row['resourceId'], (string) $row['valueBefore'], (string) $row['valueAfter'],
                (string) $row['justification'], (string) $prev,
            ]));
            if ($row['hashPrevious'] !== $prev || $row['hash'] !== $expected) {
                return ['id' => $row['id'], 'action' => $row['action'], 'createdAt' => $row['createdAt']];
            }
            $prev = $row['hash'];
        }
        return null;
    }
}
