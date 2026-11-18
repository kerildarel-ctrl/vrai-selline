import { Link, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Shell from '../components/Shell'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export default function Messages() {
  const base = useLocation().pathname.startsWith('/seller') ? '/seller/messages' : '/messages'
  const { data, error, loading, reload } = useAsync(() => api.conversations(), [])

  return (
    <Shell title="Messages" back={false}>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data || data.length === 0 ? (
          <EmptyState icon={<MessageCircle size={28} />} title="Aucune conversation" text="Écrivez à un vendeur depuis la fiche d'un produit." action={base === '/messages' ? <Link to="/products" className="btn-primary">Parcourir les produits</Link> : undefined} />
        ) : (
          <ul className="card divide-y divide-slate-50 overflow-hidden">
            {data.map((c) => (
              <li key={c.id}>
                <Link to={`${base}/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-selline-dark font-bold text-white">{c.title[0]?.toUpperCase() ?? '?'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.title}</p>
                      {c.lastAt && <time className="shrink-0 text-xs text-slate-400" dateTime={c.lastAt}>{formatDate(c.lastAt)}</time>}
                    </div>
                    {c.productName && <p className="truncate text-xs text-teal-700">{c.productName}</p>}
                    <p className={`truncate text-sm ${c.unread ? 'font-medium text-selline-dark' : 'text-slate-500'}`}>{c.lastMessage ?? 'Nouvelle conversation'}</p>
                  </div>
                  {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-selline-orange px-1.5 text-xs font-bold text-white">{c.unread}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Shell>
  )
}
