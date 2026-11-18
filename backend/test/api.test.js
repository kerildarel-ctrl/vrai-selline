import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDb, ensureCategories } from '../src/db.js'
import { createApp } from '../src/app.js'
import { seedDemo } from '../src/seed.js'

let server, base, db, uploadDir
const config = () => ({ jwtSecret: 'test-secret', jwtTtl: '1h', publicUrl: '', corsOrigins: [], uploadDir, trustProxy: 0 })

before(async () => {
  uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'selline-test-'))
  db = openDb(':memory:')
  ensureCategories(db)
  seedDemo(db, config())
  server = createApp({ db, config: config(), rateLimits: false }).listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://localhost:${server.address().port}/api`
})
after(() => { server.close(); db.close(); fs.rmSync(uploadDir, { recursive: true, force: true }) })

async function call(method, url, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(base + url, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) })
  let data = null
  try { data = await res.json() } catch { /* 204 */ }
  return { status: res.status, data }
}
const login = async (email, password = 'demo1234') => (await call('POST', '/auth/login', { body: { email, password } })).data
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082', 'hex')

test('connexion : bons et mauvais identifiants', async () => {
  const ok = await call('POST', '/auth/login', { body: { email: 'DEMO@selline.cm', password: 'demo1234' } })
  assert.equal(ok.status, 200)
  assert.ok(ok.data.token)
  assert.equal(ok.data.user.email, 'demo@selline.cm')
  assert.equal(ok.data.user.role, 'buyer')
  assert.equal('password_hash' in ok.data.user, false)

  const bad = await call('POST', '/auth/login', { body: { email: 'demo@selline.cm', password: 'faux' } })
  assert.equal(bad.status, 401)
  assert.equal(bad.data.message, 'E-mail ou mot de passe incorrect.')
  const unknown = await call('POST', '/auth/login', { body: { email: 'inconnu@selline.cm', password: 'demo1234' } })
  assert.equal(unknown.data.message, bad.data.message) // pas d'énumération de comptes
})

test('inscription, doublon, validation, /auth/me, mot de passe oublié', async () => {
  const r = await call('POST', '/auth/register', { body: { firstName: 'Awa', lastName: 'Biya', email: 'awa@test.cm', phone: '699112233', password: 'motdepasse1' } })
  assert.equal(r.status, 201)
  const me = await call('GET', '/auth/me', { token: r.data.token })
  assert.equal(me.data.firstName, 'Awa')
  assert.equal((await call('POST', '/auth/register', { body: { firstName: 'A', lastName: 'B', email: 'awa@test.cm', password: 'motdepasse1' } })).status, 409)
  const weak = await call('POST', '/auth/register', { body: { firstName: 'A', lastName: 'B', email: 'x@test.cm', password: '123' } })
  assert.equal(weak.status, 400)
  assert.match(weak.data.message, /8 caractères/)
  assert.equal((await call('POST', '/auth/register', { body: { firstName: 'A', lastName: 'B', email: 'pas-un-email', password: 'motdepasse1' } })).status, 400)
  assert.equal((await call('POST', '/auth/forgot-password', { body: { email: 'inconnu@x.cm' } })).status, 204)
  assert.equal((await call('GET', '/auth/me')).status, 401)
  assert.equal((await call('GET', '/auth/me', { token: 'jeton.invalide.ici' })).status, 401)
})

test('catalogue : catégories, recherche, tri, pagination, détail', async () => {
  const cats = (await call('GET', '/categories')).data
  assert.equal(cats.length, 6)
  const all = (await call('GET', '/products?limit=5&page=1')).data
  assert.equal(all.total, 12); assert.equal(all.items.length, 5); assert.equal(all.pages, 3)
  const mob = (await call('GET', `/products?category=${cats.find((c) => c.slug === 'telephones').id}`)).data
  assert.equal(mob.total, 2)
  const cheap = (await call('GET', '/products?sort=price_asc&limit=3')).data.items.map((p) => p.price)
  assert.deepEqual(cheap, [...cheap].sort((a, b) => a - b))
  assert.equal((await call('GET', '/products?q=miel')).data.total, 1)
  // filtres : prix, livraison offerte, boutique vérifiée, note minimale
  const cheap5 = (await call('GET', '/products?max=10000&limit=50')).data.items
  assert.ok(cheap5.length > 0 && cheap5.every((p) => p.price <= 10000))
  const mid = (await call('GET', '/products?min=10000&max=50000&limit=50')).data.items
  assert.ok(mid.length > 0 && mid.every((p) => p.price >= 10000 && p.price <= 50000))
  const free = (await call('GET', '/products?freeShipping=1&limit=50')).data
  assert.ok(free.total > 0 && free.items.every((p) => p.freeShipping))
  const ver = (await call('GET', '/products?verified=1&limit=50')).data
  assert.ok(ver.total > 0 && ver.total < 12 && ver.items.every((p) => p.shop.verified))
  const rated = (await call('GET', '/products?rating=4&limit=50')).data.items
  assert.ok(rated.every((p) => p.rating >= 4))
  assert.equal((await call('GET', '/products?min=abc&max=-5')).data.total, 12) // valeurs invalides ignorées
  assert.equal((await call('GET', '/products?q=%25')).data.total, 0) // % n'est pas un joker
  const p = (await call('GET', `/products/${all.items[0].id}`)).data
  assert.ok(p.images[0].startsWith('/api/uploads/'))
  assert.equal(typeof p.inStock, 'boolean')
  assert.equal((await call('GET', '/products/inexistant')).status, 404)
})

