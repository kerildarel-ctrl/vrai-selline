import { Link, NavLink, Outlet } from 'react-router-dom'
import { Bell, LayoutDashboard, LogOut, MessageCircle, Package, ShoppingBag, ExternalLink } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCounters } from '../context/CountersContext'
import Avatar from './Avatar'

const tabs = [
  { to: '/seller', end: true, icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
  { to: '/seller/products', icon: Package, label: 'Produits', short: 'Produits' },
  { to: '/seller/orders', icon: ShoppingBag, label: 'Commandes', short: 'Commandes' },
  { to: '/seller/messages', icon: MessageCircle, label: 'Messages', short: 'Messages', count: 'messages' as const },
  { to: '/seller/notifications', icon: Bell, label: 'Notifications', short: 'Alertes', count: 'notifications' as const },
]

export default function SellerLayout() {
  const { user, logout } = useAuth()
  const { counters } = useCounters()
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      {/* Barre latérale (bureau) */}
      <aside className="hidden bg-selline-dark text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:p-5">
        <Link to="/seller"><Logo size="sm" /></Link>
        <p className="mt-6 truncate text-xs uppercase tracking-wider text-slate-500">{user?.shop?.name ?? 'Ma boutique'}</p>
        <nav className="mt-2 space-y-1">
          {tabs.map(({ to, end, icon: Icon, label, count }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-selline-yellow' : 'text-slate-300 hover:bg-white/5'}`}>
              <Icon size={18} /> <span className="flex-1">{label}</span>
              {count && counters[count] > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-selline-orange px-1.5 text-xs font-bold text-white">{counters[count]}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 text-sm">
          <Link to="/home" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-white/5"><ExternalLink size={18} /> Voir la boutique</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-white/5"><LogOut size={18} /> Déconnexion</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        {/* Barre du haut (mobile) */}
        <header className="sticky top-0 z-40 bg-selline-dark text-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/seller"><Logo size="sm" /></Link>
            <div className="flex items-center gap-2">
              <Link to="/home" className="rounded-full p-2" aria-label="Voir la boutique"><ExternalLink size={20} /></Link>
              <Link to="/profile" aria-label="Mon profil"><Avatar user={user} className="h-8 w-8" fallbackClassName="bg-white/20 text-white text-sm" /></Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 md:py-8 lg:px-8">
          {user?.shop?.suspended && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <b>Votre boutique est suspendue.</b> Vos produits ne sont plus visibles et vous ne pouvez plus modifier votre catalogue. Contactez le support Selline.
            </div>
          )}
          <Outlet />
        </main>

        {/* Onglets (mobile) */}
        <nav className="safe-pb fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white md:hidden" aria-label="Espace vendeur">
          <div className="mx-auto flex h-16 max-w-lg">
            {tabs.map(({ to, end, icon: Icon, short, count }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-selline-dark' : 'text-slate-400'}`}>
                <span className="relative"><Icon size={22} />{count && counters[count] > 0 && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-selline-orange px-1 text-[10px] font-bold text-white">{counters[count] > 9 ? '9+' : counters[count]}</span>}</span> {short}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
