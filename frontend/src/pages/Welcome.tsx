import { Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

/* Données mock pour les cartes 3D */
const CARDS = [
  { emoji: '👟', name: 'Nike Air Max', price: '45 000 F', badge: 'Mode', color: '#6366f1' },
  { emoji: '📱', name: 'iPhone 15 Pro', price: '750 000 F', badge: 'Tech', color: '#10b981' },
  { emoji: '💄', name: 'Kit Beauté', price: '12 500 F', badge: 'Beauté', color: '#f59e0b' },
  { emoji: '🎧', name: 'AirPods Pro', price: '185 000 F', badge: 'Audio', color: '#3b82f6' },
]

function FloatingCards() {
  return (
    <div className="cards-scene" aria-hidden>
      {CARDS.map((c, i) => (
        <div
          key={c.name}
          className="float-card"
          style={{ '--i': i, '--color': c.color } as React.CSSProperties}
        >
          <span className="float-card-emoji">{c.emoji}</span>
          <div className="float-card-info">
            <span className="float-card-name">{c.name}</span>
            <span className="float-card-price">{c.price}</span>
          </div>
          <span className="float-card-badge" style={{ background: c.color + '22', color: c.color }}>
            {c.badge}
          </span>
        </div>
      ))}

      {/* Anneau orbital 3D */}
      <div className="orbit-ring" style={{ '--delay': '0s' } as React.CSSProperties}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="orbit-dot" style={{ '--j': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="orbit-ring orbit-ring-2" style={{ '--delay': '-4s' } as React.CSSProperties}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="orbit-dot orbit-dot-2" style={{ '--j': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  )
}

/* Mini version pour mobile */
function MiniOrbit() {
  return (
    <div className="mini-orbit-wrap" aria-hidden>
      <div className="mini-sphere">
        <div className="mini-ring ring-a">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="mini-dot" style={{ '--k': i } as React.CSSProperties} />
          ))}
        </div>
        <div className="mini-ring ring-b">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="mini-dot mini-dot-b" style={{ '--k': i } as React.CSSProperties} />
          ))}
        </div>
        <div className="mini-ring ring-c">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mini-dot mini-dot-c" style={{ '--k': i } as React.CSSProperties} />
          ))}
        </div>
        <div className="sphere-core" />
      </div>
    </div>
  )
}

