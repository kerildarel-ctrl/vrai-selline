import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, FolderTree, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Notice, PageTitle } from '../../components/AdminUi'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Alert, ErrorState, PageLoader, Spinner } from '../../components/States'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import type { AdminCategory } from '../../lib/types'

export default function AdminCategories() {
  const { data, error, loading, reload } = useAsync(() => api.adminCategories(), [])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [confirm, setConfirm] = useState<AdminCategory | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }

  const add = async (e: FormEvent) => {
    e.preventDefault(); setAdding(true); setFormError(null)
    try { await api.adminCreateCategory(name.trim()); setName(''); reload(); say('Catégorie ajoutée') }
    catch (err) { setFormError(err instanceof Error ? err.message : 'Erreur') }
    finally { setAdding(false) }
  }
  const rename = async () => {
    if (!editing) return
    setBusy(true)
    try { await api.adminRenameCategory(editing.id, editing.name.trim()); setEditing(null); reload(); say('Catégorie renommée') }
    catch (err) { say(err instanceof Error ? err.message : 'Erreur') }
    finally { setBusy(false) }
  }
  const remove = async (c: AdminCategory) => {
    setBusy(true)
    try { await api.adminDeleteCategory(c.id); reload(); say(`« ${c.name} » supprimée`) }
    catch (err) { say(err instanceof Error ? err.message : 'Erreur') }
    finally { setBusy(false); setConfirm(null) }
  }

  return (
    <div>
      <PageTitle title="Catégories" subtitle="Les catégories affichées dans la boutique" />

      <form onSubmit={add} className="card mb-5 p-4">
        <label htmlFor="new-cat" className="mb-2 block text-sm font-semibold">Nouvelle catégorie</label>
        {formError && <div className="mb-3"><Alert>{formError}</Alert></div>}
        <div className="flex gap-2">
          <input id="new-cat" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex. : Sport et loisirs" className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
          <button type="submit" disabled={adding || name.trim().length < 2} className="btn-primary px-5 py-2.5 text-sm">{adding ? <Spinner /> : <Plus size={16} />} Ajouter</button>
        </div>
      </form>

      {loading ? <PageLoader /> : error || !data ? <ErrorState message={error ?? 'Erreur'} onRetry={reload} /> : data.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500"><FolderTree className="mx-auto mb-3 text-slate-300" size={32} />Aucune catégorie. Ajoutez la première ci-dessus.</div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {editing?.id === c.id ? (
                <form onSubmit={(e) => { e.preventDefault(); void rename() }} className="flex min-w-0 flex-1 items-center gap-2">
                  <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} maxLength={40} aria-label="Nouveau nom" className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
                  <button type="submit" disabled={busy || editing.name.trim().length < 2} className="rounded-full bg-emerald-600 p-2 text-white disabled:opacity-50" aria-label="Enregistrer"><Check size={16} /></button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-slate-300 p-2" aria-label="Annuler"><X size={16} /></button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-slate-500">{c.productCount} produit{c.productCount > 1 ? 's' : ''}</p></div>
                  <button onClick={() => setEditing({ id: c.id, name: c.name })} className="rounded-full border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" aria-label={`Renommer ${c.name}`}><Pencil size={16} /></button>
                  <button onClick={() => setConfirm(c)} className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label={`Supprimer ${c.name}`}><Trash2 size={16} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirm && (
        <ConfirmDialog title={`Supprimer « ${confirm.name} » ?`} danger busy={busy} confirmLabel="Supprimer"
          message={confirm.productCount > 0
            ? `${confirm.productCount} produit${confirm.productCount > 1 ? 's' : ''} resteront en ligne mais n'auront plus de catégorie. Pensez à les reclasser.`
            : "Cette catégorie ne contient aucun produit."}
          onConfirm={() => void remove(confirm)} onCancel={() => setConfirm(null)} />
      )}
      <Notice message={notice} />
    </div>
  )
}
