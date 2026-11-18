import { Router } from 'express'
import { HttpError, createNotification, logAdminAction, now, startOfDayWAT, startOfMonthWAT } from '../lib.js'
import { adminShopSchema, adminUserSchema, categorySchema } from '../schemas.js'

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&')
// PostgreSQL : ILIKE pour insensibilité à la casse
const ILIKE = 'ILIKE ?'

function paging(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}
const paged = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
const search = (req) => String(req.query.q ?? '').trim().slice(0, 100)
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Construit une clause WHERE en PostgreSQL avec params $1, $2... */
function buildWhere(conditions, startIdx = 1) {
  const clauses = []
  const params = []
  let idx = startIdx
  for (const [clause, ...values] of conditions) {
    // remplace les ? par $n
    let c = clause
    for (const v of values) {
      c = c.replace('?', `$${idx++}`)
      params.push(v)
    }
    clauses.push(c)
  }
  return { where: clauses.join(' AND ') || '1=1', params, nextIdx: idx }
}

export function adminRoutes({ db }) {
  const r = Router()
  const adminName = (req) => `${req.user.firstName} ${req.user.lastName}`

  // ---------- 1. Tableau de bord ----------
  r.get('/stats', async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString()
    const [users, shops, ordersRow, revenue, productsRow] = await Promise.all([
      db.one(`SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN role = 'buyer' AND is_admin = false THEN 1 ELSE 0 END), 0) AS buyers,
          COALESCE(SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END), 0) AS sellers,
          COALESCE(SUM(CASE WHEN blocked = true THEN 1 ELSE 0 END), 0) AS blocked,
          COALESCE(SUM(CASE WHEN created_at >= $1 THEN 1 ELSE 0 END), 0) AS "newThisWeek" FROM users`, [weekAgo]),
      db.one(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN verified = true THEN 1 ELSE 0 END), 0) AS verified,
          COALESCE(SUM(CASE WHEN suspended = true THEN 1 ELSE 0 END), 0) AS suspended,
          COALESCE(SUM(CASE WHEN verified = false AND suspended = false THEN 1 ELSE 0 END), 0) AS "awaitingVerification" FROM shops`),
      db.one(`SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN created_at >= $1 THEN 1 ELSE 0 END), 0) AS today,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending FROM orders`, [startOfDayWAT()]),
      db.one(`SELECT COALESCE(SUM(total), 0) AS total,
          COALESCE(SUM(CASE WHEN created_at >= $1 THEN total ELSE 0 END), 0) AS month FROM orders WHERE status != 'cancelled'`, [startOfMonthWAT()]),
      db.one('SELECT COUNT(*) AS n FROM products'),
    ])

    const since = new Date(Date.now() - 14 * 86400e3).toISOString()
    const seriesRows = await db.query(
      `SELECT (created_at AT TIME ZONE 'Africa/Douala')::date AS d, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
       FROM orders WHERE status != 'cancelled' AND created_at >= $1 GROUP BY d`, [since]
    )
    const byDay = new Map(seriesRows.map((x) => [String(x.d).slice(0, 10), x]))
    const series = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() + 3600e3 - (13 - i) * 86400e3).toISOString().slice(0, 10)
      return { date: d, orders: Number(byDay.get(d)?.orders ?? 0), revenue: Number(byDay.get(d)?.revenue ?? 0) }
    })

    const recentOrders = (await db.query(
      `SELECT o.id, o.reference, o.created_at, o.status, o.total, u.first_name || ' ' || u.last_name AS customer
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 8`
    )).map((o) => ({ id: o.id, reference: o.reference, createdAt: o.created_at, status: o.status, total: o.total, customerName: o.customer }))

    const recentActions = (await db.query(
      `SELECT a.id, a.summary, a.created_at, u.first_name || ' ' || u.last_name AS admin
       FROM admin_actions a JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT 8`
    )).map((a) => ({ id: a.id, summary: a.summary, adminName: a.admin, createdAt: a.created_at }))

    res.json({ users, shops, products: Number(productsRow.n), orders: ordersRow, revenue, series, recentOrders, recentActions })
  })

  // ---------- 2. Boutiques ----------
  const SHOP_SELECT = `
    SELECT s.*, u.first_name || ' ' || u.last_name AS owner_name, u.email AS owner_email, u.blocked AS owner_blocked,
      (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) AS product_count,
      (SELECT COUNT(*) FROM order_shops os WHERE os.shop_id = s.id) AS order_count,
      (SELECT COALESCE(SUM(i.price * i.qty), 0) FROM order_items i JOIN order_shops os ON os.order_id = i.order_id AND os.shop_id = i.shop_id
         WHERE i.shop_id = s.id AND os.status != 'cancelled') AS revenue
    FROM shops s JOIN users u ON u.id = s.owner_id`
  const toAdminShop = (s) => ({
    id: s.id, name: s.name, city: s.city, phone: s.phone, description: s.description,
    verified: !!s.verified, suspended: !!s.suspended, createdAt: s.created_at,
    owner: { id: s.owner_id, name: s.owner_name, email: s.owner_email, blocked: !!s.owner_blocked },
    productCount: Number(s.product_count), orderCount: Number(s.order_count), revenue: Number(s.revenue),
  })

  r.get('/shops', async (req, res) => {
    const pg = paging(req), q = search(req)
    const conditions = [['1 = 1']]
    if (q) {
      const l = `%${escapeLike(q)}%`
      conditions.push(['(s.name ILIKE ? OR s.city ILIKE ? OR u.email ILIKE ? OR u.first_name || \' \' || u.last_name ILIKE ?)', l, l, l, l])
    }
    const status = String(req.query.status ?? '')
    if (status === 'verified') conditions.push(['s.verified = true'])
    else if (status === 'unverified') conditions.push(['s.verified = false AND s.suspended = false'])
    else if (status === 'suspended') conditions.push(['s.suspended = true'])

    const { where, params, nextIdx } = buildWhere(conditions)
    const totalRow = await db.one(`SELECT COUNT(*) AS n FROM shops s JOIN users u ON u.id = s.owner_id WHERE ${where}`, params)
    const rows = await db.query(`${SHOP_SELECT} WHERE ${where} ORDER BY s.created_at DESC LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`, [...params, pg.limit, pg.offset])
    res.json(paged(rows.map(toAdminShop), Number(totalRow.n), pg))
  })

  r.patch('/shops/:id', async (req, res) => {
    const b = adminShopSchema.parse(req.body)
    const shop = await db.one('SELECT * FROM shops WHERE id = $1', [req.params.id])
    if (!shop) throw new HttpError(404, 'Boutique introuvable.')
    await db.transaction(async (tx) => {
      if (b.verified !== undefined && b.verified !== !!shop.verified) {
        await tx.run('UPDATE shops SET verified = $1 WHERE id = $2', [b.verified, shop.id])
        await logAdminAction(db, req.user.id, b.verified ? 'shop.verify' : 'shop.unverify', `${adminName(req)} a ${b.verified ? 'vérifié' : 'retiré le badge de'} la boutique « ${shop.name} »`)
        await createNotification(db, shop.owner_id, b.verified
          ? { title: 'Votre boutique est vérifiée ✅', body: 'Le badge « Vérifié » est maintenant affiché sur vos produits.', link: '/seller' }
          : { title: 'Badge « Vérifié » retiré', body: 'Contactez le support Selline pour plus d\'informations.', link: '/seller' })
      }
      if (b.suspended !== undefined && b.suspended !== !!shop.suspended) {
        await tx.run('UPDATE shops SET suspended = $1 WHERE id = $2', [b.suspended, shop.id])
        await logAdminAction(db, req.user.id, b.suspended ? 'shop.suspend' : 'shop.unsuspend', `${adminName(req)} a ${b.suspended ? 'suspendu' : 'réactivé'} la boutique « ${shop.name} »`)
        await createNotification(db, shop.owner_id, b.suspended
          ? { title: 'Votre boutique a été suspendue', body: 'Vos produits ne sont plus visibles. Contactez le support Selline.', link: '/seller' }
          : { title: 'Votre boutique est de nouveau active', body: 'Vos produits sont de nouveau visibles.', link: '/seller' })
      }
    })
    res.json(toAdminShop(await db.one(`${SHOP_SELECT} WHERE s.id = $1`, [shop.id])))
  })

  // ---------- 3. Utilisateurs ----------
  const USER_SELECT = `
    SELECT u.*, s.name AS shop_name, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
    FROM users u LEFT JOIN shops s ON s.owner_id = u.id`
  const toAdminUser = (u) => ({
    id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone, city: u.city, avatar: u.avatar,
    role: u.role, isAdmin: !!u.is_admin, blocked: !!u.blocked, createdAt: u.created_at, shopName: u.shop_name ?? null, orderCount: Number(u.order_count),
  })

  r.get('/users', async (req, res) => {
    const pg = paging(req), q = search(req)
    const conditions = [['1 = 1']]
    if (q) {
      const l = `%${escapeLike(q)}%`
      conditions.push(['(u.email ILIKE ? OR u.phone ILIKE ? OR u.first_name || \' \' || u.last_name ILIKE ?)', l, l, l])
    }
    const role = String(req.query.role ?? '')
    if (role === 'buyer') conditions.push(["u.role = 'buyer' AND u.is_admin = false"])
    else if (role === 'seller') conditions.push(["u.role = 'seller'"])
    else if (role === 'admin') conditions.push(['u.is_admin = true'])
    if (req.query.status === 'blocked') conditions.push(['u.blocked = true'])

    const { where, params, nextIdx } = buildWhere(conditions)
    const totalRow = await db.one(`SELECT COUNT(*) AS n FROM users u WHERE ${where}`, params)
    const rows = await db.query(`${USER_SELECT} WHERE ${where} ORDER BY u.created_at DESC LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`, [...params, pg.limit, pg.offset])
    res.json(paged(rows.map(toAdminUser), Number(totalRow.n), pg))
  })

  r.patch('/users/:id', async (req, res) => {
    const b = adminUserSchema.parse(req.body)
    const u = await db.one('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!u) throw new HttpError(404, 'Utilisateur introuvable.')
    if (u.id === req.user.id) throw new HttpError(403, 'Vous ne pouvez pas bloquer votre propre compte.')
    if (u.is_admin) throw new HttpError(403, 'Impossible de bloquer un administrateur.')
    if (b.blocked !== !!u.blocked) {
      await db.transaction(async (tx) => {
        await tx.run('UPDATE users SET blocked = $1 WHERE id = $2', [b.blocked, u.id])
        await logAdminAction(db, req.user.id, b.blocked ? 'user.block' : 'user.unblock', `${adminName(req)} a ${b.blocked ? 'bloqué' : 'débloqué'} ${u.first_name} ${u.last_name} (${u.email})`)
      })
    }
    res.json(toAdminUser(await db.one(`${USER_SELECT} WHERE u.id = $1`, [u.id])))
  })

  // ---------- 4. Produits et avis ----------
  r.get('/products', async (req, res) => {
    const pg = paging(req), q = search(req)
    const conditions = [['1 = 1']]
    if (q) {
      const l = `%${escapeLike(q)}%`
      conditions.push(['(p.name ILIKE ? OR p.brand ILIKE ? OR s.name ILIKE ?)', l, l, l])
    }
    const { where, params, nextIdx } = buildWhere(conditions)
    const totalRow = await db.one(`SELECT COUNT(*) AS n FROM products p JOIN shops s ON s.id = p.shop_id WHERE ${where}`, params)
    const rows = await db.query(
      `SELECT p.*, s.name AS shop_name, c.name AS cat_name,
          (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image
          FROM products p JOIN shops s ON s.id = p.shop_id LEFT JOIN categories c ON c.id = p.category_id
          WHERE ${where} ORDER BY p.created_at DESC LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...params, pg.limit, pg.offset]
    )
    res.json(paged(rows.map((p) => ({
      id: p.id, name: p.name, price: p.price, stock: p.stock, image: p.image, category: p.cat_name, rating: p.rating, reviewCount: p.review_count,
      createdAt: p.created_at, shop: { id: p.shop_id, name: p.shop_name },
    })), Number(totalRow.n), pg))
  })

  r.delete('/products/:id', async (req, res) => {
    const p = await db.one('SELECT p.id, p.name, s.owner_id, s.name AS shop_name FROM products p JOIN shops s ON s.id = p.shop_id WHERE p.id = $1', [req.params.id])
    if (!p) throw new HttpError(404, 'Produit introuvable.')
    const reason = String(req.query.reason ?? '').trim().slice(0, 200)
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM products WHERE id = $1', [p.id])
      await logAdminAction(db, req.user.id, 'product.delete', `${adminName(req)} a supprimé le produit « ${p.name} » (${p.shop_name})${reason ? ` — motif : ${reason}` : ''}`)
      await createNotification(db, p.owner_id, { title: 'Produit retiré', body: `« ${p.name} » a été retiré par l'équipe Selline.${reason ? ` Motif : ${reason}` : ''}`, link: '/seller/products' })
    })
    res.status(204).end()
  })

  r.get('/reviews', async (req, res) => {
    const pg = paging(req), q = search(req)
    const conditions = [['1 = 1']]
    if (q) {
      const l = `%${escapeLike(q)}%`
      conditions.push(['(rv.comment ILIKE ? OR p.name ILIKE ? OR u.email ILIKE ? OR u.first_name || \' \' || u.last_name ILIKE ?)', l, l, l, l])
    }
    const rating = parseInt(req.query.rating, 10)
    if (rating >= 1 && rating <= 5) conditions.push(['rv.rating = ?', rating])

    const { where, params, nextIdx } = buildWhere(conditions)
    const base = `FROM reviews rv JOIN products p ON p.id = rv.product_id JOIN users u ON u.id = rv.user_id WHERE ${where}`
    const totalRow = await db.one(`SELECT COUNT(*) AS n ${base}`, params)
    const rows = await db.query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at, p.id AS product_id, p.name AS product_name,
          u.first_name || ' ' || u.last_name AS author, u.email AS author_email ${base} ORDER BY rv.created_at DESC LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...params, pg.limit, pg.offset]
    )
    res.json(paged(rows.map((x) => ({
      id: x.id, rating: x.rating, comment: x.comment, createdAt: x.created_at,
      author: x.author, authorEmail: x.author_email, product: { id: x.product_id, name: x.product_name },
    })), Number(totalRow.n), pg))
  })

  r.delete('/reviews/:id', async (req, res) => {
    const rv = await db.one('SELECT rv.id, rv.product_id, rv.rating, p.name FROM reviews rv JOIN products p ON p.id = rv.product_id WHERE rv.id = $1', [req.params.id])
    if (!rv) throw new HttpError(404, 'Avis introuvable.')
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM reviews WHERE id = $1', [rv.id])
      const stats = await db.one('SELECT AVG(rating) AS avg, COUNT(*) AS n FROM reviews WHERE product_id = $1', [rv.product_id])
      const n = Number(stats.n)
      await tx.run('UPDATE products SET rating = $1, review_count = $2 WHERE id = $3', [n ? Math.round(Number(stats.avg) * 10) / 10 : 0, n, rv.product_id])
      await logAdminAction(db, req.user.id, 'review.delete', `${adminName(req)} a supprimé un avis ${rv.rating}/5 sur « ${rv.name} »`)
    })
    res.status(204).end()
  })

  // ---------- 5. Catégories ----------
  const toCategory = (c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: Number(c.product_count) })
  const CAT_SELECT = 'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c'
  const nameTaken = async (name, exceptId = '') =>
    !!(await db.one('SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2', [name, exceptId]))

  r.get('/categories', async (_req, res) => res.json((await db.query(`${CAT_SELECT} ORDER BY c.name`)).map(toCategory)))

  r.post('/categories', async (req, res) => {
    const { name } = categorySchema.parse(req.body)
    if (await nameTaken(name)) throw new HttpError(409, 'Une catégorie porte déjà ce nom.')
    const base = slugify(name) || 'categorie'
    let slug = base
    let i = 2
    while (await db.one('SELECT 1 FROM categories WHERE slug = $1', [slug])) slug = `${base}-${i++}`
    const id = `cat-${slug}`
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)', [id, name, slug])
      await logAdminAction(db, req.user.id, 'category.create', `${adminName(req)} a créé la catégorie « ${name} »`)
    })
    res.status(201).json(toCategory(await db.one(`${CAT_SELECT} WHERE c.id = $1`, [id])))
  })

  r.put('/categories/:id', async (req, res) => {
    const { name } = categorySchema.parse(req.body)
    const c = await db.one('SELECT * FROM categories WHERE id = $1', [req.params.id])
    if (!c) throw new HttpError(404, 'Catégorie introuvable.')
    if (await nameTaken(name, c.id)) throw new HttpError(409, 'Une catégorie porte déjà ce nom.')
    await db.transaction(async (tx) => {
      await tx.run('UPDATE categories SET name = $1 WHERE id = $2', [name, c.id])
      if (name !== c.name) await logAdminAction(db, req.user.id, 'category.update', `${adminName(req)} a renommé la catégorie « ${c.name} » en « ${name} »`)
    })
    res.json(toCategory(await db.one(`${CAT_SELECT} WHERE c.id = $1`, [c.id])))
  })

  r.delete('/categories/:id', async (req, res) => {
    const c = await db.one('SELECT * FROM categories WHERE id = $1', [req.params.id])
    if (!c) throw new HttpError(404, 'Catégorie introuvable.')
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM categories WHERE id = $1', [c.id])
      await logAdminAction(db, req.user.id, 'category.delete', `${adminName(req)} a supprimé la catégorie « ${c.name} »`)
    })
    res.status(204).end()
  })

  return r
}
