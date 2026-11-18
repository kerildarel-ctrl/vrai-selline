import { NavLink } from 'react-router-dom'
import { Home, Menu, Package, ShoppingCart, User } from 'lucide-react'
import { useCart } from '../context/CartContext'

const items = [
  { to: '/home', icon: Home, label: 'Accueil' },
  { to: '/profile', icon: User, label: 'Vous' },
  { to: '/orders', icon: Package, label: 'Commandes' },
  { to: '/cart', icon: ShoppingCart, label: 'Panier', cart: true },
  { to: '/menu', icon: Menu, label: 'Menu' },
]

export default function BottomNav() {
  const { count } = useCart()
  return (
    <nav className="safe-pb fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-lg md:hidden" aria-label="Navigation principale">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {items.map(({ to, icon: Icon, label, cart }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-selline-yellow text-selline-dark font-bold shadow-sm'
                  : 'text-slate-500 hover:text-selline-dark'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {cart && count > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-selline-orange px-1 text-xs font-black text-white shadow-sm ring-2 ring-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
