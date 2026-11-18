import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Check, ShoppingCart, Truck } from 'lucide-react'
import type { Product } from '../lib/types'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import Img from './Img'
import FavoriteButton from './FavoriteButton'
import Rating from './Rating'

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  // Badge Nouveau si créé il y a moins de 7 jours (si le champ createdAt existe)
  const isNew = 'createdAt' in product && typeof (product as { createdAt?: string }).createdAt === 'string'
    ? Date.now() - new Date((product as { createdAt: string }).createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false

  // Badge Populaire si au moins 5 avis et note >= 4
  const isPopular = product.reviewCount >= 5 && product.rating >= 4

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.inStock) return
    add(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <Img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {/* Badges statut */}
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1 items-start">
          {!product.inStock && (
            <span className="badge-rupture">Rupture</span>
          )}
          {isNew && (
            <span className="badge-new">Nouveau</span>
          )}
          {isPopular && (
            <span className="badge-popular">Populaire</span>
          )}
        </div>

        <FavoriteButton productId={product.id} className="absolute right-2 top-2 z-10" />

        {/* Bouton d'ajout rapide au survol */}
        {product.inStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Ajouter ${product.name} au panier`}
            className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center gap-1.5 rounded-xl bg-selline-yellow py-2 text-xs font-bold text-selline-dark shadow-md opacity-0 transition-all duration-200 group-hover:opacity-100 hover:brightness-95 active:scale-95"
          >
            {added ? (
              <>
                <Check size={14} className="text-emerald-700 stroke-[3]" />
                <span className="text-emerald-800">Ajouté !</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug sm:text-[15px]">{product.name}</h3>
        <div className="mt-1.5"><Rating value={product.rating} count={product.reviewCount} size={12} /></div>
        <p className="mt-2 text-base font-extrabold tracking-tight text-selline-dark sm:text-lg">{formatPrice(product.price)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 truncate">
          {product.shop.name}
          {product.shop.verified && (
            <BadgeCheck size={13} className="shrink-0 text-teal-500" title="Boutique vérifiée" />
          )}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-slate-500">
          {product.freeShipping && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
              <Truck size={13} /> Livraison offerte
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ProductGrid({ children, dense = false }: { children: React.ReactNode; dense?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${dense ? '2xl:grid-cols-6' : ''}`}>
      {children}
    </div>
  )
}

export function ProductGridSkeleton({ count = 10, dense = false }: { count?: number; dense?: boolean }) {
  return (
    <ProductGrid dense={dense}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-5 w-2/3" />
          </div>
        </div>
      ))}
    </ProductGrid>
  )
}
