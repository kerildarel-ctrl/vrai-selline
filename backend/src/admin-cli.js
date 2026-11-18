import { config } from './config.js'
import { ensureCategories, openDb } from './db.js'
import { ensureAdmin } from './admin.js'

// Usage : npm run admin -- email@exemple.cm [mot-de-passe]
const [email, password] = process.argv.slice(2)
if (!email) {
  console.error('Usage : npm run admin -- <e-mail> [mot-de-passe]\n  • compte existant : il devient administrateur\n  • compte inexistant : il est créé (mot de passe de 8 caractères minimum)')
  process.exit(1)
}
const db = openDb(config.dbPath)
ensureCategories(db)
try {
  console.log(`✅ ${email} : ${ensureAdmin(db, email, password)}.`)
} catch (e) {
  console.error(`✖ ${e.message}`)
  process.exitCode = 1
} finally {
  db.close()
}
