import { useParams } from 'react-router-dom'
import Img from '../components/Img'
import PageHeader from '../components/PageHeader'
import { ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDate, formatPrice, paymentLabels, statusLabels, statusStyles } from '../lib/format'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const { data: o, error, loading, reload } = useAsync(() => api.order(id), [id])
  if (loading) return <><PageHeader title="Commande" /><PageLoader /></>
  if (error || !o) return <><PageHeader title="Commande" /><ErrorState message={error ?? 'Commande introuvable'} onRetry={reload} /></>

  return (
    <>
      <PageHeader title={`Commande ${o.reference}`} />
      <div className="page py-4 md:pt-0">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="card flex items-center justify-between p-5">
            <div><p className="text-sm text-slate-500">Passée le {formatDate(o.createdAt)}</p><p className="font-semibold">{paymentLabels[o.paymentMethod]}</p></div>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyles[o.status]}`}>{statusLabels[o.status]}</span>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Articles</h2>
            <ul className="divide-y divide-slate-100">
              {o.items.map((i) => (
                <li key={i.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Img src={i.image} alt={i.name} className="h-14 w-14 shrink-0 rounded-xl" />
                  <span className="flex-1 text-sm">{i.name}<span className="block text-slate-400">× {i.qty}</span></span>
                  <span className="text-sm font-semibold">{formatPrice(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>
          {o.address && (
            <section className="card p-5 text-sm text-slate-600">
              <h2 className="mb-2 font-semibold text-selline-dark">Livraison</h2>
              {o.address.fullName}<br />{o.address.quarter}, {o.address.city}<br />{o.address.phone}
            </section>
          )}
          <section className="card space-y-2 p-5">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total</span><span>{formatPrice(o.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Livraison</span><span>{o.shippingFee ? formatPrice(o.shippingFee) : 'Gratuite'}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold"><span>Total</span><span>{formatPrice(o.total)}</span></div>
          </section>
        </div>
      </div>
    </>
  )
}
