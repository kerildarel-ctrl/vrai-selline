import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareWarning, Star } from 'lucide-react'
import { ActionButton, FilterChips, Notice, PageTitle, SearchInput } from '../../components/AdminUi'
import ConfirmDialog from '../../components/ConfirmDialog'
import Pagination from '../../components/Pagination'
import { EmptyState, ErrorState } from '../../components/States'
import { usePagedList } from '../../hooks/usePagedList'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import type { AdminReview } from '../../lib/types'

const options = [{ value: '', label: 'Tous' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} étoile${n > 1 ? 's' : ''}` }))]


export default function AdminReviews() {
  const [rating, setRating] = useState('')
  const list = usePagedList((q) => api.adminReviews(q), rating ? { rating } : {})
  const [confirm, setConfirm] = useState<AdminReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }

  const remove = async (r: AdminReview) => {
    setBusy(true)
    try { await api.adminDeleteReview(r.id); list.remove(r.id); say('Avis supprimé') }
    catch (e) { say(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusy(false); setConfirm(null) }
  }

  return (
    <div>
      <PageTitle title="Avis" subtitle={list.data ? `${list.data.total} avis` : 'Supprimez les avis inappropriés'} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips value={rating} options={options} onChange={setRating} />
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Commentaire, produit, auteur…" />
      </div>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} />
        : !list.data && list.loading ? <div className="skeleton h-64 rounded-xl" />
        : list.data && list.data.items.length === 0 ? <EmptyState icon={<MessageSquareWarning size={28} />} title="Aucun avis" text="Aucun résultat pour ces critères." />
        : list.data && (
          <>
            <ul className={`space-y-3 ${list.loading ? 'opacity-60' : ''}`}>
              {list.data.items.map((r) => (
                <li key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex text-selline-yellow" aria-label={`${r.rating} sur 5`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill={i < r.rating ? 'currentColor' : 'none'} className={i < r.rating ? '' : 'text-slate-300'} />)}</span>
                      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 break-words text-sm">{r.comment}</p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Par <b>{r.author}</b> ({r.authorEmail}) sur <Link to={`/product/${r.product.id}`} target="_blank" className="link">{r.product.name}</Link>
                    </p>
                  </div>
                  <div className="shrink-0"><ActionButton tone="danger" onClick={() => setConfirm(r)} disabled={busy}>Supprimer</ActionButton></div>
                </li>
              ))}
            </ul>
            <Pagination page={list.data.page} pages={list.data.pages} onPage={list.setPage} />
          </>
        )}

      {confirm && (
        <ConfirmDialog title="Supprimer cet avis ?" danger busy={busy} confirmLabel="Supprimer"
          message={`L'avis de ${confirm.author} sur « ${confirm.product.name} » sera supprimé et la note du produit sera recalculée.`}
          onConfirm={() => void remove(confirm)} onCancel={() => setConfirm(null)} />
      )}
      <Notice message={notice} />
    </div>
  )
}
