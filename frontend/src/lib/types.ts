export type Role = 'buyer' | 'seller'

export interface Shop {
  id: string
  name: string
  city?: string | null
  phone?: string | null
  description?: string | null
  verified: boolean
  /** Boutique suspendue par l'équipe Selline */
  suspended?: boolean
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  city?: string | null
  /** URL publique de la photo de profil */
  avatar?: string | null
  role: Role
  /** Compte administrateur (accès à /admin) */
  isAdmin?: boolean
  shop?: Shop | null
}

export interface Category {
  id: string
  name: string
  slug?: string
}

export interface Product {
  id: string
  name: string
  brand?: string | null
  price: number
  rating: number
  reviewCount: number
  images: string[]
  shop: { id: string; name: string; verified: boolean }
  freeShipping: boolean
  shippingFee: number
  inStock: boolean
  stock?: number
  category?: Category | null
  description?: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

export interface Address {
  id: string
  fullName: string
  phone: string
  city: string
  quarter: string
  details?: string | null
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMethod = 'mobile' | 'card' | 'cod'

export interface OrderItem {
  productId: string
  name: string
  image?: string | null
  price: number
  qty: number
}

export interface Order {
  id: string
  reference: string
  createdAt: string
  status: OrderStatus
  subtotal: number
  shippingFee: number
  total: number
  paymentMethod: PaymentMethod
  items: OrderItem[]
  address?: Address | null
}

export interface SellerOrder extends Order {
  customerName: string
}

export interface SellerStats {
  ordersToday: number
  revenueMonth: number
  activeProducts: number
  pendingOrders: number
}

export interface ProductInput {
  name: string
  brand?: string
  price: number
  stock: number
  categoryId?: string
  description?: string
  freeShipping: boolean
  shippingFee: number
  images: string[]
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface ReviewList {
  items: Review[]
  total: number
  average: number
}

export interface Conversation {
  id: string
  /** Nom de l'interlocuteur (boutique pour l'acheteur, client pour le vendeur) */
  title: string
  productName?: string | null
  lastMessage?: string | null
  lastAt?: string | null
  unread: number
}

export interface Message {
  id: string
  text: string
  createdAt: string
  mine: boolean
}

export interface AppNotification {
  id: string
  title: string
  body?: string | null
  link?: string | null
  read: boolean
  createdAt: string
}

export interface Counters {
  notifications: number
  messages: number
}

// ---------- Administration ----------
export interface AdminStats {
  users: { total: number; buyers: number; sellers: number; blocked: number; newThisWeek: number }
  shops: { total: number; verified: number; suspended: number; awaitingVerification: number }
  products: number
  orders: { total: number; today: number; pending: number }
  revenue: { total: number; month: number }
  series: { date: string; orders: number; revenue: number }[]
  recentOrders: { id: string; reference: string; createdAt: string; status: OrderStatus; total: number; customerName: string }[]
  recentActions: { id: string; summary: string; adminName: string; createdAt: string }[]
}
export interface AdminShop {
  id: string; name: string; city?: string | null; phone?: string | null; description?: string | null
  verified: boolean; suspended: boolean; createdAt: string
  owner: { id: string; name: string; email: string; blocked: boolean }
  productCount: number; orderCount: number; revenue: number
}
export interface AdminUser {
  id: string; firstName: string; lastName: string; email: string; phone?: string | null; city?: string | null; avatar?: string | null
  role: Role; isAdmin: boolean; blocked: boolean; createdAt: string; shopName: string | null; orderCount: number
}
export interface AdminProduct {
  id: string; name: string; price: number; stock: number; image?: string | null; category?: string | null
  rating: number; reviewCount: number; createdAt: string; shop: { id: string; name: string }
}
export interface AdminReview {
  id: string; rating: number; comment: string; createdAt: string; author: string; authorEmail: string
  product: { id: string; name: string }
}
export interface AdminCategory { id: string; name: string; slug: string; productCount: number }
