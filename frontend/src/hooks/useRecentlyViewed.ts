import { useEffect, useCallback } from 'react'

const KEY = 'selline-recently-viewed'
const MAX = 12

export function useRecentlyViewed() {
  const getIds = (): string[] => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  }

  const track = useCallback((productId: string) => {
    const ids = getIds().filter(id => id !== productId)
    ids.unshift(productId)
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)))
  }, [])

  const getIds2 = (): string[] => getIds()

  return { track, getIds: getIds2 }
}
