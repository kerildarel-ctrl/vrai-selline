import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import { Alert, Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'

const CRITERIA = [
  { id: 'len',   label: '8 caractères minimum',      test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Une lettre majuscule (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Une lettre minuscule (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un chiffre (0-9)',           test: (p: string) => /[0-9]/.test(p) },
  { id: 'spec',  label: 'Un symbole (@, #, !, %…)',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password: string) {
  return CRITERIA.filter(c => c.test(password)).length
}

const STRENGTH_LABELS = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = getStrength(password)
  const color = STRENGTH_COLORS[score]
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : '#e2e8f0' }} />
        ))}
      </div>
      <p className="text-xs font-semibold transition-colors" style={{ color }}>
        {STRENGTH_LABELS[score]}
      </p>
      <ul className="space-y-1">
        {CRITERIA.map(c => {
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

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const change = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (getStrength(form.password) < 5) { setError('Votre mot de passe ne respecte pas tous les critères de sécurité.'); return }
    setBusy(true); setError(null)
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        password:  form.password,
      })
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Quelques informations et vous êtes prêt." back="/login">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom"  name="firstName" autoComplete="given-name"  value={form.firstName} onChange={change} required />
          <Field label="Nom"     name="lastName"  autoComplete="family-name" value={form.lastName}  onChange={change} required />
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
