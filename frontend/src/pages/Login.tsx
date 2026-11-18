import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import { Alert, Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notVerified, setNotVerified] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotVerified(false)
    try {
      const user = await login(email.trim(), password)
      navigate(from ?? (user.isAdmin ? '/admin' : user.role === 'seller' ? '/seller' : '/home'), { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connexion impossible'
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setNotVerified(true)
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setResendBusy(true)
    try {
      await api.resendVerification(email.trim())
      setResendDone(true)
    } catch {
      // silencieux
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <AuthShell title="Connexion" subtitle="Bienvenue ! Connectez-vous pour accéder à votre compte." back="/">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        {notVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">E-mail non vérifié</p>
                <p className="text-amber-700 text-sm mt-1">
                  Vérifiez votre boîte mail et cliquez sur le lien de confirmation avant de vous connecter.
                </p>
                <p className="text-xs text-amber-600 mt-1">Vérifiez aussi vos <strong>spams</strong>.</p>
              </div>
            </div>
            {resendDone ? (
              <p className="text-sm text-teal-700 font-medium">✅ E-mail renvoyé ! Vérifiez votre boîte mail.</p>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={resendBusy || !email.trim()}
                className="w-full text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg py-2 px-4 transition disabled:opacity-50"
              >
                {resendBusy ? 'Envoi en cours...' : '🔄 Renvoyer l\'e-mail de vérification'}
              </button>
            )}
          </div>
        )}

        <Field label="Adresse e-mail" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
        <Field label="Mot de passe" type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" required />
        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-sm font-medium text-teal-700 hover:underline underline-offset-2">
            Mot de passe oublié ?
          </Link>
        </div>
        <button type="submit" disabled={busy} className="btn-primary btn-block gap-2">
          {busy && <Spinner />} Se connecter
        </button>
      </form>

      <div className="mt-8">
        <div className="relative flex items-center gap-3 py-2">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-xs font-medium text-slate-400">Pas encore de compte ?</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>
        <div className="mt-4 space-y-3">
          <Link to="/register" className="btn-outline btn-block">Créer un compte</Link>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Vous vendez ?{' '}
        <Link to="/register" className="font-semibold text-selline-dark hover:underline underline-offset-2">
          Ouvrir une boutique →
        </Link>
      </p>
    </AuthShell>
  )
}