test('commande : prix/livraison recalculés, stock décrémenté, isolation entre utilisateurs', async () => {
  const { token } = await login('demo@selline.cm')
  const products = (await call('GET', '/products?limit=50')).data.items
  const phone = products.find((p) => p.name.startsWith('Smartphone'))   // 95 000, livraison gratuite
  const oil = products.find((p) => p.name.startsWith('Huile'))          // 5 000 + 1 500
  const addr = (await call('GET', '/addresses', { token })).data[0]

  const res = await call('POST', '/orders', { token, body: { items: [{ productId: phone.id, qty: 2 }, { productId: oil.id, qty: 1 }, { productId: oil.id, qty: 1 }], addressId: addr.id, paymentMethod: 'cod', total: 1, subtotal: 1 } })
  assert.equal(res.status, 201)
  assert.equal(res.data.subtotal, 95000 * 2 + 5000 * 2)
  assert.equal(res.data.shippingFee, 1500) // 1 seule boutique : frais le plus élevé
  assert.equal(res.data.total, res.data.subtotal + 1500)
  assert.equal(res.data.items.length, 2)
  assert.equal(res.data.status, 'pending')
  assert.match(res.data.reference, /^SL-\d{6}-\d{5}$/)

  assert.equal((await call('GET', `/products/${phone.id}`)).data.stock, phone.stock - 2)

  const other = (await call('POST', '/auth/register', { body: { firstName: 'Intrus', lastName: 'Test', email: 'intrus@test.cm', password: 'motdepasse1' } })).data.token
  assert.equal((await call('GET', `/orders/${res.data.id}`, { token: other })).status, 404)
  assert.deepEqual((await call('GET', '/orders', { token: other })).data, [])
  assert.equal((await call('GET', '/orders', { token })).data[0].id, res.data.id)
  // adresse d'un autre utilisateur refusée
  const stolen = await call('POST', '/orders', { token: other, body: { items: [{ productId: oil.id, qty: 1 }], addressId: addr.id, paymentMethod: 'cod' } })
  assert.equal(stolen.status, 400)
})

test('commande : stock insuffisant, mobile money invalide, achat de ses propres produits, panier vide', async () => {
  const { token } = await login('demo@selline.cm')
  const addr = (await call('GET', '/addresses', { token })).data[0]
  const p = (await call('GET', '/products?q=Ordinateur')).data.items[0]
  const tooMany = await call('POST', '/orders', { token, body: { items: [{ productId: p.id, qty: 99 }], addressId: addr.id, paymentMethod: 'cod' } })
  assert.equal(tooMany.status, 409); assert.match(tooMany.data.message, /Stock insuffisant/)
  assert.equal((await call('GET', `/products/${p.id}`)).data.stock, p.stock) // rien n'a été retiré
  const badPhone = await call('POST', '/orders', { token, body: { items: [{ productId: p.id, qty: 1 }], addressId: addr.id, paymentMethod: 'mobile', paymentPhone: '123' } })
  assert.equal(badPhone.status, 400)
  const goodPhone = await call('POST', '/orders', { token, body: { items: [{ productId: p.id, qty: 1 }], addressId: addr.id, paymentMethod: 'mobile', paymentPhone: '6 70 00 00 00' } })
  assert.equal(goodPhone.status, 201)
  assert.equal((await call('POST', '/orders', { token, body: { items: [], addressId: addr.id, paymentMethod: 'cod' } })).status, 400)
  const seller = (await login('vendeur@selline.cm')).token
  const own = (await call('GET', '/seller/products', { token: seller })).data[0]
  const sa = (await call('POST', '/addresses', { token: seller, body: { fullName: 'Vendeur Demo', phone: '670000002', city: 'Yaoundé', quarter: 'Mvan' } })).data
  assert.equal((await call('POST', '/orders', { token: seller, body: { items: [{ productId: own.id, qty: 1 }], addressId: sa.id, paymentMethod: 'cod' } })).status, 400)
})

