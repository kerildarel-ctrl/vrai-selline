import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { HttpError, loadUser, now, uid } from '../lib.js'
import { forgotSchema, loginSchema, registerSchema } from '../schemas.js'
import { requireAuth, signToken } from '../middleware.js'

// Hash factice : anti-énumération par temps de réponse
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 10)

const resetSchema = { parse: (b) => {
  if (!b?.token || typeof b.token !== 'string') throw new Error('Token invalide.')
  if (!b?.password || typeof b.password !== 'string' || b.password.length < 8) throw new Error('Mot de passe : 8 caractères minimum.')
  if (b.password.length > 72) throw new Error('Mot de passe : 72 caractères maximum.')
  return { token: b.token, password: b.password }
}}

export function authRoutes(ctx) {
  const { db, config } = ctx
  const r = Router()

  // ---------- Inscription ----------
  r.post('/register', async (req, res) => {
    const b = registerSchema.parse(req.body)
    const existing = await db.one('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [b.email])
    if (existing) throw new HttpError(409, 'Un compte existe déjà avec cet e-mail.')

    const id = uid()
    const hash = await bcrypt.hash(b.password, 10)

    try {
      await db.run(
        'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)',
        [id, b.firstName, b.lastName, b.email, b.phone ?? null, hash, 'buyer', now()]
      )
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'Un compte existe déjà avec cet e-mail.')
      throw e
    }

    // Connexion automatique après inscription
    res.status(201).json({ token: signToken(config, id), user: await loadUser(db, id) })
  })

  // ---------- Connexion ----------
  r.post('/login', async (req, res) => {
    const b = loginSchema.parse(req.body)
    const row = await db.one('SELECT id, password_hash, blocked FROM users WHERE LOWER(email) = LOWER($1)', [b.email])
    const ok = await bcrypt.compare(b.password, row?.password_hash ?? DUMMY_HASH)
    if (!row || !ok) throw new HttpError(401, 'E-mail ou mot de passe incorrect.')
    if (row.blocked) throw new HttpError(403, 'Ce compte a été suspendu. Contactez le support Selline.')
    res.json({ token: signToken(config, row.id), user: await loadUser(db, row.id) })
  })

  // ---------- Mot de passe oublié ----------
  r.post('/forgot-password', async (req, res) => {
    const { email } = forgotSchema.parse(req.body)
    const user = await db.one('SELECT id, first_name FROM users WHERE LOWER(email) = LOWER($1)', [email])
    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await db.run('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [user.id])
      await db.run(
        'INSERT INTO password_resets (id, user_id, token, expires_at, used, created_at) VALUES ($1, $2, $3, $4, false, $5)',
        [uid(), user.id, token, expiresAt, now()]
      )
      // Email désactivé — le token est loggé pour debug
      console.log(`[reset] Token pour ${email}: ${token}`)
    }
    res.status(204).end()
  })

  // ---------- Réinitialiser le mot de passe ----------
  r.post('/reset-password', async (req, res) => {
    let parsed
    try { parsed = resetSchema.parse(req.body) }
    catch (e) { throw new HttpError(400, e.message) }

    const reset = await db.one(
      'SELECT * FROM password_resets WHERE token = $1 AND used = false AND expires_at > NOW()',
      [parsed.token]
    )
    if (!reset) throw new HttpError(400, 'Lien de réinitialisation invalide ou expiré.')

    const hash = await bcrypt.hash(parsed.password, 10)
    await db.transaction(async (tx) => {
      await tx.run('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id])
      await tx.run('UPDATE password_resets SET used = true WHERE id = $1', [reset.id])
    })

    res.json({ message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.' })
  })

  r.get('/me', requireAuth(ctx), async (req, res) => res.json(req.user))
  return r
}
