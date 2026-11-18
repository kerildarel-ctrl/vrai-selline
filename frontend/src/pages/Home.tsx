import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard, { ProductGrid, ProductGridSkeleton } from '../components/ProductCard'
import Carousel from '../components/Carousel'
import Img from '../components/Img'
import { EmptyState, ErrorState } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useCategories } from '../hooks/useCategories'
import { api } from '../lib/api'
import type { Category, Product } from '../lib/types'
import { ArrowRight, Package, Sparkles, Tag, Truck } from 'lucide-react'

const tileH = 'h-64 sm:h-72 lg:h-[22rem]'

const TABS = [
  { key: 'popular',      label: 'Populaires',       icon: Sparkles, sort: 'popular'  },
  { key: 'newest',       label: 'Nouveautés',        icon: Tag,      sort: 'newest'   },
  { key: 'free',         label: 'Livraison offerte', icon: Truck,    sort: 'popular'  },
] as const
type TabKey = typeof TABS[number]['key']

/** Grande tuile catégorie */
function CategoryTile({ category, image, className = '' }: { category: Category; image?: string; className?: string }) {
  return (
    <Link
      to={`/products?category=${category.id}`}
      className={`group relative overflow-hidden rounded-2xl bg-slate-800 ${tileH} ${className}`}
    >
      <Img src={image} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110 opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-lg font-bold text-white drop-shadow-sm">{category.name}</h2>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/80">
          Voir la sélection <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  )
}

/** Carte catégorie dans le carousel */
function CategoryCard({ category, items }: { category: Category; items: Product[] }) {
  const shown = items.slice(0, 4)
  return (
    <div className="flex w-60 shrink-0 snap-start flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06] sm:w-72" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.04),0 4px 20px rgba(15,23,42,.07)' }}>
      <h3 className="text-[15px] font-bold">{category.name}</h3>
      <Link to={`/products?category=${category.id}`} className={`mt-3 grid flex-1 gap-2 ${shown.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {shown.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl bg-slate-100">
            <Img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" />
          </div>
        ))}
        {shown.length === 0 && (
          <div className="col-span-2 flex h-24 items-center justify-center rounded-xl bg-slate-100">
            <Package size={28} className="text-slate-400" />
          </div>
        )}
      </Link>
      <Link to={`/products?category=${category.id}`} className="link mt-3 text-xs">
        Voir tout
      </Link>
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('popular')

  const popular  = useAsync(() => api.products({ sort: 'popular', limit: 30 }), [])
  const newest   = useAsync(() => api.products({ sort: 'newest',  limit: 30 }), [])
  const freeship = useAsync(() => api.products({ sort: 'popular', freeShipping: 1, limit: 30 }), [])
  const { categories } = useCategories()

  const tabData: Record<TabKey, { loading: boolean; error: string | null; items: Product[] }> = {
    popular:  { loading: popular.loading,  error: popular.error,  items: popular.data?.items  ?? [] },
    newest:   { loading: newest.loading,   error: newest.error,   items: newest.data?.items   ?? [] },
    free:     { loading: freeship.loading, error: freeship.error, items: freeship.data?.items ?? [] },
  }

  const current = tabData[activeTab]

  // Pour les tuiles catégories, on prend les produits populaires
  const allTop = popular.data?.items ?? []
  const byCategory = categories.map((c) => ({
    category: c,
    items: allTop.filter((p) => p.category?.id === c.id),
  }))
  const tiles = byCategory.filter((x) => x.items.length > 0).slice(0, 3)

  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-selline-navy/60 to-transparent" />

      <div className="page-wide relative space-y-6 pb-12 pt-4">

        {/* Tuiles catégories */}
        {(popular.loading || tiles.length > 0) && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            {popular.loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${tileH} rounded-2xl`} />)
              : tiles.map(({ category, items }, i) => (
                  <CategoryTile key={category.id} category={category} image={items[0]?.images[0]} className={i === 2 ? 'col-span-2 lg:col-span-1' : ''} />
                ))}
          </div>
        )}

        {/* Carousel catégories */}
        {byCategory.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Parcourir par catégorie</h2>
            <Carousel>
              {byCategory.map(({ category, items }) => <CategoryCard key={category.id} category={category} items={items} />)}
            </Carousel>
          </section>
        )}

        {/* Onglets filtres */}
        <section className="card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === key
                    ? 'border-b-2 border-selline-yellow bg-selline-yellow/5 text-selline-dark'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Contenu de l'onglet */}
          <div className="p-4">
            {current.error && <ErrorState message={current.error} />}

            {current.loading ? (
              <ProductGridSkeleton count={8} />
            ) : current.items.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title="Aucun produit"
                text={activeTab === 'free' ? 'Aucun produit avec livraison offerte pour le moment.' : 'Aucun produit disponible.'}
                action={<Link to="/products" className="btn-primary">Parcourir tout</Link>}
              />
            ) : (
              <ProductGrid>
                {current.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </ProductGrid>
            )}

            {/* Voir plus */}
            {current.items.length > 0 && (
              <div className="mt-5 text-center">
                <Link
                  to={activeTab === 'free' ? '/products?freeShipping=1' : `/products?sort=${TABS.find(t => t.key === activeTab)?.sort}`}
                  className="btn-outline inline-flex items-center gap-2 px-6"
                >
                  Voir plus <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
