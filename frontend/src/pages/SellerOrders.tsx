import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDate, formatPrice, statusLabels, statusStyles } from '../lib/format'
import type { OrderStatus } from '../lib/types'

const statuses: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function SellerOrders() {
  const { data, error, loading, reload, setData } = useAsync(() => api.sellerOrders(), [])
  const [busyId, setBusyId] = useState<string | null>(null)

  const change = async (id: string, status: OrderStatus) => {
    setBusyId(id)
    try {
      const updated = await api.updateOrderStatus(id, status)
      setData((prev) => prev?.map((o) => (o.id === id ? { ...o, ...updated } : o)) ?? prev)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusyId(null) }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold md:text-2xl">Commandes</h1>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data || data.length === 0 ? <EmptyState icon={<ShoppingBag size={28} />} title="Aucune commande" text="Les commandes de vos clients apparaîtront ici." />
        : (
          <ul className="space-y-3">
            {data.map((o) => (
              <li key={o.id} className="card p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.reference}</p>
                    <p className="text-xs text-slate-500">{o.customerName} · {formatDate(o.createdAt)}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusStyles[o.status]}`}>{statusLabels[o.status]}</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {o.items.map((i) => <li key={i.productId} className="flex justify-between gap-3"><span className="truncate">{i.name} × {i.qty}</span><span>{formatPrice(i.price * i.qty)}</span></li>)}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="font-bold">{formatPrice(o.total)}</span>
                  <select value={o.status} disabled={busyId === o.id} onChange={(e) => change(o.id, e.target.value as OrderStatus)} aria-label="Changer le statut" className="rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-selline-yellow">
                    {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
