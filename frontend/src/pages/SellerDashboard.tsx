import { Link } from 'react-router-dom'
import { BadgeCheck, BarChart3, Clock, Package, Plus, ShoppingBag, Wallet } from 'lucide-react'
import { ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDate, formatPrice, statusLabels, statusStyles } from '../lib/format'

export default function SellerDashboard() {
  const { user } = useAuth()
  const stats = useAsync(() => api.sellerStats(), [])
  const orders = useAsync(() => api.sellerOrders(), [])

  const cards = stats.data ? [
    { label: 'Commandes du jour', value: String(stats.data.ordersToday), icon: ShoppingBag, color: 'bg-sky-50 text-sky-600' },
    { label: 'Revenus du mois', value: formatPrice(stats.data.revenueMonth), icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Produits actifs', value: String(stats.data.activeProducts), icon: Package, color: 'bg-amber-50 text-amber-600' },
    { label: 'À traiter', value: String(stats.data.pendingOrders), icon: Clock, color: 'bg-violet-50 text-violet-600' },
  ] : []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">Tableau de bord</h1>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-500">
            {user?.shop?.name}
            {user?.shop?.verified && (
              <BadgeCheck size={16} className="shrink-0 text-teal-500" aria-label="Boutique vérifiée" />
            )}
          </p>
        </div>
        <Link to="/seller/products/new" className="btn-primary shrink-0 px-4 py-2.5 text-sm"><Plus size={16} /> Produit</Link>
      </div>

      {stats.loading ? <PageLoader /> : stats.error ? <ErrorState message={stats.error} onRetry={stats.reload} /> : (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card p-4 md:p-5">
              <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}><c.icon size={18} /></span>
              <p className="truncate text-lg font-bold md:text-2xl">{c.value}</p>
              <p className="mt-0.5 text-xs text-slate-500 md:text-sm">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3 md:hidden">
        {[{ icon: Package, label: 'Produits', to: '/seller/products' }, { icon: ShoppingBag, label: 'Commandes', to: '/seller/orders' }, { icon: BarChart3, label: 'Tableau', to: '/seller' }].map((a) => (
          <Link key={a.label} to={a.to} className="card flex flex-col items-center gap-1.5 p-3 active:scale-95"><a.icon size={22} /><span className="text-xs font-medium">{a.label}</span></Link>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3 md:px-5">
          <h2 className="font-semibold">Commandes récentes</h2>
          <Link to="/seller/orders" className="link text-sm">Voir tout</Link>
        </div>
        {orders.loading ? <PageLoader /> : orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} />
          : !orders.data || orders.data.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Aucune commande pour le moment.</p>
          : orders.data.slice(0, 5).map((o, i, arr) => (
            <div key={o.id} className={`flex items-center justify-between gap-3 px-4 py-3 md:px-5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="min-w-0"><p className="text-sm font-medium">{o.reference}</p><p className="truncate text-xs text-slate-500">{o.customerName} · {formatDate(o.createdAt)}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-bold">{formatPrice(o.total)}</p><span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${statusStyles[o.status]}`}>{statusLabels[o.status]}</span></div>
            </div>
          ))}
      </section>
    </div>
  )
}
