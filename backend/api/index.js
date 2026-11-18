import { createApp } from '../src/app.js'
import { openDb, ensureCategories } from '../src/db.js'
import { config } from '../src/config.js'
import { ensureAdmin } from '../src/admin.js'

// Cache entre les invocations "chaudes" (warm start Vercel)
let cachedApp = null

async function bootstrap() {
  if (cachedApp) return cachedApp
  const db = await openDb(config.databaseUrl)
  await ensureCategories(db)
  if (process.env.ADMIN_EMAIL) {
    try { await ensureAdmin(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD) } catch {}
  }
  cachedApp = createApp({ db, config })
  return cachedApp
}

export default async function handler(req, res) {
  const app = await bootstrap()
  return app(req, res)
}
