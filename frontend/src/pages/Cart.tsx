import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import Img from '../components/Img'
import PageHeader from '../components/PageHeader'
import { EmptyState } from '../components/States'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'

export default function Cart() {
  const { items, subtotal, shipping, total, setQty, remove, count } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const checkout = () => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })

  const summary = (
    <div className="card space-y-3 p-5">
      <h2 className="font-semibold">Récapitulatif</h2>
      <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total ({count} article{count > 1 ? 's' : ''})</span><span>{formatPrice(subtotal)}</span></div>
      <div className="flex justify-between text-sm"><span className="text-slate-500">Livraison</span>{shipping === 0 ? <span className="font-medium text-emerald-600">Gratuite</span> : <span>{formatPrice(shipping)}</span>}</div>
      <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
      <button onClick={checkout} className="btn-primary btn-block hidden md:flex">Passer la commande</button>
    </div>
  )

  return (
    <>
      <PageHeader title="Mon panier" />
      <div className="page py-4 pb-44 md:pb-10 md:pt-0">
        {items.length === 0 ? (
          <EmptyState icon={<ShoppingCart size={28} />} title="Votre panier est vide" text="Ajoutez des produits pour commencer." action={<Link to="/home" className="btn-primary">Continuer vos achats</Link>} />
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
            <ul className="space-y-3">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <Link to={`/product/${product.id}`} className="shrink-0"><Img src={product.images[0]} alt={product.name} className="h-20 w-20 rounded-xl sm:h-28 sm:w-28" /></Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link to={`/product/${product.id}`} className="line-clamp-2 text-sm font-medium sm:text-base">{product.name}</Link>
                    <p className="text-xs text-slate-500">{product.shop.name}</p>
                    <p className="mt-1 text-sm font-bold sm:text-base">{formatPrice(product.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQty(product.id, qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition hover:bg-slate-50" aria-label="Diminuer"><Minus size={14} /></button>
                        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => setQty(product.id, qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition hover:bg-slate-50" aria-label="Augmenter"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => remove(product.id)} className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Retirer"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="mt-4 hidden lg:sticky lg:top-40 lg:mt-0 lg:block">{summary}</aside>
            <aside className="mt-4 lg:hidden">{summary}</aside>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="safe-pb fixed inset-x-0 bottom-16 z-40 border-t border-slate-100 bg-white p-3 md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex-1"><p className="text-xs text-slate-500">Total</p><p className="text-lg font-bold leading-tight">{formatPrice(total)}</p></div>
            <button onClick={checkout} className="btn-primary px-8">Commander</button>
          </div>
        </div>
      )}
    </>
  )
}
