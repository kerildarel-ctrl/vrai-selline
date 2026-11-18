import { Router } from 'express'
import { randomInt } from 'node:crypto'
import { HttpError, VISIBLE, createNotification, loadOrders, now, uid } from '../lib.js'
import { orderSchema } from '../schemas.js'

const MOMO = /^(\+?237)?6\d{8}$/

async function newReference(db) {
  for (let i = 0; i < 10; i++) {
    const ref = `SL-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomInt(10000, 99999)}`
    const existing = await db.one('SELECT 1 FROM orders WHERE reference = $1', [ref])
    if (!existing) return ref
  }
  throw new Error('Impossible de générer une référence de commande.')
}

export function orderRoutes({ db }) {
  const r = Router()

  r.post('/orders', async (req, res) => {
    const b = orderSchema.parse(req.body)

    if (b.paymentMethod === 'mobile') {
      const phone = (b.paymentPhone ?? '').replace(/[\s.-]/g, '')
      if (!MOMO.test(phone)) throw new HttpError(400, 'Numéro Mobile Money invalide (ex. 6 70 00 00 00).')
    }
    const address = await db.one('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [b.addressId, req.user.id])
    if (!address) throw new HttpError(400, 'Adresse de livraison introuvable.')

    // Fusionne les lignes d'un même produit
    const wanted = new Map()
    for (const it of b.items) wanted.set(it.productId, (wanted.get(it.productId) ?? 0) + it.qty)

    const orderId = uid()
    const reference = await newReference(db)

    // Tout dans une transaction
    await db.transaction(async (tx) => {
      const lines = []
      for (const [productId, qty] of wanted) {
        const p = await tx.one(
          `SELECT p.*, s.owner_id FROM products p JOIN shops s ON s.id = p.shop_id JOIN users ow ON ow.id = s.owner_id WHERE p.id = $1 AND ${VISIBLE}`,
          [productId]
        )
        if (!p) throw new HttpError(400, "Un produit de votre panier n'est plus disponible.")
        if (p.owner_id === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas acheter vos propres produits.')
        if (qty > 99) throw new HttpError(400, 'Quantité trop élevée.')

        // Décrémente le stock atomiquement
        const result = await tx.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
          [qty, p.id]
        )
        if (result.length === 0) {
          const cur = await tx.one('SELECT stock FROM products WHERE id = $1', [p.id])
          const stock = cur?.stock ?? 0
          throw new HttpError(409, stock > 0 ? `Stock insuffisant pour « ${p.name} » (il en reste ${stock}).` : `« ${p.name} » est en rupture de stock.`)
        }

        const imgRow = await tx.one('SELECT url FROM product_images WHERE product_id = $1 ORDER BY position, id LIMIT 1', [p.id])
        lines.push({ p, qty, image: imgRow?.url ?? null, fee: p.free_shipping ? 0 : p.shipping_fee })
      }

      // Livraison : frais le plus élevé par boutique
      const feeByShop = new Map()
      for (const l of lines) feeByShop.set(l.p.shop_id, Math.max(feeByShop.get(l.p.shop_id) ?? 0, l.fee))
      const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
      const shipping = [...feeByShop.values()].reduce((a, c) => a + c, 0)

      const addr = { id: address.id, fullName: address.full_name, phone: address.phone, city: address.city, quarter: address.quarter, details: address.details }
      await tx.run(
        `INSERT INTO orders (id, reference, user_id, status, subtotal, shipping_fee, total, payment_method, payment_phone, address_json, created_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)`,
        [orderId, reference, req.user.id, subtotal, shipping, subtotal + shipping, b.paymentMethod, b.paymentMethod === 'mobile' ? b.paymentPhone : null, JSON.stringify(addr), now()]
      )

      for (const l of lines) {
        await tx.run(
          'INSERT INTO order_items (order_id, product_id, shop_id, name, image, price, qty, shipping_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [orderId, l.p.id, l.p.shop_id, l.p.name, l.image, l.p.price, l.qty, feeByShop.get(l.p.shop_id)]
        )
      }
      for (const [shopId] of feeByShop) {
        await tx.run("INSERT INTO order_shops (order_id, shop_id, status) VALUES ($1, $2, 'pending')", [orderId, shopId])
        const ownerRow = await tx.one('SELECT owner_id FROM shops WHERE id = $1', [shopId])
        await createNotification(db, ownerRow.owner_id, { title: 'Nouvelle commande', body: `Commande ${reference} de ${req.user.firstName} ${req.user.lastName}`, link: '/seller/orders' })
      }
    })

    const orderRow = await db.one('SELECT * FROM orders WHERE id = $1', [orderId])
    res.status(201).json((await loadOrders(db, [orderRow]))[0])
  })

  r.get('/orders', async (req, res) => {
    const rows = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [req.user.id])
    res.json(await loadOrders(db, rows))
  })

  r.get('/orders/:id', async (req, res) => {
    const row = await db.one('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (!row) throw new HttpError(404, 'Commande introuvable.')
    res.json((await loadOrders(db, [row]))[0])
  })
  return r
}
