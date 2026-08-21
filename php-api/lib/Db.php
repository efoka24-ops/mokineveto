<?php

declare(strict_types=1);

/**
 * Accès à la base MySQL.
 *
 * Toutes les requêtes passent par des instructions préparées : aucune valeur
 * fournie par l'utilisateur n'est concaténée dans du SQL (SFD §7.2).
 */
final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $cfg = Config::db();

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $cfg['host'],
            $cfg['port'],
            $cfg['name']
        );

        try {
            self::$pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Instructions réellement préparées côté serveur, et non
                // émulées : l'émulation réintroduit un risque d'injection.
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            error_log('[db] connexion impossible : ' . $e->getMessage());
            Http::fail('Service temporairement indisponible.', 503);
        }

        return self::$pdo;
    }

    /** @param array<string|int, mixed> $params */
    public static function run(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /** @return array<string, mixed>|null */
    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    /** @return list<array<string, mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    /**
     * Insère une ligne et renvoie son identifiant.
     * `createdAt` et `updatedAt` sont renseignés ici pour rester cohérents avec
     * le comportement de l'ORM remplacé.
     */
    public static function insert(string $table, array $data, bool $timestamps = true): string
    {
        $data['id'] ??= Id::generate();

        if ($timestamps) {
            $now = self::now();
            $data['createdAt'] ??= $now;
            $data['updatedAt'] ??= $now;
        }

        $columns = array_keys($data);
        $sql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $table,
            '`' . implode('`, `', $columns) . '`',
            implode(', ', array_map(static fn (string $c): string => ':' . $c, $columns))
        );

        self::run($sql, $data);
        return (string) $data['id'];
    }

    public static function update(string $table, string $id, array $data, bool $timestamps = true): void
    {
        if ($data === []) {
            return;
        }
        if ($timestamps) {
            $data['updatedAt'] = self::now();
        }

        $sets = implode(', ', array_map(static fn (string $c): string => "`$c` = :$c", array_keys($data)));
        $data['__id'] = $id;

        self::run("UPDATE `$table` SET $sets WHERE `id` = :__id", $data);
    }

    /** Horodatage au format DATETIME(3), comme les colonnes générées. */
    public static function now(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.v');
    }
}
