import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

interface FavoritesState {
  ids: Set<string>
  has: (id: string) => boolean
  toggle: (id: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesState | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) { setIds(new Set()); return }
    let alive = true
    api.favorites().then((list) => alive && setIds(new Set(list.map((p) => p.id)))).catch(() => { /* ignoré */ })
    return () => { alive = false }
  }, [user])

  const toggle = useCallback(async (id: string) => {
    const wasFav = ids.has(id)
    const apply = (on: boolean) => setIds((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n })
    apply(!wasFav) // mise à jour immédiate, annulée en cas d'échec
    try { await (wasFav ? api.removeFavorite(id) : api.addFavorite(id)) } catch { apply(wasFav) }
  }, [ids])

  const value = useMemo<FavoritesState>(() => ({ ids, has: (id) => ids.has(id), toggle }), [ids, toggle])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites doit être utilisé dans <FavoritesProvider>')
  return ctx
}
