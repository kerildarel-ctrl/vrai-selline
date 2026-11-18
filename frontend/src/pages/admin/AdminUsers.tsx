import { useState } from 'react'
import { Users } from 'lucide-react'
import { ActionButton, Badge, FilterChips, Notice, PageTitle, SearchInput, td, th } from '../../components/AdminUi'
import Avatar from '../../components/Avatar'
import ConfirmDialog from '../../components/ConfirmDialog'
import Pagination from '../../components/Pagination'
import { EmptyState, ErrorState } from '../../components/States'
import { useAuth } from '../../context/AuthContext'
import { usePagedList } from '../../hooks/usePagedList'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import type { AdminUser } from '../../lib/types'

type Filter = '' | 'buyer' | 'seller' | 'admin' | 'blocked'
const options: { value: Filter; label: string }[] = [
  { value: '', label: 'Tous' }, { value: 'buyer', label: 'Acheteurs' }, { value: 'seller', label: 'Vendeurs' }, { value: 'admin', label: 'Admins' }, { value: 'blocked', label: 'Bloqués' },
]

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [filter, setFilter] = useState<Filter>('')
  const list = usePagedList((q) => api.adminUsers(q), filter === 'blocked' ? { status: 'blocked' } : filter ? { role: filter } : {})
  const [confirm, setConfirm] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }

  const toggle = async (u: AdminUser) => {
    setBusy(true)
    try {
      const updated = await api.adminBlockUser(u.id, !u.blocked)
      if (filter === 'blocked' && !updated.blocked) list.remove(u.id); else list.replace(updated)
      say(updated.blocked ? `${u.firstName} ${u.lastName} est bloqué(e)` : `${u.firstName} ${u.lastName} est débloqué(e)`)
    } catch (e) { say(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusy(false); setConfirm(null) }
  }

  const roleBadge = (u: AdminUser) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {u.isAdmin ? <Badge tone="blue">Admin</Badge> : u.role === 'seller' ? <Badge tone="amber">Vendeur</Badge> : <Badge>Acheteur</Badge>}
      {u.shopName && <span className="text-xs text-slate-500">{u.shopName}</span>}
    </div>
  )
  const action = (u: AdminUser) =>
    u.isAdmin || u.id === me?.id ? <span className="text-xs text-slate-400">—</span>
      : u.blocked ? <ActionButton tone="success" onClick={() => void toggle(u)} disabled={busy}>Débloquer</ActionButton>
      : <ActionButton tone="danger" onClick={() => setConfirm(u)} disabled={busy}>Bloquer</ActionButton>

  return (
    <div>
      <PageTitle title="Utilisateurs" subtitle={list.data ? `${list.data.total} compte${list.data.total > 1 ? 's' : ''}` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips value={filter} options={options} onChange={setFilter} />
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Nom, e-mail, téléphone…" />
      </div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} />
        : !list.data && list.loading ? <div className="skeleton h-64 rounded-xl" />
        : list.data && list.data.items.length === 0 ? <EmptyState icon={<Users size={28} />} title="Aucun utilisateur" text="Aucun résultat pour ces critères." />
        : list.data && (
          <>
            <ul className={`space-y-3 md:hidden ${list.loading ? 'opacity-60' : ''}`}>
              {list.data.items.map((u) => (
                <li key={u.id} className="card space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} className="h-10 w-10" fallbackClassName="bg-slate-200 text-slate-700 text-xs" />
                    <div className="min-w-0"><p className="font-bold">{u.firstName} {u.lastName}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div>
                    <div className="ml-auto">{u.blocked ? <Badge tone="red">Bloqué</Badge> : <Badge tone="green">Actif</Badge>}</div>
                  </div>
                  {roleBadge(u)}
                  <p className="text-xs text-slate-500">{u.phone ?? 'Pas de téléphone'} · {u.orderCount} commande{u.orderCount > 1 ? 's' : ''} · inscrit le {formatDate(u.createdAt)}</p>
                  {action(u)}
                </li>
              ))}
            </ul>
            <div className={`card hidden overflow-x-auto md:block ${list.loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[52rem]">
                <thead className="border-b border-slate-100 bg-slate-50"><tr>
                  <th className={th}>Utilisateur</th><th className={th}>Contact</th><th className={th}>Rôle</th><th className={`${th} text-right`}>Commandes</th><th className={th}>Inscrit le</th><th className={th}>Statut</th><th className={th}>Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className={td}><div className="flex items-center gap-3">
                        <Avatar user={u} className="h-9 w-9" fallbackClassName="bg-slate-200 text-slate-700 text-xs" />
                        <div className="min-w-0"><p className="font-semibold">{u.firstName} {u.lastName}</p><p className="text-xs text-slate-500">{u.city ?? '—'}</p></div>
                      </div></td>
                      <td className={td}><p>{u.email}</p><p className="text-xs text-slate-500">{u.phone ?? '—'}</p></td>
                      <td className={td}>{roleBadge(u)}</td>
                      <td className={`${td} text-right`}>{u.orderCount}</td>
                      <td className={td}>{formatDate(u.createdAt)}</td>
                      <td className={td}>{u.blocked ? <Badge tone="red">Bloqué</Badge> : <Badge tone="green">Actif</Badge>}</td>
                      <td className={td}>{action(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pages={list.data.pages} onPage={list.setPage} />
          </>
        )}

      {confirm && (
        <ConfirmDialog title={`Bloquer ${confirm.firstName} ${confirm.lastName} ?`} danger busy={busy} confirmLabel="Bloquer"
          message={`${confirm.email} ne pourra plus se connecter, et sa session en cours sera coupée.${confirm.shopName ? ` Les produits de « ${confirm.shopName} » seront masqués.` : ''} Vous pourrez le débloquer à tout moment.`}
          onConfirm={() => void toggle(confirm)} onCancel={() => setConfirm(null)} />
      )}
      <Notice message={notice} />
    </div>
  )
}
