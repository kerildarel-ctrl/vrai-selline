import { useState } from 'react'
import { ExternalLink, Package, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionButton, Notice, PageTitle, SearchInput, td, th } from '../../components/AdminUi'
import ConfirmDialog from '../../components/ConfirmDialog'
import Img from '../../components/Img'
import Pagination from '../../components/Pagination'
import { EmptyState, ErrorState } from '../../components/States'
import { usePagedList } from '../../hooks/usePagedList'
import { api } from '../../lib/api'
import { formatDate, formatPrice } from '../../lib/format'
import type { AdminProduct } from '../../lib/types'

export default function AdminProducts() {
  const list = usePagedList((q) => api.adminProducts(q))
  const [confirm, setConfirm] = useState<AdminProduct | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }

  const remove = async (p: AdminProduct, reason?: string) => {
    setBusy(true)
    try { await api.adminDeleteProduct(p.id, reason); list.remove(p.id); say(`« ${p.name} » supprimé`) }
    catch (e) { say(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusy(false); setConfirm(null) }
  }

  return (
    <div>
      <PageTitle title="Produits" subtitle={list.data ? `${list.data.total} produit${list.data.total > 1 ? 's' : ''}` : 'Retirez les produits inappropriés'} />
      <div className="mb-4"><SearchInput value={list.q} onChange={list.setQ} placeholder="Produit, marque, boutique…" /></div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} />
        : !list.data && list.loading ? <div className="skeleton h-64 rounded-xl" />
        : list.data && list.data.items.length === 0 ? <EmptyState icon={<Package size={28} />} title="Aucun produit" text="Aucun résultat pour cette recherche." />
        : list.data && (
          <>
            <ul className={`space-y-3 md:hidden ${list.loading ? 'opacity-60' : ''}`}>
              {list.data.items.map((p) => (
                <li key={p.id} className="card flex gap-3 p-3">
                  <Img src={p.image ?? undefined} alt="" className="h-20 w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.shop.name} · {p.category ?? 'Sans catégorie'}</p>
                    <p className="mt-1 text-sm font-semibold">{formatPrice(p.price)} <span className="text-xs font-normal text-slate-500">· stock {p.stock}</span></p>
                    <div className="mt-2 flex items-center gap-2">
                      <Link to={`/product/${p.id}`} target="_blank" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Voir ${p.name}`}><ExternalLink size={16} /></Link>
                      <ActionButton tone="danger" onClick={() => setConfirm(p)} disabled={busy}>Supprimer</ActionButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className={`card hidden overflow-x-auto md:block ${list.loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[52rem]">
                <thead className="border-b border-slate-100 bg-slate-50"><tr>
                  <th className={th}>Produit</th><th className={th}>Boutique</th><th className={th}>Catégorie</th><th className={`${th} text-right`}>Prix</th><th className={`${th} text-right`}>Stock</th><th className={th}>Avis</th><th className={th}>Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className={td}><div className="flex items-center gap-3">
                        <Img src={p.image ?? undefined} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
                        <div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">Ajouté le {formatDate(p.createdAt)}</p></div>
                      </div></td>
                      <td className={td}>{p.shop.name}</td>
                      <td className={td}>{p.category ?? <span className="text-slate-400">Sans catégorie</span>}</td>
                      <td className={`${td} text-right font-semibold`}>{formatPrice(p.price)}</td>
                      <td className={`${td} text-right`}>{p.stock}</td>
                      <td className={td}>
                        {p.reviewCount > 0
                          ? <span className="inline-flex items-center gap-1"><Star size={13} className="fill-selline-yellow text-selline-yellow" />{p.rating.toFixed(1)} <span className="text-slate-400">({p.reviewCount})</span></span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={td}><div className="flex items-center gap-2">
                        <Link to={`/product/${p.id}`} target="_blank" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Voir ${p.name}`}><ExternalLink size={16} /></Link>
                        <ActionButton tone="danger" onClick={() => setConfirm(p)} disabled={busy}>Supprimer</ActionButton>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pages={list.data.pages} onPage={list.setPage} />
          </>
        )}

      {confirm && (
        <ConfirmDialog title={`Supprimer « ${confirm.name} » ?`} danger askReason busy={busy} confirmLabel="Supprimer"
          message={`Ce produit de « ${confirm.shop.name} » sera définitivement supprimé, avec ses avis et ses favoris. Les commandes déjà passées sont conservées.`}
          onConfirm={(reason) => void remove(confirm, reason)} onCancel={() => setConfirm(null)} />
      )}
      <Notice message={notice} />
    </div>
  )
}
