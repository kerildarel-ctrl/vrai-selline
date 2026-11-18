import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, Check, ChevronLeft, ChevronRight, LayoutGrid, List, PackageSearch, ShoppingCart, SlidersHorizontal, Star, Tag, Truck } from 'lucide-react'
import ProductCard, { ProductGrid, ProductGridSkeleton } from '../components/ProductCard'
import Img from '../components/Img'
import FavoriteButton from '../components/FavoriteButton'
import Rating from '../components/Rating'
import { EmptyState, ErrorState } from '../components/States'
import { MobileBar } from '../components/PageHeader'
import { useCategories } from '../hooks/useCategories'
import { useCart } from '../context/CartContext'
import { getCategoryIcon } from '../components/Header'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Paginated, Product } from '../lib/types'

const sorts = [
  { value: 'popular', label: 'Popularité' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Nouveautés' },
]

const priceRanges = [
  { label: 'Tous les prix', min: '', max: '' },
  { label: "Jusqu'à 10 000 FCFA", min: '', max: '10000' },
  { label: '10 000 à 50 000 FCFA', min: '10000', max: '50000' },
  { label: '50 000 à 100 000 FCFA', min: '50000', max: '100000' },
  { label: 'Plus de 100 000 FCFA', min: '100000', max: '' },
]

const LIMIT = 24
const FILTER_KEYS = ['min', 'max', 'freeShipping', 'verified', 'rating']

function pageList(current: number, total: number): (number | '…')[] {
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push('…'); out.push(n) })
  return out
}

