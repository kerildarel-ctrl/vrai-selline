import { z } from 'zod'

const text = (label, min, max) =>
  z.string({ required_error: `${label} requis.`, invalid_type_error: `${label} invalide.` })
    .trim()
    .min(min, min <= 1 ? `${label} requis.` : `${label} : ${min} caractères minimum.`)
    .max(max, `${label} : ${max} caractères maximum.`)

const empty = (v) => (v === '' ? null : v)
const optText = (label, max) => z.preprocess(empty, z.string({ invalid_type_error: `${label} invalide.` }).trim().max(max, `${label} : ${max} caractères maximum.`).nullish())
const phoneRule = z.string({ invalid_type_error: 'Numéro de téléphone invalide.' }).trim().regex(/^\+?[0-9 .-]{8,20}$/, 'Numéro de téléphone invalide.')
const optPhone = z.preprocess(empty, phoneRule.nullish())
const passwordRule = z.string({ required_error: 'Mot de passe requis.', invalid_type_error: 'Mot de passe invalide.' })
  .min(8, 'Mot de passe : 8 caractères minimum.')
  .max(72, 'Mot de passe : 72 caractères maximum.')
  .refine((p) => /[A-Z]/.test(p), 'Mot de passe : au moins une lettre majuscule.')
  .refine((p) => /[a-z]/.test(p), 'Mot de passe : au moins une lettre minuscule.')
  .refine((p) => /[0-9]/.test(p), 'Mot de passe : au moins un chiffre.')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Mot de passe : au moins un caractère spécial (ex. @, #, !, %).')
const email = z.string({ required_error: 'Adresse e-mail requise.', invalid_type_error: 'Adresse e-mail invalide.' })
  .trim().toLowerCase().max(254, 'Adresse e-mail invalide.').email('Adresse e-mail invalide.')
const int = (label, min, max) =>
  z.number({ required_error: `${label} requis.`, invalid_type_error: `${label} invalide.` })
    .int(`${label} : nombre entier attendu.`)
    .min(min, `${label} : minimum ${min}.`)
    .max(max, `${label} : maximum ${max}.`)

// La vérification « image envoyée via /uploads » se fait dans les routes (isOwnUploadUrl).
const imageUrl = z.string({ invalid_type_error: "Adresse d'image invalide." }).trim().min(1, "Adresse d'image invalide.").max(500, "Adresse d'image invalide.")

export const registerSchema = z.object({
  firstName: text('Prénom', 1, 60), lastName: text('Nom', 1, 60), email, phone: optPhone, password: passwordRule,
})
export const loginSchema = z.object({
  email, password: z.string({ required_error: 'Mot de passe requis.' }).min(1, 'Mot de passe requis.').max(200),
})
export const forgotSchema = z.object({ email })

export const profileSchema = z.object({
  firstName: text('Prénom', 1, 60), lastName: text('Nom', 1, 60),
  phone: optPhone.optional(), city: optText('Ville', 80).optional(),
  avatar: z.preprocess(empty, imageUrl.nullish()).optional(),
})
export const passwordSchema = z.object({
  currentPassword: z.string({ required_error: 'Mot de passe actuel requis.' }).min(1, 'Mot de passe actuel requis.').max(200),
  newPassword: passwordRule,
})

export const addressSchema = z.object({
  fullName: text('Nom complet', 2, 100), phone: phoneRule, city: text('Ville', 1, 80),
  quarter: text('Quartier', 1, 100), details: optText('Précisions', 300),
})

export const shopSchema = z.object({
  name: text('Nom de la boutique', 2, 80), city: text('Ville', 1, 80), phone: phoneRule, description: optText('Description', 500),
})

export const productSchema = z.object({
  name: text('Nom du produit', 2, 120),
  brand: optText('Marque', 60),
  price: int('Prix', 1, 100_000_000),
  stock: int('Stock', 0, 100_000),
  categoryId: z.preprocess(empty, z.string().max(100).nullish()),
  description: optText('Description', 3000),
  freeShipping: z.boolean({ required_error: 'Livraison gratuite : oui ou non.', invalid_type_error: 'Livraison gratuite : oui ou non.' }),
  shippingFee: int('Frais de livraison', 0, 1_000_000),
  images: z.array(imageUrl, { required_error: 'Ajoutez au moins une photo.', invalid_type_error: 'Photos invalides.' })
    .max(8, '8 photos maximum.'),
})

export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string({ required_error: 'Produit invalide.' }).min(1).max(100),
    qty: int('Quantité', 1, 99),
  }), { required_error: 'Votre panier est vide.' }).min(1, 'Votre panier est vide.').max(50, 'Panier trop volumineux (50 articles maximum).'),
  addressId: z.string({ required_error: 'Choisissez une adresse de livraison.' }).min(1, 'Choisissez une adresse de livraison.'),
  paymentMethod: z.enum(['mobile', 'card', 'cod'], { errorMap: () => ({ message: 'Mode de paiement invalide.' }) }),
  paymentPhone: z.preprocess(empty, z.string().trim().max(20).nullish()),
})

export const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], { errorMap: () => ({ message: 'Statut invalide.' }) }),
})

export const reviewSchema = z.object({
  rating: int('Note', 1, 5),
  comment: text('Commentaire', 3, 1000),
})

export const conversationSchema = z.object({
  shopId: z.string({ required_error: 'Boutique requise.' }).min(1).max(100),
  productId: z.preprocess(empty, z.string().max(100).nullish()),
})
export const messageSchema = z.object({ text: text('Message', 1, 2000) })

// ---------- Administration ----------
export const adminShopSchema = z.object({
  verified: z.boolean({ invalid_type_error: 'Valeur invalide.' }).optional(),
  suspended: z.boolean({ invalid_type_error: 'Valeur invalide.' }).optional(),
}).refine((b) => b.verified !== undefined || b.suspended !== undefined, { message: 'Aucune modification demandée.' })

export const adminUserSchema = z.object({ blocked: z.boolean({ required_error: 'Valeur requise.', invalid_type_error: 'Valeur invalide.' }) })
export const categorySchema = z.object({ name: text('Nom de la catégorie', 2, 40) })
