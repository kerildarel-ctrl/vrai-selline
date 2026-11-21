import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Check, MessageCircle, Minus, Plus, Share2, ShoppingCart, Store, Truck, X, XCircle } from 'lucide-react'
import Img from '../components/Img'
import Rating from '../components/Rating'
import Reviews from '../components/Reviews'
import FavoriteButton from '../components/FavoriteButton'
import Carousel from '../components/Carousel'
import ProductCard from '../components/ProductCard'
import { ErrorState, PageLoader } from '../components/States'
import { MobileBar } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Product } from '../lib/types'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { user } = useAuth()
  const { track } = useRecentlyViewed()
  const [contacting, setContacting] = useState(false)
  const { data: product, error, loading, reload } = useAsync(() => api.product(id), [id])
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [similar, setSimilar] = useState<Product[]>([])

  // Tracker le produit vu
  useEffect(() => { if (product?.id) track(product.id) }, [product?.id])

  useEffect(() => {
    if (!product?.category?.id) {
      setSimilar([])
      return
    }
    let cancelled = false
    api.products({ category: product.category.id, limit: 7 })
      .then((res) => {
        if (!cancelled) {
          const filtered = res.items.filter((p) => p.id !== product.id).slice(0, 6)
          setSimilar(filtered)
        }
      })
      .catch(() => {
        if (!cancelled) setSimilar([])
      })
    return () => { cancelled = true }
  }, [product?.id, product?.category?.id])

  if (loading) return <><MobileBar title="Produit" /><PageLoader /></>
  if (error || !product) return <><MobileBar title="Produit" /><ErrorState message={error ?? 'Produit introuvable'} onRetry={reload} /></>

  const images = product.images.length ? product.images : [null]
  const title = `${product.name}${product.brand ? ` – ${product.brand}` : ''}`

  const addToCart = () => {
    add(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }
  const buyNow = () => { add(product, qty); navigate('/checkout') }

  const contactSeller = async () => {
    if (!user) { navigate('/login', { state: { from: `/product/${product.id}` } }); return }
    setContacting(true)
    try {
      const c = await api.startConversation({ shopId: product.shop.id, productId: product.id })
      navigate(`/messages/${c.id}`)
    } catch (e) { alert(e instanceof Error ? e.message : 'Conversation impossible') }
    finally { setContacting(false) }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `${product.name} sur Selline`, url })
      } catch {
        // Annulation utilisateur
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback
      }
    }
  }

  const actions = (
    <>
      <button onClick={addToCart} disabled={!product.inStock} className="btn-primary btn-block">
        {added ? <><Check size={18} /> Ajouté au panier</> : <><ShoppingCart size={18} /> Ajouter au panier</>}
      </button>
      <button onClick={buyNow} disabled={!product.inStock} className="btn-secondary btn-block">Acheter maintenant</button>
    </>
  )

  return (
    <>
      <MobileBar title={product.name} back action={<Link to="/cart" className="p-2" aria-label="Panier"><ShoppingCart size={22} /></Link>} />
      <div className="page py-4 pb-32 md:py-8 md:pb-8">
        <nav className="mb-4 hidden text-sm text-slate-500 md:block" aria-label="Fil d'Ariane">
          <Link to="/home" className="hover:underline">Accueil</Link> /{' '}
          {product.category && <><Link to={`/products?category=${product.category.id}`} className="hover:underline">{product.category.name}</Link> / </>}
          <span className="text-selline-dark font-medium">{product.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* Galerie avec Zoom au clic */}
          <div>
            <div
              className="card relative cursor-zoom-in overflow-hidden group"
              onClick={() => images[active] && setZoomOpen(true)}
              title="Cliquer pour agrandir"
            >
              <Img src={images[active]} alt={product.name} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
              <FavoriteButton productId={product.id} className="absolute right-3 top-3 !h-10 !w-10 z-10" />
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    aria-label={`Image ${i + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition md:h-20 md:w-20 ${
                      i === active ? 'ring-selline-yellow shadow-sm' : 'ring-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modal plein écran Zoom */}
          {zoomOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm transition-opacity"
              onClick={() => setZoomOpen(false)}
            >
              <div
                className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setZoomOpen(false)}
                  className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur transition hover:bg-slate-900"
                  aria-label="Fermer le zoom"
                >
                  <X size={20} />
                </button>
                <img
                  src={images[active] ?? ''}
                  alt={product.name}
                  className="max-h-[85vh] max-w-[85vw] object-contain"
                />
              </div>
            </div>
          )}

          {/* Infos */}
          <div className="space-y-4">
            <div className="card p-5 md:p-6">
              <h1 className="text-xl font-bold leading-snug md:text-2xl text-selline-dark">{title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="flex items-center gap-1.5 text-sm text-teal-700">
                  <Store size={14} /> Boutique {product.shop.name}
                  {product.shop.verified && (
                    <span title="Vendeur vérifié" className="inline-flex items-center gap-0.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-xs font-bold text-teal-700 ring-1 ring-teal-200">
                      <BadgeCheck size={13} /> Vérifié
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={contactSeller}
                  disabled={contacting}
                  className="link inline-flex items-center gap-1.5 text-sm"
                >
                  <MessageCircle size={14} /> Contacter le vendeur
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-selline-dark transition"
                >
                  <Share2 size={14} />
                  {copied ? <span className="font-semibold text-emerald-600">Lien copié !</span> : <span>Partager</span>}
                </button>
              </div>

              <div className="mt-2.5"><Rating value={product.rating} count={product.reviewCount} size={16} /></div>

              {/* Prix corrigé en text-selline-dark */}
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-selline-dark">{formatPrice(product.price)}</p>

              <p className="mt-2 flex items-center gap-1.5 text-sm">
                <Truck size={16} className="text-teal-700" />
                {product.freeShipping
                  ? <span className="font-semibold text-teal-700">Livraison GRATUITE</span>
                  : <span className="text-slate-600">Livraison {formatPrice(product.shippingFee)}</span>}
              </p>
              <p className={`mt-1.5 flex items-center gap-1.5 text-sm font-semibold ${product.inStock ? 'text-emerald-600' : 'text-red-600'}`}>
                {product.inStock ? <><Check size={15} className="stroke-[3]" /> En stock</> : <><XCircle size={15} /> Rupture de stock</>}
              </p>


              {product.inStock && (
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-sm font-medium">Quantité</span>
                  <div className="flex items-center rounded-full border border-slate-200">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5" aria-label="Diminuer"><Minus size={16} /></button>
                    <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)} className="p-2.5" aria-label="Augmenter"><Plus size={16} /></button>
                  </div>
                </div>
              )}

              <div className="mt-6 hidden space-y-3 md:block">{actions}</div>
            </div>

            {product.description && (
              <div className="card p-5 md:p-6">
                <h2 className="mb-2 font-bold text-selline-dark">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Produits similaires */}
        {similar.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-selline-dark">
                Produits similaires
              </h2>
              {product.category && (
                <Link
                  to={`/products?category=${product.category.id}`}
                  className="link text-sm font-semibold"
                >
                  Voir toute la catégorie →
                </Link>
              )}
            </div>
            <Carousel>
              {similar.map((p) => (
                <div key={p.id} className="w-44 shrink-0 sm:w-56 md:w-60">
                  <ProductCard product={p} />
                </div>
              ))}
            </Carousel>
          </section>
        )}

        {/* Section Avis */}
        <div className="mt-12">
          <Reviews productId={product.id} />
        </div>
      </div>

      {/* Barre d'achat mobile */}
      <div className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white p-3 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">{actions}</div>
      </div>
    </>
  )
}
