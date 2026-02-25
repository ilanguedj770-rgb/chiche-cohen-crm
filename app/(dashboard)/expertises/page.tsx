'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Stethoscope, Calendar, User } from 'lucide-react'
import Link from 'next/link'

export default function ExpertisesPage() {
  const [expertises, setExpertises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<'toutes' | 'a_venir' | 'passees'>('toutes')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('expertises')
        .select(`*, dossiers(reference, client_id, clients(nom, prenom))`)
        .order('date_expertise', { ascending: true, nullsFirst: false })
      if (data) setExpertises(data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const filtrees = expertises.filter(e => {
    if (filtre === 'a_venir') return e.date_expertise && new Date(e.date_expertise) >= now
    if (filtre === 'passees') return !e.date_expertise || new Date(e.date_expertise) < now
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Expertises</h1>
        <p className="text-gray-500 text-sm mt-1">{expertises.length} expertise(s)</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[['toutes', 'Toutes'], ['a_venir', 'À venir'], ['passees', 'Passées']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltre(val as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtre === val ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-cabinet-blue'}`}>
            {label}
          </button>
        ))}
      </div>

      {filtrees.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune expertise</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtrees.map(e => {
            const client = e.dossiers?.clients
            const aVenir = e.date_expertise && new Date(e.date_expertise) >= now
            return (
              <div key={e.id} className={`card border-l-4 ${aVenir ? 'border-purple-400' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold capitalize">{e.type}</div>
                    {client && <div className="text-sm text-gray-500">{client.nom} {client.prenom}</div>}
                  </div>
                  {e.dossiers && (
                    <Link href={`/dossiers/${e.dossier_id}`} className="text-xs font-mono text-cabinet-blue hover:underline">{e.dossiers.reference}</Link>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {e.date_expertise && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar size={13} />
                      {new Date(e.date_expertise).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {e.expert_nom && <div className="flex items-center gap-1 text-gray-500"><User size={13} />{e.expert_nom}</div>}
                  {e.medecin_conseil_nom && <div className="text-gray-500">Médecin conseil : {e.medecin_conseil_nom}</div>}
                  {e.lieu_expertise && <div className="text-gray-500">{e.lieu_expertise}</div>}
                </div>
                {(e.taux_dfp || e.duree_itt_jours || e.quantum_doloris) && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                    {e.taux_dfp != null && <span className="badge bg-purple-100 text-purple-700">DFP {e.taux_dfp}%</span>}
                    {e.duree_itt_jours != null && <span className="badge bg-blue-100 text-blue-700">ITT {e.duree_itt_jours}j</span>}
                    {e.quantum_doloris != null && <span className="badge bg-orange-100 text-orange-700">QD {e.quantum_doloris}/7</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
