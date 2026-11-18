import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import { now, uid } from './lib.js'

/** Données de démonstration : comptes demo@selline.cm / vendeur@selline.cm (mot de passe : demo1234). */
export async function seedDemo(db, config) {
  const countRow = await db.one('SELECT COUNT(*) AS n FROM users')
  if (Number(countRow.n) > 0) return false
  fs.mkdirSync(config.uploadDir, { recursive: true })
  const hash = bcrypt.hashSync('demo1234', 10)

  const user = async (first, last, email, phone, city, role = 'buyer', pwd = hash) => {
    const id = uid()
    await db.run(
      'INSERT INTO users (id, first_name, last_name, email, phone, city, password_hash, role, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)',
      [id, first, last, email, phone, city, pwd, role, now()]
    )
    return id
  }
  const shop = async (owner, name, city, phone, description, verified) => {
    const id = uid()
    await db.run(
      'INSERT INTO shops (id, owner_id, name, city, phone, description, verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, owner, name, city, phone, description, verified, now()]
    )
    return id
  }

  await db.transaction(async (tx) => {
    const demo = await user('Kero', 'Demo', 'demo@selline.cm', '670000001', 'Yaoundé')
    const adminId = await user('Admin', 'Selline', 'admin@selline.cm', null, 'Yaoundé')
    await db.run('UPDATE users SET is_admin = true WHERE id = $1', [adminId])
    const seller1 = await user('Vendeur', 'Demo', 'vendeur@selline.cm', '670000002', 'Yaoundé', 'seller')
    await shop(seller1, 'Boutique Demo', 'Yaoundé', '670000002', 'Boutique de démonstration', true)
    const seller2 = await user('Tech', 'Mboa', 'tech@selline.cm', '699000000', 'Douala', 'seller')
    await shop(seller2, 'Tech Mboa', 'Douala', '699000000', null, false)
    const lockedPwd = bcrypt.hashSync(uid(), 10)
    await user('Amina', 'Ndongo', 'amina@example.cm', null, 'Douala', 'buyer', lockedPwd)
    await user('Paul', 'Essomba', 'paul@example.cm', null, 'Yaoundé', 'buyer', lockedPwd)
    await user('Chantal', 'Mbarga', 'chantal@example.cm', null, 'Bafoussam', 'buyer', lockedPwd)

    await tx.run(
      'INSERT INTO addresses (id, user_id, full_name, phone, city, quarter, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [uid(), demo, 'Kero Demo', '670000001', 'Yaoundé', 'Bastos', 'Près du rond-point', now()]
    )
    await tx.run(
      'INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES ($1, $2, $3, $4, $5, false, $6)',
      [uid(), demo, 'Bienvenue sur Selline 👋', 'Ceci est un compte de démonstration.', '/home', now()]
    )
  })
  return true
}
