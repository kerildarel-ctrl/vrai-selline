import type { OrderStatus, PaymentMethod } from './types'

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(price)).replace(/ /g, ' ') + ' FCFA'
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-sky-50 text-sky-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

export const paymentLabels: Record<PaymentMethod, string> = {
  mobile: 'Mobile Money (MTN / Orange)',
  card: 'Carte bancaire',
  cod: 'Paiement à la livraison',
}

export function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

/** Redimensionne une image en carré (recadrage centré) et la renvoie en JPEG léger. */
export async function squareImage(file: File, size = 400): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image (JPG, PNG, WebP).')
  if (file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (15 Mo maximum).')
  const bmp = await createImageBitmap(file).catch(() => { throw new Error("Impossible de lire cette image.") })
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
  if (!blob) throw new Error("Impossible de traiter cette image.")
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}
