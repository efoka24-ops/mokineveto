<?php

declare(strict_types=1);

/**
 * Migration à usage unique : ajout du rôle FOURNISSEUR et des colonnes
 * associées sur Supplier. Protégée par jeton, à supprimer après exécution.
 *
 *   POST /api/migrate_fournisseur.php?token=<jeton>
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Config.php';
require __DIR__ . '/lib/Db.php';

Config::load(__DIR__ . '/../.env');

$expected = Config::get('MIGRATE_TOKEN', '');
$provided = (string) ($_GET['token'] ?? '');

if ($expected === null || $expected === '' || !hash_equals($expected, $provided)) {
    Http::fail('Non autorisé.', 403);
}

$pdo = Db::pdo();
$done = [];

// 1) Rôle FOURNISSEUR sur User.role
$col = $pdo->query("SHOW COLUMNS FROM `User` LIKE 'role'")->fetch(PDO::FETCH_ASSOC);
if ($col !== false && !str_contains((string) $col['Type'], 'FOURNISSEUR')) {
    $pdo->exec("ALTER TABLE `User` MODIFY `role` ENUM('ELEVEUR', 'VETERINAIRE', 'FOURNISSEUR', 'ADMIN') NOT NULL");
    $done[] = 'User.role: FOURNISSEUR ajouté';
}

// 2) Colonnes Supplier
$existingCols = array_column($pdo->query('SHOW COLUMNS FROM `Supplier`')->fetchAll(PDO::FETCH_ASSOC), 'Field');

if (!in_array('userId', $existingCols, true)) {
    $pdo->exec("ALTER TABLE `Supplier` ADD COLUMN `userId` VARCHAR(191) NULL AFTER `id`");
    $pdo->exec("ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_key` (`userId`)");
    $done[] = 'Supplier.userId ajouté';
}
if (!in_array('address', $existingCols, true)) {
    $pdo->exec("ALTER TABLE `Supplier` ADD COLUMN `address` VARCHAR(255) NULL");
    $done[] = 'Supplier.address ajouté';
}
if (!in_array('schedule', $existingCols, true)) {
    $pdo->exec("ALTER TABLE `Supplier` ADD COLUMN `schedule` VARCHAR(191) NULL");
    $done[] = 'Supplier.schedule ajouté';
}
if (!in_array('logoUrl', $existingCols, true)) {
    $pdo->exec("ALTER TABLE `Supplier` ADD COLUMN `logoUrl` VARCHAR(191) NULL");
    $done[] = 'Supplier.logoUrl ajouté';
}

Http::ok(['status' => 'ok', 'changes' => $done]);
