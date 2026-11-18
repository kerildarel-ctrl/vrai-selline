import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import type { Counters } from '../lib/types'
import { useAuth } from './AuthContext'

interface CountersState {
  counters: Counters
  refresh: () => Promise<void>
}

const empty: Counters = { notifications: 0, messages: 0 }
const CountersContext = createContext<CountersState | null>(null)

/** Compteurs de notifications et de messages non lus, actualisés toutes les 45 s */
export function CountersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [counters, setCounters] = useState<Counters>(empty)

  const refresh = useCallback(async () => {
    if (!user) { setCounters(empty); return }
    try { setCounters(await api.counters()) } catch { /* on garde les valeurs actuelles */ }
  }, [user])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 45000)
    return () => clearInterval(timer)
  }, [refresh])

  const value = useMemo(() => ({ counters, refresh }), [counters, refresh])
  return <CountersContext.Provider value={value}>{children}</CountersContext.Provider>
}

export function useCounters(): CountersState {
  const ctx = useContext(CountersContext)
  if (!ctx) throw new Error('useCounters doit être utilisé dans <CountersProvider>')
  return ctx
}
