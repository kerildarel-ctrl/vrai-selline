import { Link, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

export default function OrderSuccess() {
  const state = useLocation().state as { reference?: string; orderId?: string } | null
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><CheckCircle size={40} className="text-emerald-600" /></div>
      <h1 className="mb-2 text-2xl font-bold md:text-3xl">Commande confirmée !</h1>
      <p className="mb-8 max-w-sm text-sm text-slate-500">
        {state?.reference ? <>Votre commande <b className="text-selline-dark">#{state.reference}</b> a été enregistrée.</> : 'Votre commande a été enregistrée.'} Vous recevrez un SMS de confirmation.
      </p>
      <div className="w-full max-w-xs space-y-3">
        <Link to={state?.orderId ? `/orders/${state.orderId}` : '/orders'} className="btn-primary btn-block">Suivre ma commande</Link>
        <Link to="/home" className="btn-outline btn-block">Continuer mes achats</Link>
      </div>
    </div>
  )
}
