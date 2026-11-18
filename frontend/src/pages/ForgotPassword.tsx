import { useState } from 'react'
import type { FormEvent } from 'react'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import { Alert, Spinner } from '../components/States'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.forgotPassword(email.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Indiquez votre e-mail, nous vous enverrons un lien de réinitialisation." back="/login">
      {done ? (
        <Alert kind="success">Si un compte existe pour cette adresse, un e-mail vient d'être envoyé.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <Field label="Adresse e-mail" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
          <button type="submit" disabled={busy} className="btn-primary btn-block">{busy && <Spinner />} Envoyer le lien</button>
        </form>
      )}
    </AuthShell>
  )
}
