/**
 * Marketplace API routes
 * - GET /marketplace/suppliers - list active suppliers
 * - GET /marketplace/products - list active products (filter by supplierId/category)
 * - POST /marketplace/orders - create order (PENDING, no payment yet)
 * - GET /marketplace/orders - list my orders
 *
 * Le paiement réel se fait ensuite via POST /payments/init-order (purpose ORDER),
 * exactement comme pour les rendez-vous (même flux Camoo).
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const marketplaceRouter = Router();

marketplaceRouter.get('/suppliers', async (req, res) => {
  try {
    const { region } = req.query;
    const suppliers = await prisma.supplier.findMany({
      where: { active: true, ...(region ? { region: region as any } : {}) },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list suppliers' });
  }
});

marketplaceRouter.get('/products', async (req, res) => {
  try {
    const { supplierId, category } = req.query;
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(supplierId ? { supplierId: supplierId as string } : {}),
        ...(category ? { category: category as string } : {}),
      },
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list products' });
  }
});

marketplaceRouter.post('/orders', requireAuth, async (req, res) => {
  const { supplierId, items } = req.body as { supplierId: string; items: { productId: string; qty: number }[] };

  try {
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields: supplierId, items' });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, supplierId, active: true },
    });

    if (products.length !== items.length) {
      return res.status(400).json({ success: false, error: 'One or more products are invalid or unavailable' });
    }

    const priceByProduct = new Map(products.map((p) => [p.id, p.price]));
    const totalAmount = items.reduce((sum, i) => sum + (priceByProduct.get(i.productId) ?? 0) * i.qty, 0);

    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        supplierId,
        status: 'PENDING',
        totalAmount,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            unitPrice: priceByProduct.get(i.productId)!,
          })),
        },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create order' });
  }
});

marketplaceRouter.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: { include: { product: true } }, supplier: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list orders' });
  }
});
