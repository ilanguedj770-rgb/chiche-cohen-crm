'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Search, Download, Eye, FolderOpen, Filter, X } from 'lucide-react'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  rapport_expertise: 'Rapport expertise',
  ordonnance: 'Ordonnance',
  jugement: 'Jugement',
  assignation: 'Assignation',
  certificat_medical: 'Certificat médical',
  constat: 'Constat',
  contrat: 'Contrat',
  facture: 'Facture',
  correspondance: 'Correspondance',
  piece_identite: 'Pièce d\'identité',
  autre: 'Autre',
}

const EXT_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', heic: '🖼️',
  mp4: '🎬', mov: '🎬',
}

function extIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  return EXT_ICON[ext] || '📎'
}

function fileSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko'
  return (bytes / 1024 / 1024).toFixed(1) + ' Mo'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('')

  useEffect(() => {
    supabase
      .from('documents')
      .select(`
        id, nom_fichier, type_document, taille_bytes, created_at, storage_path,
        dossier:dossiers(id, reference, client:clients(nom, prenom))
      `)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setDocuments(data)
        setLoading(false)
      })
  }, [])

  const filtres = useMemo(() => documents.filter(d => {
    if (recherche) {
      const q = recherche.toLowerCase()
      if (!d.nom_fichier?.toLowerCase().includes(q) &&
          !d.dossier?.reference?.toLowerCase().includes(q) &&
          !d.dossier?.client?.nom?.toLowerCase().includes(q)) return false
    }
    if (filtreType && d.type_document !== filtreType) return false
    return true
  }), [documents, recherche, filtreType])

  const types = useMemo(() => {
    const seen = new Set(documents.map(d => d.type_document).filter(Boolean))
    return Array.from(seen)
  }, [documents])

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={22} className="text-cabinet-blue" />Documents</h1>
          <p className="text-gray-500 text-sm mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats par type */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFiltreType('')}
          className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' + (!filtreType ? 'bg-cabinet-blue text-white border-cabinet-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
          Tous ({documents.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFiltreType(f => f === t ? '' : t)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' + (filtreType === t ? 'bg-cabinet-blue text-white border-cabinet-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
            {TYPE_LABELS[t] || t} ({documents.filter(d => d.type_document === t).length})
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Nom fichier, référence, client..."
            value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cabinet-blue" />
        </div>
        {(recherche || filtreType) && (
          <button onClick={() => { setRecherche(''); setFiltreType('') }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X size={14} /> Réinitialiser
          </button>
        )}
        <span className="text-sm text-gray-400 ml-auto">{filtres.length} résultat{filtres.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Liste documents */}
      {filtres.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">Aucun document trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Document', 'Dossier / Client', 'Type', 'Taille', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtres.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{extIcon(doc.nom_fichier)}</span>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{doc.nom_fichier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.dossier ? (
                      <Link href={'/dossiers/' + doc.dossier.id} className="hover:text-cabinet-blue">
                        <div className="text-sm font-medium">{doc.dossier.client?.nom} {doc.dossier.client?.prenom}</div>
                        <div className="text-xs text-gray-400 font-mono">{doc.dossier.reference}</div>
                      </Link>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-600 text-xs">{TYPE_LABELS[doc.type_document] || doc.type_document || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{fileSize(doc.taille_bytes)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDownload(doc)} title="Télécharger"
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-cabinet-blue transition-colors">
                        <Download size={14} />
                      </button>
                      {doc.dossier && (
                        <Link href={'/dossiers/' + doc.dossier.id} title="Voir le dossier">
                          <span className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex items-center">
                            <FolderOpen size={14} />
                          </span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
