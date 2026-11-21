import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CreditCard, MapPin, Plus, Smartphone, Tag, Wallet } from 'lucide-react'
import Field from '../components/Field'
import Img from '../components/Img'
import PageHeader from '../components/PageHeader'
import { Alert, PageLoader, Spinner } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { PaymentMethod } from '../lib/types'

const methods = [
  { id: 'mobile' as const, icon: Smartphone, label: 'Mobile Money (MTN / Orange)' },
  { id: 'card' as const, icon: CreditCard, label: 'Carte bancaire' },
  { id: 'cod' as const, icon: Wallet, label: 'Paiement à la livraison' },
]

export default function Checkout() {
  const { items, subtotal, shipping, total, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: addresses, loading, error: loadError, reload } = useAsync(() => api.addresses(), [])
  const [addressId, setAddressId] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('mobile')
  const [payPhone, setPayPhone] = useState(user?.phone ?? '')
  const [showForm, setShowForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ fullName: user ? `${user.firstName} ${user.lastName}` : '', phone: user?.phone ?? '', city: user?.city ?? '', quarter: '', details: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number; label: string } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  useEffect(() => {
    if (addresses && addresses.length > 0 && !addressId) setAddressId(addresses[0].id)
    if (addresses && addresses.length === 0) setShowForm(true)
  }, [addresses, addressId])

  if (items.length === 0) return <Navigate to="/cart" replace />
  if (loading) return <><PageHeader title="Paiement" /><PageLoader /></>

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const a = await api.addAddress({ ...newAddr, details: newAddr.details || null })
      await reload()
      setAddressId(a.id)
      setShowForm(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Adresse non enregistrée') }
    finally { setBusy(false) }
  }

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true); setPromoError('')
    try {
      const res = await fetch(`/api/promos/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), total })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')
      setPromoApplied({ code: data.code, discount: data.discount, label: data.label })
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Code invalide')
      setPromoApplied(null)
    } finally { setPromoLoading(false) }
  }

  const finalTotal = promoApplied ? Math.max(0, total - promoApplied.discount) : total

  const confirm = async () => {
    if (!addressId) { setError('Choisissez une adresse de livraison.'); return }
    if (payment === 'mobile' && !payPhone.trim()) { setError('Indiquez le numéro Mobile Money.'); return }
    setBusy(true); setError(null)
    try {
      const order = await api.createOrder({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        addressId,
        paymentMethod: payment,
        paymentPhone: payment === 'mobile' ? payPhone.trim() : undefined,
        promoCode: promoApplied?.code,
      })
      clear()
      navigate('/order-success', { replace: true, state: { reference: order.reference, orderId: order.id } })
    } catch (err) { setError(err instanceof Error ? err.message : 'Commande impossible'); setBusy(false) }
  }

  const radio = (active: boolean) => (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-selline-yellow' : 'border-slate-300'}`}>
      {active && <span className="h-2.5 w-2.5 rounded-full bg-selline-yellow" />}
    </span>
  )

  return (
    <>
      <PageHeader title="Paiement" />
      <div className="page py-4 pb-10 md:pt-0">
        <div className="lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-8">
          <div className="space-y-4">
            {loadError && <Alert>{loadError}</Alert>}

            {/* Adresse */}
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold"><MapPin size={18} /> Adresse de livraison</h2>
                {!showForm && <button onClick={() => setShowForm(true)} className="link inline-flex items-center gap-1 text-sm"><Plus size={14} /> Ajouter</button>}
              </div>
              <div className="space-y-2">
                {addresses?.map((a) => (
                  <button key={a.id} onClick={() => setAddressId(a.id)} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition ${addressId === a.id ? 'border-selline-yellow bg-yellow-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <span className="mt-0.5">{radio(addressId === a.id)}</span>
                    <span className="text-sm text-slate-600"><b className="text-selline-dark">{a.fullName}</b><br />{a.quarter}, {a.city}{a.details ? ` – ${a.details}` : ''}<br />{a.phone}</span>
                  </button>
                ))}
              </div>
              {showForm && (
                <form onSubmit={saveAddress} className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4">
                  <Field label="Nom complet" value={newAddr.fullName} onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })} required />
                  <Field label="Téléphone" type="tel" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} placeholder="+237 6XX XXX XXX" required />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Ville" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} required />
                    <Field label="Quartier" value={newAddr.quarter} onChange={(e) => setNewAddr({ ...newAddr, quarter: e.target.value })} required />
                  </div>
                  <Field label="Précisions (facultatif)" value={newAddr.details} onChange={(e) => setNewAddr({ ...newAddr, details: e.target.value })} placeholder="Repère, rue, immeuble…" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="btn-dark px-5 py-2.5 text-sm">{busy && <Spinner />} Enregistrer</button>
                    {addresses && addresses.length > 0 && <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-5 py-2.5 text-sm">Annuler</button>}
                  </div>
                </form>
              )}
            </section>

            {/* Paiement */}
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Mode de paiement</h2>
              <div className="space-y-2">
                {methods.map((m) => (
                  <button key={m.id} onClick={() => setPayment(m.id)} className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition ${payment === m.id ? 'border-selline-yellow bg-yellow-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    {radio(payment === m.id)}
                    <m.icon size={18} className="text-slate-500" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              {payment === 'mobile' && (
                <div className="mt-3"><Field label="Numéro Mobile Money" type="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="+237 6XX XXX XXX" hint="Vous validerez le paiement sur ce numéro." /></div>
              )}
            </section>
          </div>

          {/* Récapitulatif */}
          <aside className="mt-4 space-y-4 lg:sticky lg:top-40 lg:mt-0">
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold">Votre commande</h2>
              <ul className="max-h-56 space-y-3 overflow-y-auto">
                {items.map(({ product, qty }) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <Img src={product.images[0]} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg" />
                    <span className="line-clamp-2 flex-1 text-sm">{product.name} <span className="text-slate-400">× {qty}</span></span>
                    <span className="text-sm font-medium">{formatPrice(product.price * qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Livraison</span>{shipping === 0 ? <span className="text-emerald-600">Gratuite</span> : <span>{formatPrice(shipping)}</span>}</div>
                {promoApplied && (
                  <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                    <span>🎉 {promoApplied.label}</span>
                    <span>-{formatPrice(promoApplied.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold">
                  <span>Total</span><span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* Code promo */}
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-slate-500 flex items-center gap-1"><Tag size={12}/> Code promo</p>
                {promoApplied ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                    <span className="font-bold text-emerald-700">✓ {promoApplied.code}</span>
                    <button onClick={() => { setPromoApplied(null); setPromoCode('') }} className="text-xs text-slate-400 hover:text-red-500">Retirer</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                      placeholder="Ex: SELLINE10"
                      className="input-field flex-1 py-2 text-sm"
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    />
                    <button onClick={applyPromo} disabled={promoLoading} className="btn-dark px-4 py-2 text-sm">
                      {promoLoading ? '…' : 'OK'}
                    </button>
                  </div>
                )}
                {promoError && <p className="mt-1 text-xs text-red-500">{promoError}</p>}
              </div>
            </section>
            {error && <Alert>{error}</Alert>}
            <button onClick={confirm} disabled={busy || showForm} className="btn-primary btn-block">{busy && <Spinner />} Confirmer la commande</button>
            <p className="text-center text-xs text-slate-400">Le montant définitif est confirmé par la boutique. <Link to="/cart" className="underline">Modifier le panier</Link></p>
          </aside>
        </div>
      </div>
    </>
  )
}
