import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout, RequireAuth } from './components/Layouts'
import SellerLayout from './components/SellerLayout'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminShops from './pages/admin/AdminShops'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProducts from './pages/admin/AdminProducts'
import AdminReviews from './pages/admin/AdminReviews'
import AdminCategories from './pages/admin/AdminCategories'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'
import RoleChoice from './pages/RoleChoice'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import Addresses from './pages/Addresses'
import Menu from './pages/Menu'
import Info from './pages/Info'
import SellerRegister from './pages/SellerRegister'
import SellerDashboard from './pages/SellerDashboard'
import SellerProducts from './pages/SellerProducts'
import SellerProductForm from './pages/SellerProductForm'
import SellerOrders from './pages/SellerOrders'
import Favorites from './pages/Favorites'
import Messages from './pages/Messages'
import Conversation from './pages/Conversation'
import Notifications from './pages/Notifications'

function CategoryRedirect() {
  const { id } = useParams()
  return <Navigate to={`/products?category=${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Pages plein écran */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<RequireAuth />}>
        <Route path="/role" element={<RoleChoice />} />
        <Route path="/seller/register" element={<SellerRegister />} />
      </Route>

      {/* Boutique : en-tête complet sur mobile */}
      <Route element={<AppLayout mobileHeader />}>
        <Route path="/home" element={<Home />} />
      </Route>

      {/* Boutique : barre mobile simple + navigation basse */}
      <Route element={<AppLayout />}>
        <Route path="/products" element={<Products />} />
        <Route path="/category/:id" element={<CategoryRedirect />} />
        <Route path="/search" element={<Navigate to="/products" replace />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/menu" element={<Menu />} />
        {['/help', '/contact', '/about', '/terms', '/privacy', '/returns'].map((p) => <Route key={p} path={p} element={<Info />} />)}
        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>

      {/* Tunnel d'achat : sans navigation basse */}
      <Route element={<AppLayout bottomNav={false} />}>
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route element={<RequireAuth />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/messages/:id" element={<Conversation />} />
        </Route>
      </Route>

      {/* Espace vendeur */}
      <Route element={<RequireAuth role="seller" />}>
        <Route element={<SellerLayout />}>
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/dashboard" element={<Navigate to="/seller" replace />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/products/new" element={<SellerProductForm />} />
          <Route path="/seller/products/:id" element={<SellerProductForm />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/messages" element={<Messages />} />
          <Route path="/seller/messages/:id" element={<Conversation />} />
          <Route path="/seller/notifications" element={<Notifications />} />
        </Route>
      </Route>

      {/* Administration */}
      <Route element={<RequireAuth admin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/shops" element={<AdminShops />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
