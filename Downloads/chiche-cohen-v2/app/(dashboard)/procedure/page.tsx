'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Filter } from 'lucide-react'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS } from '@/lib/types'
import Link from 'next/link'

export default function ProcedurePage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<'tous' | 'judiciaire' | 'amiable'>('tous')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vue_pipeline')
        .select('*')
        .in('etape', ['procedure_judiciaire', 'negociation', 'offre_assureur', 'transaction'])
        .order('updated_at', { ascending: false })
      if (data) setDossiers(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtres = dossiers.filter(d => {
    if (filtre === 'judiciaire') return d.voie === 'judiciaire'
    if (filtre === 'amiable') return d.voie === 'amiable'
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Procédures en cours</h1>
        <p className="text-gray-500 text-sm mt-1">{dossiers.length} dossier(s) en phase procédurale</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[['tous', 'Tous'], ['judiciaire', '⚖️ Judiciaire'], ['amiable', '🤝 Amiable']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltre(val as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtre === val ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-cabinet-blue'}`}>
            {label}
          </button>
        ))}
      </div>

      {filtres.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Scale size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune procédure en cours</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Référence', 'Client', 'Type', 'Étape', 'Voie', 'Juriste', 'Inactivité'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtres.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dossiers/${d.id}`} className="text-sm font-mono text-cabinet-blue hover:underline">{d.reference}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{d.client_nom} {d.client_prenom}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{TYPE_ACCIDENT_LABELS[d.type_accident as keyof typeof TYPE_ACCIDENT_LABELS]}</td>
                  <td className="px-4 py-3"><span className={`badge ${ETAPES_COULEURS[d.etape as keyof typeof ETAPES_COULEURS]}`}>{ETAPES_LABELS[d.etape as keyof typeof ETAPES_LABELS]}</span></td>
                  <td className="px-4 py-3">
                    <span className={`badge ${d.voie === 'judiciaire' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {d.voie === 'judiciaire' ? '⚖️ Judiciaire' : '🤝 Amiable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.juriste_nom ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs ${d.jours_inactif >= 10 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>{d.jours_inactif}j</span></td>
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
