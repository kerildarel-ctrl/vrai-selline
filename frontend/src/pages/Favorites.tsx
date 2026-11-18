import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductCard, { ProductGrid, ProductGridSkeleton } from '../components/ProductCard'
import { EmptyState, ErrorState } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useFavorites } from '../context/FavoritesContext'
import { api } from '../lib/api'

export default function Favorites() {
  const { data, error, loading, reload } = useAsync(() => api.favorites(), [])
  const { ids } = useFavorites()
  // Un produit retiré des favoris disparaît tout de suite de la liste
  const items = (data ?? []).filter((p) => ids.has(p.id))

  return (
    <>
      <PageHeader title="Mes favoris" subtitle="Les produits que vous avez enregistrés" />
      <div className="page py-4 md:pt-0">
        {loading ? <ProductGridSkeleton count={5} /> : error ? <ErrorState message={error} onRetry={reload} />
          : items.length === 0 ? (
            <EmptyState icon={<Heart size={28} />} title="Aucun favori" text="Touchez le cœur d'un produit pour le retrouver ici." action={<Link to="/products" className="btn-primary">Découvrir les produits</Link>} />
          ) : <ProductGrid>{items.map((p) => <ProductCard key={p.id} product={p} />)}</ProductGrid>}
      </div>
    </>
  )
}
