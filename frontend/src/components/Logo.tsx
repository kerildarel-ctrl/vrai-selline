interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

const sizes = {
  sm: { wrap: 'w-8 h-8', text: 'text-[17px]' },
  md: { wrap: 'w-10 h-10', text: 'text-xl' },
  lg: { wrap: 'w-14 h-14', text: 'text-3xl' },
}

export default function Logo({ size = 'md', dark = false }: LogoProps) {
  const s = sizes[size]
  return (
    <span className="inline-flex items-center gap-2 select-none">
      {/* Sac de shopping original, couleurs premium */}
      <span className={`${s.wrap} flex items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5 shrink-0`}>
        <svg viewBox="0 0 40 40" className="h-[68%] w-[68%]" fill="none" aria-hidden="true">
          {/* Corps du sac — dégradé dark→navy */}
          <defs>
            <linearGradient id="bagGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
          </defs>
          <path d="M12 14h16l-1.5 16H13.5L12 14z" fill="url(#bagGrad)" />
          {/* Poignée — orange vif */}
          <path d="M16 14V11a4 4 0 018 0v3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
          {/* Point central — jaune/or */}
          <circle cx="20" cy="22" r="2.2" fill="#FACC15" />
        </svg>
      </span>
      <span className={`font-extrabold tracking-tight ${s.text} ${dark ? 'text-selline-dark' : 'text-white'}`}>
        selline
      </span>
    </span>
  )
}
