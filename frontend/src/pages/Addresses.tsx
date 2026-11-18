import { useState } from 'react'
import type { FormEvent } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import { Alert, EmptyState, ErrorState, PageLoader, Spinner } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Addresses() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsync(() => api.addresses(), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ fullName: user ? `${user.firstName} ${user.lastName}` : '', phone: user?.phone ?? '', city: user?.city ?? '', quarter: '', details: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setFormError(null)
    try {
      await api.addAddress({ ...form, details: form.details || null })
      setOpen(false)
      await reload()
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erreur') }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    if (!confirm('Supprimer cette adresse ?')) return
    try { await api.deleteAddress(id); await reload() } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  return (
    <>
      <PageHeader title="Carnet d'adresses" />
      <div className="page py-4 md:pt-0">
        <div className="mx-auto max-w-2xl space-y-3">
          {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
            <>
              {data && data.length === 0 && !open && <EmptyState icon={<MapPin size={28} />} title="Aucune adresse" text="Ajoutez une adresse pour accélérer vos commandes." />}
              {data?.map((a) => (
                <div key={a.id} className="card flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><MapPin size={18} /></span>
                  <p className="flex-1 text-sm text-slate-600"><b className="text-selline-dark">{a.fullName}</b><br />{a.quarter}, {a.city}{a.details ? ` – ${a.details}` : ''}<br />{a.phone}</p>
                  <button onClick={() => remove(a.id)} className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 size={18} /></button>
                </div>
              ))}
              {open ? (
                <form onSubmit={submit} className="card space-y-4 p-5">
                  <h2 className="font-semibold">Nouvelle adresse</h2>
                  {formError && <Alert>{formError}</Alert>}
                  <Field label="Nom complet" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  <Field label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    <Field label="Quartier" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} required />
                  </div>
                  <Field label="Précisions (facultatif)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="btn-primary">{busy && <Spinner />} Enregistrer</button>
                    <button type="button" onClick={() => setOpen(false)} className="btn-outline">Annuler</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setOpen(true)} className="btn-dark btn-block"><Plus size={18} /> Ajouter une adresse</button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
