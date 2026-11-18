import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import Avatar from '../components/Avatar'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import { Alert, Spinner } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { squareImage } from '../lib/format'

export default function ProfileEdit() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '', city: user?.city ?? '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string; scope: 'profile' | 'pw' } | null>(null)
  const [busy, setBusy] = useState<'profile' | 'pw' | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const changePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setPhotoBusy(true); setPhotoMsg(null)
    try {
      const { url } = await api.upload(await squareImage(file))
      setUser(await api.updateProfile({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || undefined, city: user.city || undefined, avatar: url }))
      setPhotoMsg({ kind: 'success', text: 'Photo de profil mise à jour.' })
    } catch (err) { setPhotoMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Envoi impossible.' }) }
    finally { setPhotoBusy(false) }
  }

  const removePhoto = async () => {
    if (!user) return
    setPhotoBusy(true); setPhotoMsg(null)
    try {
      setUser(await api.updateProfile({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || undefined, city: user.city || undefined, avatar: null }))
      setPhotoMsg({ kind: 'success', text: 'Photo supprimée.' })
    } catch (err) { setPhotoMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Erreur' }) }
    finally { setPhotoBusy(false) }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setBusy('profile'); setMsg(null)
    try {
      setUser(await api.updateProfile({ ...form, phone: form.phone || null, city: form.city || null }))
      setMsg({ kind: 'success', text: 'Profil mis à jour.', scope: 'profile' })
    } catch (err) { setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Erreur', scope: 'profile' }) }
    finally { setBusy(null) }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (pw.newPassword !== pw.confirm) { setMsg({ kind: 'error', text: 'Les mots de passe ne correspondent pas.', scope: 'pw' }); return }
    const checks = [
      pw.newPassword.length >= 8,
      /[A-Z]/.test(pw.newPassword),
      /[a-z]/.test(pw.newPassword),
      /[0-9]/.test(pw.newPassword),
      /[^A-Za-z0-9]/.test(pw.newPassword),
    ]
    if (checks.some((c) => !c)) { setMsg({ kind: 'error', text: 'Le nouveau mot de passe ne respecte pas les critères de sécurité (8 car. min., maj., min., chiffre, symbole).', scope: 'pw' }); return }
    setBusy('pw')
    try {
      await api.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      setMsg({ kind: 'success', text: 'Mot de passe modifié.', scope: 'pw' })
    } catch (err) { setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Erreur', scope: 'pw' }) }
    finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title="Modifier le profil" />
      <div className="page space-y-4 py-4 md:pt-0">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Photo de profil</h2>
            {photoMsg && <div className="mb-4"><Alert kind={photoMsg.kind}>{photoMsg.text}</Alert></div>}
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative">
                <Avatar user={user} className="h-28 w-28 ring-4 ring-white shadow-card" fallbackClassName="bg-selline-dark text-white text-4xl" />
                {photoBusy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><Spinner /></span>}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm text-slate-500">JPG, PNG ou WebP. L'image est recadrée en carré automatiquement.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <input ref={fileRef} type="file" accept="image/*" onChange={changePhoto} className="hidden" />
                  <button type="button" disabled={photoBusy} onClick={() => fileRef.current?.click()} className="btn-primary px-5 py-2.5 text-sm"><Camera size={16} /> {user?.avatar ? 'Changer la photo' : 'Ajouter une photo'}</button>
                  {user?.avatar && <button type="button" disabled={photoBusy} onClick={removePhoto} className="btn-outline px-5 py-2.5 text-sm text-red-600"><Trash2 size={16} /> Supprimer</button>}
                </div>
              </div>
            </div>
          </section>

          <form onSubmit={saveProfile} className="card space-y-4 p-5">
            <h2 className="font-semibold">Informations personnelles</h2>
            {msg?.scope === 'profile' && <Alert kind={msg.kind}>{msg.text}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Field label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Field label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Field label="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <Field label="Adresse e-mail" value={user?.email ?? ''} disabled readOnly />
            <button type="submit" disabled={busy === 'profile'} className="btn-primary">{busy === 'profile' && <Spinner />} Enregistrer</button>
          </form>

          <form id="password" onSubmit={savePassword} className="card space-y-4 p-5">
            <h2 className="font-semibold">Changer le mot de passe</h2>
            {msg?.scope === 'pw' && <Alert kind={msg.kind}>{msg.text}</Alert>}
            <Field label="Mot de passe actuel" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nouveau mot de passe" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
              <Field label="Confirmation" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </div>
            <button type="submit" disabled={busy === 'pw'} className="btn-dark">{busy === 'pw' && <Spinner />} Modifier</button>
          </form>
        </div>
      </div>
    </>
  )
}
