import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import Field from '../components/Field'
import Img from '../components/Img'
import { Alert, ErrorState, PageLoader, Spinner } from '../components/States'
import { useCategories } from '../hooks/useCategories'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'

export default function SellerProductForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const { categories } = useCategories()
  const existing = useAsync(() => (id ? api.sellerProduct(id) : Promise.resolve(null)), [id])
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: '', brand: '', price: '', stock: '1', categoryId: '', description: '', freeShipping: true, shippingFee: '0' })
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const p = existing.data
    if (!p) return
    setForm({ name: p.name, brand: p.brand ?? '', price: String(p.price), stock: String(p.stock ?? 0), categoryId: p.category?.id ?? '', description: p.description ?? '', freeShipping: p.freeShipping, shippingFee: String(p.shippingFee) })
    setImages(p.images)
  }, [existing.data])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true); setError(null)
    try {
      const urls = await Promise.all([...files].map((f) => api.upload(f).then((r) => r.url)))
      setImages((prev) => [...prev, ...urls])
    } catch (e) { setError(e instanceof Error ? e.message : 'Téléversement impossible') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    const body = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: form.categoryId || undefined,
      description: form.description.trim() || undefined,
      freeShipping: form.freeShipping,
      shippingFee: form.freeShipping ? 0 : Number(form.shippingFee),
      images,
    }
    try {
      await (id ? api.updateProduct(id, body) : api.createProduct(body))
      navigate('/seller/products', { replace: true })
    } catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible'); setBusy(false) }
  }

  if (editing && existing.loading) return <PageLoader />
  if (editing && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold md:text-2xl">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h1>
      <form onSubmit={submit} className="card space-y-4 p-5 md:p-6">
        {error && <Alert>{error}</Alert>}

        <div>
          <span className="label">Photos</span>
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={src + i} className="relative">
                <Img src={src} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-xl" />
                <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-selline-dark p-1 text-white" aria-label="Retirer la photo"><X size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-500 transition hover:border-selline-dark">
              {uploading ? <Spinner /> : <ImagePlus size={20} />} Ajouter
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          </div>
        </div>

        <Field label="Nom du produit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marque (facultatif)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <div>
            <label htmlFor="cat" className="label">Catégorie</label>
            <select id="cat" className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Choisir…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Prix (FCFA)" type="number" min={0} inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Field label="Stock" type="number" min={0} inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={form.freeShipping} onChange={(e) => setForm({ ...form, freeShipping: e.target.checked })} className="h-4 w-4 accent-selline-dark" />
            Livraison gratuite
          </label>
          {!form.freeShipping && <div className="mt-3"><Field label="Frais de livraison (FCFA)" type="number" min={0} inputMode="numeric" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: e.target.value })} required /></div>}
        </div>

        <div>
          <label htmlFor="d" className="label">Description</label>
          <textarea id="d" rows={5} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={busy || uploading} className="btn-primary flex-1 sm:flex-none">{busy && <Spinner />} {editing ? 'Enregistrer' : 'Publier'}</button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Annuler</button>
        </div>
      </form>
    </div>
  )
}
