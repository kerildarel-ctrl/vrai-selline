import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const BANNERS = [
  {
    id: 1,
    tag: '🔥 Offre du jour',
    title: 'Jusqu\'à -50%',
    subtitle: 'sur les téléphones & accessoires',
    cta: 'Voir les offres',
    to: '/products?category=cat-telephones',
    gradient: 'from-[#1a1035] via-[#2d1b6e] to-[#1a1035]',
    accent: '#a78bfa',
    blob1: 'rgba(139,92,246,0.35)',
    blob2: 'rgba(59,130,246,0.2)',
    emoji: '📱',
  },
  {
    id: 2,
    tag: '✨ Nouveautés',
    title: 'Mode Cameroun',
    subtitle: 'Les tendances du moment, livrées chez vous',
    cta: 'Explorer',
    to: '/products?category=cat-mode',
    gradient: 'from-[#0a1628] via-[#0f2850] to-[#0a1628]',
    accent: '#38bdf8',
    blob1: 'rgba(14,165,233,0.3)',
    blob2: 'rgba(16,185,129,0.2)',
    emoji: '👗',
  },
  {
    id: 3,
    tag: '🚚 Livraison offerte',
    title: 'Zéro frais',
    subtitle: 'sur des centaines de produits sélectionnés',
    cta: 'Profiter',
    to: '/products?freeShipping=1',
    gradient: 'from-[#0d1f12] via-[#0f2d1a] to-[#0d1f12]',
    accent: '#34d399',
    blob1: 'rgba(16,185,129,0.3)',
    blob2: 'rgba(250,204,21,0.15)',
    emoji: '📦',
  },
]

export default function HeroBanner() {
  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)

  const go = useCallback((next: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setIdx(next); setAnimating(false) }, 300)
  }, [animating])

  const prev = () => go((idx - 1 + BANNERS.length) % BANNERS.length)
  const next = () => go((idx + 1) % BANNERS.length)

  useEffect(() => {
    const t = setInterval(() => next(), 5000)
    return () => clearInterval(t)
  }, [idx])

  const b = BANNERS[idx]

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${b.gradient.split(' ').join(', ')})` }}>
      {/* BG gradient */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{ background: `linear-gradient(135deg, #0d0d1a, #111827)` }}
      />
      {/* Blobs */}
      <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full blur-3xl transition-all duration-700"
        style={{ background: b.blob1 }} />
      <div className="absolute -bottom-10 right-10 h-48 w-48 rounded-full blur-3xl transition-all duration-700"
        style={{ background: b.blob2 }} />
      {/* Grid dots */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col justify-between gap-4 px-6 py-7 sm:flex-row sm:items-center sm:py-8"
        style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'none', transition: 'opacity .3s, transform .3s' }}
      >
        <div>
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: b.accent + '22', color: b.accent }}
          >
            {b.tag}
          </span>
          <h2 className="text-3xl font-black text-white sm:text-4xl">{b.title}</h2>
          <p className="mt-1 text-sm text-white/50">{b.subtitle}</p>
          <Link
            to={b.to}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-80"
            style={{ background: b.accent }}
          >
            {b.cta} →
          </Link>
        </div>
        <div className="flex items-center justify-center">
          <span
            className="text-7xl sm:text-8xl"
            style={{ filter: 'drop-shadow(0 0 32px ' + b.blob1 + ')', animation: 'float 3s ease-in-out infinite' }}
          >
            {b.emoji}
          </span>
        </div>
      </div>

      {/* Nav arrows */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition">
        <ChevronLeft size={16} />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition">
        <ChevronRight size={16} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 20 : 6, background: i === idx ? b.accent : 'rgba(255,255,255,0.3)' }}
          />
        ))}
      </div>
    </div>
  )
}
