import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

export const th = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
export const td = 'px-4 py-3 align-middle text-sm'

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}
export function Badge({ tone = 'slate', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-selline-yellow" />
    </label>
  )
}

export function FilterChips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={`chip ${value === o.value ? 'chip-active' : ''}`}>{o.label}</button>
      ))}
    </div>
  )
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return <div role="status" className="fixed inset-x-0 bottom-24 z-[90] mx-auto w-fit max-w-[90vw] rounded-full bg-selline-dark px-5 py-2.5 text-sm font-medium text-white shadow-pop md:bottom-8">{message}</div>
}

export function ActionButton({ children, onClick, tone = 'default', disabled }: { children: ReactNode; onClick: () => void; tone?: 'default' | 'danger' | 'success'; disabled?: boolean }) {
  const t = tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50' : tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
  return <button onClick={onClick} disabled={disabled} className={`whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${t}`}>{children}</button>
}