test('vendeur : stats, commandes, transitions de statut, notifications, avis après livraison', async () => {
  const buyer = (await login('demo@selline.cm')).token
  const seller = (await login('vendeur@selline.cm')).token
  const addr = (await call('GET', '/addresses', { token: buyer })).data[0]
  const mine = (await call('GET', '/seller/products', { token: seller })).data
  const p = mine.find((x) => x.name.startsWith('Sandales'))
  const order = (await call('POST', '/orders', { token: buyer, body: { items: [{ productId: p.id, qty: 1 }], addressId: addr.id, paymentMethod: 'cod' } })).data

  const stats = (await call('GET', '/seller/stats', { token: seller })).data
  assert.ok(stats.ordersToday >= 1); assert.ok(stats.pendingOrders >= 1); assert.equal(stats.activeProducts, mine.length)
  assert.ok((await call('GET', '/me/counters', { token: seller })).data.notifications >= 1)

  const so = (await call('GET', '/seller/orders', { token: seller })).data.find((o) => o.id === order.id)
  assert.equal(so.customerName, 'Kero Demo')
  assert.equal(so.items.length, 1)

  // pas d'avis avant livraison
  assert.equal((await call('POST', `/products/${p.id}/reviews`, { token: buyer, body: { rating: 5, comment: 'Super' } })).status, 403)
  // transition interdite
  const skip = await call('PATCH', `/seller/orders/${order.id}`, { token: seller, body: { status: 'delivered' } })
  assert.equal(skip.status, 400); assert.match(skip.data.message, /Changement impossible/)
  for (const s of ['confirmed', 'shipped', 'delivered']) {
    const u = await call('PATCH', `/seller/orders/${order.id}`, { token: seller, body: { status: s } })
    assert.equal(u.status, 200); assert.equal(u.data.status, s)
  }
  assert.equal((await call('GET', `/orders/${order.id}`, { token: buyer })).data.status, 'delivered')
  const notifs = (await call('GET', '/notifications', { token: buyer })).data
  assert.ok(notifs.some((n) => n.link === `/orders/${order.id}` && !n.read))

  // un autre vendeur ne peut pas toucher cette commande
  const tech = (await login('tech@selline.cm')).token
  assert.equal((await call('PATCH', `/seller/orders/${order.id}`, { token: tech, body: { status: 'cancelled' } })).status, 404)
  // un acheteur n'a pas accès à l'espace vendeur (403, pas 401)
  assert.equal((await call('GET', '/seller/stats', { token: buyer })).status, 403)

  // avis autorisé après livraison, un seul par produit
  const before = (await call('GET', `/products/${p.id}`)).data
  const rev = await call('POST', `/products/${p.id}/reviews`, { token: buyer, body: { rating: 5, comment: 'Très confortables' } })
  assert.equal(rev.status, 201); assert.equal(rev.data.author, 'Kero D.')
  assert.equal((await call('POST', `/products/${p.id}/reviews`, { token: buyer, body: { rating: 4, comment: 'Encore' } })).status, 409)
  const after = (await call('GET', `/products/${p.id}`)).data
  assert.equal(after.reviewCount, before.reviewCount + 1)
  const list = (await call('GET', `/products/${p.id}/reviews`)).data
  assert.equal(list.total, after.reviewCount); assert.ok(list.average > 0)
})

test('annulation : le stock est restitué', async () => {
  const buyer = (await login('demo@selline.cm')).token
  const seller = (await login('vendeur@selline.cm')).token
  const addr = (await call('GET', '/addresses', { token: buyer })).data[0]
  const p = (await call('GET', '/seller/products', { token: seller })).data.find((x) => x.name.startsWith('Ventilateur'))
  const o = (await call('POST', '/orders', { token: buyer, body: { items: [{ productId: p.id, qty: 3 }], addressId: addr.id, paymentMethod: 'cod' } })).data
  assert.equal((await call('GET', `/products/${p.id}`)).data.stock, p.stock - 3)
  const c = await call('PATCH', `/seller/orders/${o.id}`, { token: seller, body: { status: 'cancelled' } })
  assert.equal(c.data.status, 'cancelled')
  assert.equal((await call('GET', `/products/${p.id}`)).data.stock, p.stock)
  assert.equal((await call('GET', `/orders/${o.id}`, { token: buyer })).data.status, 'cancelled')
})

