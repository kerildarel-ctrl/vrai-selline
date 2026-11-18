import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDate, formatPrice, statusLabels, statusStyles } from '../lib/format'

export default function Orders() {
  const { data, error, loading, reload } = useAsync(() => api.orders(), [])
  return (
    <>
      <PageHeader title="Mes commandes" back={false} />
      <div className="page py-4 md:pt-0">
        {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} />
          : !data || data.length === 0 ? (
            <EmptyState icon={<Package size={28} />} title="Aucune commande" text="Vos commandes apparaîtront ici." action={<Link to="/home" className="btn-primary">Découvrir les produits</Link>} />
          ) : (
            <ul className="mx-auto grid max-w-3xl gap-3">
              {data.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="card block p-4 transition hover:shadow-pop">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Package size={20} /></span>
                        <div>
                          <p className="text-sm font-semibold">{o.reference}</p>
                          <p className="text-xs text-slate-500">{formatDate(o.createdAt)} · {o.items.length} article{o.items.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusStyles[o.status]}`}>{statusLabels[o.status]}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm font-bold">{formatPrice(o.total)}</span>
                      <span className="link inline-flex items-center text-sm">Voir le détail <ChevronRight size={16} /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </div>
    </>
  )
}
