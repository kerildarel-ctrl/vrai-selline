import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Bell, Camera, ShieldCheck, ChevronRight, FileText, Heart, HelpCircle, Lock, LogOut, MapPin, MessageCircle, Package, Store, User } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const items = [
    ...(user.isAdmin ? [{ icon: ShieldCheck, label: 'Espace administration', to: '/admin' }] : []),
    { icon: User, label: 'Modifier le profil', to: '/profile/edit' },
    { icon: Package, label: 'Mes commandes', to: '/orders' },
    { icon: Heart, label: 'Mes favoris', to: '/favorites' },
    { icon: MessageCircle, label: 'Messages', to: '/messages' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
    { icon: MapPin, label: "Carnet d'adresses", to: '/addresses' },
    { icon: Lock, label: 'Changer le mot de passe', to: '/profile/edit#password' },
    user.role === 'seller'
      ? { icon: Store, label: 'Gérer ma boutique', to: '/seller' }
      : { icon: Store, label: 'Ouvrir une boutique', to: '/seller/register' },
    { icon: HelpCircle, label: 'Aide & FAQ', to: '/help' },
    { icon: FileText, label: "Conditions d'utilisation", to: '/terms' },
  ]

  return (
    <>
      <PageHeader title="Mon compte" back={false} />
      <div className="page py-4 md:pt-0">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="card flex items-center gap-4 p-5">
            <Link to="/profile/edit" className="group relative shrink-0" aria-label="Changer ma photo de profil">
              <Avatar user={user} className="h-20 w-20 ring-4 ring-white shadow-card" fallbackClassName="bg-selline-dark text-white text-2xl" />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-selline-yellow text-selline-dark shadow ring-2 ring-white transition group-hover:scale-110"><Camera size={14} /></span>
            </Link>
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 truncate text-lg font-bold">
                {user.firstName} {user.lastName}
                {user.shop?.verified && (
                  <BadgeCheck size={18} className="shrink-0 text-teal-500" title="Boutique vérifiée" />
                )}
              </h2>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
              <p className="mt-0.5 text-xs text-teal-700">{user.isAdmin ? 'Administrateur' : user.role === 'seller' ? 'Vendeur' : 'Acheteur'}{user.city ? ` · ${user.city}` : ''}</p>
            </div>
          </div>

          <nav className="card overflow-hidden">
            {items.map((item, i) => (
              <Link key={item.label} to={item.to} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${i < items.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <item.icon size={20} className="text-slate-500" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            ))}
          </nav>

          <button onClick={() => { logout(); navigate('/', { replace: true }) }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </div>
    </>
  )
}
