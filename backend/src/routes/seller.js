import { Router } from 'express'
import {
  HttpError, TRANSITIONS, assertOwnImages, createNotification, loadOrders, now, productById,
  refreshOrderStatus, startOfDayWAT, startOfMonthWAT, statusLabels, toShop, uid,
} from '../lib.js'
import { productSchema, shopSchema, statusSchema } from '../schemas.js'
import { requireSeller } from '../middleware.js'

/** POST /seller/shop : ouvert à tout utilisateur connecté (il devient vendeur). */
export function shopRoutes({ db }) {
  const r = Router()
  r.post('/seller/shop', async (req, res) => {
    if (req.user.shop) throw new HttpError(409, 'Vous avez déjà une boutique.')
    const b = shopSchema.parse(req.body)
    const id = uid()
    await db.transaction(async (tx) => {
      // « verified » n'est jamais modifiable par l'utilisateur.
      await tx.run(
        'INSERT INTO shops (id, owner_id, name, city, phone, description, verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, false, $7)',
        [id, req.user.id, b.name, b.city, b.phone, b.description ?? null, now()]
      )
      await tx.run("UPDATE users SET role = 'seller' WHERE id = $1", [req.user.id])
    })
    res.status(201).json(toShop(await db.one('SELECT * FROM shops WHERE id = $1', [id])))
  })
  return r
}