test('devenir vendeur et gérer ses produits (avec envoi d\'image)', async () => {
  const t = (await call('POST', '/auth/register', { body: { firstName: 'Brice', lastName: 'Fotso', email: 'brice@test.cm', password: 'motdepasse1' } })).data.token
  assert.equal((await call('GET', '/seller/products', { token: t })).status, 403)
  const shop = await call('POST', '/seller/shop', { token: t, body: { name: 'Chez Brice', city: 'Douala', phone: '677000000', verified: true } })
  assert.equal(shop.status, 201); assert.equal(shop.data.verified, false) // on ne peut pas se « vérifier » soi-même
  assert.equal((await call('POST', '/seller/shop', { token: t, body: { name: 'Autre', city: 'X', phone: '677000000' } })).status, 409)
  assert.equal((await call('GET', '/auth/me', { token: t })).data.role, 'seller')

  const fd = new FormData(); fd.append('file', new Blob([PNG], { type: 'image/png' }), 'photo.png')
  const up = await call('POST', '/uploads', { token: t, form: fd })
  assert.equal(up.status, 201); assert.match(up.data.url, /^\/api\/uploads\/[\w-]+\.png$/)
  const img = await fetch(`http://localhost:${server.address().port}${up.data.url}`)
  assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png')
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff')

  const fake = new FormData(); fake.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png')
  assert.equal((await call('POST', '/uploads', { token: t, form: fake })).status, 400)
  assert.equal((await call('POST', '/uploads', { form: fd })).status, 401)

  const input = { name: 'Boubou brodé', price: 25000, stock: 5, categoryId: 'cat-mode', freeShipping: false, shippingFee: 2000, images: [up.data.url] }
  const created = await call('POST', '/seller/products', { token: t, body: input })
  assert.equal(created.status, 201); assert.equal(created.data.shippingFee, 2000); assert.equal(created.data.category.name, 'Mode')
  assert.equal((await call('POST', '/seller/products', { token: t, body: { ...input, images: ['https://tracker.exemple/pixel.gif'] } })).status, 400)
  assert.equal((await call('POST', '/seller/products', { token: t, body: { ...input, price: -5 } })).status, 400)
  assert.equal((await call('POST', '/seller/products', { token: t, body: { ...input, categoryId: 'nope' } })).status, 400)
  const upd = await call('PUT', `/seller/products/${created.data.id}`, { token: t, body: { ...input, price: 22000, freeShipping: true, shippingFee: 999 } })
  assert.equal(upd.data.price, 22000); assert.equal(upd.data.shippingFee, 0)
  // un autre vendeur ne peut ni lire, ni modifier, ni supprimer
  const demoSeller = (await login('vendeur@selline.cm')).token
  assert.equal((await call('PUT', `/seller/products/${created.data.id}`, { token: demoSeller, body: input })).status, 404)
  await call('DELETE', `/seller/products/${created.data.id}`, { token: demoSeller })
  assert.equal((await call('GET', `/products/${created.data.id}`)).status, 200)
  await call('DELETE', `/seller/products/${created.data.id}`, { token: t })
  assert.equal((await call('GET', `/products/${created.data.id}`)).status, 404)
})

test('profil : photo, champs conservés/effacés, mot de passe', async () => {
  const t = (await call('POST', '/auth/register', { body: { firstName: 'Lea', lastName: 'Kamga', email: 'lea@test.cm', phone: '677111222', password: 'motdepasse1' } })).data.token
  const fd = new FormData(); fd.append('file', new Blob([PNG], { type: 'image/png' }), 'a.png')
  const { url } = (await call('POST', '/uploads', { token: t, form: fd })).data
  let u = (await call('PATCH', '/users/me', { token: t, body: { firstName: 'Léa', lastName: 'Kamga', avatar: url } })).data
  assert.equal(u.avatar, url); assert.equal(u.phone, '677111222') // téléphone conservé (clé absente)
  u = (await call('PATCH', '/users/me', { token: t, body: { firstName: 'Léa', lastName: 'Kamga', city: 'Douala' } })).data
  assert.equal(u.avatar, url); assert.equal(u.city, 'Douala')
  assert.equal((await call('PATCH', '/users/me', { token: t, body: { firstName: 'Léa', lastName: 'Kamga', avatar: 'https://tracker.exemple/p.png' } })).status, 400)
  u = (await call('PATCH', '/users/me', { token: t, body: { firstName: 'Léa', lastName: 'Kamga', avatar: null, phone: null } })).data
  assert.equal(u.avatar, null); assert.equal(u.phone, null)

  const wrong = await call('PUT', '/users/me/password', { token: t, body: { currentPassword: 'faux', newPassword: 'nouveaumdp1' } })
  assert.equal(wrong.status, 400) // pas 401 : ne déconnecte pas
  assert.equal((await call('PUT', '/users/me/password', { token: t, body: { currentPassword: 'motdepasse1', newPassword: 'nouveaumdp1' } })).status, 204)
  assert.equal((await call('POST', '/auth/login', { body: { email: 'lea@test.cm', password: 'nouveaumdp1' } })).status, 200)
  assert.equal((await call('POST', '/auth/login', { body: { email: 'lea@test.cm', password: 'motdepasse1' } })).status, 401)
})

