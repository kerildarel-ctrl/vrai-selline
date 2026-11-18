import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, ShieldCheck, Smartphone, Truck } from 'lucide-react'
import Logo from './Logo'

const perks = [
  { icon: Truck,      text: 'Prix livraison inclus, sans surprise' },
  { icon: Smartphone, text: 'MTN MoMo, Orange Money, ou à la livraison' },
  { icon: ShieldCheck,text: 'Vendeurs vérifiés dans tout le Cameroun' },
]

export default function AuthShell({
  title, subtitle, back, children,
}: {
  title: string; subtitle?: string; back?: string; children: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">

      {/* ── Panneau gauche (desktop) ── */}
      <aside
        className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-14"
        style={{ background: 'linear-gradient(145deg, #080C14 0%, #0F172A 55%, #1a1040 100%)' }}
      >
        {/* Halos décoratifs */}
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #FACC15, transparent)' }} />
        <div aria-hidden className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />
        <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />

        <Link to="/" className="relative z-10">
          <Logo size="md" />
        </Link>

        <div className="relative z-10">
          <h2 className="max-w-sm text-4xl font-extrabold leading-tight tracking-tight">
            Le commerce pensé pour le{' '}
            <span style={{ background: 'linear-gradient(90deg,#FACC15,#F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Cameroun
            </span>
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-selline-yellow">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>

          {/* Badge confiance */}
          <div className="mt-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
            <BadgeCheck size={22} className="shrink-0 text-selline-yellow" />
            <p className="text-sm text-slate-300">
              Des milliers de Camerounais font confiance à Selline chaque jour.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-600">© {new Date().getFullYear()} Selline</p>
      </aside>

      {/* ── Panneau droite / formulaire ── */}
      <div className="flex flex-col bg-white">

        {/* Top bar mobile */}
        <div className="flex items-center gap-2 bg-selline-dark px-5 pb-8 pt-6 text-white lg:hidden">
          {back && (
            <Link to={back} className="-ml-1 mr-1 rounded-full p-2 transition hover:bg-white/10" aria-label="Retour">
              <ArrowLeft size={22} />
            </Link>
          )}
          <Link to="/" className="mx-auto">
            <Logo size="sm" />
          </Link>
          {back && <span className="w-10" />}
        </div>

        {/* Formulaire */}
        <div className="-mt-5 flex flex-1 flex-col rounded-t-3xl bg-white px-6 pt-8 lg:mt-0 lg:justify-center lg:rounded-none lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md pb-12">
            {back && (
              <Link to={back} className="mb-6 hidden items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-selline-dark lg:inline-flex">
                <ArrowLeft size={15} /> Retour
              </Link>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-selline-dark lg:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
