import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import PageHeader from './PageHeader'

/** Gabarit commun aux pages partagées entre l'espace acheteur et l'espace vendeur */
export default function Shell({ title, back, narrow = true, children }: { title: string; back?: boolean; narrow?: boolean; children: ReactNode }) {
  const seller = useLocation().pathname.startsWith('/seller')
  const body = <div className={narrow ? 'mx-auto max-w-3xl' : ''}>{children}</div>
  if (seller) return <div><h1 className="mb-6 text-xl font-bold md:text-2xl">{title}</h1>{body}</div>
  return (
    <>
      <PageHeader title={title} back={back} />
      <div className="page py-4 md:pt-0">{body}</div>
    </>
  )
}
