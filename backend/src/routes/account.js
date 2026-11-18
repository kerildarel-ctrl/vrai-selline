import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { HttpError, assertOwnImages, loadUser, now, uid } from '../lib.js'
import { addressSchema, passwordSchema, profileSchema } from '../schemas.js'

const toAddress = (a) => ({ id: a.id, fullName: a.full_name, phone: a.phone, city: a.city, quarter: a.quarter, details: a.details })

export function accountRoutes({ db, config }) {
  const r = Router()

  // Absent = inchangé ; null (ou "") = effacer.
  r.patch('/users/me', async (req, res) => {
    const b = profileSchema.parse(req.body)
    if (b.avatar) assertOwnImages(config, [b.avatar])
    const sets = []
    const args = []
    let i = 1
    sets.push(`first_name = $${i++}`); args.push(b.firstName)
    sets.push(`last_name = $${i++}`); args.push(b.lastName)
    for (const [key, col] of [['phone', 'phone'], ['city', 'city'], ['avatar', 'avatar']]) {
      if (b[key] !== undefined) { sets.push(`${col} = $${i++}`); args.push(b[key] ?? null) }
    }
    args.push(req.user.id)
    await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, args)
    res.json(await loadUser(db, req.user.id))
  })

  r.put('/users/me/password', async (req, res) => {
    const b = passwordSchema.parse(req.body)
    const row = await db.one('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    // 400 (et non 401) : un 401 déconnecterait l'utilisateur côté frontend.
    if (!(await bcrypt.compare(b.currentPassword, row.password_hash))) throw new HttpError(400, 'Mot de passe actuel incorrect.')
    await db.run('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(b.newPassword, 10), req.user.id])
    res.status(204).end()
  })

  r.get('/addresses', async (req, res) => {
    const rows = await db.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json(rows.map(toAddress))
  })

  r.post('/addresses', async (req, res) => {
    const b = addressSchema.parse(req.body)
    const count = await db.one('SELECT COUNT(*) AS n FROM addresses WHERE user_id = $1', [req.user.id])
    if (Number(count.n) >= 20) throw new HttpError(400, 'Vous avez atteint la limite de 20 adresses.')
    const id = uid()
    await db.run(
      'INSERT INTO addresses (id, user_id, full_name, phone, city, quarter, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.user.id, b.fullName, b.phone, b.city, b.quarter, b.details ?? null, now()]
    )
    res.status(201).json(toAddress(await db.one('SELECT * FROM addresses WHERE id = $1', [id])))
  })

  r.delete('/addresses/:id', async (req, res) => {
    await db.run('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.status(204).end()
  })

  return r
}
