import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tokenStore } from '../lib/api'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { Spinner } from '../components/States'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !token) return
    done.current = true

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    api.verifyEmail(token)
      .then((res) => {
        // Connexion automatique
        tokenStore.set(res.token)
        setUser(res.user)
        // Redirection vers l'accueil
        navigate(res.user.isAdmin ? '/admin' : res.user.role === 'seller' ? '/seller' : '/home', { replace: true })
      })
      .catch(() => {
        // Lien invalide : on renvoie vers le login avec un message
        navigate('/login?verified=error', { replace: true })
      })
  }, [token, navigate, setUser])

  return (
    <AuthShell title="Vérification en cours…" subtitle="Activation de votre compte Selline." back="/login">
      <div className="flex flex-col items-center gap-5 py-8">
        <Spinner />
        <p className="text-slate-500 text-sm text-center">
          Vérification de votre adresse e-mail…<br />
          Vous allez être redirigé automatiquement.
        </p>
      </div>
    </AuthShell>
  )
}
