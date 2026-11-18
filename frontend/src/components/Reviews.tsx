import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import Rating from './Rating'
import { Alert, ErrorState, Spinner } from './States'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export default function Reviews({ productId }: { productId: string }) {
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsync(() => api.reviews(productId), [productId])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating === 0) { setFormError('Choisissez une note de 1 à 5.'); return }
    setBusy(true); setFormError(null)
    try {
      await api.addReview(productId, { rating, comment: comment.trim() })
      setRating(0); setComment(''); setSent(true)
      await reload()
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Avis non envoyé') }
    finally { setBusy(false) }
  }

  return (
    <section className="mt-6 md:mt-10" aria-labelledby="reviews-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 id="reviews-title" className="text-lg font-bold md:text-xl">Avis clients</h2>
        {data && data.total > 0 && (
          <div className="flex items-center gap-2"><span className="text-2xl font-extrabold">{data.average.toFixed(1)}</span><Rating value={data.average} count={data.total} size={16} /></div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-3">
          {loading ? <div className="skeleton h-24" /> : error ? <ErrorState message={error} onRetry={reload} />
            : !data || data.items.length === 0 ? <p className="card p-6 text-center text-sm text-slate-500">Aucun avis pour le moment. Soyez le premier à donner le vôtre.</p>
            : data.items.map((r) => (
              <article key={r.id} className="card p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-selline-dark text-sm font-bold text-white">{r.author[0]?.toUpperCase() ?? '?'}</span>
                    <div><p className="text-sm font-semibold">{r.author}</p><Rating value={r.rating} size={13} /></div>
                  </div>
                  <time className="text-xs text-slate-400" dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
                </div>
                {r.comment && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{r.comment}</p>}
              </article>
            ))}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Donner votre avis</h3>
          {!user ? (
            <p className="text-sm text-slate-500"><Link to="/login" state={{ from: `/product/${productId}` }} className="link">Connectez-vous</Link> pour laisser un avis.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {sent && <Alert kind="success">Merci, votre avis a été publié.</Alert>}
              {formError && <Alert>{formError}</Alert>}
              <div className="flex gap-1" role="radiogroup" aria-label="Note">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} sur 5`} onClick={() => setRating(i)} className="p-0.5 transition hover:scale-110">
                    <Star size={28} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
              <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Votre expérience avec ce produit (facultatif)" className="input-field" aria-label="Commentaire" />
              <button type="submit" disabled={busy} className="btn-dark btn-block">{busy && <Spinner />} Publier</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
