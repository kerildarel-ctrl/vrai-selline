import { Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function Welcome() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#080c14] text-white">

      {/* ─── PANNEAU GAUCHE ─── */}
      <div className="relative hidden flex-1 flex-col overflow-hidden lg:flex">

        {/* Blobs CSS */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.18) 0%, transparent 65%)' }} />
          <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 65%)' }} />
          <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)' }} />
          {/* Grille de points */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          {/* Diagonale décorative */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        {/* Contenu gauche */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Logo size="md" />

          <div>


            <h1 className="text-5xl font-black leading-[1.08] tracking-tight text-white xl:text-6xl">
              La boutique<br />
              en ligne<br />
              du Cameroun.
            </h1>

            <p className="mt-6 max-w-sm text-base leading-relaxed text-white/60">
              Achetez et vendez partout au Cameroun. Mobile Money, livraison rapide, vendeurs vérifiés.
            </p>

            {/* Stats ligne */}
            <div className="mt-10 flex items-center gap-8">
              {[['500+', 'Boutiques'], ['48h', 'Livraison'], ['100%', 'Sécurisé']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="text-xs font-medium text-white/40">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-700">© {new Date().getFullYear()} Selline</p>
        </div>
      </div>

      {/* ─── PANNEAU DROIT ─── */}
      <div className="relative flex w-full flex-col items-center justify-center bg-[#0d1120] px-8 py-12 lg:w-[420px] lg:shrink-0 xl:w-[480px]">


        <div className="relative z-10 w-full max-w-sm">
          {/* Logo + nom mis en exergue */}
          <div className="mb-10 flex flex-col items-center gap-2">
            <Logo size="lg" />
            <h2 className="text-2xl font-black tracking-tight text-white">selline</h2>
            <p className="text-sm text-white/40">Rejoignez la communauté Selline</p>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-4">
            <Link
              to="/register"
              className="group relative w-full overflow-hidden rounded-2xl py-4 text-center text-[15px] font-bold text-selline-dark shadow-xl shadow-selline-yellow/20 transition duration-300 hover:shadow-selline-yellow/40"
              style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)' }}
            >
              <span className="relative z-10">Créer un compte</span>
              <div className="absolute inset-0 translate-y-full bg-white/20 transition duration-300 group-hover:translate-y-0" />
            </Link>

            <Link
              to="/login"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-center text-[15px] font-semibold text-white backdrop-blur transition duration-300 hover:border-white/25 hover:bg-white/[0.08]"
            >
              Se connecter
            </Link>
          </div>

          {/* Séparateur */}
          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-xs text-slate-600">ou</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* Parcourir */}
          <Link
            to="/home"
            className="flex w-full items-center justify-center rounded-2xl border border-white/[0.06] py-3.5 text-sm font-medium text-slate-400 transition hover:border-white/15 hover:text-white"
          >
            Parcourir les produits
          </Link>

          <p className="mt-8 text-center text-xs text-slate-700">
            En continuant, vous acceptez nos{' '}
            <Link to="/terms" className="text-slate-500 hover:text-slate-300 transition">conditions d'utilisation</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .relative.z-10.w-full.max-w-sm > * {
          animation: fadeSlide .45s ease both;
        }
        .relative.z-10.w-full.max-w-sm > *:nth-child(1) { animation-delay: .05s; }
        .relative.z-10.w-full.max-w-sm > *:nth-child(2) { animation-delay: .12s; }
        .relative.z-10.w-full.max-w-sm > *:nth-child(3) { animation-delay: .19s; }
        .relative.z-10.w-full.max-w-sm > *:nth-child(4) { animation-delay: .26s; }
        .relative.z-10.w-full.max-w-sm > *:nth-child(5) { animation-delay: .32s; }
        .relative.z-10.w-full.max-w-sm > *:nth-child(6) { animation-delay: .38s; }
      `}</style>
    </div>
  )
}
