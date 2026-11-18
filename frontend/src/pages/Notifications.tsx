import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import Shell from '../components/Shell'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useCounters } from '../context/CountersContext'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export default function Notifications() {
  const navigate = useNavigate()
  const { refresh } = useCounters()
  const { data, error, loading, reload, setData } = useAsync(() => api.notifications(), [])
  const unread = data?.filter((n) => !n.read).length ?? 0

  const open = async (id: string, link?: string | null, read?: boolean) => {
    if (!read) {
      setData((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev)
      api.readNotification(id).then(refresh).catch(() => { /* non bloquant */ })
    }
    if (link) navigate(link)
  }

  const readAll = async () => {
    setData((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev)
    try { await api.readAllNotifications(); await refresh() } catch { await reload() }
  }

  return (
    <Shell title="Notifications" back={false}>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data || data.length === 0 ? <EmptyState icon={<Bell size={28} />} title="Aucune notification" text="Vos alertes de commande et de livraison apparaîtront ici." />
        : (
          <>
            {unread > 0 && (
              <div className="mb-3 flex justify-end">
                <button onClick={readAll} className="link inline-flex items-center gap-1.5 text-sm"><CheckCheck size={16} /> Tout marquer comme lu</button>
              </div>
            )}
            <ul className="card divide-y divide-slate-50 overflow-hidden">
              {data.map((n) => (
                <li key={n.id}>
                  <button onClick={() => open(n.id, n.link, n.read)} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-yellow-50/60'}`}>
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-selline-orange'}`} aria-label={n.read ? undefined : 'Non lue'} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.read ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-sm text-slate-500">{n.body}</span>}
                      <span className="mt-1 block text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
    </Shell>
  )
}