export function sellerRoutes({ db, config }) {
  const r = Router()
  r.use('/seller', requireSeller)
  // Boutique suspendue par l'équipe : le vendeur peut consulter mais plus modifier
  r.use('/seller', (req, _res, next) => {
    if (req.method !== 'GET' && req.user.shop.suspended) {
      throw new HttpError(403, 'Votre boutique est suspendue : modifications impossibles. Contactez le support Selline.')
    }
    next()
  })

  async function checkCategory(categoryId) {
    if (categoryId && !(await db.one('SELECT 1 FROM categories WHERE id = $1', [categoryId]))) throw new HttpError(400, 'Catégorie invalide.')
  }
  async function saveImages(tx, productId, urls) {
    await tx.run('DELETE FROM product_images WHERE product_id = $1', [productId])
    for (let i = 0; i < urls.length; i++) {
      await tx.run('INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)', [productId, urls[i], i])
    }
  }
  const ownProduct = async (req) => {
    const p = await db.one('SELECT id FROM products WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shop.id])
    if (!p) throw new HttpError(404, 'Produit introuvable.')
    return p
  }

  r.get('/seller/stats', async (req, res) => {
    const shopId = req.user.shop.id
    const [ordersToday, revenueMonth, activeProducts, pendingOrders] = await Promise.all([
      db.one('SELECT COUNT(*) AS n FROM order_shops os JOIN orders o ON o.id = os.order_id WHERE os.shop_id = $1 AND o.created_at >= $2', [shopId, startOfDayWAT()]),
      db.one(`SELECT COALESCE(SUM(i.price * i.qty), 0) AS n FROM order_items i
              JOIN order_shops os ON os.order_id = i.order_id AND os.shop_id = i.shop_id
              JOIN orders o ON o.id = i.order_id
              WHERE i.shop_id = $1 AND os.status != 'cancelled' AND o.created_at >= $2`, [shopId, startOfMonthWAT()]),
      db.one('SELECT COUNT(*) AS n FROM products WHERE shop_id = $1', [shopId]),
      db.one("SELECT COUNT(*) AS n FROM order_shops WHERE shop_id = $1 AND status = 'pending'", [shopId]),
    ])
    res.json({
      ordersToday: Number(ordersToday.n),
      revenueMonth: Number(revenueMonth.n),
      activeProducts: Number(activeProducts.n),
      pendingOrders: Number(pendingOrders.n),
    })
  })

  r.get('/seller/products', async (req, res) => {
    const rows = await db.query('SELECT id FROM products WHERE shop_id = $1 ORDER BY created_at DESC', [req.user.shop.id])
    const products = await Promise.all(rows.map((x) => productById(db, x.id)))
    res.json(products)
  })
  r.get('/seller/products/:id', async (req, res) => res.json(await productById(db, (await ownProduct(req)).id)))

  r.post('/seller/products', async (req, res) => {
    const b = productSchema.parse(req.body)
    await checkCategory(b.categoryId); assertOwnImages(config, b.images)
    const id = uid()
    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO products (id, shop_id, category_id, name, brand, description, price, stock, free_shipping, shipping_fee, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, req.user.shop.id, b.categoryId ?? null, b.name, b.brand ?? null, b.description ?? null, b.price, b.stock, b.freeShipping, b.freeShipping ? 0 : b.shippingFee, now()]
      )
      await saveImages(tx, id, b.images)
    })
    res.status(201).json(await productById(db, id))
  })

  // Import en masse (admin/vendeur uniquement) — jusqu'à 500 produits par appel
  r.post('/seller/products/bulk', async (req, res) => {
    const { z } = await import('zod')
    const rowSchema = z.object({
      name:         z.string().min(1).max(200),
      description:  z.string().max(5000).optional().default(''),
      price:        z.coerce.number().min(1).max(10_000_000),
      stock:        z.coerce.number().int().min(0).max(100_000).default(1),
      categoryId:   z.string().optional().nullable().default(null),
      brand:        z.string().max(100).optional().default(''),
      freeShipping: z.coerce.boolean().default(false),
      shippingFee:  z.coerce.number().min(0).default(0),
      images:       z.array(z.string().url()).max(5).default([]),
    })
    const rows = z.array(rowSchema).min(1).max(500).parse(req.body)
    const shopId = req.user.shop.id
    const created = []
    const errors = []
    for (let i = 0; i < rows.length; i++) {
      try {
        const b = rows[i]
        if (b.categoryId) await checkCategory(b.categoryId)
        const id = uid()
        await db.transaction(async (tx) => {
          await tx.run(
            `INSERT INTO products (id, shop_id, category_id, name, brand, description, price, stock, free_shipping, shipping_fee, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, shopId, b.categoryId ?? null, b.name, b.brand || null, b.description || null,
             b.price, b.stock, b.freeShipping, b.freeShipping ? 0 : b.shippingFee, now()]
          )
          for (let j = 0; j < b.images.length; j++) {
            await tx.run('INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)', [id, b.images[j], j])
          }
        })
        created.push(id)
      } catch (e) {
        errors.push({ row: i + 1, name: rows[i].name, error: e.message })
      }
    }
    res.status(201).json({ created: created.length, errors })
  })

  r.put('/seller/products/:id', async (req, res) => {
    const { id } = await ownProduct(req)
    const b = productSchema.parse(req.body)
    await checkCategory(b.categoryId); assertOwnImages(config, b.images)
    await db.transaction(async (tx) => {
      await tx.run(
        `UPDATE products SET category_id = $1, name = $2, brand = $3, description = $4, price = $5, stock = $6, free_shipping = $7, shipping_fee = $8 WHERE id = $9`,
        [b.categoryId ?? null, b.name, b.brand ?? null, b.description ?? null, b.price, b.stock, b.freeShipping, b.freeShipping ? 0 : b.shippingFee, id]
      )
      await saveImages(tx, id, b.images)
    })
    res.json(await productById(db, id))
  })

  r.delete('/seller/products/:id', async (req, res) => {
    await db.run('DELETE FROM products WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shop.id])
    res.status(204).end()
  })

  const sellerOrderRows = async (shopId, orderId = null) => db.query(
    `SELECT o.*, u.first_name || ' ' || u.last_name AS customer_name
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE EXISTS (SELECT 1 FROM order_shops os WHERE os.order_id = o.id AND os.shop_id = $1) ${orderId ? 'AND o.id = $2' : ''}
     ORDER BY o.created_at DESC LIMIT 200`,
    orderId ? [shopId, orderId] : [shopId]
  )

  r.get('/seller/orders', async (req, res) => {
    const rows = await sellerOrderRows(req.user.shop.id)
    res.json(await loadOrders(db, rows, { shopId: req.user.shop.id }))
  })

  r.patch('/seller/orders/:id', async (req, res) => {
    const { status } = statusSchema.parse(req.body)
    const shopId = req.user.shop.id
    const os = await db.one('SELECT * FROM order_shops WHERE order_id = $1 AND shop_id = $2', [req.params.id, shopId])
    if (!os) throw new HttpError(404, 'Commande introuvable.')
    if (!TRANSITIONS[os.status].includes(status)) {
      throw new HttpError(400, `Changement impossible : « ${statusLabels[os.status]} » → « ${statusLabels[status]} ».`)
    }
    const order = await db.transaction(async (tx) => {
      await tx.run('UPDATE order_shops SET status = $1 WHERE order_id = $2 AND shop_id = $3', [status, req.params.id, shopId])
      if (status === 'cancelled') {
        const items = await tx.query('SELECT product_id, qty FROM order_items WHERE order_id = $1 AND shop_id = $2', [req.params.id, shopId])
        for (const i of items) {
          await tx.run('UPDATE products SET stock = stock + $1 WHERE id = $2', [i.qty, i.product_id])
        }
      }
      await refreshOrderStatus(db, req.params.id)
      const o = await db.one('SELECT * FROM orders WHERE id = $1', [req.params.id])
      await createNotification(db, o.user_id, { title: `Commande ${o.reference} : ${statusLabels[status].toLowerCase()}`, body: `${req.user.shop.name} a mis à jour votre commande.`, link: `/orders/${o.id}` })
      return o
    })
    const rows = await sellerOrderRows(shopId, order.id)
    res.json((await loadOrders(db, rows, { shopId }))[0])
  })

  return r
}
