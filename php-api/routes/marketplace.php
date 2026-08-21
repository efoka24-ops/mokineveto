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
        $sql    = 'SELECT * FROM `Product` WHERE `active` = 1';
        $params = [];

        $supplierId = Http::query('supplierId');
        if (is_string($supplierId) && $supplierId !== '') {
            $sql     .= ' AND `supplierId` = ?';
            $params[] = $supplierId;
        }

        $category = Http::query('category');
        if (is_string($category) && $category !== '') {
            $sql     .= ' AND `category` = ?';
            $params[] = $category;
        }

        Http::ok(array_map($shapeProduct, Db::all($sql . ' ORDER BY `name`', $params)));
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

    /** Changement d'état — réservé à l'administration. */
    $r->patch('/marketplace/orders/{id}', static function (array $args): void {
        Auth::requireRole('ADMIN');

        $status = strtoupper((string) Http::input('status', ''));
        if (!in_array($status, ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'], true)) {
            Http::fail('État de commande invalide.', 400);
        }

        $order = Db::one('SELECT * FROM `Order` WHERE `id` = ?', [$args['id']]);
        if ($order === null) {
            Http::fail('Commande introuvable.', 404, 'NOT_FOUND');
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
};
