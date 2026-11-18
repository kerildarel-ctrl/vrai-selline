import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Heart, MapPin, MessageCircle, Search, ShieldCheck, ShoppingCart, Smartphone, Store, Tag, Utensils, User as UserIcon, Shirt, Home as HomeIcon, Sparkles, Monitor } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useCounters } from '../context/CountersContext'
import { useCategories } from '../hooks/useCategories'
import Avatar from './Avatar'

const categoryIconMap: Record<string, LucideIcon> = {
  'cat-telephones': Smartphone,
  'cat-mode': Shirt,
  'cat-maison': HomeIcon,
  'cat-beaute': Sparkles,
  'cat-informatique': Monitor,
  'cat-alimentation': Utensils,
}

export function getCategoryEmoji(_cat?: { id?: string; slug?: string; name?: string } | null): string {
  return ''
}

export function getCategoryIcon(cat?: { id?: string; slug?: string; name?: string } | null): LucideIcon {
  if (!cat) return Tag
  if (cat.id && categoryIconMap[cat.id]) return categoryIconMap[cat.id]
  const n = (cat.slug || cat.name || '').toLowerCase()
  if (n.includes('tel') || n.includes('phone')) return Smartphone
  if (n.includes('mode') || n.includes('vetement') || n.includes('habit')) return Shirt
  if (n.includes('maison') || n.includes('deco') || n.includes('meuble')) return HomeIcon
  if (n.includes('beaut') || n.includes('cosmet') || n.includes('soin')) return Sparkles
  if (n.includes('info') || n.includes('ordi') || n.includes('pc') || n.includes('tech')) return Monitor
  if (n.includes('alim') || n.includes('nour') || n.includes('epic')) return Utensils
  return Tag
}

function SearchBar({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  useEffect(() => { setQ(params.get('q') ?? '') }, [params])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      }}
      className={`flex overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-selline-yellow/50 transition focus-within:ring-selline-yellow ${className}`}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher sur SELLINE..."
        aria-label="Rechercher"
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-selline-dark placeholder:text-slate-400 focus:outline-none"
      />
      <button type="submit" aria-label="Lancer la recherche" className="bg-selline-yellow px-4 text-selline-dark transition hover:brightness-95">
        <Search size={18} />
      </button>
    </form>
  )
}

export default function Header({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  const { user } = useAuth()
  const { count } = useCart()
  const { categories } = useCategories()
  const { counters } = useCounters()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const badge = (n: number) => n > 0 && (
    <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-selline-orange px-1 text-[10px] font-bold text-white shadow-sm">
      {n > 99 ? '99+' : n}
    </span>
  )
  const iconLink = 'relative rounded-full p-2 transition hover:bg-white/10'

  const cart = (
    <Link to="/cart" className="relative flex items-center gap-2 rounded-full p-2 transition hover:bg-white/10" aria-label="Panier">
      <ShoppingCart size={22} />
      <span className="hidden text-sm font-medium lg:inline">Panier</span>
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-selline-orange px-1 text-[10px] font-bold text-white shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )

  return (
    <header className={`sticky top-0 z-40 bg-selline-dark text-white shadow-md transition-all duration-200 ${hideOnMobile ? 'hidden md:block' : ''}`}>
      <div className="page-wide">
        {/* Ligne principale avec réduction de hauteur dynamique au scroll */}
        <div className={`flex items-center justify-between gap-4 transition-all duration-200 ${scrolled ? 'h-12 md:h-14' : 'h-14 md:h-16'}`}>
          <Link to="/home" aria-label="Accueil Selline" className="shrink-0"><Logo size="sm" /></Link>

          <SearchBar className="hidden max-w-2xl flex-1 md:flex" />

          <div className="flex items-center gap-1 md:gap-3">
            {user && (
              <>
                <Link to="/favorites" className={`${iconLink} hidden md:block`} aria-label="Favoris"><Heart size={22} /></Link>
                <Link to="/messages" className={`${iconLink} hidden md:block`} aria-label="Messages"><MessageCircle size={22} />{badge(counters.messages)}</Link>
                <Link to="/notifications" className={iconLink} aria-label="Notifications"><Bell size={22} />{badge(counters.notifications)}</Link>
              </>
            )}
            {user ? (
              <>
                {user.isAdmin && (
                  <Link to="/admin" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-selline-yellow transition hover:bg-white/10 md:flex">
                    <ShieldCheck size={18} /> Administration
                  </Link>
                )}
                {user.role === 'seller' && (
                  <Link to="/seller" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-white/10 md:flex">
                    <Store size={18} /> Ma boutique
                  </Link>
                )}
                <Link to="/profile" className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-white/10 md:flex">
                  <Avatar user={user} className="h-8 w-8 ring-2 ring-white/20" fallbackClassName="bg-selline-yellow text-selline-dark text-xs" />
                  <span className="text-sm font-medium">{user.firstName}</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-white/10 md:flex">
                  <UserIcon size={18} /> Connexion
                </Link>
                <Link to="/register" className="btn-primary hidden px-4 py-2 text-sm md:inline-flex">Créer un compte</Link>
                <Link to="/login" className="rounded-full p-2 md:hidden" aria-label="Connexion"><UserIcon size={22} /></Link>
              </>
            )}
            {cart}
          </div>
        </div>

        {/* Recherche mobile */}
        <div className="pb-3 md:hidden"><SearchBar /></div>

        {/* Livraison (mobile) */}
        <div className="flex items-center gap-1.5 pb-2.5 text-sm text-slate-300 md:hidden">
          <MapPin size={14} className="text-selline-yellow" />
          {user ? (
            <span className="truncate">Livrer à {user.firstName}{user.city ? ` · ${user.city}` : ''}</span>
          ) : (
            <Link to="/login" className="underline-offset-2 hover:underline">Connectez-vous pour choisir votre adresse</Link>
          )}
        </div>
      </div>

      {/* Catégories (bureau) avec icônes Lucide */}
      {categories.length > 0 && (
        <nav className="hidden border-t border-white/10 bg-selline-navy md:block" aria-label="Catégories">
          <div className="page-wide no-scrollbar flex items-center gap-1 overflow-x-auto py-1.5">
            <NavLink
              to="/products"
              end
              className={({ isActive }) =>
                `shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-white/10 ${
                  isActive ? 'bg-white/10 font-semibold text-selline-yellow' : 'text-slate-200'
                }`
              }
            >
              <Tag size={14} /> Tout
            </NavLink>
            {categories.map((c) => {
              const CatIcon = getCategoryIcon(c)
              return (
                <Link
                  key={c.id}
                  to={`/products?category=${c.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <CatIcon size={14} />
                  <span>{c.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
