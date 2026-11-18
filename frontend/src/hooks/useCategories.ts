import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Category } from '../lib/types'

let cache: Category[] | null = null
let inflight: Promise<Category[]> | null = null

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    inflight ??= api.categories().then((c) => (cache = c)).finally(() => { inflight = null })
    let alive = true
    inflight
      .then((c) => alive && setCategories(c))
      .catch(() => { /* la liste reste vide */ })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  return { categories, loading }
}
