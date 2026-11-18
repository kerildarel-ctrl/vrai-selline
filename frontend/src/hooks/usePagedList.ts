import { useCallback, useEffect, useRef, useState } from 'react'
import type { Paginated } from '../lib/types'
import type { Query } from '../lib/api'

/** Liste paginée avec recherche (anti-rebond) et filtres, pour les pages d'administration. */
export function usePagedList<T extends { id: string }>(
  fetcher: (query: Query) => Promise<Paginated<T>>,
  filters: Record<string, string> = {},
) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => { setPage(1) }, [filtersKey])

  const load = useCallback(async () => {
    const id = ++latest.current
    setLoading(true); setError(null)
    try {
      const res = await fetcher({ q: debounced, page, limit: 20, ...filters })
      if (id === latest.current) setData(res)
    } catch (e) {
      if (id === latest.current) setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      if (id === latest.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, page, filtersKey])

  useEffect(() => { void load() }, [load])

  const replace = (item: T) => setData((d) => d && { ...d, items: d.items.map((x) => (x.id === item.id ? item : x)) })
  const remove = (id: string) => setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== id), total: Math.max(0, d.total - 1) })

  return { q, setQ, page, setPage, data, loading, error, reload: load, replace, remove }
}
