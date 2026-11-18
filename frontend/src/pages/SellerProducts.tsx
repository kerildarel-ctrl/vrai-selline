import { Link } from 'react-router-dom'
import { FileSpreadsheet, Pencil, Plus, Trash2, Package } from 'lucide-react'
import Img from '../components/Img'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'

export default function SellerProducts() {
  const { data, error, loading, reload } = useAsync(() => api.sellerProducts(), [])

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer « ${name} » ?`)) return
    try { await api.deleteProduct(id); await reload() } catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold md:text-2xl">Mes produits</h1>
        <div className="flex items-center gap-2">
          <Link to="/seller/products/import" className="btn-outline px-3 py-2.5 text-sm flex items-center gap-1.5"><FileSpreadsheet size={16} /> Import CSV</Link>
          <Link to="/seller/products/new" className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> Ajouter</Link>
        </div>
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data || data.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title="Aucun produit" text="Ajoutez votre premier produit pour commencer à vendre." action={<Link to="/seller/products/new" className="btn-primary">Ajouter un produit</Link>} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.map((p) => (
              <li key={p.id} className="card flex items-center gap-3 p-3">
                <Img src={p.images[0]} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-sm font-bold">{formatPrice(p.price)}</p>
                  <p className={`text-xs ${p.inStock ? 'text-emerald-600' : 'text-red-600'}`}>{p.inStock ? `En stock${p.stock !== undefined ? ` (${p.stock})` : ''}` : 'Rupture'}</p>
                </div>
                <Link to={`/seller/products/${p.id}`} className="rounded-full p-2.5 text-slate-500 transition hover:bg-slate-100" aria-label="Modifier"><Pencil size={18} /></Link>
                <button onClick={() => remove(p.id, p.name)} className="rounded-full p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
