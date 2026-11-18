import { ChevronLeft, ChevronRight } from 'lucide-react'

function pageList(current: number, total: number): (number | '…')[] {
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push('…'); out.push(n) })
  return out
}

export default function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /> Précédent</button>
      {pageList(page, pages).map((n, i) => n === '…'
        ? <span key={`e${i}`} className="px-2 text-slate-400">…</span>
        : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className={`h-10 min-w-10 rounded-md border px-3 text-sm font-medium ${n === page ? 'border-selline-dark bg-selline-dark text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>{n}</button>)}
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">Suivant <ChevronRight size={16} /></button>
    </nav>
  )
}
