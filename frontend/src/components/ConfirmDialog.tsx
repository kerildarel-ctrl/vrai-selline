import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Spinner } from './States'

interface Props {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  /** Affiche un champ « motif » (facultatif) transmis à onConfirm */
  askReason?: boolean
  busy?: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

/** Fenêtre de confirmation pour les actions sensibles (suspension, blocage, suppression). */
export default function ConfirmDialog({ title, message, confirmLabel, danger = false, askReason = false, busy = false, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle size={20} /></span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>
        {askReason && (
          <label className="mt-4 block text-sm font-medium">Motif (facultatif)
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex. : contenu inapproprié" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Le vendeur en sera informé.</span>
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Annuler</button>
          <button onClick={() => onConfirm(reason.trim() || undefined)} disabled={busy} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-selline-dark hover:opacity-90'} disabled:opacity-60`}>
            {busy && <Spinner />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
