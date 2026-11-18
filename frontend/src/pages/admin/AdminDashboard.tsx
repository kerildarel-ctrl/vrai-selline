import { Link } from 'react-router-dom'
import { CircleDollarSign, ShoppingBag, Store, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, PageTitle } from '../../components/AdminUi'
import { ErrorState, PageLoader } from '../../components/States'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPrice, statusLabels } from '../../lib/format'

function StatCard({ icon, label, value, lines, tone }: { icon: ReactNode; label: string; value: string; lines: ReactNode[]; tone: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: s, error, loading, reload } = useAsync(() => api.adminStats(), [])
  if (loading) return <PageLoader />
  if (error || !s) return <ErrorState message={error ?? 'Erreur'} onRetry={reload} />

  const maxRevenue = Math.max(...s.series.map((d) => d.revenue), 1)
  const periodRevenue = s.series.reduce((a, d) => a + d.revenue, 0)
  const periodOrders = s.series.reduce((a, d) => a + d.orders, 0)

  return (
    <div>
      <PageTitle title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme" />

      {s.shops.awaitingVerification > 0 && (
        <Link to="/admin/shops?status=unverified" className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-100">
          <span><b>{s.shops.awaitingVerification}</b> boutique{s.shops.awaitingVerification > 1 ? 's' : ''} en attente de vérification</span>
          <span className="font-semibold underline underline-offset-2">Examiner</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users size={22} />} label="Utilisateurs" value={String(s.users.total)} tone="bg-blue-50 text-blue-600"
          lines={[`${s.users.buyers} acheteurs · ${s.users.sellers} vendeurs`, `${s.users.newThisWeek} nouveau${s.users.newThisWeek > 1 ? 'x' : ''} cette semaine`, s.users.blocked > 0 ? <span className="text-red-600">{s.users.blocked} bloqué{s.users.blocked > 1 ? 's' : ''}</span> : 'Aucun compte bloqué']} />
        <StatCard icon={<Store size={22} />} label="Boutiques" value={String(s.shops.total)} tone="bg-violet-50 text-violet-600"
          lines={[`${s.shops.verified} vérifiée${s.shops.verified > 1 ? 's' : ''}`, `${s.shops.awaitingVerification} en attente`, s.shops.suspended > 0 ? <span className="text-red-600">{s.shops.suspended} suspendue{s.shops.suspended > 1 ? 's' : ''}</span> : 'Aucune suspendue']} />
        <StatCard icon={<ShoppingBag size={22} />} label="Commandes" value={String(s.orders.total)} tone="bg-amber-50 text-amber-600"
          lines={[`${s.orders.today} aujourd'hui`, `${s.orders.pending} en attente`, `${s.products} produits en ligne`]} />
        <StatCard icon={<CircleDollarSign size={22} />} label="Chiffre d'affaires" value={formatPrice(s.revenue.total)} tone="bg-emerald-50 text-emerald-600"
          lines={[`${formatPrice(s.revenue.month)} ce mois-ci`, 'Commandes annulées exclues']} />
      </div>

      <section className="card mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">14 derniers jours</h2>
          <p className="text-sm text-slate-500">{periodOrders} commande{periodOrders > 1 ? 's' : ''} · {formatPrice(periodRevenue)}</p>
        </div>
        <div className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Chiffre d'affaires par jour">
          {s.series.map((d) => (
            <div key={d.date} className="group flex h-full flex-1 flex-col justify-end" title={`${formatDate(d.date)} : ${formatPrice(d.revenue)}, ${d.orders} commande${d.orders > 1 ? 's' : ''}`}>
              <div className={`w-full rounded-t-md transition ${d.revenue > 0 ? 'bg-selline-yellow group-hover:bg-selline-orange' : 'bg-slate-100'}`} style={{ height: `${Math.max(d.revenue > 0 ? 6 : 3, (d.revenue / maxRevenue) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 text-[10px] text-slate-400 sm:gap-2">
          {s.series.map((d, i) => <span key={d.date} className="flex-1 text-center">{(s.series.length - 1 - i) % 2 === 0 ? d.date.slice(8) : ''}</span>)}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Dernières commandes</h2></div>
          {s.recentOrders.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Aucune commande pour le moment.</p> : (
            <ul className="divide-y divide-slate-100">
              {s.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.reference}</p>
                    <p className="truncate text-xs text-slate-500">{o.customerName} · {formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : o.status === 'pending' ? 'amber' : 'blue'}>{statusLabels[o.status]}</Badge>
                    <span className="w-24 text-right font-bold">{formatPrice(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold">Activité des administrateurs</h2>
          {s.recentActions.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Aucune action pour le moment.</p> : (
            <ul className="divide-y divide-slate-100">
              {s.recentActions.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <p>{a.summary}</p>
                  <p className="text-xs text-slate-400">{formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
