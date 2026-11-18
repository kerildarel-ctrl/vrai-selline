import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import Header from './Header'
import BottomNav from './BottomNav'
import Footer from './Footer'
import { PageLoader } from './States'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../lib/types'

interface AppLayoutProps {
  /** Affiche l'en-tête complet (logo + recherche) sur mobile */
  mobileHeader?: boolean
  /** Affiche la barre de navigation basse sur mobile */
  bottomNav?: boolean
}

export function AppLayout({ mobileHeader = false, bottomNav = true }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header hideOnMobile={!mobileHeader} />
      <main className={`flex-1 ${bottomNav ? 'pb-20 md:pb-0' : ''}`}>
        <Outlet />
      </main>
      <Footer />
      {bottomNav && <BottomNav />}
    </div>
  )
}

export function RequireAuth({ role, admin, children }: { role?: Role; admin?: boolean; children?: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (admin && !user.isAdmin) return <Navigate to="/home" replace />
  if (role && user.role !== role) return <Navigate to={role === 'seller' ? '/seller/register' : '/home'} replace />
  return <>{children ?? <Outlet />}</>
}
