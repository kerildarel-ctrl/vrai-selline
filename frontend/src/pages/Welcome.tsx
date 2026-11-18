import { Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function Welcome() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#070b12] text-white">

      {/* ─── PANNEAU GAUCHE (desktop) ─── */}
      <div className="relative hidden flex-1 flex-col overflow-hidden lg:flex">
        {/* Orbes animés */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Logo size="md" />
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/50 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Disponible au Cameroun
            </div>
            <h1 className="text-5xl font-black leading-[1.07] tracking-tight text-white xl:text-6xl">
              La boutique<br />
              en ligne<br />
              <span className="text-gradient">du Cameroun.</span>
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/50">
              Achetez et vendez partout au Cameroun. Mobile Money, livraison rapide, vendeurs vérifiés.
            </p>
            <div className="mt-10 flex items-center gap-10">
              {[['500+', 'Boutiques'], ['48h', 'Livraison max'], ['100%', 'Sécurisé']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/35">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/[0.12]">© {new Date().getFullYear()} Selline</p>
        </div>
      </div>

      {/* ─── PANNEAU DROIT / MOBILE ─── */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-12 lg:w-[440px] lg:shrink-0 xl:w-[480px]">

        {/* Fond mobile : orbes */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="orb orb-1" style={{ opacity: .5 }} />
          <div className="orb orb-2" style={{ opacity: .4 }} />
        </div>

        {/* Ligne séparatrice gauche (desktop) */}
        <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent lg:block" />

        <div className="relative z-10 w-full max-w-sm space-y-welcome">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 welcome-item">
            <div className="logo-ring">
              <Logo size="lg" />
            </div>
            <div className="text-center">
              <h2 className="text-[22px] font-black tracking-tight text-white">Selline</h2>
              <p className="mt-1 text-sm text-white/35">La marketplace du Cameroun</p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-3 welcome-item">
            {/* Créer compte — blanc premium */}
            <Link
              to="/register"
              className="btn-welcome-primary group relative overflow-hidden"
            >
              <span className="relative z-10 font-bold text-[#070b12]">Créer un compte</span>
              <div className="btn-shine" />
            </Link>

            {/* Se connecter — verre sombre */}
            <Link
              to="/login"
              className="btn-welcome-secondary"
            >
              <span className="font-semibold text-white">Se connecter</span>
            </Link>
          </div>

          {/* Séparateur */}
          <div className="flex items-center gap-4 welcome-item">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-white/25">ou</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Parcourir */}
          <Link
            to="/home"
            className="welcome-item flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm text-white/35 transition duration-300 hover:text-white/70"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Parcourir les produits
          </Link>

          <p className="welcome-item text-center text-[11px] text-white/[0.18]">
            En continuant, vous acceptez nos{' '}
            <Link to="/terms" className="text-white/35 underline-offset-2 hover:text-white/60 transition hover:underline">conditions d'utilisation</Link>
          </p>
        </div>
      </div>

      <style>{`
        /* Gradient texte */
        .text-gradient {
          background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Orbes flottants */
        .orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 {
          width: 520px; height: 520px;
          top: -160px; left: -160px;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%);
          animation: drift1 18s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 420px; height: 420px;
          bottom: -100px; right: -100px;
          background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%);
          animation: drift2 22s ease-in-out infinite alternate;
        }
        .orb-3 {
          width: 350px; height: 350px;
          top: 40%; left: 30%;
          background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%);
          animation: drift1 15s ease-in-out infinite alternate-reverse;
        }
        @keyframes drift1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-30px, -40px) scale(1.05); }
        }

        /* Logo ring glow */
        .logo-ring {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 24px;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          box-shadow: 0 0 40px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        /* Bouton primaire */
        .btn-welcome-primary {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          padding: 15px 24px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          box-shadow: 0 4px 32px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.3) inset;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-decoration: none;
        }
        .btn-welcome-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 40px rgba(255,255,255,0.14), 0 1px 0 rgba(255,255,255,0.3) inset;
        }
        .btn-welcome-primary:active { transform: translateY(0) scale(0.98); }

        /* Effet shimmer */
        .btn-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%);
          background-size: 200% 100%;
          background-position: -100% 0;
          border-radius: 16px;
          transition: background-position 0s;
        }
        .btn-welcome-primary:hover .btn-shine {
          animation: shine 0.5s ease forwards;
        }
        @keyframes shine {
          from { background-position: -100% 0; }
          to   { background-position: 200% 0; }
        }

        /* Bouton secondaire */
        .btn-welcome-secondary {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          padding: 15px 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .btn-welcome-secondary:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          transform: translateY(-1px);
        }
        .btn-welcome-secondary:active { transform: translateY(0) scale(0.98); }

        /* Entrées */
        .space-y-welcome { display: flex; flex-direction: column; gap: 28px; }
        .welcome-item {
          animation: welcomeIn 0.5s cubic-bezier(.22,.68,0,1.2) both;
        }
        .welcome-item:nth-child(1) { animation-delay: 0.05s; }
        .welcome-item:nth-child(2) { animation-delay: 0.13s; }
        .welcome-item:nth-child(3) { animation-delay: 0.20s; }
        .welcome-item:nth-child(4) { animation-delay: 0.27s; }
        .welcome-item:nth-child(5) { animation-delay: 0.33s; }
        @keyframes welcomeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
