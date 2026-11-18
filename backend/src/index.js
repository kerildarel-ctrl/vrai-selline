import { config } from './config.js'
import { ensureCategories, openDb } from './db.js'
import { createApp } from './app.js'
import { seedDemo } from './seed.js'
import { ensureAdmin } from './admin.js'

async function main() {
  const db = await openDb(config.databaseUrl)
  await ensureCategories(db)

  if (config.seedDemo && await seedDemo(db, config)) {
    console.log('🌱 Données de démonstration créées : demo@selline.cm / vendeur@selline.cm / admin@selline.cm (mot de passe : demo1234)')
  }

  // Production : ADMIN_EMAIL (+ ADMIN_PASSWORD si le compte n'existe pas encore) crée ou promeut l'administrateur
  if (process.env.ADMIN_EMAIL) {
    try { console.log(`👑 ${process.env.ADMIN_EMAIL} : ${await ensureAdmin(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)}`) }
    catch (e) { console.error(`⚠️  Administrateur non configuré : ${e.message}`) }
  }

  // Base de démo créée avant l'espace admin
  if (config.seedDemo && !(await db.one("SELECT 1 FROM users WHERE email = 'admin@selline.cm'"))) {
    await ensureAdmin(db, 'admin@selline.cm', 'demo1234')
    console.log('👑 Compte admin de démo créé : admin@selline.cm (mot de passe : demo1234)')
  }

  const server = createApp({ db, config }).listen(config.port, () => {
    console.log(`✅ API Selline sur http://localhost:${config.port}/api  (base : Neon PostgreSQL)`)
  })

  const stop = async () => {
    server.close(async () => {
      await db.close()
      process.exit(0)
    })
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main().catch((err) => {
  console.error('❌ Erreur au démarrage :', err)
  process.exit(1)
})