test('adresses et favoris', async () => {
  const t = (await login('demo@selline.cm')).token
  const a = await call('POST', '/addresses', { token: t, body: { fullName: 'Kero Demo', phone: '670000001', city: 'Douala', quarter: 'Akwa', details: '' } })
  assert.equal(a.status, 201)
  assert.equal((await call('POST', '/addresses', { token: t, body: { fullName: 'K', phone: 'abc', city: '', quarter: '' } })).status, 400)
  const other = (await login('vendeur@selline.cm')).token
  await call('DELETE', `/addresses/${a.data.id}`, { token: other }) // sans effet sur l'adresse d'autrui
  assert.ok((await call('GET', '/addresses', { token: t })).data.some((x) => x.id === a.data.id))
  assert.equal((await call('DELETE', `/addresses/${a.data.id}`, { token: t })).status, 204)

  const p = (await call('GET', '/products?limit=1')).data.items[0]
  assert.equal((await call('PUT', `/favorites/${p.id}`, { token: t })).status, 204)
  assert.equal((await call('PUT', `/favorites/${p.id}`, { token: t })).status, 204) // idempotent
  assert.equal((await call('GET', '/favorites', { token: t })).data.length, 1)
  assert.equal((await call('PUT', '/favorites/inexistant', { token: t })).status, 404)
  assert.equal((await call('DELETE', `/favorites/${p.id}`, { token: t })).status, 204)
  assert.equal((await call('GET', '/favorites', { token: t })).data.length, 0)
})

test('messagerie : conversation, messages, non lus, compteurs, accès restreint', async () => {
  const buyer = (await login('demo@selline.cm')).token
  const seller = (await login('vendeur@selline.cm')).token
  const p = (await call('GET', '/seller/products', { token: seller })).data[0]

  const conv = await call('POST', '/conversations', { token: buyer, body: { shopId: p.shop.id, productId: p.id } })
  assert.equal(conv.status, 201); assert.equal(conv.data.title, 'Boutique Demo'); assert.equal(conv.data.productName, p.name)
  assert.equal((await call('GET', '/conversations', { token: seller })).data.length, 0) // vide : invisible côté vendeur
  const again = await call('POST', '/conversations', { token: buyer, body: { shopId: p.shop.id } })
  assert.equal(again.status, 200); assert.equal(again.data.id, conv.data.id)
  assert.equal((await call('POST', '/conversations', { token: seller, body: { shopId: p.shop.id } })).status, 400)

  const m = await call('POST', `/conversations/${conv.data.id}/messages`, { token: buyer, body: { text: 'Bonjour, est-ce disponible ?' } })
  assert.equal(m.status, 201); assert.equal(m.data.mine, true)
  assert.equal((await call('POST', `/conversations/${conv.data.id}/messages`, { token: buyer, body: { text: '   ' } })).status, 400)
  assert.equal((await call('POST', `/conversations/${conv.data.id}/messages`, { token: buyer, body: { text: 'x'.repeat(2001) } })).status, 400)

  const sc = (await call('GET', '/conversations', { token: seller })).data
  assert.equal(sc[0].title, 'Kero Demo'); assert.equal(sc[0].unread, 1)
  assert.equal((await call('GET', '/me/counters', { token: seller })).data.messages, 1)
  const open = await call('GET', `/conversations/${conv.data.id}`, { token: seller })
  assert.equal(open.data.messages[0].mine, false)
  assert.equal((await call('GET', '/me/counters', { token: seller })).data.messages, 0) // marqués comme lus
  await call('POST', `/conversations/${conv.data.id}/messages`, { token: seller, body: { text: 'Oui, en stock !' } })
  const bc = (await call('GET', `/conversations/${conv.data.id}`, { token: buyer })).data
  assert.deepEqual(bc.messages.map((x) => x.mine), [true, false])

  const intruder = (await login('tech@selline.cm')).token
  assert.equal((await call('GET', `/conversations/${conv.data.id}`, { token: intruder })).status, 404)
  assert.equal((await call('POST', `/conversations/${conv.data.id}/messages`, { token: intruder, body: { text: 'hey' } })).status, 404)

  const n = (await call('GET', '/notifications', { token: seller })).data.find((x) => x.link === `/seller/messages/${conv.data.id}`)
  assert.ok(n)
  assert.equal((await call('PATCH', `/notifications/${n.id}/read`, { token: seller })).status, 204)
  assert.equal((await call('POST', '/notifications/read-all', { token: seller })).status, 204)
  assert.equal((await call('GET', '/me/counters', { token: seller })).data.notifications, 0)
})

test('erreurs : JSON invalide, route inconnue, injection SQL dans la recherche', async () => {
  const res = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' })
  assert.equal(res.status, 400)
  assert.equal((await call('GET', '/nimporte-quoi')).status, 401)
  const t = (await login('demo@selline.cm')).token
  assert.equal((await call('GET', '/nimporte-quoi', { token: t })).status, 404)
  const inj = await call('GET', `/products?q=${encodeURIComponent("'; DROP TABLE products; --")}&sort=${encodeURIComponent('price; DROP TABLE users')}`)
  assert.equal(inj.status, 200)
  assert.equal((await call('GET', '/products?limit=1')).data.total > 0, true)
})

