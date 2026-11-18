import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { HttpError, loadUser } from './lib.js'

export function signToken(config, userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtTtl })
}

/** Exige un jeton valide ; charge l'utilisateur (req.user, objet API). */
export function requireAuth({ db, config }) {
  return async (req, _res, next) => {
    try {
      const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
      if (!token) throw new HttpError(401, 'Veuillez vous connecter.')
      let payload
      try { payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) }
      catch { throw new HttpError(401, 'Session expirée, reconnectez-vous.') }
      const user = await loadUser(db, payload.sub)
      if (!user) throw new HttpError(401, 'Session expirée, reconnectez-vous.')
      const row = await db.one('SELECT blocked FROM users WHERE id = $1', [user.id])
      if (row?.blocked) throw new HttpError(401, 'Votre compte a été suspendu. Contactez le support Selline.')
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
}

export function requireSeller(req, _res, next) {
  // 403 (et non 401) : un 401 déconnecterait l'utilisateur côté frontend.
  if (req.user.role !== 'seller' || !req.user.shop) throw new HttpError(403, 'Cette page est réservée aux vendeurs.')
  next()
}

/** Réservé aux administrateurs (403 : un 401 déconnecterait l'utilisateur côté frontend). */
export function requireAdmin(req, _res, next) {
  if (!req.user.isAdmin) throw new HttpError(403, 'Accès réservé aux administrateurs.')
  next()
}

export function notFound(_req, _res) {
  throw new HttpError(404, 'Ressource introuvable.')
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message })
  if (err instanceof ZodError) return res.status(400).json({ message: err.issues[0]?.message ?? 'Données invalides.' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Requête invalide.' })
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Requête trop volumineuse.' })
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Image trop lourde (8 Mo maximum).' })
  if (err?.name === 'MulterError') return res.status(400).json({ message: 'Envoi du fichier impossible.' })
  console.error(`[erreur] ${req.method} ${req.originalUrl}`, err)
  res.status(500).json({ message: 'Erreur du serveur. Veuillez réessayer.' })
}
