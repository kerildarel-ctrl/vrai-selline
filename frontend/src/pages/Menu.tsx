import { Link } from 'react-router-dom'
import { Bell, ChevronRight, FileText, Heart, HelpCircle, Info, MessageCircle, Package, Phone, RefreshCw, Shield, Store } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'

export default function Menu() {
  const { user } = useAuth()
  const links = [
    { icon: Package, label: 'Mes commandes', to: '/orders' },
    { icon: Heart, label: 'Mes favoris', to: '/favorites' },
    { icon: MessageCircle, label: 'Messages', to: '/messages' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
    { icon: Store, label: user?.role === 'seller' ? 'Ma boutique' : 'Vendre sur Selline', to: user?.role === 'seller' ? '/seller' : '/seller/register' },
    { icon: HelpCircle, label: 'Aide & FAQ', to: '/help' },
    { icon: Phone, label: 'Contact', to: '/contact' },
    { icon: Info, label: 'À propos', to: '/about' },
    { icon: FileText, label: "Conditions d'utilisation", to: '/terms' },
    { icon: Shield, label: 'Confidentialité', to: '/privacy' },
    { icon: RefreshCw, label: 'Politique de retour', to: '/returns' },
  ]
  return (
    <>
      <PageHeader title="Menu" back={false} />
      <div className="page py-4 md:pt-0">
        <nav className="card mx-auto max-w-2xl overflow-hidden">
          {links.map((item, i) => (
            <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${i < links.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <item.icon size={20} className="text-slate-500" />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
