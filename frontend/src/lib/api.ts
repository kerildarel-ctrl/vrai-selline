import type {
  AppNotification, Conversation, Counters, Message, Review, ReviewList,
  Address, AuthResponse, Category, Order, Paginated, PaymentMethod, Product,
  ProductInput, SellerOrder, SellerStats, Shop, User, OrderStatus,
  AdminStats, AdminShop, AdminUser, AdminProduct, AdminReview, AdminCategory,
} from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'
const TOKEN_KEY = 'selline_token'

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type Query = Record<string, string | number | undefined | null>

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Query; form?: FormData } = {},
): Promise<T> {
  const qs = opts.query
    ? Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, { method, headers, body })
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0)
  }

  if (res.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event('selline:unauthorized'))
  }
  if (res.status === 204) return undefined as T

  let data: unknown = null
  try { data = await res.json() } catch { /* corps vide */ }
  if (!res.ok) {
    const msg = (data as { message?: string; error?: string } | null)?.message
      || (data as { error?: string } | null)?.error
      || 'Une erreur est survenue. Veuillez réessayer.'
    throw new ApiError(msg, res.status)
  }
  return data as T
}

const get = <T>(p: string, query?: Query) => request<T>('GET', p, { query })
const post = <T>(p: string, body?: unknown) => request<T>('POST', p, { body })
const put = <T>(p: string, body?: unknown) => request<T>('PUT', p, { body })
const patch = <T>(p: string, body?: unknown) => request<T>('PATCH', p, { body })
const del = <T>(p: string) => request<T>('DELETE', p)

export const api = {
  // Authentification
  register: (b: { firstName: string; lastName: string; email: string; phone: string; password: string }) =>
    post<{ message: string }>('/auth/register', b),
  login: (b: { email: string; password: string }) => post<AuthResponse>('/auth/login', b),
  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),
  verifyEmail: (token: string) => post<AuthResponse>('/auth/verify-email', { token }),
  resendVerification: (email: string) => post<void>('/auth/resend-verification', { email }),
  me: () => get<User>('/auth/me'),

  // Compte
  updateProfile: (b: { firstName: string; lastName: string; phone?: string | null; city?: string | null; avatar?: string | null }) =>
    patch<User>('/users/me', b),
  changePassword: (b: { currentPassword: string; newPassword: string }) =>
    put<void>('/users/me/password', b),
  addresses: () => get<Address[]>('/addresses'),
  addAddress: (b: Omit<Address, 'id'>) => post<Address>('/addresses', b),
  deleteAddress: (id: string) => del<void>(`/addresses/${id}`),

  // Catalogue
  categories: () => get<Category[]>('/categories'),
  products: (q: { q?: string; category?: string; sort?: string; page?: number; limit?: number; min?: string; max?: string; freeShipping?: string | number; verified?: string | number; rating?: string }) =>
    get<Paginated<Product>>('/products', q as Record<string, string | number | undefined | null>),
  product: (id: string) => get<Product>(`/products/${id}`),

  // Commandes
  createOrder: (b: {
    items: { productId: string; qty: number }[]
    addressId: string
    paymentMethod: PaymentMethod
    paymentPhone?: string
  }) => post<Order>('/orders', b),
  orders: () => get<Order[]>('/orders'),
  order: (id: string) => get<Order>(`/orders/${id}`),

  // Favoris
  favorites: () => get<Product[]>('/favorites'),
  addFavorite: (productId: string) => put<void>(`/favorites/${productId}`),
  removeFavorite: (productId: string) => del<void>(`/favorites/${productId}`),

  // Avis
  reviews: (productId: string) => get<ReviewList>(`/products/${productId}/reviews`),
  addReview: (productId: string, b: { rating: number; comment: string }) =>
    post<Review>(`/products/${productId}/reviews`, b),

  // Messagerie
  conversations: () => get<Conversation[]>('/conversations'),
  startConversation: (b: { shopId: string; productId?: string }) => post<Conversation>('/conversations', b),
  conversation: (id: string) => get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  sendMessage: (id: string, text: string) => post<Message>(`/conversations/${id}/messages`, { text }),

  // Notifications
  notifications: () => get<AppNotification[]>('/notifications'),
  readNotification: (id: string) => patch<void>(`/notifications/${id}/read`),
  readAllNotifications: () => post<void>('/notifications/read-all'),
  counters: () => get<Counters>('/me/counters'),

  // Vendeur
  createShop: (b: { name: string; city: string; phone: string; description?: string }) =>
    post<Shop>('/seller/shop', b),
  sellerStats: () => get<SellerStats>('/seller/stats'),
  sellerProducts: () => get<Product[]>('/seller/products'),
  sellerProduct: (id: string) => get<Product>(`/seller/products/${id}`),
  createProduct: (b: ProductInput) => post<Product>('/seller/products', b),
  updateProduct: (id: string, b: ProductInput) => put<Product>(`/seller/products/${id}`, b),
  deleteProduct: (id: string) => del<void>(`/seller/products/${id}`),
  sellerOrders: () => get<SellerOrder[]>('/seller/orders'),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    patch<SellerOrder>(`/seller/orders/${id}`, { status }),
  // Administration
  adminStats: () => get<AdminStats>('/admin/stats'),
  adminShops: (q: Query) => get<Paginated<AdminShop>>('/admin/shops', q),
  adminUpdateShop: (id: string, b: { verified?: boolean; suspended?: boolean }) => patch<AdminShop>(`/admin/shops/${id}`, b),
  adminUsers: (q: Query) => get<Paginated<AdminUser>>('/admin/users', q),
  adminBlockUser: (id: string, blocked: boolean) => patch<AdminUser>(`/admin/users/${id}`, { blocked }),
  adminProducts: (q: Query) => get<Paginated<AdminProduct>>('/admin/products', q),
  adminDeleteProduct: (id: string, reason?: string) => request<void>('DELETE', `/admin/products/${id}`, { query: { reason } }),
  adminReviews: (q: Query) => get<Paginated<AdminReview>>('/admin/reviews', q),
  adminDeleteReview: (id: string) => del<void>(`/admin/reviews/${id}`),
  adminCategories: () => get<AdminCategory[]>('/admin/categories'),
  adminCreateCategory: (name: string) => post<AdminCategory>('/admin/categories', { name }),
  adminRenameCategory: (id: string, name: string) => put<AdminCategory>(`/admin/categories/${id}`, { name }),
  adminDeleteCategory: (id: string) => del<void>(`/admin/categories/${id}`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('POST', '/uploads', { form })
  },
}
