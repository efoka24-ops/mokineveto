<?php

declare(strict_types=1);

/**
 * Place de marché : fournisseurs, produits, commandes.
 *
 * Ce module ne figurait pas dans la SFD ; l'audit du design a établi qu'il est
 * bien au périmètre — l'écran « Producteur » comporte une catégorie « Marché »
 * et liste des fournisseurs. C'est la SFD qui reste à compléter.
 */

return static function (Router $r): void {

    $shapeSupplier = static fn (array $s): array => [
        'id'     => $s['id'],
        'name'   => $s['name'],
        'phone'  => $s['phone'],
        'region' => $s['region'],
        'active' => (bool) $s['active'],
    ];

    $shapeProduct = static fn (array $p): array => [
        'id'         => $p['id'],
        'supplierId' => $p['supplierId'],
        'name'       => $p['name'],
        'category'   => $p['category'],
        'price'      => (int) $p['price'],
        'unit'       => $p['unit'],
        'imageUrl'   => $p['imageUrl'],
        'active'     => (bool) $p['active'],
        'supplier'   => isset($p['supplierName']) ? ['id' => $p['supplierId'], 'name' => $p['supplierName']] : null,
    ];

    $r->get('/marketplace/suppliers', static function () use ($shapeSupplier): void {
        $sql    = 'SELECT * FROM `Supplier` WHERE `active` = 1';
        $params = [];

        $region = Http::query('region');
        if (is_string($region) && $region !== '') {
            $sql     .= ' AND (`region` = ? OR `region` IS NULL)';
            $params[] = $region;
        }

        Http::ok(array_map($shapeSupplier, Db::all($sql . ' ORDER BY `name`', $params)));
    });

    $r->get('/marketplace/products', static function () use ($shapeProduct): void {
        $sql    = 'SELECT p.*, s.`name` AS supplierName
                   FROM `Product` p JOIN `Supplier` s ON s.`id` = p.`supplierId`
                   WHERE p.`active` = 1';
        $params = [];

        $supplierId = Http::query('supplierId');
        if (is_string($supplierId) && $supplierId !== '') {
            $sql     .= ' AND p.`supplierId` = ?';
            $params[] = $supplierId;
        }

        $category = Http::query('category');
        if (is_string($category) && $category !== '') {
            $sql     .= ' AND p.`category` = ?';
            $params[] = $category;
        }

        Http::ok(array_map($shapeProduct, Db::all($sql . ' ORDER BY p.`name`', $params)));
    });

    $r->get('/marketplace/orders', static function (): void {
        $user = Auth::require();

        $orders = Db::all(
            'SELECT o.*, s.`name` AS supplierName
             FROM `Order` o JOIN `Supplier` s ON s.`id` = o.`supplierId`
             WHERE o.`userId` = ? ORDER BY o.`createdAt` DESC',
            [$user['id']]
        );
        if ($orders === []) {
            Http::ok([]);
        }

        $ids          = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $items = Db::all(
            "SELECT i.*, p.`name` AS productName, p.`unit`
             FROM `OrderItem` i JOIN `Product` p ON p.`id` = i.`productId`
             WHERE i.`orderId` IN ($placeholders)",
            $ids
        );

        $byOrder = [];
        foreach ($items as $it) {
            $byOrder[$it['orderId']][] = [
                'id'          => $it['id'],
                'productId'   => $it['productId'],
                'productName' => $it['productName'],
                'unit'        => $it['unit'],
                'qty'         => (int) $it['qty'],
                'unitPrice'   => (int) $it['unitPrice'],
            ];
        }

        Http::ok(array_map(static fn (array $o): array => [
            'id'           => $o['id'],
            'supplierId'   => $o['supplierId'],
            'supplierName' => $o['supplierName'],
            'status'       => $o['status'],
            'totalAmount'  => (int) $o['totalAmount'],
            'paymentId'    => $o['paymentId'],
            'createdAt'    => $o['createdAt'],
            'items'        => $byOrder[$o['id']] ?? [],
        ], $orders));
    });

    $r->post('/marketplace/orders', static function (): void {
        $user       = Auth::require();
        $supplierId = trim((string) Http::input('supplierId', ''));
        $items      = Http::input('items', []);

        if ($supplierId === '') {
            Http::fail('Fournisseur requis.', 400);
        }
        if (!is_array($items) || $items === []) {
            Http::fail('La commande est vide.', 400);
        }

        $supplier = Db::one('SELECT * FROM `Supplier` WHERE `id` = ? AND `active` = 1', [$supplierId]);
        if ($supplier === null) {
            Http::fail('Fournisseur introuvable.', 404, 'NOT_FOUND');
        }

        // Les prix sont relus en base : accepter ceux envoyés par le client
        // permettrait de commander à un tarif choisi par l'acheteur.
        $lines = [];
        $total = 0;

        foreach ($items as $item) {
            $productId = (string) ($item['productId'] ?? '');
            $qty       = (int) ($item['qty'] ?? 0);

            if ($productId === '' || $qty < 1) {
                Http::fail('Ligne de commande invalide.', 400);
            }

            $product = Db::one(
                'SELECT * FROM `Product` WHERE `id` = ? AND `active` = 1',
                [$productId]
            );
            if ($product === null) {
                Http::fail('Produit introuvable ou indisponible.', 404, 'NOT_FOUND');
            }
            if ($product['supplierId'] !== $supplierId) {
                Http::fail('Une commande ne peut porter que sur un seul fournisseur.', 400);
            }

            $unitPrice = (int) $product['price'];
            $total    += $unitPrice * $qty;
            $lines[]   = ['productId' => $productId, 'qty' => $qty, 'unitPrice' => $unitPrice];
        }

        $orderId = Db::insert('Order', [
            'userId'      => $user['id'],
            'supplierId'  => $supplierId,
            'status'      => 'PENDING',
            'totalAmount' => $total,
        ]);

        foreach ($lines as $line) {
            Db::insert('OrderItem', [
                'orderId'   => $orderId,
                'productId' => $line['productId'],
                'qty'       => $line['qty'],
                'unitPrice' => $line['unitPrice'],
            ], false);
        }

        Http::ok([
            'id'          => $orderId,
            'supplierId'  => $supplierId,
            'status'      => 'PENDING',
            'totalAmount' => $total,
            'items'       => $lines,
        ], 201);
    });

    /** Changement d'état — l'administration ou le fournisseur propriétaire de la commande. */
    $r->patch('/marketplace/orders/{id}', static function (array $args): void {
        $user = Auth::require();

        $status = strtoupper((string) Http::input('status', ''));
        if (!in_array($status, ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'], true)) {
            Http::fail('État de commande invalide.', 400);
        }

        $order = Db::one('SELECT * FROM `Order` WHERE `id` = ?', [$args['id']]);
        if ($order === null) {
            Http::fail('Commande introuvable.', 404, 'NOT_FOUND');
        }

        if ($user['role'] !== 'ADMIN') {
            $supplier = Db::one('SELECT `id` FROM `Supplier` WHERE `userId` = ?', [$user['id']]);
            if ($supplier === null || $supplier['id'] !== $order['supplierId']) {
                Http::fail('Accès refusé.', 403, 'FORBIDDEN');
            }
        }

        Db::update('Order', $order['id'], ['status' => $status]);

        Db::insert('Notification', [
            'userId'    => $order['userId'],
            'type'      => 'order_status',
            'title'     => 'Commande mise à jour',
            'body'      => 'Votre commande est désormais : ' . $status . '.',
            'data'      => json_encode(['orderId' => $order['id']], JSON_UNESCAPED_UNICODE),
            'createdAt' => Db::now(),
        ], false);

        Http::ok(['id' => $order['id'], 'status' => $status]);
    });

    // ─── Espace fournisseur (compte connecté, rôle FOURNISSEUR) ────────────
    /** Résout le Supplier lié à l'utilisateur connecté, ou refuse l'accès. */
    $requireSupplier = static function () use ($shapeSupplier): array {
        $user = Auth::requireRole('FOURNISSEUR');
        $supplier = Db::one('SELECT * FROM `Supplier` WHERE `userId` = ?', [$user['id']]);
        if ($supplier === null) {
            Http::fail('Profil fournisseur introuvable.', 404, 'NOT_FOUND');
        }
        return $supplier;
    };

    $r->get('/marketplace/me/supplier', static function () use ($requireSupplier, $shapeSupplier): void {
        Http::ok($shapeSupplier($requireSupplier()));
    });

    $r->patch('/marketplace/me/supplier', static function () use ($requireSupplier, $shapeSupplier): void {
        $supplier = $requireSupplier();
        $data = [];

        $name = Http::input('name');
        if (is_string($name) && trim($name) !== '') {
            $data['name'] = trim($name);
        }
        $address = Http::input('address');
        if (is_string($address)) {
            $data['address'] = trim($address) ?: null;
        }
        $schedule = Http::input('schedule');
        if (is_string($schedule)) {
            $data['schedule'] = trim($schedule) ?: null;
        }
        $logoUrl = Http::input('logoUrl');
        if (is_string($logoUrl) && filter_var($logoUrl, FILTER_VALIDATE_URL)) {
            $data['logoUrl'] = $logoUrl;
        }

        if ($data !== []) {
            Db::update('Supplier', $supplier['id'], $data);
        }

        $fresh = Db::one('SELECT * FROM `Supplier` WHERE `id` = ?', [$supplier['id']]);
        Http::ok($shapeSupplier($fresh));
    });

    $r->get('/marketplace/me/products', static function () use ($requireSupplier, $shapeProduct): void {
        $supplier = $requireSupplier();
        $products = Db::all(
            'SELECT * FROM `Product` WHERE `supplierId` = ? ORDER BY `name`',
            [$supplier['id']]
        );
        Http::ok(array_map($shapeProduct, $products));
    });

    $r->post('/marketplace/me/products', static function () use ($requireSupplier, $shapeProduct): void {
        $supplier = $requireSupplier();

        $name     = trim((string) Http::input('name', ''));
        $category = trim((string) Http::input('category', ''));
        $price    = (int) Http::input('price', 0);
        $unit     = trim((string) Http::input('unit', ''));

        if ($name === '' || $category === '' || $unit === '' || $price <= 0) {
            Http::fail('Nom, catégorie, unité et prix (positif) sont requis.', 400);
        }

        $productId = Db::insert('Product', [
            'supplierId' => $supplier['id'],
            'name'       => $name,
            'category'   => $category,
            'price'      => $price,
            'unit'       => $unit,
            'imageUrl'   => ((string) Http::input('imageUrl', '')) ?: null,
            'active'     => 1,
        ]);

        $product = Db::one('SELECT * FROM `Product` WHERE `id` = ?', [$productId]);
        Http::json(['success' => true, 'data' => $shapeProduct($product)], 201);
    });

    $r->patch('/marketplace/me/products/{id}', static function (array $args) use ($requireSupplier, $shapeProduct): void {
        $supplier = $requireSupplier();
        $product  = Db::one('SELECT * FROM `Product` WHERE `id` = ? AND `supplierId` = ?', [$args['id'], $supplier['id']]);
        if ($product === null) {
            Http::fail('Produit introuvable.', 404, 'NOT_FOUND');
        }

        $data = [];
        foreach (['name', 'category', 'unit', 'imageUrl'] as $field) {
            $value = Http::input($field);
            if (is_string($value) && trim($value) !== '') {
                $data[$field] = trim($value);
            }
        }
        $price = Http::input('price');
        if ($price !== null && (int) $price > 0) {
            $data['price'] = (int) $price;
        }
        $active = Http::input('active');
        if ($active !== null) {
            $data['active'] = $active ? 1 : 0;
        }

        if ($data !== []) {
            Db::update('Product', $product['id'], $data);
        }

        $fresh = Db::one(
            'SELECT p.*, s.`name` AS supplierName FROM `Product` p JOIN `Supplier` s ON s.`id` = p.`supplierId` WHERE p.`id` = ?',
            [$product['id']]
        );
        Http::ok($shapeProduct($fresh));
    });

    $r->delete('/marketplace/me/products/{id}', static function (array $args) use ($requireSupplier): void {
        $supplier = $requireSupplier();
        $product  = Db::one('SELECT `id` FROM `Product` WHERE `id` = ? AND `supplierId` = ?', [$args['id'], $supplier['id']]);
        if ($product === null) {
            Http::fail('Produit introuvable.', 404, 'NOT_FOUND');
        }
        // Désactivation plutôt que suppression : préserve l'historique des
        // commandes déjà passées, qui référencent ce produit.
        Db::update('Product', $product['id'], ['active' => 0]);
        Http::ok(['id' => $product['id'], 'active' => false]);
    });

    $r->get('/marketplace/me/orders', static function () use ($requireSupplier): void {
        $supplier = $requireSupplier();

        $orders = Db::all(
            'SELECT o.*, u.`name` AS buyerName, u.`phone` AS buyerPhone
             FROM `Order` o JOIN `User` u ON u.`id` = o.`userId`
             WHERE o.`supplierId` = ? ORDER BY o.`createdAt` DESC',
            [$supplier['id']]
        );
        if ($orders === []) {
            Http::ok([]);
        }

        $ids          = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $items = Db::all(
            "SELECT i.*, p.`name` AS productName, p.`unit`
             FROM `OrderItem` i JOIN `Product` p ON p.`id` = i.`productId`
             WHERE i.`orderId` IN ($placeholders)",
            $ids
        );

        $byOrder = [];
        foreach ($items as $it) {
            $byOrder[$it['orderId']][] = [
                'id'          => $it['id'],
                'productId'   => $it['productId'],
                'productName' => $it['productName'],
                'unit'        => $it['unit'],
                'qty'         => (int) $it['qty'],
                'unitPrice'   => (int) $it['unitPrice'],
            ];
        }

        Http::ok(array_map(static fn (array $o): array => [
            'id'          => $o['id'],
            'buyerName'   => $o['buyerName'],
            'buyerPhone'  => $o['buyerPhone'],
            'status'      => $o['status'],
            'totalAmount' => (int) $o['totalAmount'],
            'createdAt'   => $o['createdAt'],
            'items'       => $byOrder[$o['id']] ?? [],
        ], $orders));
    });
};