// ======================= ADMINISTRATION =======================
const adminLogin = async () => (await login('admin@selline.cm')).token

test('admin : accès réservé aux administrateurs', async () => {
  assert.equal((await call('GET', '/admin/stats')).status, 401)
  const buyer = (await login('demo@selline.cm')).token
  const seller = (await login('vendeur@selline.cm')).token
  for (const t of [buyer, seller]) {
    assert.equal((await call('GET', '/admin/stats', { token: t })).status, 403) // 403 : ne déconnecte pas
    assert.equal((await call('GET', '/admin/users', { token: t })).status, 403)
    assert.equal((await call('PATCH', '/admin/shops/x', { token: t, body: { verified: true } })).status, 403)
    assert.equal((await call('DELETE', '/admin/products/x', { token: t })).status, 403)
  }
  const me = (await call('GET', '/auth/me', { token: await adminLogin() })).data
  assert.equal(me.isAdmin, true)
  assert.equal((await call('GET', '/auth/me', { token: buyer })).data.isAdmin, false)
  // personne ne peut se promouvoir admin via l'API
  await call('PATCH', '/users/me', { token: buyer, body: { firstName: 'Kero', lastName: 'Demo', isAdmin: true, is_admin: 1 } })
  assert.equal((await call('GET', '/auth/me', { token: buyer })).data.isAdmin, false)
})

test('admin : tableau de bord cohérent avec la base', async () => {
  const t = await adminLogin()
  const s = (await call('GET', '/admin/stats', { token: t })).data
  const n = (sql, ...a) => db.prepare(sql).get(...a).n
  assert.equal(s.users.total, n('SELECT COUNT(*) AS n FROM users'))
  assert.equal(s.users.sellers, n("SELECT COUNT(*) AS n FROM users WHERE role = 'seller'"))
  assert.equal(s.shops.total, n('SELECT COUNT(*) AS n FROM shops'))
  assert.equal(s.shops.verified, n('SELECT COUNT(*) AS n FROM shops WHERE verified = 1'))
  assert.equal(s.products, n('SELECT COUNT(*) AS n FROM products'))
  assert.equal(s.orders.total, n('SELECT COUNT(*) AS n FROM orders'))
  assert.equal(s.revenue.total, n("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled'"))
  assert.ok(s.revenue.total > 0 && s.revenue.month <= s.revenue.total)
  assert.equal(s.series.length, 14)
  assert.equal(s.series.reduce((a, d) => a + d.revenue, 0) <= s.revenue.total, true)
  assert.ok(s.recentOrders.length > 0 && s.recentOrders[0].customerName)
})

test('admin : vérifier / suspendre une boutique, effets sur le catalogue et les commandes', async () => {
  const t = await adminLogin()
  const list = await call('GET', '/admin/shops?limit=50', { token: t })
  assert.equal(list.status, 200); assert.ok(list.data.total >= 3)
  const tech = list.data.items.find((x) => x.name === 'Tech Mboa')
  assert.equal(tech.verified, false); assert.equal(tech.owner.email, 'tech@selline.cm')
  assert.equal((await call('GET', '/admin/shops?q=mboa', { token: t })).data.total, 1)
  assert.ok((await call('GET', '/admin/shops?status=unverified', { token: t })).data.items.every((x) => !x.verified && !x.suspended))

  // vérification
  const v = await call('PATCH', `/admin/shops/${tech.id}`, { token: t, body: { verified: true } })
  assert.equal(v.data.verified, true)
  const techProduct = (await call('GET', '/products?limit=50')).data.items.find((p) => p.shop.id === tech.id)
  assert.equal(techProduct.shop.verified, true)
  const ownerToken = (await login('tech@selline.cm')).token
  assert.ok((await call('GET', '/notifications', { token: ownerToken })).data.some((n) => /vérifiée/.test(n.title)))
  await call('PATCH', `/admin/shops/${tech.id}`, { token: t, body: { verified: false } })
  assert.equal((await call('GET', `/products/${techProduct.id}`)).data.shop.verified, false)
  assert.equal((await call('PATCH', `/admin/shops/${tech.id}`, { token: t, body: {} })).status, 400)
  assert.equal((await call('PATCH', '/admin/shops/inconnue', { token: t, body: { verified: true } })).status, 404)

  // suspension
  const before = (await call('GET', '/products?limit=50')).data.total
  const sus = await call('PATCH', `/admin/shops/${tech.id}`, { token: t, body: { suspended: true } })
  assert.equal(sus.data.suspended, true)
  assert.equal((await call('GET', '/products?limit=50')).data.total, before - tech.productCount)
  assert.equal((await call('GET', `/products/${techProduct.id}`)).status, 404)
  const buyer = (await login('demo@selline.cm')).token
  const addr = (await call('GET', '/addresses', { token: buyer })).data[0]
  const order = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: techProduct.id, qty: 1 }], addressId: addr.id, paymentMethod: 'cod' } })
  assert.equal(order.status, 400)
  // le vendeur suspendu garde la lecture mais ne peut plus modifier
  assert.equal((await call('GET', '/seller/stats', { token: ownerToken })).status, 200)
  assert.equal((await call('GET', '/auth/me', { token: ownerToken })).data.shop.suspended, true)
  const w = await call('PUT', `/seller/products/${techProduct.id}`, { token: ownerToken, body: { name: 'X modifié', price: 1000, stock: 1, freeShipping: true, shippingFee: 0, images: [techProduct.images[0]] } })
  assert.equal(w.status, 403); assert.match(w.data.message, /suspendue/)

  // réactivation
  await call('PATCH', `/admin/shops/${tech.id}`, { token: t, body: { suspended: false } })
  assert.equal((await call('GET', '/products?limit=50')).data.total, before)
  assert.equal((await call('GET', `/products/${techProduct.id}`)).status, 200)

  // le journal garde la trace
  const log = (await call('GET', '/admin/stats', { token: t })).data.recentActions
  assert.ok(log.some((a) => /suspendu/.test(a.summary)) && log.every((a) => a.adminName === 'Admin Selline'))
})

