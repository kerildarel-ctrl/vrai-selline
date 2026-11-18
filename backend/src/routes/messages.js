import { Router } from 'express'
import { HttpError, createNotification, now, uid } from '../lib.js'
import { conversationSchema, messageSchema } from '../schemas.js'

const CONV_SELECT = `
  SELECT c.*, s.name AS shop_name, s.owner_id AS owner_id,
         u.first_name || ' ' || u.last_name AS buyer_name,
         p.name AS product_name
  FROM conversations c
  JOIN shops s ON s.id = c.shop_id
  JOIN users u ON u.id = c.buyer_id
  LEFT JOIN products p ON p.id = c.product_id`

export function messageRoutes({ db }) {
  const r = Router()

  async function toConversation(c, me) {
    const last = await db.one('SELECT text, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1', [c.id])
    const unreadRow = await db.one('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL', [c.id, me])
    return {
      id: c.id,
      title: c.buyer_id === me ? c.shop_name : c.buyer_name,
      productName: c.product_name, lastMessage: last?.text ?? null, lastAt: last?.created_at ?? null, unread: Number(unreadRow.n),
    }
  }

  /** Conversation accessible à l'utilisateur (acheteur ou propriétaire de la boutique), sinon 404. */
  async function accessible(id, me) {
    const c = await db.one(`${CONV_SELECT} WHERE c.id = $1`, [id])
    if (!c || (c.buyer_id !== me && c.owner_id !== me)) throw new HttpError(404, 'Conversation introuvable.')
    return c
  }

  r.get('/conversations', async (req, res) => {
    // Le vendeur ne voit pas les conversations encore vides
    const rows = await db.query(
      `${CONV_SELECT}
       WHERE c.buyer_id = $1 OR (s.owner_id = $2 AND c.last_message_at IS NOT NULL)
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT 200`,
      [req.user.id, req.user.id]
    )
    res.json(await Promise.all(rows.map((c) => toConversation(c, req.user.id))))
  })

  r.post('/conversations', async (req, res) => {
    const b = conversationSchema.parse(req.body)
    const shop = await db.one('SELECT * FROM shops WHERE id = $1', [b.shopId])
    if (!shop) throw new HttpError(404, 'Boutique introuvable.')
    if (shop.owner_id === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas vous écrire à vous-même.')
    if (b.productId && !(await db.one('SELECT 1 FROM products WHERE id = $1 AND shop_id = $2', [b.productId, shop.id]))) {
      throw new HttpError(400, "Ce produit n'appartient pas à cette boutique.")
    }
    let existing = await db.one('SELECT id FROM conversations WHERE buyer_id = $1 AND shop_id = $2', [req.user.id, shop.id])
    let status = 200
    if (existing) {
      if (b.productId) await db.run('UPDATE conversations SET product_id = $1 WHERE id = $2', [b.productId, existing.id])
    } else {
      existing = { id: uid() }
      await db.run('INSERT INTO conversations (id, buyer_id, shop_id, product_id, created_at) VALUES ($1, $2, $3, $4, $5)', [existing.id, req.user.id, shop.id, b.productId ?? null, now()])
      status = 201
    }
    const conv = await db.one(`${CONV_SELECT} WHERE c.id = $1`, [existing.id])
    res.status(status).json(await toConversation(conv, req.user.id))
  })

  r.get('/conversations/:id', async (req, res) => {
    const c = await accessible(req.params.id, req.user.id)
    await db.run('UPDATE messages SET read_at = $1 WHERE conversation_id = $2 AND sender_id != $3 AND read_at IS NULL', [now(), c.id, req.user.id])
    const msgs = await db.query(
      'SELECT * FROM (SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 500) sub ORDER BY created_at ASC',
      [c.id]
    )
    res.json({
      conversation: await toConversation(c, req.user.id),
      messages: msgs.map((m) => ({ id: m.id, text: m.text, createdAt: m.created_at, mine: m.sender_id === req.user.id })),
    })
  })

  r.post('/conversations/:id/messages', async (req, res) => {
    const c = await accessible(req.params.id, req.user.id)
    const { text } = messageSchema.parse(req.body)
    const id = uid(), at = now()
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO messages (id, conversation_id, sender_id, text, created_at) VALUES ($1, $2, $3, $4, $5)', [id, c.id, req.user.id, text, at])
      await tx.run('UPDATE conversations SET last_message_at = $1 WHERE id = $2', [at, c.id])
      const recipientIsBuyer = c.owner_id === req.user.id
      const recipient = recipientIsBuyer ? c.buyer_id : c.owner_id
      const link = recipientIsBuyer ? `/messages/${c.id}` : `/seller/messages/${c.id}`
      const preview = text.length > 100 ? `${text.slice(0, 100)}…` : text
      const sender = recipientIsBuyer ? c.shop_name : `${req.user.firstName} ${req.user.lastName}`
      // Une seule notification non lue par conversation
      const unread = await db.one('SELECT id FROM notifications WHERE user_id = $1 AND link = $2 AND read = false', [recipient, link])
      if (unread) {
        await db.run('UPDATE notifications SET title = $1, body = $2, created_at = $3 WHERE id = $4', [`Nouveau message de ${sender}`, preview, at, unread.id])
      } else {
        await createNotification(db, recipient, { title: `Nouveau message de ${sender}`, body: preview, link })
      }
    })
    res.status(201).json({ id, text, createdAt: at, mine: true })
  })

  return r
}

export function notificationRoutes({ db }) {
  const r = Router()

  r.get('/notifications', async (req, res) => {
    const rows = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user.id])
    res.json(rows.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.read, createdAt: n.created_at })))
  })

  r.post('/notifications/read-all', async (req, res) => {
    await db.run('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id])
    res.status(204).end()
  })

  r.patch('/notifications/:id/read', async (req, res) => {
    await db.run('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.status(204).end()
  })

  r.get('/me/counters', async (req, res) => {
    const me = req.user.id
    const [notifRow, msgRow] = await Promise.all([
      db.one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND read = false', [me]),
      db.one(`SELECT COUNT(*) AS n FROM messages m
        JOIN conversations c ON c.id = m.conversation_id JOIN shops s ON s.id = c.shop_id
        WHERE (c.buyer_id = $1 OR s.owner_id = $2) AND m.sender_id != $3 AND m.read_at IS NULL`, [me, me, me]),
    ])
    res.json({ notifications: Number(notifRow.n), messages: Number(msgRow.n) })
  })
  return r
}
