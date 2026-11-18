import { config } from './config.js'
import { ensureCategories, openDb } from './db.js'
import { seedDemo } from './seed.js'

const db = openDb(config.dbPath)
ensureCategories(db)
console.log(seedDemo(db, config)
  ? '🌱 Données de démonstration créées (demo@selline.cm / vendeur@selline.cm, mot de passe : demo1234).'
  : 'La base contient déjà des utilisateurs : rien à faire. (npm run reset pour repartir de zéro)')
db.close()
