import { Link, NavLink, Outlet } from 'react-router-dom'
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, MessageSquareWarning, Package, Store, Users } from 'lucide-react'
import Logo from './Logo'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
  { to: '/admin/shops', icon: Store, label: 'Boutiques', short: 'Boutiques' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs', short: 'Membres' },
  { to: '/admin/products', icon: Package, label: 'Produits', short: 'Produits' },
  { to: '/admin/reviews', icon: MessageSquareWarning, label: 'Avis', short: 'Avis' },
  { to: '/admin/categories', icon: FolderTree, label: 'Catégories', short: 'Catég.' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-selline-dark text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:p-5">
        <Link to="/admin"><Logo size="sm" /></Link>
        <p className="mt-6 text-xs uppercase tracking-wider text-selline-yellow">Administration</p>
        <nav className="mt-2 space-y-1">
          {tabs.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-selline-yellow' : 'text-slate-300 hover:bg-white/5'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 text-sm">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar user={user} className="h-8 w-8" fallbackClassName="bg-white/20 text-white text-xs" />
            <span className="min-w-0 truncate text-slate-300">{user?.firstName} {user?.lastName}</span>
          </div>
          <Link to="/home" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-white/5"><ExternalLink size={18} /> Voir le site</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-white/5"><LogOut size={18} /> Déconnexion</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-40 bg-selline-dark text-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/admin" className="flex items-center gap-2"><Logo size="sm" /><span className="text-xs font-semibold uppercase text-selline-yellow">Admin</span></Link>
            <div className="flex items-center gap-1">
              <Link to="/home" className="rounded-full p-2" aria-label="Voir le site"><ExternalLink size={20} /></Link>
              <button onClick={logout} className="rounded-full p-2" aria-label="Déconnexion"><LogOut size={20} /></button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 md:py-8 lg:px-8"><Outlet /></main>

        <nav className="safe-pb fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white md:hidden" aria-label="Administration">
          <div className="mx-auto flex h-16 max-w-lg">
            {tabs.map(({ to, end, icon: Icon, short }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive ? 'text-selline-dark' : 'text-slate-400'}`}>
                <Icon size={21} /> {short}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
