import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  back?: boolean | string
  action?: ReactNode
}

/** Barre de titre mobile (masquée sur grand écran, où l'en-tête principal est affiché) */
export function MobileBar({ title, back = true, action }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-0 z-40 bg-selline-dark text-white md:hidden">
      <div className="flex h-14 items-center gap-1 px-3">
        {back && (
          <button onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} className="-ml-1 rounded-full p-2" aria-label="Retour">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="flex-1 truncate pl-1 text-lg font-semibold">{title}</h1>
        {action}
      </div>
    </div>
  )
}

/** Titre de page affiché sur grand écran uniquement (le titre mobile est dans la barre) */
export function DesktopTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 hidden items-end justify-between gap-4 md:flex">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export default function PageHeader(props: PageHeaderProps & { subtitle?: string }) {
  return (
    <>
      <MobileBar title={props.title} back={props.back} action={props.action} />
      <div className="page pt-6"><DesktopTitle title={props.title} subtitle={props.subtitle} /></div>
    </>
  )
}
