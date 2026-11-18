import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react'

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} aria-label="Chargement" />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-selline-yellow" />
      </div>
      <p className="text-sm font-medium">Chargement…</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
        <AlertTriangle size={28} />
      </div>
      <h3 className="mb-1 font-bold text-selline-dark">Quelque chose s'est mal passé</h3>
      <p className="text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-dark mt-6 gap-2 px-6 py-2.5 text-sm">
          <RefreshCw size={15} /> Réessayer
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <Inbox size={28} />}
      </div>
      <h2 className="text-lg font-bold text-selline-dark">{title}</h2>
      {text && <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Alert({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' }) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
  return (
    <div role="alert" className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>
      {children}
    </div>
  )
}
