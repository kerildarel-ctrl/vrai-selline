import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'
import type { AuthResponse, User } from '../lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (b: Parameters<typeof api.register>[0]) => Promise<{ message: string }>
  logout: () => void
  setUser: (u: User | null) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !!tokenStore.get())

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return }
    try { setUser(await api.me()) } catch { setUser(null) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('selline:unauthorized', onUnauthorized)
    return () => window.removeEventListener('selline:unauthorized', onUnauthorized)
  }, [])

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (email, password) => accept(await api.login({ email, password })),
    register: async (b) => api.register(b),
    logout: () => { tokenStore.clear(); setUser(null) },
    setUser,
    refresh,
  }), [user, loading, accept, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
