import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from '../lib/types'

export interface CartItem {
  product: Product
  qty: number
}

interface CartState {
  items: CartItem[]
  count: number
  subtotal: number
  shipping: number
  total: number
  add: (product: Product, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const KEY = 'selline_cart'
const CartContext = createContext<CartState | null>(null)

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const add = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === product.id)
      if (found) return prev.map((i) => i.product.id === product.id ? { product, qty: i.qty + qty } : i)
      return [...prev, { product, qty }]
    })
  }, [])
  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => i.product.id === id ? { ...i, qty } : i).filter((i) => i.qty > 0))
  }, [])
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartState>(() => {
    const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0)
    // Estimation : frais de livraison le plus élevé par boutique (le serveur reste l'autorité)
    const perShop = new Map<string, number>()
    for (const { product } of items) {
      const fee = product.freeShipping ? 0 : product.shippingFee
      perShop.set(product.shop.id, Math.max(perShop.get(product.shop.id) ?? 0, fee))
    }
    const shipping = [...perShop.values()].reduce((a, b) => a + b, 0)
    return {
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      add, setQty, remove, clear,
    }
  }, [items, add, setQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>')
  return ctx
}