export default function Welcome() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#070b12] text-white">

      {/* ─── PANNEAU GAUCHE (desktop) ─── */}
      <div className="relative hidden flex-1 flex-col overflow-hidden lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Logo size="md" />

          {/* Animation 3D centrale */}
          <div className="flex flex-1 items-center justify-center">
            <FloatingCards />
          </div>

          <div>
            <h1 className="text-5xl font-black leading-[1.07] tracking-tight text-white xl:text-6xl">
              La boutique<br />
              en ligne<br />
              <span className="text-gradient">du Cameroun.</span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/40">
              Achetez et vendez partout au Cameroun. Mobile Money, livraison rapide, vendeurs vérifiés.
            </p>
            <div className="mt-8 flex items-center gap-10">
              {[['500+', 'Boutiques'], ['48h', 'Livraison'], ['100%', 'Sécurisé']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="mt-0.5 text-xs text-white/30">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/[0.1]">© {new Date().getFullYear()} Selline</p>
        </div>
      </div>

      {/* ─── PANNEAU DROIT / MOBILE ─── */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-10 lg:w-[440px] lg:shrink-0 xl:w-[480px]">

        {/* Orbes background mobile */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="orb orb-1" style={{ opacity: .45 }} />
          <div className="orb orb-2" style={{ opacity: .35 }} />
        </div>

        <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent lg:block" />

        <div className="relative z-10 w-full max-w-sm">

          {/* Sphère 3D — mobile uniquement */}
          <div className="mb-6 flex justify-center lg:hidden">
            <MiniOrbit />
          </div>

          {/* Logo */}
          <div className="mb-9 flex flex-col items-center gap-3 welcome-item">
            <div className="logo-ring">
              <Logo size="lg" />
            </div>
            <div className="text-center">
              <h2 className="text-[22px] font-black tracking-tight text-white">Selline</h2>
              <p className="mt-1 text-sm text-white/30">La marketplace du Cameroun</p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-3 welcome-item">
            <Link to="/register" className="btn-welcome-primary group relative overflow-hidden">
              <span className="relative z-10 font-bold text-[#070b12]">Créer un compte</span>
              <div className="btn-shine" />
            </Link>
            <Link to="/login" className="btn-welcome-secondary">
              <span className="font-semibold text-white">Se connecter</span>
            </Link>
          </div>

          <div className="my-7 flex items-center gap-4 welcome-item">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-white/20">ou</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <Link to="/home" className="welcome-item flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm text-white/30 transition duration-300 hover:text-white/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Parcourir les produits
          </Link>

          <p className="mt-7 welcome-item text-center text-[11px] text-white/[0.15]">
            En continuant, vous acceptez nos{' '}
            <Link to="/terms" className="text-white/30 hover:text-white/55 transition">conditions d'utilisation</Link>
          </p>
        </div>
      </div>

      <style>{`
        /* ── Gradient texte ── */
        .text-gradient {
          background: linear-gradient(135deg, #e2e8f0 0%, #64748b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Orbes flottants ── */
        .orb { position:absolute; border-radius:9999px; filter:blur(90px); pointer-events:none; }
        .orb-1 { width:500px;height:500px;top:-150px;left:-150px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 65%);animation:drift1 18s ease-in-out infinite alternate; }
        .orb-2 { width:400px;height:400px;bottom:-80px;right:-80px;background:radial-gradient(circle,rgba(16,185,129,.12) 0%,transparent 65%);animation:drift2 22s ease-in-out infinite alternate; }
        .orb-3 { width:320px;height:320px;top:40%;left:35%;background:radial-gradient(circle,rgba(59,130,246,.08) 0%,transparent 65%);animation:drift1 15s ease-in-out infinite alternate-reverse; }
        @keyframes drift1 { from{transform:translate(0,0) scale(1)} to{transform:translate(40px,30px) scale(1.08)} }
        @keyframes drift2 { from{transform:translate(0,0) scale(1)} to{transform:translate(-30px,-40px) scale(1.05)} }

        /* ── SCÈNE 3D CARTES ── */
        .cards-scene {
          position: relative;
          width: 340px; height: 380px;
          perspective: 900px;
          transform-style: preserve-3d;
        }
        .float-card {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 240px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset;
          animation: floatCard 6s ease-in-out infinite;
          animation-delay: calc(var(--i) * -1.5s);
        }
        .float-card:nth-child(1) { top:  10px; left:  20px; transform: rotateX(8deg) rotateY(-12deg) rotateZ(-2deg); }
        .float-card:nth-child(2) { top:  90px; left:  80px; transform: rotateX(6deg) rotateY(10deg) rotateZ(1deg); z-index:2; }
        .float-card:nth-child(3) { top: 185px; left:  10px; transform: rotateX(-6deg) rotateY(-8deg) rotateZ(-1deg); }
        .float-card:nth-child(4) { top: 260px; left:  75px; transform: rotateX(4deg) rotateY(14deg) rotateZ(2deg); }

        @keyframes floatCard {
          0%,100% { transform: rotateX(var(--rx,8deg)) rotateY(var(--ry,-12deg)) rotateZ(var(--rz,-2deg)) translateY(0px); }
          50%      { transform: rotateX(var(--rx,8deg)) rotateY(var(--ry,-12deg)) rotateZ(var(--rz,-2deg)) translateY(-10px); }
        }
        .float-card:nth-child(1) { --rx:8deg; --ry:-12deg; --rz:-2deg; }
        .float-card:nth-child(2) { --rx:6deg; --ry:10deg; --rz:1deg; }
        .float-card:nth-child(3) { --rx:-6deg; --ry:-8deg; --rz:-1deg; }
        .float-card:nth-child(4) { --rx:4deg; --ry:14deg; --rz:2deg; }

        .float-card-emoji { font-size: 26px; flex-shrink:0; }
        .float-card-info { flex:1; min-width:0; }
        .float-card-name { display:block; font-size:12px; font-weight:600; color:rgba(255,255,255,0.85); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .float-card-price { display:block; font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; }
        .float-card-badge { flex-shrink:0; font-size:10px; font-weight:600; padding:3px 8px; border-radius:99px; }

        /* ── ANNEAUX ORBITAUX (desktop) ── */
        .orbit-ring {
          position: absolute;
          top: 50%; left: 50%;
          width: 300px; height: 300px;
          margin: -150px 0 0 -150px;
          transform-style: preserve-3d;
          animation: orbit 10s linear infinite;
          animation-delay: var(--delay);
        }
        .orbit-ring-2 { width:200px;height:200px;margin:-100px 0 0 -100px; animation-duration:7s; animation-direction:reverse; }
        @keyframes orbit {
          from { transform: rotateX(72deg) rotateZ(0deg); }
          to   { transform: rotateX(72deg) rotateZ(360deg); }
        }
        .orbit-dot {
          position: absolute;
          top: 50%; left: 50%;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(99,102,241,0.7);
          box-shadow: 0 0 8px rgba(99,102,241,0.8);
          transform: rotateZ(calc(var(--j) * 36deg)) translateX(150px) translateY(-3px);
        }
        .orbit-dot-2 {
          width:5px; height:5px;
          background: rgba(16,185,129,0.7);
          box-shadow: 0 0 8px rgba(16,185,129,0.8);
          transform: rotateZ(calc(var(--j) * 51.4deg)) translateX(100px) translateY(-2.5px);
        }

        /* ── SPHÈRE MINI (mobile) ── */
        .mini-orbit-wrap {
          perspective: 400px;
          width: 120px; height: 120px;
          display: flex; align-items: center; justify-content: center;
        }
        .mini-sphere {
          position: relative;
          width: 100%; height: 100%;
          transform-style: preserve-3d;
        }
        .mini-ring {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          border-radius: 50%;
        }
        .ring-a { animation: spinA 6s linear infinite; }
        .ring-b { animation: spinB 9s linear infinite; }
        .ring-c { animation: spinC 12s linear infinite; }
        @keyframes spinA { from{transform:rotateX(60deg) rotateZ(0deg)} to{transform:rotateX(60deg) rotateZ(360deg)} }
        @keyframes spinB { from{transform:rotateX(20deg) rotateY(60deg) rotateZ(0deg)} to{transform:rotateX(20deg) rotateY(60deg) rotateZ(360deg)} }
        @keyframes spinC { from{transform:rotateX(80deg) rotateY(30deg) rotateZ(0deg)} to{transform:rotateX(80deg) rotateY(30deg) rotateZ(-360deg)} }

        .mini-dot {
          position: absolute;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(99,102,241,0.9);
          box-shadow: 0 0 6px rgba(99,102,241,1);
          top: 50%; left: 50%;
          transform: rotateZ(calc(var(--k) * 45deg)) translateX(55px) translateY(-2.5px);
        }
        .mini-dot-b {
          width: 4px; height: 4px;
          background: rgba(16,185,129,0.9);
          box-shadow: 0 0 6px rgba(16,185,129,1);
          transform: rotateZ(calc(var(--k) * 60deg)) translateX(44px) translateY(-2px);
        }
        .mini-dot-c {
          width: 3px; height: 3px;
          background: rgba(245,158,11,0.9);
          box-shadow: 0 0 5px rgba(245,158,11,1);
          transform: rotateZ(calc(var(--k) * 72deg)) translateX(32px) translateY(-1.5px);
        }
        .sphere-core {
          position: absolute;
          top: 50%; left: 50%;
          width: 20px; height: 20px;
          margin: -10px 0 0 -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.6), rgba(99,102,241,0.1));
          box-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3);
          animation: pulse-core 3s ease-in-out infinite;
        }
        @keyframes pulse-core {
          0%,100% { transform:scale(1); box-shadow:0 0 20px rgba(99,102,241,0.6),0 0 40px rgba(99,102,241,0.3); }
          50%      { transform:scale(1.2); box-shadow:0 0 30px rgba(99,102,241,0.9),0 0 60px rgba(99,102,241,0.5); }
        }

        /* ── Logo ring ── */
        .logo-ring {
          display:inline-flex; align-items:center; justify-content:center;
          border-radius:24px; padding:2px;
          background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03));
          box-shadow:0 0 40px rgba(99,102,241,0.15),inset 0 1px 0 rgba(255,255,255,0.07);
        }

        /* ── Boutons ── */
        .btn-welcome-primary {
          display:flex; width:100%; align-items:center; justify-content:center;
          border-radius:16px; padding:15px 24px;
          background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);
          box-shadow:0 4px 32px rgba(255,255,255,0.08),0 1px 0 rgba(255,255,255,0.3) inset;
          transition:transform .2s ease,box-shadow .2s ease; text-decoration:none;
        }
        .btn-welcome-primary:hover { transform:translateY(-1px); box-shadow:0 8px 40px rgba(255,255,255,0.14),0 1px 0 rgba(255,255,255,0.3) inset; }
        .btn-welcome-primary:active { transform:scale(0.98); }
        .btn-shine {
          position:absolute; inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 100%; background-position:-100% 0; border-radius:16px;
        }
        .btn-welcome-primary:hover .btn-shine { animation:shine .5s ease forwards; }
        @keyframes shine { from{background-position:-100% 0} to{background-position:200% 0} }

        .btn-welcome-secondary {
          display:flex; width:100%; align-items:center; justify-content:center;
          border-radius:16px; padding:15px 24px;
          border:1px solid rgba(255,255,255,0.08);
          background:rgba(255,255,255,0.03); backdrop-filter:blur(12px);
          text-decoration:none; transition:border-color .2s,background .2s,transform .2s;
        }
        .btn-welcome-secondary:hover { border-color:rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);transform:translateY(-1px); }
        .btn-welcome-secondary:active { transform:scale(0.98); }

        /* ── Entrées ── */
        .welcome-item { animation:welcomeIn .5s cubic-bezier(.22,.68,0,1.2) both; }
        .welcome-item:nth-child(1){animation-delay:.05s}
        .welcome-item:nth-child(2){animation-delay:.12s}
        .welcome-item:nth-child(3){animation-delay:.19s}
        .welcome-item:nth-child(4){animation-delay:.26s}
        .welcome-item:nth-child(5){animation-delay:.32s}
        @keyframes welcomeIn {
          from{opacity:0;transform:translateY(20px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
      `}</style>
    </div>
  )
}
