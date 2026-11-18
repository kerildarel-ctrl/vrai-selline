import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Rangée horizontale défilante (glisser au doigt, ou flèches sur ordinateur) comme sur Amazon. */
export default function Carousel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  const arrow = 'absolute top-1/2 z-10 hidden h-24 w-10 -translate-y-1/2 items-center justify-center bg-white/95 text-slate-800 shadow-pop transition hover:bg-white md:flex'

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} onScroll={update} className="no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto scroll-smooth pb-1">
        {children}
      </div>
      {!edge.start && <button type="button" aria-label="Précédent" onClick={() => go(-1)} className={`${arrow} left-0 rounded-r-lg`}><ChevronLeft size={28} /></button>}
      {!edge.end && <button type="button" aria-label="Suivant" onClick={() => go(1)} className={`${arrow} right-0 rounded-l-lg`}><ChevronRight size={28} /></button>}
    </div>
  )
}
