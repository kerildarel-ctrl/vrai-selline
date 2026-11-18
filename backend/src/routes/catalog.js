import { Router } from 'express'
import { HttpError, VISIBLE, now, uid, createNotification, productById, productsWhere } from '../lib.js'
import { reviewSchema } from '../schemas.js'

const SORTS = {
  popular: 'p.review_count DESC, p.rating DESC, p.created_at DESC',
  price_asc: 'p.price ASC, p.created_at DESC',
  price_desc: 'p.price DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
}

// PostgreSQL : LIKE est case-sensitive, on utilise ILIKE. L'échappement reste utile pour % et _
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&')

async function roundedAverage(db, productId) {
  const row = await db.one('SELECT AVG(rating) AS avg, COUNT(*) AS n FROM reviews WHERE product_id = $1', [productId])
  const n = Number(row.n)
  return { average: n ? Math.round(Number(row.avg) * 10) / 10 : 0, count: n }
}

/** Routes publiques : catégories, produits, avis (lecture). */
export function publicCatalogRoutes({ db }) {
  const r = Router()

  r.get('/categories', async (_req, res) => {
    res.json(await db.query('SELECT id, name, slug FROM categories ORDER BY name'))
  })

  r.get('/products', async (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 100)
    const category = String(req.query.category ?? '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12))
    const where = [VISIBLE]
    const args = []
    let idx = 1

    if (q) {
      const like = `%${escapeLike(q)}%`
      where.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx + 1} OR p.description ILIKE $${idx + 2})`)
      args.push(like, like, like); idx += 3
    }
    if (category) { where.push(`p.category_id = $${idx++}`); args.push(category) }

    const min = parseInt(req.query.min, 10), max = parseInt(req.query.max, 10), rating = parseFloat(req.query.rating)
    if (Number.isFinite(min) && min > 0) { where.push(`p.price >= $${idx++}`); args.push(min) }
    if (Number.isFinite(max) && max > 0) { where.push(`p.price <= $${idx++}`); args.push(max) }
    if (req.query.freeShipping === '1') where.push('p.free_shipping = true')
    if (req.query.verified === '1') where.push('s.verified = true')
    if (Number.isFinite(rating) && rating > 0) { where.push(`p.rating >= $${idx++}`); args.push(Math.min(rating, 5)) }

    const clause = where.join(' AND ')
    const countRow = await db.one(
      `SELECT COUNT(*) AS n FROM products p JOIN shops s ON s.id = p.shop_id JOIN users ow ON ow.id = s.owner_id WHERE ${clause}`,
      args
    )
    const total = Number(countRow.n)
    const items = await productsWhere(db, clause, args, SORTS[req.query.sort] ?? SORTS.newest, `LIMIT $${idx} OFFSET $${idx + 1}`, [limit, (page - 1) * limit])
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  })

  r.get('/products/:id', async (req, res) => {
    const p = await productById(db, req.params.id, { publicOnly: true })
    if (!p) throw new HttpError(404, 'Produit introuvable.')
    res.json(p)
  })

  r.get('/products/:id/reviews', async (req, res) => {
    const rows = await db.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.first_name, u.last_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 100`, [req.params.id])
    const { average, count } = await roundedAverage(db, req.params.id)
    res.json({
      items: rows.map((x) => ({ id: x.id, author: `${x.first_name} ${x.last_name.charAt(0)}.`, rating: x.rating, comment: x.comment, createdAt: x.created_at })),
      total: count, average,
    })
  })
  return r
}

/** Routes connectées : avis (écriture) et favoris. */
export function socialRoutes({ db }) {
  const r = Router()

  r.post('/products/:id/reviews', async (req, res) => {
    const b = reviewSchema.parse(req.body)
    const product = await db.one('SELECT p.id, p.name, s.owner_id FROM products p JOIN shops s ON s.id = p.shop_id WHERE p.id = $1', [req.params.id])
    if (!product) throw new HttpError(404, 'Produit introuvable.')
    if (product.owner_id === req.user.id) throw new HttpError(403, 'Vous ne pouvez pas noter vos propres produits.')
    const delivered = await db.one(`
      SELECT 1 FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN order_shops os ON os.order_id = o.id AND os.shop_id = i.shop_id
      WHERE o.user_id = $1 AND i.product_id = $2 AND os.status = 'delivered' LIMIT 1`, [req.user.id, product.id])
    if (!delivered) throw new HttpError(403, 'Vous pourrez noter ce produit une fois votre commande livrée.')
    const existing = await db.one('SELECT 1 FROM reviews WHERE product_id = $1 AND user_id = $2', [product.id, req.user.id])
    if (existing) throw new HttpError(409, 'Vous avez déjà donné votre avis sur ce produit.')

    const id = uid(), at = now()
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO reviews (id, product_id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [id, product.id, req.user.id, b.rating, b.comment, at])
      const { average, count } = await roundedAverage(db, product.id)
      await tx.run('UPDATE products SET rating = $1, review_count = $2 WHERE id = $3', [average, count, product.id])
      await createNotification(db, product.owner_id, { title: `Nouvel avis ${b.rating}/5`, body: `${product.name}`, link: `/product/${product.id}` })
    })
    res.status(201).json({ id, author: `${req.user.firstName} ${req.user.lastName.charAt(0)}.`, rating: b.rating, comment: b.comment, createdAt: at })
  })

  r.get('/favorites', async (req, res) => {
    const rows = await db.query('SELECT product_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])
    const ids = rows.map((x) => x.product_id)
    if (ids.length === 0) return res.json([])
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const products = await productsWhere(db, `p.id IN (${placeholders}) AND ${VISIBLE}`, ids)
    res.json(ids.map((id) => products.find((p) => p.id === id)).filter(Boolean))
  })

  r.put('/favorites/:productId', async (req, res) => {
    const exists = await db.one('SELECT 1 FROM products WHERE id = $1', [req.params.productId])
    if (!exists) throw new HttpError(404, 'Produit introuvable.')
    await db.run(
      'INSERT INTO favorites (user_id, product_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.productId, now()]
    )
    res.status(204).end()
  })

  r.delete('/favorites/:productId', async (req, res) => {
    await db.run('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, req.params.productId])
    res.status(204).end()
  })
  return r
}
