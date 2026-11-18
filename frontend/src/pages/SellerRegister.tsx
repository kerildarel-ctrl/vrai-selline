import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import { Alert, Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function SellerRegister() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', city: user?.city ?? '', phone: user?.phone ?? '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      await api.createShop({ ...form, description: form.description || undefined })
      await refresh()
      navigate('/seller', { replace: true })
    } catch (err) { setError(err instanceof Error ? err.message : 'Création impossible') }
    finally { setBusy(false) }
  }

  return (
    <AuthShell title="Ouvrir ma boutique" subtitle="Présentez votre boutique, vous ajouterez vos produits ensuite." back="/profile">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Nom de la boutique" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Field label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="desc" className="label">Description (facultatif)</label>
          <textarea id="desc" rows={3} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary btn-block">{busy && <Spinner />} Créer ma boutique</button>
      </form>
    </AuthShell>
  )
}