test('admin : utilisateurs (recherche, blocage, déblocage)', async () => {
  const t = await adminLogin()
  const reg = await call('POST', '/auth/register', { body: { firstName: 'Zoé', lastName: 'Bloquée', email: 'zoe@test.cm', phone: '699000111', password: 'motdepasse1' } })
  const zoe = (await call('GET', '/admin/users?q=zoe@test', { token: t })).data
  assert.equal(zoe.total, 1); assert.equal(zoe.items[0].blocked, false)
  assert.equal((await call('GET', '/admin/users?q=699000111', { token: t })).data.total, 1)
  assert.ok((await call('GET', '/admin/users?role=seller', { token: t })).data.items.every((u) => u.role === 'seller'))
  assert.ok((await call('GET', '/admin/users?role=admin', { token: t })).data.items.every((u) => u.isAdmin))

  const blocked = await call('PATCH', `/admin/users/${zoe.items[0].id}`, { token: t, body: { blocked: true } })
  assert.equal(blocked.data.blocked, true)
  assert.equal((await call('GET', '/admin/users?status=blocked', { token: t })).data.total, 1)
  const attempt = await call('POST', '/auth/login', { body: { email: 'zoe@test.cm', password: 'motdepasse1' } })
  assert.equal(attempt.status, 403); assert.match(attempt.data.message, /suspendu/)
  assert.equal((await call('POST', '/auth/login', { body: { email: 'zoe@test.cm', password: 'faux' } })).status, 401) // pas de fuite sur l'état du compte
  assert.equal((await call('GET', '/auth/me', { token: reg.data.token })).status, 401) // session existante coupée

  await call('PATCH', `/admin/users/${zoe.items[0].id}`, { token: t, body: { blocked: false } })
  assert.equal((await call('POST', '/auth/login', { body: { email: 'zoe@test.cm', password: 'motdepasse1' } })).status, 200)

  // pas d'auto-blocage ni de blocage d'un admin
  const me = (await call('GET', '/auth/me', { token: t })).data
  assert.equal((await call('PATCH', `/admin/users/${me.id}`, { token: t, body: { blocked: true } })).status, 403)
  assert.equal((await call('PATCH', '/admin/users/inconnu', { token: t, body: { blocked: true } })).status, 404)

  // bloquer un vendeur masque ses produits
  const sellerRow = db.prepare("SELECT id FROM users WHERE email = 'tech@selline.cm'").get()
  const before = (await call('GET', '/products?limit=50')).data.total
  await call('PATCH', `/admin/users/${sellerRow.id}`, { token: t, body: { blocked: true } })
  assert.ok((await call('GET', '/products?limit=50')).data.total < before)
  await call('PATCH', `/admin/users/${sellerRow.id}`, { token: t, body: { blocked: false } })
  assert.equal((await call('GET', '/products?limit=50')).data.total, before)
})

