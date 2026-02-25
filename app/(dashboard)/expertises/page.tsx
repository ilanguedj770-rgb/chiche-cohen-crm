'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Expertise } from '@/lib/types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Stethoscope, Calendar, MapPin, AlertTriangle, Clock, Search, User
} from 'lucide-react'
import Link from 'next/link'

interface ExpertiseVue extends Expertise {
  dossier_reference?: string
  client_nom?: string
  client_prenom?: string
}

export default function ExpertisesPage() {
  const [expertises, setExpertises] = useState<ExpertiseVue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreType, setFiltreType] = useState<'' | 'amiable' | 'judiciaire' | 'sapiteur'>('')
  const [filtrePeriode, setFiltrePeriode] = useState<'a_venir' | 'passees' | 'toutes'>('a_venir')

  useEffect(() => {
    async function load() {
      const { data: expertisesData } = await supabase
        .from('expertises')
        .select('*')
        .order('date_expertise', { ascending: true })

      if (expertisesData) {
        // Enrichir avec les infos du dossier et du client
        const enriched = await Promise.all(
          expertisesData.map(async (e: Expertise) => {
            const { data: dossier } = await supabase
              .from('dossiers')
              .select('reference, client_id')
              .eq('id', e.dossier_id)
              .single()

            let clientNom = ''
            let clientPrenom = ''
            if (dossier) {
              const { data: client } = await supabase
                .from('clients')
                .select('nom, prenom')
                .eq('id', dossier.client_id)
                .single()
              if (client) {
                clientNom = client.nom
                clientPrenom = client.prenom
              }
            }

            return {
              ...e,
              dossier_reference: dossier?.reference,
              client_nom: clientNom,
              client_prenom: clientPrenom,
            } as ExpertiseVue
          })
        )
        setExpertises(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()

  const filteredExpertises = expertises.filter(e => {
    if (search) {
      const s = search.toLowerCase()
      const match = [e.client_nom, e.client_prenom, e.expert_nom, e.dossier_reference, e.lieu_expertise]
        .filter(Boolean)
        .some(v => v!.toLowerCase().includes(s))
      if (!match) return false
    }
    if (filtreType && e.type !== filtreType) return false
    if (filtrePeriode === 'a_venir' && e.date_expertise) {
      if (parseISO(e.date_expertise) < today) return false
    }
    if (filtrePeriode === 'passees' && e.date_expertise) {
      if (parseISO(e.date_expertise) >= today) return false
    }
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expertises</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredExpertises.length} expertise(s)</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-6 !p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par client, expert, référence..."
              className="input !pl-10"
            />
          </div>
          <select
            value={filtreType}
            onChange={e => setFiltreType(e.target.value as '' | 'amiable' | 'judiciaire' | 'sapiteur')}
            className="input !w-auto"
          >
            <option value="">Tous types</option>
            <option value="amiable">Amiable</option>
            <option value="judiciaire">Judiciaire</option>
            <option value="sapiteur">Sapiteur</option>
          </select>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            {(['a_venir', 'passees', 'toutes'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFiltrePeriode(p)}
                className={`px-3 py-2 text-xs font-medium ${
                  filtrePeriode === p ? 'bg-cabinet-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p === 'a_venir' ? 'A venir' : p === 'passees' ? 'Passées' : 'Toutes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste */}
      {filteredExpertises.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune expertise {filtrePeriode === 'a_venir' ? 'à venir' : filtrePeriode === 'passees' ? 'passée' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpertises.map(e => {
            const joursAvant = e.date_expertise ? differenceInDays(parseISO(e.date_expertise), today) : null
            const isUrgent = joursAvant !== null && joursAvant >= 0 && joursAvant <= 2
            const isSoon = joursAvant !== null && joursAvant >= 0 && joursAvant <= 7
            const isPast = joursAvant !== null && joursAvant < 0

            return (
              <div key={e.id} className={`card !p-4 border-l-4 ${
                isUrgent ? 'border-red-400' :
                isSoon ? 'border-orange-400' :
                isPast ? 'border-gray-300' :
                'border-purple-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Compte à rebours */}
                    {joursAvant !== null && joursAvant >= 0 && (
                      <div className={`text-center w-16 ${
                        isUrgent ? 'text-red-500' :
                        isSoon ? 'text-orange-500' :
                        'text-purple-500'
                      }`}>
                        <div className="text-2xl font-bold">J-{joursAvant}</div>
                        <div className="text-xs">jours</div>
                      </div>
                    )}
                    {isPast && (
                      <div className="text-center w-16 text-gray-400">
                        <Clock size={20} className="mx-auto mb-1" />
                        <div className="text-xs">Passée</div>
                      </div>
                    )}
                    {joursAvant === null && (
                      <div className="text-center w-16 text-gray-300">
                        <Calendar size={20} className="mx-auto mb-1" />
                        <div className="text-xs">Non planifiée</div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{e.client_nom} {e.client_prenom}</span>
                        <span className={`badge ${
                          e.type === 'amiable' ? 'bg-purple-100 text-purple-700' :
                          e.type === 'judiciaire' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {e.type === 'amiable' ? 'Amiable' : e.type === 'judiciaire' ? 'Judiciaire' : 'Sapiteur'}
                        </span>
                      </div>
                      {e.date_expertise && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {format(parseISO(e.date_expertise), "EEEE d MMMM yyyy", { locale: fr })}
                          {e.heure_expertise && ` à ${e.heure_expertise}`}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-1.5">
                        {e.expert_nom && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User size={10} /> Dr {e.expert_nom}
                          </span>
                        )}
                        {e.lieu_expertise && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin size={10} /> {e.lieu_expertise}
                          </span>
                        )}
                        {e.medecin_conseil_nom && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Stethoscope size={10} /> Conseil: Dr {e.medecin_conseil_nom}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Métriques médicales */}
                    {(e.taux_dfp || e.quantum_doloris || e.duree_itt_jours) && (
                      <div className="flex items-center gap-2">
                        {e.taux_dfp !== undefined && e.taux_dfp !== null && (
                          <span className="badge bg-blue-50 text-blue-600">DFP {e.taux_dfp}%</span>
                        )}
                        {e.quantum_doloris !== undefined && e.quantum_doloris !== null && (
                          <span className="badge bg-orange-50 text-orange-600">QD {e.quantum_doloris}/7</span>
                        )}
                        {e.duree_itt_jours !== undefined && e.duree_itt_jours !== null && (
                          <span className="badge bg-gray-100 text-gray-600">ITT {e.duree_itt_jours}j</span>
                        )}
                      </div>
                    )}

                    {/* Rappels */}
                    {!isPast && (
                      <div className="flex gap-1">
                        {!e.rappel_j7_envoye && isSoon && (
                          <span className="badge bg-orange-100 text-orange-600 flex items-center gap-1">
                            <AlertTriangle size={10} /> J-7
                          </span>
                        )}
                        {!e.rappel_j2_envoye && isUrgent && (
                          <span className="badge bg-red-100 text-red-600 flex items-center gap-1">
                            <AlertTriangle size={10} /> J-2
                          </span>
                        )}
                      </div>
                    )}

                    {/* Lien dossier */}
                    <Link
                      href={`/dossiers/${e.dossier_id}`}
                      className="text-xs text-cabinet-blue hover:underline font-mono"
                    >
                      {e.dossier_reference || 'Voir dossier'}
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
