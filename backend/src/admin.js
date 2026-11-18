import bcrypt from 'bcryptjs'
import { now, uid } from './lib.js'

/**
 * Crée un administrateur, ou promeut un compte existant. Réservé au serveur (script ou variables d'environnement) :
 * aucune route de l'API ne permet de devenir administrateur.
 */
export async function ensureAdmin(db, email, password) {
  email = String(email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.')
  const existing = await db.one('SELECT id, is_admin FROM users WHERE LOWER(email) = $1', [email])
  if (existing) {
    if (existing.is_admin) return 'déjà administrateur'
    await db.run('UPDATE users SET is_admin = true, blocked = false WHERE id = $1', [existing.id])
    return 'promu administrateur'
  }
  if (!password || password.length < 8) throw new Error("Ce compte n'existe pas : fournissez un mot de passe de 8 caractères minimum pour le créer.")
  await db.run(
    'INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_admin, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)',
    [uid(), 'Admin', 'Selline', email, bcrypt.hashSync(password, 10), 'buyer', now()]
  )
  return 'créé'
}
