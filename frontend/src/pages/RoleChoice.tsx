import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Store } from 'lucide-react'
import AuthShell from '../components/AuthShell'

const roles = [
  { id: 'buyer' as const, icon: ShoppingBag, title: 'Acheter', text: 'Je veux acheter' },
  { id: 'seller' as const, icon: Store, title: 'Vendre', text: "J'ouvre une boutique" },
]

export default function RoleChoice() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null)

  return (
    <AuthShell title="Que souhaitez-vous faire ?" subtitle="Vous pourrez changer d'avis plus tard.">
      <div className="space-y-3" role="radiogroup">
        {roles.map(({ id, icon: Icon, title, text }) => {
          const active = role === id
          return (
            <button
              key={id}
              role="radio"
              aria-checked={active}
              onClick={() => setRole(id)}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${active ? 'border-selline-yellow bg-yellow-50' : 'border-transparent bg-white shadow-card hover:border-slate-200'}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-selline-yellow text-selline-dark' : 'bg-slate-100 text-slate-500'}`}><Icon size={22} /></span>
              <span className="flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-slate-500">{text}</span>
              </span>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-selline-yellow' : 'border-slate-300'}`}>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-selline-yellow" />}
              </span>
            </button>
          )
        })}
      </div>
      <button
        disabled={!role}
        onClick={() => navigate(role === 'seller' ? '/seller/register' : '/home')}
        className="btn-primary btn-block mt-6"
      >
        Continuer
      </button>
    </AuthShell>
  )
}
