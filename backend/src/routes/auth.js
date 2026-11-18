import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { HttpError, loadUser, now, uid } from '../lib.js'
import { forgotSchema, loginSchema, registerSchema } from '../schemas.js'
import { requireAuth, signToken } from '../middleware.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../email.js'

// Hash factice : on compare toujours un mot de passe, même si l'e-mail n'existe pas (anti-énumération par le temps de réponse).
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
    const verificationToken = randomBytes(32).toString('hex')

    try {
      await db.run(
        'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, email_verification_token, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)',
        [id, b.firstName, b.lastName, b.email, b.phone ?? null, hash, 'buyer', verificationToken, now()]
      )
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'Un compte existe déjà avec cet e-mail.')
      throw e
    }

    // Envoi de l'email de vérification
    sendVerificationEmail(config, { to: b.email, name: b.firstName, token: verificationToken })
      .then(() => console.log(`[email] Email de vérification envoyé à ${b.email}`))
      .catch((err) => console.error('[email] ERREUR envoi vérification:', err))

    res.status(201).json({ message: 'Compte créé ! Un e-mail de vérification vous a été envoyé. Vérifiez votre boîte mail (et vos spams).' })
  })

  // ---------- Connexion ----------
  r.post('/login', async (req, res) => {
    const b = loginSchema.parse(req.body)
    const row = await db.one('SELECT id, password_hash, blocked, email_verified FROM users WHERE LOWER(email) = LOWER($1)', [b.email])
    const ok = await bcrypt.compare(b.password, row?.password_hash ?? DUMMY_HASH)
    if (!row || !ok) throw new HttpError(401, 'E-mail ou mot de passe incorrect.')
    if (row.blocked) throw new HttpError(403, 'Ce compte a été suspendu. Contactez le support Selline.')
    if (!row.email_verified) throw new HttpError(403, 'EMAIL_NOT_VERIFIED')
    res.json({ token: signToken(config, row.id), user: await loadUser(db, row.id) })
  })

  // ---------- Vérification d'email ----------
  r.post('/verify-email', async (req, res) => {
    const token = req.body?.token
    if (!token || typeof token !== 'string') throw new HttpError(400, 'Token invalide.')

    const user = await db.one('SELECT id, email_verified FROM users WHERE email_verification_token = $1', [token])
    if (!user) throw new HttpError(400, 'Lien de vérification invalide ou déjà utilisé.')

    if (!user.email_verified) {
      await db.run(
        'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = $1',
        [user.id]
      )
    }

    // Connexion automatique après vérification
    res.json({ token: signToken(config, user.id), user: await loadUser(db, user.id) })
  })

  // ---------- Renvoyer l'email de vérification ----------
  r.post('/resend-verification', async (req, res) => {
    const { email } = forgotSchema.parse(req.body)
    // Toujours répondre 204 (anti-énumération)
    const user = await db.one('SELECT id, first_name, email_verified, email_verification_token FROM users WHERE LOWER(email) = LOWER($1)', [email])
    if (user && !user.email_verified) {
      let token = user.email_verification_token
      if (!token) {
        token = randomBytes(32).toString('hex')
        await db.run('UPDATE users SET email_verification_token = $1 WHERE id = $2', [token, user.id])
      }
      sendVerificationEmail(config, { to: email, name: user.first_name, token })
        .catch((err) => console.error('[email] Erreur renvoi vérification:', err))
    }
    res.status(204).end()
  })

  // ---------- Mot de passe oublié ----------
  r.post('/forgot-password', async (req, res) => {
    const { email } = forgotSchema.parse(req.body)
    // Toujours répondre 204 (anti-énumération)
    const user = await db.one('SELECT id, first_name FROM users WHERE LOWER(email) = LOWER($1)', [email])
    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 heure
      // Invalider les anciens tokens
      await db.run('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [user.id])
      await db.run(
        'INSERT INTO password_resets (id, user_id, token, expires_at, used, created_at) VALUES ($1, $2, $3, $4, false, $5)',
        [uid(), user.id, token, expiresAt, now()]
      )
      sendPasswordResetEmail(config, { to: email, name: user.first_name, token })
        .catch((err) => console.error('[email] Erreur envoi reset:', err))
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
