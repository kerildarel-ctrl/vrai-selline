import { useState } from 'react'
import { initials } from '../lib/format'

interface AvatarProps {
  user?: { firstName?: string; lastName?: string; avatar?: string | null } | null
  className?: string
  /** Classes de la pastille d'initiales (couleurs, taille du texte) */
  fallbackClassName?: string
}

/** Photo de profil, ou initiales si aucune photo (ou si elle ne charge pas). */
export default function Avatar({ user, className = 'h-10 w-10', fallbackClassName = 'bg-selline-yellow text-selline-dark text-sm' }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = user?.avatar
  if (src && failed !== src) {
    return <img src={src} alt="" onError={() => setFailed(src)} className={`shrink-0 rounded-full object-cover ${className}`} />
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${className} ${fallbackClassName}`}>
      {initials(user?.firstName, user?.lastName)}
    </span>
  )
}
