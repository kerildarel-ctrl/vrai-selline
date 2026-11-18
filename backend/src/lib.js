import { randomUUID } from 'node:crypto'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const uid = () => randomUUID()
export const now = () => new Date().toISOString()

/** Africa/Douala = UTC+1 toute l'année : début de la journée / du mois locaux, en ISO UTC. */
const WAT_MS = 3600e3
export function startOfDayWAT(date = new Date()) {
  const local = new Date(date.getTime() + WAT_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - WAT_MS).toISOString()
}
export function startOfMonthWAT(date = new Date()) {
  const local = new Date(date.getTime() + WAT_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - WAT_MS).toISOString()
}

/** Seules les images envoyées sur ce serveur sont acceptées (évite le pistage via des liens externes). */
export function isOwnUploadUrl(config, url) {
  // URL locale : /api/uploads/xxx
  const re = /^\/api\/uploads\/[\w.-]+$/
  if (re.test(url)) return true
  // URL absolue locale
  if (!!config.publicUrl && url.startsWith(`${config.publicUrl}/`) && re.test(url.slice(config.publicUrl.length))) return true
  // URL Cloudinary
  if (/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/.+$/.test(url)) return true
  return false
}

export function assertOwnImages(config, urls) {
  for (const u of urls) if (!isOwnUploadUrl(config, u)) throw new HttpError(400, "Adresse d'image invalide : utilisez le bouton d'envoi de photo.")
}

export const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

// ---------- Sérialiseurs (ligne SQL -> objet de l'API) ----------
export function toShop(s) {
  return s && { id: s.id, name: s.name, city: s.city, phone: s.phone, description: s.description, verified: !!s.verified, suspended: !!s.suspended }
}

export function toUser(u, shop) {
  return {
    id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email,
    phone: u.phone, city: u.city, avatar: u.avatar, role: u.role, isAdmin: !!u.is_admin,
    emailVerified: !!u.email_verified,
    shop: toShop(shop) ?? null,
  }
}

export async function loadUser(db, id) {
  const u = await db.one('SELECT * FROM users WHERE id = $1', [id])
  if (!u) return null
  const shop = await db.one('SELECT * FROM shops WHERE owner_id = $1', [id])
  return toUser(u, shop)
}

const PRODUCT_SELECT = `
  SELECT p.*, s.name AS shop_name, s.verified AS shop_verified,
         c.name AS cat_name, c.slug AS cat_slug
  FROM products p
  JOIN shops s ON s.id = p.shop_id
  JOIN users ow ON ow.id = s.owner_id
  LEFT JOIN categories c ON c.id = p.category_id`

/** Un produit n'est visible du public que si sa boutique n'est pas suspendue et son propriétaire pas bloqué. */
export const VISIBLE = 's.suspended = false AND ow.blocked = false'

export async function hydrateProducts(db, rows) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
  const imgs = await db.query(`SELECT product_id, url FROM product_images WHERE product_id IN (${placeholders}) ORDER BY position, id`, ids)
  const byProduct = new Map()
  for (const i of imgs) (byProduct.get(i.product_id) ?? byProduct.set(i.product_id, []).get(i.product_id)).push(i.url)
  return rows.map((p) => ({
    id: p.id, name: p.name, brand: p.brand, price: p.price, rating: p.rating, reviewCount: p.review_count,
    images: byProduct.get(p.id) ?? [],
    shop: { id: p.shop_id, name: p.shop_name, verified: !!p.shop_verified },
    freeShipping: !!p.free_shipping, shippingFee: p.shipping_fee,
    inStock: p.stock > 0, stock: p.stock,
    category: p.category_id ? { id: p.category_id, name: p.cat_name, slug: p.cat_slug } : null,
    description: p.description,
  }))
}

export async function productById(db, id, { publicOnly = false } = {}) {
  const row = await db.one(`${PRODUCT_SELECT} WHERE p.id = $1 ${publicOnly ? `AND ${VISIBLE}` : ''}`, [id])
  return row ? (await hydrateProducts(db, [row]))[0] : null
}

export async function productsWhere(db, where, args, orderBy = 'p.created_at DESC', limit = '', limitArgs = []) {
  const allArgs = [...args, ...limitArgs]
  const rows = await db.query(`${PRODUCT_SELECT} WHERE ${where} ORDER BY ${orderBy} ${limit}`, allArgs)
  return hydrateProducts(db, rows)
}

/** Charge les commandes avec leurs lignes. `shopId` : vue vendeur (seulement ses lignes et ses montants). */
export async function loadOrders(db, rows, { shopId = null } = {}) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const marks = ids.map((_, i) => `$${i + 1}`).join(',')

  let items
  if (shopId) {
    items = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${marks}) AND shop_id = $${ids.length + 1} ORDER BY id`,
      [...ids, shopId]
    )
  } else {
    items = await db.query(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY id`, ids)
  }

  const byOrder = new Map()
  for (const it of items) (byOrder.get(it.order_id) ?? byOrder.set(it.order_id, []).get(it.order_id)).push(it)

  let shopStatus = new Map()
  if (shopId) {
    const st = await db.query(
      `SELECT order_id, status FROM order_shops WHERE shop_id = $${ids.length + 1} AND order_id IN (${marks})`,
      [...ids, shopId]
    )
    shopStatus = new Map(st.map((s) => [s.order_id, s.status]))
  }

  return rows.map((o) => {
    const mine = byOrder.get(o.id) ?? []
    const base = {
      id: o.id, reference: o.reference, createdAt: o.created_at, paymentMethod: o.payment_method,
      items: mine.map((i) => ({ productId: i.product_id, name: i.name, image: i.image, price: i.price, qty: i.qty })),
      address: o.address_json ? JSON.parse(o.address_json) : null,
    }
    if (!shopId) return { ...base, status: o.status, subtotal: o.subtotal, shippingFee: o.shipping_fee, total: o.total }
    const subtotal = mine.reduce((s, i) => s + i.price * i.qty, 0)
    const shippingFee = mine.reduce((m, i) => Math.max(m, i.shipping_fee), 0)
    return { ...base, status: shopStatus.get(o.id) ?? o.status, subtotal, shippingFee, total: subtotal + shippingFee, customerName: o.customer_name }
  })
}

export async function createNotification(db, userId, { title, body = null, link = null }) {
  await db.run(
    'INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES ($1, $2, $3, $4, $5, false, $6)',
    [uid(), userId, title, body, link, now()]
  )
}

// ---------- Statuts de commande ----------
export const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

/** Statut global d'une commande, déduit des statuts de chaque boutique. */
export function deriveStatus(statuses) {
  const active = statuses.filter((s) => s !== 'cancelled')
  if (active.length === 0) return 'cancelled'
  if (active.every((s) => s === 'delivered')) return 'delivered'
  if (active.some((s) => s === 'shipped' || s === 'delivered')) return 'shipped'
  if (active.some((s) => s === 'confirmed')) return 'confirmed'
  return 'pending'
}

export async function refreshOrderStatus(db, orderId) {
  const rows = await db.query('SELECT status FROM order_shops WHERE order_id = $1', [orderId])
  const status = deriveStatus(rows.map((x) => x.status))
  await db.run('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId])
  return status
}

/** Journal des actions d'administration (qui a fait quoi, quand). */
export async function logAdminAction(db, adminId, action, summary) {
  await db.run(
    'INSERT INTO admin_actions (id, admin_id, action, summary, created_at) VALUES ($1, $2, $3, $4, $5)',
    [uid(), adminId, action, summary, now()]
  )
}
