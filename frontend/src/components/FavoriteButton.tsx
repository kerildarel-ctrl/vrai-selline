import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'

export default function FavoriteButton({ productId, className = '' }: { productId: string; className?: string }) {
  const { user } = useAuth()
  const { has, toggle } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const active = has(productId)

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user) { navigate('/login', { state: { from: location.pathname } }); return }
        void toggle(productId)
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart size={18} className={active ? 'fill-red-500 text-red-500' : 'text-slate-500'} />
    </button>
  )
}
