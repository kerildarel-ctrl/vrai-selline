import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { authRoutes } from './routes/auth.js'
import { accountRoutes } from './routes/account.js'
import { publicCatalogRoutes, socialRoutes } from './routes/catalog.js'
import { orderRoutes } from './routes/orders.js'
import { sellerRoutes, shopRoutes } from './routes/seller.js'
import { messageRoutes, notificationRoutes } from './routes/messages.js'
import { uploadRoutes } from './routes/uploads.js'
import { adminRoutes } from './routes/admin.js'
import { errorHandler, notFound, requireAdmin, requireAuth } from './middleware.js'

export function createApp({ db, config, rateLimits = true }) {
  const ctx = { db, config }
  const app = express()
  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', config.trustProxy)

  // Les images doivent pouvoir s'afficher depuis le frontend (autre origine en production).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: config.corsOrigins }))
  app.use(express.json({ limit: '100kb' }))

  const limiter = (limit, message) => rateLimits
    ? rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message } })
    : (_req, _res, next) => next()

  // Images envoyées : noms aléatoires, jamais exécutées (sandbox + nosniff)
  app.use('/api/uploads', express.static(config.uploadDir, {
    index: false, maxAge: '30d', immutable: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    },
  }))

  const api = express.Router()
  const auth = requireAuth(ctx)

  api.get('/health', (_req, res) => res.json({ ok: true }))
  // Anti force-brute : uniquement sur les actions sensibles (pas sur GET /auth/me, appelé à chaque chargement)
  api.post(['/auth/login', '/auth/register', '/auth/forgot-password'], limiter(40, 'Trop de tentatives. Réessayez dans quelques minutes.'))
  api.use('/auth', authRoutes(ctx))

  // Public
  api.use(publicCatalogRoutes(ctx))

  // Connecté
  api.use(auth)
  api.use(limiter(2000, 'Trop de requêtes. Réessayez dans quelques minutes.'))
  api.use(accountRoutes(ctx))
  api.use(socialRoutes(ctx))
  api.use(orderRoutes(ctx))
  api.use(messageRoutes(ctx))
  api.use(notificationRoutes(ctx))
  api.use('/uploads', limiter(100, "Trop d'envois de fichiers. Réessayez plus tard."))
  api.use(uploadRoutes(ctx))
  api.use('/admin', requireAdmin, adminRoutes(ctx))
  api.use(shopRoutes(ctx))
  api.use(sellerRoutes(ctx))

  app.use('/api', api)
  app.use(notFound)
  app.use(errorHandler)
  return app
}
