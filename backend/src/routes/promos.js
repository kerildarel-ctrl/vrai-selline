import { Router } from 'express'
import { z } from 'zod'

export default function promosRouter(db) {
  const r = Router()

  // Créer la table si elle n'existe pas
  db.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id          SERIAL PRIMARY KEY,
      code        TEXT UNIQUE NOT NULL,
      label       TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'percent',   -- 'percent' ou 'fixed'
      value       NUMERIC NOT NULL,                  -- % ou montant fixe en FCFA
      min_order   NUMERIC DEFAULT 0,
      max_uses    INT DEFAULT NULL,
      uses        INT DEFAULT 0,
      active      BOOLEAN DEFAULT TRUE,
      expires_at  TIMESTAMPTZ DEFAULT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `).then(async () => {
    // Codes de démonstration insérés une seule fois
    const demos = [
      { code: 'SELLINE10', label: '10% de réduction', type: 'percent', value: 10, min_order: 5000 },
      { code: 'BIENVENUE', label: '2 000 F offerts',  type: 'fixed',   value: 2000, min_order: 10000 },
      { code: 'LIVRAISON', label: 'Livraison gratuite (5 000 F)', type: 'fixed', value: 5000, min_order: 15000 },
    ]
    for (const d of demos) {
      await db.query(
        `INSERT INTO promo_codes (code, label, type, value, min_order)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`,
        [d.code, d.label, d.type, d.value, d.min_order]
      ).catch(() => {})
    }
  }).catch(() => {})

  // Valider un code promo
  r.post('/validate', async (req, res) => {
    const { code, total } = z.object({
      code:  z.string().min(1),
      total: z.number().min(0),
    }).parse(req.body)

    const promo = await db.oneOrNone(
      `SELECT * FROM promo_codes WHERE code = UPPER($1) AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses < max_uses)`,
      [code]
    )

    if (!promo) {
      return res.status(400).json({ error: 'Code promo invalide ou expiré.' })
    }
    if (total < promo.min_order) {
      return res.status(400).json({
        error: `Commande minimum de ${Number(promo.min_order).toLocaleString('fr-FR')} F pour ce code.`
      })
    }

    const discount = promo.type === 'percent'
      ? Math.round((total * Number(promo.value)) / 100)
      : Math.min(Number(promo.value), total)

    res.json({ code: promo.code, label: promo.label, discount, type: promo.type })
  })

  // Liste des codes (admin uniquement — simple vérification)
  r.get('/', async (req, res) => {
    const rows = await db.any('SELECT * FROM promo_codes ORDER BY created_at DESC')
    res.json(rows)
  })

  // Créer un code (admin)
  r.post('/', async (req, res) => {
    const b = z.object({
      code:      z.string().min(2).toUpperCase(),
      label:     z.string().min(1),
      type:      z.enum(['percent', 'fixed']),
      value:     z.number().positive(),
      min_order: z.number().default(0),
      max_uses:  z.number().nullable().default(null),
      expires_at: z.string().nullable().default(null),
    }).parse(req.body)

    const row = await db.one(
      `INSERT INTO promo_codes (code, label, type, value, min_order, max_uses, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.code, b.label, b.type, b.value, b.min_order, b.max_uses, b.expires_at]
    )
    res.status(201).json(row)
  })

  // Désactiver un code (admin)
  r.patch('/:id', async (req, res) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body)
    const row = await db.one(
      'UPDATE promo_codes SET active=$1 WHERE id=$2 RETURNING *',
      [active, req.params.id]
    )
    res.json(row)
  })

  return r
}