test('admin : suppression de produits et d\'avis', async () => {
  const t = await adminLogin()
  const prods = await call('GET', '/admin/products?q=Parfum', { token: t })
  assert.equal(prods.data.total, 1)
  const reviewsBefore = (await call('GET', '/admin/reviews?limit=100', { token: t })).data
  assert.ok(reviewsBefore.total > 0)
  const rv = reviewsBefore.items.find((x) => x.product.name === 'Miel de la Menoua 1 kg')
  const pBefore = (await call('GET', `/products/${rv.product.id}`)).data
  assert.equal((await call('GET', '/admin/reviews?rating=1', { token: t })).data.items.every((x) => x.rating === 1), true)

  assert.equal((await call('DELETE', `/admin/reviews/${rv.id}`, { token: t })).status, 204)
  const pAfter = (await call('GET', `/products/${rv.product.id}`)).data
  assert.equal(pAfter.reviewCount, pBefore.reviewCount - 1)
  assert.equal((await call('DELETE', `/admin/reviews/${rv.id}`, { token: t })).status, 404)

  const product = prods.data.items[0]
  assert.equal((await call('DELETE', `/admin/products/${product.id}?reason=${encodeURIComponent('Contenu inapproprié')}`, { token: t })).status, 204)
  assert.equal((await call('GET', `/products/${product.id}`)).status, 404)
  const owner = (await login('vendeur@selline.cm')).token
  const note = (await call('GET', '/notifications', { token: owner })).data.find((n) => n.title === 'Produit retiré')
  assert.match(note.body, /Contenu inapproprié/)
  assert.equal((await call('DELETE', `/admin/products/${product.id}`, { token: t })).status, 404)
})

test('admin : catégories (ajout, modification, suppression)', async () => {
  const t = await adminLogin()
  const created = await call('POST', '/admin/categories', { token: t, body: { name: 'Sport & Loisirs' } })
  assert.equal(created.status, 201); assert.equal(created.data.slug, 'sport-loisirs'); assert.equal(created.data.productCount, 0)
  assert.ok((await call('GET', '/categories')).data.some((c) => c.name === 'Sport & Loisirs'))
  assert.equal((await call('POST', '/admin/categories', { token: t, body: { name: 'sport & loisirs' } })).status, 409)
  assert.equal((await call('POST', '/admin/categories', { token: t, body: { name: 'A' } })).status, 400)
  assert.equal((await call('POST', '/admin/categories', { token: t, body: { name: 'Éléctro' } })).data.slug, 'electro')

  const renamed = await call('PUT', `/admin/categories/${created.data.id}`, { token: t, body: { name: 'Sports' } })
  assert.equal(renamed.data.name, 'Sports')
  assert.equal((await call('PUT', `/admin/categories/${created.data.id}`, { token: t, body: { name: 'Mode' } })).status, 409)

  // suppression d'une catégorie qui contient des produits : ils restent en ligne, sans catégorie
  const list = (await call('GET', '/admin/categories', { token: t })).data
  const maison = list.find((c) => c.slug === 'maison')
  assert.ok(maison.productCount > 0)
  const sample = (await call('GET', `/products?category=${maison.id}`)).data.items[0]
  assert.equal((await call('DELETE', `/admin/categories/${maison.id}`, { token: t })).status, 204)
  assert.equal((await call('GET', `/products/${sample.id}`)).data.category, null)
  assert.equal((await call('DELETE', `/admin/categories/${maison.id}`, { token: t })).status, 404)
  assert.equal((await call('DELETE', `/admin/categories/${created.data.id}`, { token: t })).status, 204)
})

test('admin : création d\'un compte admin côté serveur et migration d\'une ancienne base', async () => {
  const { ensureAdmin } = await import('../src/admin.js')
  assert.equal(ensureAdmin(db, 'demo@selline.cm'), 'promu administrateur')
  assert.equal(ensureAdmin(db, 'demo@selline.cm'), 'déjà administrateur')
  assert.throws(() => ensureAdmin(db, 'nouveau@selline.cm'), /mot de passe/)
  assert.throws(() => ensureAdmin(db, 'nouveau@selline.cm', 'court'), /mot de passe/)
  assert.equal(ensureAdmin(db, 'nouveau@selline.cm', 'motdepasse1'), 'créé')
  assert.equal((await login('nouveau@selline.cm', 'motdepasse1')).user.isAdmin, true)
  db.prepare("UPDATE users SET is_admin = 0 WHERE email = 'demo@selline.cm'").run() // on remet l'état initial

  // ancienne base (sans les colonnes admin) : l'ouverture les ajoute sans rien perdre
  const { DatabaseSync } = await import('node:sqlite')
  const file = path.join(uploadDir, 'ancienne.db')
  const old = new DatabaseSync(file)
  old.exec("CREATE TABLE users (id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, password_hash TEXT, created_at TEXT, role TEXT, phone TEXT, city TEXT, avatar TEXT); CREATE TABLE shops (id TEXT PRIMARY KEY, owner_id TEXT, name TEXT, verified INTEGER DEFAULT 0, created_at TEXT); INSERT INTO users (id, first_name, last_name, email) VALUES ('u1', 'Ancien', 'Compte', 'ancien@x.cm');")
  old.close()
  const migrated = openDb(file)
  const cols = (t) => migrated.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
  assert.ok(cols('users').includes('is_admin') && cols('users').includes('blocked') && cols('shops').includes('suspended'))
  assert.equal(migrated.prepare("SELECT first_name, blocked, is_admin FROM users WHERE id = 'u1'").get().first_name, 'Ancien')
  migrated.close()
  openDb(file).close() // une 2e ouverture ne casse rien
})