function ProductListItem({ product }: { product: Product }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  const isNew = 'createdAt' in product && typeof (product as { createdAt?: string }).createdAt === 'string'
    ? Date.now() - new Date((product as { createdAt: string }).createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false
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
      className="card group flex gap-3 p-3 transition duration-150 hover:shadow-pop sm:gap-4 sm:p-4"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
        <Img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        {!product.inStock && (
          <span className="badge-rupture absolute left-1 top-1 text-[10px] px-1.5 py-0.5">Rupture</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-selline-dark sm:text-base">
              {product.name}
            </h3>
            <FavoriteButton productId={product.id} className="shrink-0" />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">{product.shop.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Rating value={product.rating} count={product.reviewCount} size={12} />
            {isPopular && <span className="badge-popular text-[10px] py-0 px-1.5">Populaire</span>}
            {isNew && <span className="badge-new text-[10px] py-0 px-1.5">Nouveau</span>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-extrabold text-selline-dark sm:text-lg">{formatPrice(product.price)}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {product.freeShipping && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
                  <Truck size={12} /> Livraison offerte
                </span>
              )}
              {product.shop.verified && (
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck size={12} className="text-sky-600" /> Vérifié
                </span>
              )}
            </div>
          </div>

          {product.inStock && (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="btn-primary !px-3 !py-1.5 text-xs font-bold shrink-0"
              aria-label="Ajouter au panier"
            >
              {added ? <><Check size={14} className="stroke-[3]" /> Ajouté</> : <><ShoppingCart size={14} /> Ajouter</>}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'popular'
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''
  const freeShipping = params.get('freeShipping') === '1'
  const verified = params.get('verified') === '1'
  const rating = params.get('rating') ?? ''
  const { categories } = useCategories()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [result, setResult] = useState<Paginated<Product> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [minInput, setMinInput] = useState(min)
  const [maxInput, setMaxInput] = useState(max)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      setResult(await api.products({ q, category, sort, page, limit: LIMIT, min, max, freeShipping: freeShipping ? '1' : '', verified: verified ? '1' : '', rating }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [params.toString()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMinInput(min); setMaxInput(max) }, [min, max])

  const update = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k)
    if (!keepPage) next.delete('page')
    setParams(next)
  }
  const goToPage = (n: number) => { update({ page: n === 1 ? '' : String(n) }, true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const applyPrice = (e: FormEvent) => { e.preventDefault(); update({ min: minInput.trim(), max: maxInput.trim() }) }
  const clearFilters = () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length
  const current = categories.find((c) => c.id === category)
  const title = q ? `Résultats pour « ${q} »` : current ? current.name : 'Tous les produits'
  const items = result?.items ?? []
  const from = result && result.total > 0 ? (result.page - 1) * LIMIT + 1 : 0
  const to = from + items.length - 1

  const block = 'border-b border-slate-200 py-4 first:pt-0 last:border-0'
  const heading = 'mb-2 text-sm font-bold'
  const option = (active: boolean) => `block w-full rounded-md px-2 py-1 text-left text-sm transition hover:bg-slate-100 ${active ? 'bg-slate-100 font-bold text-selline-dark' : 'text-slate-700'}`

  const filters = (
    <div className="text-sm">
      <div className={block}>
        <h2 className={heading}>Catégorie</h2>
        <button onClick={() => update({ category: '' })} className={option(!category)}>
          <span className="inline-flex items-center gap-1.5"><Tag size={13} /> Toutes les catégories</span>
        </button>
        {categories.map((c) => {
          const CatIcon = getCategoryIcon(c)
          return (
            <button key={c.id} onClick={() => update({ category: c.id })} className={option(category === c.id)}>
              <span className="inline-flex items-center gap-1.5"><CatIcon size={13} />{c.name}</span>
            </button>
          )
        })}
      </div>

      <div className={block}>
        <h2 className={heading}>Avis clients</h2>
        {[['4', '4 étoiles et plus'], ['3', '3 étoiles et plus']].map(([v, label]) => (
          <button key={v} onClick={() => update({ rating: rating === v ? '' : v })} className={`${option(rating === v)} flex items-center gap-2`}>
            <span className="flex text-selline-yellow">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < Number(v) ? 'currentColor' : 'none'} className={i < Number(v) ? '' : 'text-slate-300'} />)}</span>
            {label}
          </button>
        ))}
      </div>

      <div className={block}>
        <h2 className={heading}>Prix</h2>
        {priceRanges.map((r) => <button key={r.label} onClick={() => update({ min: r.min, max: r.max })} className={option(min === r.min && max === r.max)}>{r.label}</button>)}
        <form onSubmit={applyPrice} className="mt-2 flex items-center gap-1.5">
          <input value={minInput} onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Min" aria-label="Prix minimum" className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
          <span className="text-slate-400">–</span>
          <input value={maxInput} onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Max" aria-label="Prix maximum" className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
          <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">OK</button>
        </form>
      </div>

      {/* Toggles stylisés avec fond vert (#10B981) quand actif */}
      <div className={block}>
        <h2 className={heading}>Livraison et vendeurs</h2>
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => update({ freeShipping: freeShipping ? '' : '1' })}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">Livraison offerte</span>
            <div
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                freeShipping ? 'bg-selline-green' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  freeShipping ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => update({ verified: verified ? '' : '1' })}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">Vendeurs vérifiés</span>
            <div
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                verified ? 'bg-selline-green' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  verified ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {activeFilters > 0 && <button onClick={clearFilters} className="link mt-3 text-sm">Effacer les filtres</button>}
    </div>
  )

  return (
    <>
      <MobileBar title={title} back />
      <div className="page-wide py-4 md:py-6">
        {/* Mobile : catégories en pastilles + filtres repliables */}
        <div className="mb-3 lg:hidden">
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:-mx-4 sm:px-4">
            <button onClick={() => update({ category: '' })} className={`chip inline-flex items-center gap-1.5 ${!category ? 'chip-active' : ''}`}>
              <Tag size={14} /> Tout
            </button>
            {categories.map((c) => {
              const CatIcon = getCategoryIcon(c)
              return (
                <button
                  key={c.id}
                  onClick={() => update({ category: c.id })}
                  className={`chip inline-flex items-center gap-1.5 ${category === c.id ? 'chip-active' : ''}`}
                >
                  <CatIcon size={14} />
                  <span>{c.name}</span>
                </button>
              )
            })}
          </div>
          <details className="mt-1 rounded-lg bg-white shadow-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
              <SlidersHorizontal size={16} /> Filtres{activeFilters > 0 && <span className="rounded-full bg-selline-yellow px-2 text-xs">{activeFilters}</span>}
            </summary>
            <div className="border-t border-slate-100 px-4 py-4">{filters}</div>
          </details>
        </div>

        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-6 xl:grid-cols-[17rem_1fr]">
          <aside className="hidden lg:block">{filters}</aside>

          <section className="min-w-0">
            {/* Barre de résultats avec toggle Grille/Liste et tri */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-900/5">
              <div>
                <h1 className="hidden text-lg font-bold md:block text-selline-dark">{title}</h1>
                <p className="text-sm text-slate-600">
                  {result ? (result.total === 0 ? 'Aucun résultat' : <>{from}-{to} sur <b>{result.total}</b> résultat{result.total > 1 ? 's' : ''}</>) : 'Chargement…'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle Grille / Liste */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Affichage en grille"
                    className={`rounded-md p-1.5 transition ${
                      viewMode === 'grid'
                        ? 'bg-white text-selline-dark shadow-sm'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="Affichage en liste"
                    className={`rounded-md p-1.5 transition ${
                      viewMode === 'list'
                        ? 'bg-white text-selline-dark shadow-sm'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <List size={18} />
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="hidden sm:inline">Trier par</span>
                  <select
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-sm font-semibold text-selline-dark focus:outline-none focus:ring-2 focus:ring-selline-yellow"
                  >
                    {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              viewMode === 'grid' ? (
                <ProductGridSkeleton count={12} dense />
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card flex gap-4 p-4">
                      <div className="skeleton h-24 w-24 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="skeleton h-4 w-3/4" />
                        <div className="skeleton h-3 w-1/3" />
                        <div className="skeleton h-5 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : items.length === 0 ? (
              <EmptyState icon={<PackageSearch size={28} />} title="Aucun produit trouvé" text={activeFilters > 0 ? 'Essayez de retirer des filtres.' : 'Essayez un autre mot-clé ou une autre catégorie.'} />
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <ProductGrid dense>{items.map((p) => <ProductCard key={p.id} product={p} />)}</ProductGrid>
                ) : (
                  <div className="space-y-3">
                    {items.map((p) => <ProductListItem key={p.id} product={p} />)}
                  </div>
                )}

                {result && result.pages > 1 && (
                  <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
                    <button onClick={() => goToPage(result.page - 1)} disabled={result.page <= 1} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /> Précédent</button>
                    {pageList(result.page, result.pages).map((n, i) => n === '…'
                      ? <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                      : <button key={n} onClick={() => goToPage(n)} aria-current={n === result.page ? 'page' : undefined} className={`h-10 min-w-10 rounded-md border px-3 text-sm font-medium ${n === result.page ? 'border-selline-dark bg-selline-dark text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>{n}</button>)}
                    <button onClick={() => goToPage(result.page + 1)} disabled={result.page >= result.pages} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">Suivant <ChevronRight size={16} /></button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
