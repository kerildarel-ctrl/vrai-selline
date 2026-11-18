import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Store } from 'lucide-react'
import { ActionButton, Badge, FilterChips, Notice, PageTitle, SearchInput, td, th } from '../../components/AdminUi'
import ConfirmDialog from '../../components/ConfirmDialog'
import Pagination from '../../components/Pagination'
import { EmptyState, ErrorState } from '../../components/States'
import { usePagedList } from '../../hooks/usePagedList'
import { api } from '../../lib/api'
import { formatDate, formatPrice } from '../../lib/format'
import type { AdminShop } from '../../lib/types'

type Status = '' | 'verified' | 'unverified' | 'suspended'
const filters: { value: Status; label: string }[] = [
  { value: '', label: 'Toutes' }, { value: 'unverified', label: 'À vérifier' }, { value: 'verified', label: 'Vérifiées' }, { value: 'suspended', label: 'Suspendues' },
]

export default function AdminShops() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as Status
  const list = usePagedList((q) => api.adminShops(q), { status })
  const [confirm, setConfirm] = useState<AdminShop | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }
  const update = async (shop: AdminShop, change: { verified?: boolean; suspended?: boolean }, done: string) => {
    setBusy(true)
    try { list.replace(await api.adminUpdateShop(shop.id, change)); say(done) }
    catch (e) { say(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusy(false); setConfirm(null) }
  }

  const statusBadges = (s: AdminShop) => (
    <div className="flex flex-wrap gap-1.5">
      {s.verified ? <Badge tone="green"><BadgeCheck size={13} className="mr-1" />Vérifiée</Badge> : <Badge tone="amber">Non vérifiée</Badge>}
      {s.suspended && <Badge tone="red">Suspendue</Badge>}
      {s.owner.blocked && <Badge tone="red">Propriétaire bloqué</Badge>}
    </div>
  )
  const actions = (s: AdminShop) => (
    <div className="flex flex-wrap gap-1.5">
      {s.verified
        ? <ActionButton onClick={() => void update(s, { verified: false }, `Badge retiré à « ${s.name} »`)} disabled={busy}>Retirer le badge</ActionButton>
        : <ActionButton tone="success" onClick={() => void update(s, { verified: true }, `« ${s.name} » est vérifiée`)} disabled={busy}>Vérifier</ActionButton>}
      {s.suspended
        ? <ActionButton tone="success" onClick={() => setConfirm(s)} disabled={busy}>Réactiver</ActionButton>
        : <ActionButton tone="danger" onClick={() => setConfirm(s)} disabled={busy}>Suspendre</ActionButton>}
    </div>
  )

  return (
    <div>
      <PageTitle title="Boutiques" subtitle={list.data ? `${list.data.total} boutique${list.data.total > 1 ? 's' : ''}` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips value={status} options={filters} onChange={(v) => setParams(v ? { status: v } : {})} />
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Boutique, ville, propriétaire…" />
      </div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} />
        : !list.data && list.loading ? <div className="skeleton h-64 rounded-xl" />
        : list.data && list.data.items.length === 0 ? <EmptyState icon={<Store size={28} />} title="Aucune boutique" text="Aucun résultat pour ces critères." />
        : list.data && (
          <>
            <ul className={`space-y-3 md:hidden ${list.loading ? 'opacity-60' : ''}`}>
              {list.data.items.map((s) => (
                <li key={s.id} className="card space-y-3 p-4">
                  <div><p className="font-bold">{s.name}</p><p className="text-xs text-slate-500">{s.city ?? '—'} · créée le {formatDate(s.createdAt)}</p></div>
                  <p className="text-sm">{s.owner.name} <span className="text-xs text-slate-500">· {s.owner.email}</span></p>
                  <p className="text-xs text-slate-500">{s.productCount} produit{s.productCount > 1 ? 's' : ''} · {s.orderCount} commande{s.orderCount > 1 ? 's' : ''} · {formatPrice(s.revenue)}</p>
                  {statusBadges(s)}
                  {actions(s)}
                </li>
              ))}
            </ul>
            <div className={`card hidden overflow-x-auto md:block ${list.loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[56rem]">
                <thead className="border-b border-slate-100 bg-slate-50"><tr>
                  <th className={th}>Boutique</th><th className={th}>Propriétaire</th><th className={`${th} text-right`}>Produits</th><th className={`${th} text-right`}>Commandes</th><th className={`${th} text-right`}>Ventes</th><th className={th}>Statut</th><th className={th}>Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.items.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className={td}><p className="font-semibold">{s.name}</p><p className="text-xs text-slate-500">{s.city ?? '—'} · créée le {formatDate(s.createdAt)}</p></td>
                      <td className={td}><p>{s.owner.name}</p><p className="text-xs text-slate-500">{s.owner.email}</p></td>
                      <td className={`${td} text-right`}>{s.productCount}</td>
                      <td className={`${td} text-right`}>{s.orderCount}</td>
                      <td className={`${td} text-right font-semibold`}>{formatPrice(s.revenue)}</td>
                      <td className={td}>{statusBadges(s)}</td>
                      <td className={td}>{actions(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pages={list.data.pages} onPage={list.setPage} />
          </>
        )}

      {confirm && (
        <ConfirmDialog
          title={confirm.suspended ? `Réactiver « ${confirm.name} » ?` : `Suspendre « ${confirm.name} » ?`}
          message={confirm.suspended
            ? 'Ses produits seront de nouveau visibles et le vendeur pourra reprendre son activité.'
            : 'Ses produits disparaîtront du site, il ne sera plus possible de les acheter, et le vendeur ne pourra plus modifier son catalogue. Il en sera informé.'}
          confirmLabel={confirm.suspended ? 'Réactiver' : 'Suspendre'} danger={!confirm.suspended} busy={busy}
          onConfirm={() => void update(confirm, { suspended: !confirm.suspended }, confirm.suspended ? `« ${confirm.name} » est réactivée` : `« ${confirm.name} » est suspendue`)}
          onCancel={() => setConfirm(null)} />
      )}
      <Notice message={notice} />
    </div>
  )
}
