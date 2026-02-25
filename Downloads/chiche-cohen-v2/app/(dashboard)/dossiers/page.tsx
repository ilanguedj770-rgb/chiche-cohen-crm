'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type DossierPipeline, type Etape } from '@/lib/types'
import { Plus, Search, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'

const ETAPES_PIPELINE: Etape[] = [
  'qualification', 'mandat', 'constitution_dossier', 'expertise_amiable',
  'offre_assureur', 'negociation', 'procedure_judiciaire', 'transaction', 'encaissement'
]

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<DossierPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [vue, setVue] = useState<'kanban' | 'liste'>('kanban')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    supabase.from('vue_pipeline').select('*').order('updated_at', { ascending: false }).then(({ data }) => {
      if (data) setDossiers(data)
      setLoading(false)
    })
  }, [])

  const filtres = dossiers.filter(d => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return d.client_nom?.toLowerCase().includes(q) || d.client_prenom?.toLowerCase().includes(q) || d.reference?.toLowerCase().includes(q)
  })

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dossiers</h1>
          <p className="text-gray-500 text-sm mt-1">{dossiers.length} dossiers actifs</p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau dossier
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="input pl-9" />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg p-1">
          {(['kanban', 'liste'] as const).map(v => (
            <button key={v} onClick={() => setVue(v)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vue === v ? 'bg-cabinet-blue text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'kanban' ? 'Pipeline' : 'Liste'}
            </button>
          ))}
        </div>
      </div>

      {vue === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {ETAPES_PIPELINE.map(etape => {
              const items = filtres.filter(d => d.etape === etape)
              return (
                <div key={etape} className="w-64 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{ETAPES_LABELS[etape]}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-16">
                    {items.map(d => (
                      <Link key={d.id} href={`/dossiers/${d.id}`}>
                        <div className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${d.jours_inactif >= 7 ? 'border-orange-200' : 'border-gray-100'}`}>
                          <div className="font-medium text-sm">{d.client_nom} {d.client_prenom}</div>
                          <div className="text-xs text-gray-400 font-mono">{d.reference}</div>
                          <div className="text-xs text-gray-400 mt-1">{TYPE_ACCIDENT_LABELS[d.type_accident]}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">{d.juriste_nom ?? '—'}</span>
                            <div className="flex items-center gap-1">
                              {d.prochaine_audience && <span className="text-xs text-blue-500 flex items-center gap-0.5"><Calendar size={10} />{new Date(d.prochaine_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                              {d.jours_inactif >= 7 && <span className="text-xs text-orange-500 flex items-center gap-0.5"><Clock size={10} />{d.jours_inactif}j</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {vue === 'liste' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Référence', 'Client', 'Type', 'Étape', 'Juriste', 'Inactivité'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtres.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link href={`/dossiers/${d.id}`} className="text-sm font-mono text-cabinet-blue hover:underline">{d.reference}</Link></td>
                  <td className="px-4 py-3"><div className="text-sm font-medium">{d.client_nom} {d.client_prenom}</div></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{TYPE_ACCIDENT_LABELS[d.type_accident]}</td>
                  <td className="px-4 py-3"><span className={`badge ${ETAPES_COULEURS[d.etape]}`}>{ETAPES_LABELS[d.etape]}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.juriste_nom ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs ${d.jours_inactif >= 10 ? 'text-orange-500' : 'text-gray-400'}`}>{d.jours_inactif}j</span></td>
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
