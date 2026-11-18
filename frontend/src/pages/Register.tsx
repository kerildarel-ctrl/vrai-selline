import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import { Alert, Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

// ---------- Critères de robustesse ----------
const CRITERIA = [
  { id: 'len',   label: '8 caractères minimum',      test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Une lettre majuscule (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Une lettre minuscule (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un chiffre (0-9)',           test: (p: string) => /[0-9]/.test(p) },
  { id: 'spec',  label: 'Un symbole (@, #, !, %…)',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password: string) {
  return CRITERIA.filter((c) => c.test(password)).length
}

const STRENGTH_LABELS = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = getStrength(password)
  const color = STRENGTH_COLORS[score]
  return (
    <div className="mt-2 space-y-2">
      {/* Barre */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : '#e2e8f0' }}
          />
        ))}
      </div>
      {/* Label force */}
      <p className="text-xs font-semibold transition-colors" style={{ color }}>
        {STRENGTH_LABELS[score]}
      </p>
      {/* Critères */}
      <ul className="space-y-1">
        {CRITERIA.map((c) => {
          const ok = c.test(password)
          return (
            <li key={c.id} className="flex items-center gap-2 text-xs">
              <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${ok ? 'bg-green-500' : 'bg-slate-200'}`}>
                {ok
                  ? <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                }
              </span>
              <span className={ok ? 'text-green-700 font-medium' : 'text-slate-400'}>{c.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- Page ----------
export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  const change = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (getStrength(form.password) < 5) {
      setError('Votre mot de passe ne respecte pas tous les critères de sécurité.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setResendBusy(true)
    try {
      await api.resendVerification(form.email.trim())
      setResendDone(true)
    } catch { /* silencieux */ } finally {
      setResendBusy(false)
    }
  }

  // ---------- Écran de confirmation ----------
  if (done) {
    return (
      <AuthShell title="Vérifiez votre e-mail" subtitle="Un e-mail de confirmation vous a été envoyé." back="/register">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-700 font-medium">Un lien de confirmation a été envoyé à</p>
            <p className="text-teal-700 font-semibold text-lg break-all">{form.email}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-1">
            <p className="text-sm font-semibold text-amber-800">📋 Étapes à suivre :</p>
            <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
              <li>Ouvrez votre boîte mail</li>
              <li>Cliquez sur le lien dans l'e-mail Selline</li>
              <li>Votre compte sera activé et vous accéderez directement à l'accueil</li>
            </ol>
            <p className="text-xs text-amber-600 mt-2">⚠️ Vérifiez aussi vos <strong>spams / courriers indésirables</strong></p>
          </div>
          {resendDone ? (
            <Alert kind="success">E-mail renvoyé ! Vérifiez votre boîte mail.</Alert>
          ) : (
            <div className="text-sm text-slate-500">
              Vous n'avez pas reçu l'e-mail ?{' '}
              <button onClick={resend} disabled={resendBusy} className="font-semibold text-teal-700 hover:underline underline-offset-2 disabled:opacity-50">
                {resendBusy ? 'Envoi...' : "Renvoyer l'e-mail"}
              </button>
            </div>
          )}
          <Link to="/login" className="btn-primary btn-block mt-2">Aller à la connexion</Link>
        </div>
      </AuthShell>
    )
  }

  // ---------- Formulaire d'inscription ----------
  return (
    <AuthShell title="Créer un compte" subtitle="Quelques informations et vous êtes prêt." back="/login">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" name="firstName" autoComplete="given-name" value={form.firstName} onChange={change} required />
          <Field label="Nom" name="lastName" autoComplete="family-name" value={form.lastName} onChange={change} required />
        </div>
        <Field label="Adresse e-mail" type="email" name="email" autoComplete="email" value={form.email} onChange={change} placeholder="vous@exemple.com" required />
        <Field label="Téléphone" type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={change} placeholder="+237 6XX XXX XXX" required />

        <div>
          <Field label="Mot de passe" type="password" name="password" autoComplete="new-password" value={form.password} onChange={change} required />
          <PasswordStrength password={form.password} />
        </div>

        <Field label="Confirmer le mot de passe" type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={change} placeholder="Retapez votre mot de passe" required />

        <button type="submit" disabled={busy || getStrength(form.password) < 5} className="btn-primary btn-block mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {busy && <Spinner />} Créer mon compte
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà un compte ? <Link to="/login" className="font-medium text-selline-dark underline underline-offset-2">Se connecter</Link>
      </p>
    </AuthShell>
  )
}
