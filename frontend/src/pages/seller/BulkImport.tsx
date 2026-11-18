import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { api } from '../../lib/api'

// Catégories disponibles
const CATEGORIES = [
  { id: 'cat-alimentation', name: 'Alimentation' },
  { id: 'cat-beaute', name: 'Beauté' },
  { id: 'cat-informatique', name: 'Informatique' },
  { id: 'cat-maison', name: 'Maison' },
  { id: 'cat-mode', name: 'Mode' },
  { id: 'cat-telephones', name: 'Téléphones' },
  { id: 'cat-autre', name: 'Autre' },
]

// Colonnes du CSV
const COLUMNS = ['nom', 'description', 'prix', 'stock', 'categorie_id', 'marque', 'livraison_gratuite', 'frais_livraison', 'image1', 'image2', 'image3']

// Générer le fichier CSV exemple
function downloadTemplate() {
  const header = COLUMNS.join(';')
  const examples = [
    ['Chaussures Nike Air Max', 'Chaussures de sport confortables', '45000', '20', 'cat-mode', 'Nike', 'false', '2000', 'https://example.com/img1.jpg', '', ''],
    ['iPhone 15 Pro', 'Smartphone Apple dernière génération', '750000', '5', 'cat-telephones', 'Apple', 'true', '0', 'https://example.com/img2.jpg', '', ''],
    ['Crème hydratante', 'Soin visage naturel', '8500', '50', 'cat-beaute', '', 'false', '1000', '', '', ''],
  ]
  const rows = examples.map(r => r.join(';'))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'template_produits_selline.csv'; a.click()
  URL.revokeObjectURL(url)
}

// Parser le CSV
function parseCsv(text: string) {
  const sep = text.includes(';') ? ';' : ','
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('Le fichier doit contenir au moins 1 produit.')
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  return lines.slice(1).map((line, i) => {
    const vals = line.split(sep)
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim().replace(/^"|"$/g, '') })
    const images = [row.image1, row.image2, row.image3].filter(u => u && u.startsWith('http'))
    return {
      _row: i + 2,
      name: row.nom || row.name || '',
      description: row.description || '',
      price: parseFloat(row.prix || row.price || '0'),
      stock: parseInt(row.stock || '1', 10),
      categoryId: row.categorie_id || row.category_id || null,
      brand: row.marque || row.brand || '',
      freeShipping: row.livraison_gratuite === 'true' || row.livraison_gratuite === 'oui' || row.free_shipping === 'true',
      shippingFee: parseFloat(row.frais_livraison || row.shipping_fee || '0'),
      images,
    }
  })
}

type ParsedRow = ReturnType<typeof parseCsv>[number]

export default function BulkImport() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: { row: number; name: string; error: string }[] } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(''); setRows([]); setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCsv(ev.target?.result as string)
        const invalid = parsed.filter(r => !r.name || !r.price || r.price <= 0)
        if (invalid.length) setParseError(`${invalid.length} ligne(s) invalide(s) : « nom » et « prix » sont obligatoires.`)
        setRows(parsed.filter(r => r.name && r.price > 0))
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Fichier invalide.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true); setResult(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = rows.map(({ _row: _, ...r }) => r)
      const res = await api.bulkImportProducts(payload)
      setResult(res)
      if (res.created > 0) setRows([])
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur d\'import.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeader title="Import en masse" back />
      <div className="page py-4">
        <div className="mx-auto max-w-4xl space-y-4">

          {/* Instructions */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><FileSpreadsheet size={18} className="text-selline-dark" /> Comment ça marche ?</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Télécharge le <strong>template CSV</strong> ci-dessous</li>
              <li>Remplis-le avec tes produits dans Excel / Google Sheets</li>
              <li>Pour les photos : mets le lien URL de l'image dans les colonnes <code className="bg-slate-100 px-1 rounded">image1</code>, <code className="bg-slate-100 px-1 rounded">image2</code>…</li>
              <li>Exporte en <strong>.CSV</strong> (séparateur point-virgule ou virgule)</li>
              <li>Uploade ton fichier ici et clique <strong>Importer</strong></li>
            </ol>
            <div className="pt-1">
              <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2 px-4 py-2.5 text-sm">
                <Download size={16} /> Télécharger le template CSV
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Catégories disponibles : {CATEGORIES.map(c => <span key={c.id} className="inline-block bg-slate-100 rounded px-1.5 py-0.5 mr-1 mb-1">{c.name} <span className="text-slate-400">({c.id})</span></span>)}
            </div>
          </div>

          {/* Upload zone */}
          <div
            className="card border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer hover:border-selline-yellow hover:bg-yellow-50 transition"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-600">Clique pour sélectionner ton fichier CSV</p>
            <p className="text-sm text-slate-400 mt-1">ou glisse-dépose ici</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </div>

          {/* Erreur parse */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {parseError}
            </div>
          )}

          {/* Résultat import */}
          {result && (
            <div className={`rounded-xl p-4 text-sm ${result.errors.length === 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
              <p className="font-semibold flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-green-600" />
                {result.created} produit(s) importé(s) avec succès !
              </p>
              {result.errors.length > 0 && (
                <>
                  <p className="text-amber-700 font-medium mb-1">{result.errors.length} erreur(s) :</p>
                  <ul className="space-y-0.5 text-amber-700">
                    {result.errors.map((e, i) => <li key={i}>Ligne {e.row} « {e.name} » : {e.error}</li>)}
                  </ul>
                </>
              )}
              {result.created > 0 && (
                <button onClick={() => navigate('/seller/products')} className="btn-primary mt-3 px-4 py-2 text-sm">Voir mes produits</button>
              )}
            </div>
          )}

          {/* Prévisualisation */}
          {rows.length > 0 && !result && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-50">
                <h2 className="font-semibold">{rows.length} produit(s) prêt(s) à importer</h2>
                <button onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = '' }} className="text-slate-400 hover:text-red-500 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Photo</th>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-right">Prix</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{r._row}</td>
                        <td className="px-3 py-2">
                          {r.images[0]
                            ? <img src={r.images[0]} alt="" className="h-9 w-9 rounded-lg object-cover bg-slate-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">–</div>
                          }
                        </td>
                        <td className="px-3 py-2 font-medium max-w-[200px] truncate">{r.name}</td>
                        <td className="px-3 py-2 text-right font-bold">{r.price.toLocaleString('fr-FR')} F</td>
                        <td className="px-3 py-2 text-right">{r.stock}</td>
                        <td className="px-3 py-2 text-slate-500">{CATEGORIES.find(c => c.id === r.categoryId)?.name ?? r.categoryId ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && <p className="px-4 py-2 text-xs text-slate-400">… et {rows.length - 20} autre(s)</p>}
              </div>
              <div className="p-4 border-t border-slate-50">
                <button onClick={handleImport} disabled={importing} className="btn-primary px-6 py-3 text-sm w-full sm:w-auto">
                  {importing ? 'Import en cours…' : `🚀 Importer ${rows.length} produit(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
