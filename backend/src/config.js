import 'dotenv/config'
import path from 'node:path'

const isProd = process.env.NODE_ENV === 'production'

let jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET est obligatoire en production.')
  jwtSecret = 'dev-only-secret-ne-pas-utiliser-en-production'
  console.warn('⚠️  JWT_SECRET absent : secret de développement utilisé (à définir dans .env avant la mise en ligne).')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est obligatoire (Neon PostgreSQL).')
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  jwtSecret,
  jwtTtl: '30d',
  databaseUrl: process.env.DATABASE_URL,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 0,
  seedDemo: process.env.SEED_DEMO !== 'false' && !isProd,
  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoSender: process.env.BREVO_SENDER || '',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
}
