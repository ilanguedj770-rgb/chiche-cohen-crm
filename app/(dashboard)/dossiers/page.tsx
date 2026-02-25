'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type DossierPipeline, type Etape, type TypeAccident } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search, Plus, FolderOpen, Clock, Filter, X,
  ChevronDown, Phone, Mail
} from 'lucide-react'
import Link from 'next/link'

const PRIORITE_COULEURS: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  haute: 'bg-orange-100 text-orange-700',
  normale: 'bg-blue-100 text-blue-700',
  basse: 'bg-gray-100 text-gray-500',
}

const PRIORITE_LABELS: Record<string, string> = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
}

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<DossierPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreEtape, setFiltreEtape] = useState<Etape | ''>('')
  const [filtreType, setFiltreType] = useState<TypeAccident | ''>('')
  const [filtreVoie, setFiltreVoie] = useState<'' | 'amiable' | 'judiciaire'>('')
  const [filtrePriorite, setFiltrePriorite] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [vue, setVue] = useState<'liste' | 'pipeline'>('liste')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vue_pipeline')
        .select('*')
        .order('updated_at', { ascending: false })
      if (data) setDossiers(data)
      setLoading(false)
    }
    load()
  }, [])

  const filteredDossiers = dossiers.filter(d => {
    if (search) {
      const s = search.toLowerCase()
      const match = [d.client_nom, d.client_prenom, d.reference, d.assureur_nom]
        .filter(Boolean)
        .some(v => v!.toLowerCase().includes(s))
      if (!match) return false
    }
    if (filtreEtape && d.etape !== filtreEtape) return false
    if (filtreType && d.type_accident !== filtreType) return false
    if (filtreVoie && d.voie !== filtreVoie) return false
    if (filtrePriorite && d.priorite !== filtrePriorite) return false
    return true
  })

  const hasFilters = filtreEtape || filtreType || filtreVoie || filtrePriorite
  const clearFilters = () => {
    setFiltreEtape('')
    setFiltreType('')
    setFiltreVoie('')
    setFiltrePriorite('')
  }

  const etapeGroups = (Object.keys(ETAPES_LABELS) as Etape[]).filter(e => e !== 'archive')

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
          <h1 className="text-2xl font-bold text-gray-900">Dossiers</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredDossiers.length} dossier(s){hasFilters ? ' (filtré)' : ''}</p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau dossier
        </Link>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="card mb-6 !p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, référence, assureur..."
              className="input !pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${hasFilters ? '!border-cabinet-blue !bg-cabinet-blue-light' : ''}`}
          >
            <Filter size={14} />
            Filtres
            {hasFilters && <span className="w-5 h-5 rounded-full bg-cabinet-blue text-white text-xs flex items-center justify-center">
              {[filtreEtape, filtreType, filtreVoie, filtrePriorite].filter(Boolean).length}
            </span>}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setVue('liste')}
              className={`px-3 py-2 text-xs font-medium ${vue === 'liste' ? 'bg-cabinet-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Liste
            </button>
            <button
              onClick={() => setVue('pipeline')}
              className={`px-3 py-2 text-xs font-medium ${vue === 'pipeline' ? 'bg-cabinet-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Pipeline
            </button>
          </div>
        </div>

        {/* Filtres dépliés */}
        {showFilters && (
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Étape</label>
              <select value={filtreEtape} onChange={e => setFiltreEtape(e.target.value as Etape | '')} className="input text-xs">
                <option value="">Toutes les étapes</option>
                {(Object.keys(ETAPES_LABELS) as Etape[]).map(e => (
                  <option key={e} value={e}>{ETAPES_LABELS[e]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type d&apos;accident</label>
              <select value={filtreType} onChange={e => setFiltreType(e.target.value as TypeAccident | '')} className="input text-xs">
                <option value="">Tous les types</option>
                {(Object.keys(TYPE_ACCIDENT_LABELS) as TypeAccident[]).map(t => (
                  <option key={t} value={t}>{TYPE_ACCIDENT_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Voie</label>
              <select value={filtreVoie} onChange={e => setFiltreVoie(e.target.value as '' | 'amiable' | 'judiciaire')} className="input text-xs">
                <option value="">Toutes les voies</option>
                <option value="amiable">Amiable</option>
                <option value="judiciaire">Judiciaire</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priorité</label>
              <select value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)} className="input text-xs">
                <option value="">Toutes</option>
                <option value="urgente">Urgente</option>
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            {hasFilters && (
              <div className="col-span-4 flex justify-end">
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X size={12} /> Effacer les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vue Liste */}
      {vue === 'liste' && (
        <div className="space-y-2">
          {filteredDossiers.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>{search || hasFilters ? 'Aucun dossier ne correspond à votre recherche' : 'Aucun dossier pour l\'instant'}</p>
              {!search && !hasFilters && (
                <Link href="/dossiers/nouveau" className="btn-primary inline-flex items-center gap-2 mt-4">
                  <Plus size={14} /> Créer un dossier
                </Link>
              )}
            </div>
          ) : (
            filteredDossiers.map(d => (
              <Link key={d.id} href={`/dossiers/${d.id}`}>
                <div className="card !p-4 hover:shadow-md transition-shadow border-l-4 cursor-pointer"
                  style={{ borderLeftColor: d.priorite === 'urgente' ? '#ef4444' : d.priorite === 'haute' ? '#f97316' : 'transparent' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{d.client_nom} {d.client_prenom}</span>
                          <span className="font-mono text-xs text-gray-400">{d.reference}</span>
                          {d.voie === 'judiciaire' && (
                            <span className="badge bg-red-50 text-red-600 text-[10px]">Judiciaire</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-xs text-gray-400">{TYPE_ACCIDENT_LABELS[d.type_accident]}</span>
                          {d.juriste_nom && <span className="text-xs text-gray-400">Juriste: {d.juriste_nom}</span>}
                          {d.avocat_nom && <span className="text-xs text-gray-400">Avocat: {d.avocat_nom}</span>}
                          {d.assureur_nom && <span className="text-xs text-gray-400">Assureur: {d.assureur_nom}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {d.client_telephone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{d.client_telephone}</span>
                          )}
                          {d.client_email && (
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{d.client_email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {d.prochaine_expertise && (
                        <span className="text-xs text-purple-500">
                          Expertise: {format(parseISO(d.prochaine_expertise), 'd MMM', { locale: fr })}
                        </span>
                      )}
                      {d.prochaine_audience && (
                        <span className="text-xs text-red-500">
                          Audience: {format(parseISO(d.prochaine_audience), 'd MMM', { locale: fr })}
                        </span>
                      )}
                      {d.jours_inactif >= 7 && (
                        <span className="flex items-center gap-1 text-xs text-orange-500">
                          <Clock size={12} /> {d.jours_inactif}j
                        </span>
                      )}
                      <span className={`badge ${PRIORITE_COULEURS[d.priorite]}`}>
                        {PRIORITE_LABELS[d.priorite]}
                      </span>
                      <span className={`badge ${ETAPES_COULEURS[d.etape]}`}>
                        {ETAPES_LABELS[d.etape]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Vue Pipeline (Kanban) */}
      {vue === 'pipeline' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {etapeGroups.map(etape => {
            const dossiersEtape = filteredDossiers.filter(d => d.etape === etape)
            return (
              <div key={etape} className="flex-shrink-0 w-72">
                <div className={`rounded-t-lg px-3 py-2 ${ETAPES_COULEURS[etape]} flex items-center justify-between`}>
                  <span className="text-xs font-semibold">{ETAPES_LABELS[etape]}</span>
                  <span className="text-xs font-bold">{dossiersEtape.length}</span>
                </div>
                <div className="bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px] border border-t-0 border-gray-200">
                  {dossiersEtape.length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-xs">Vide</div>
                  )}
                  {dossiersEtape.map(d => (
                    <Link key={d.id} href={`/dossiers/${d.id}`}>
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900 truncate">{d.client_nom} {d.client_prenom}</span>
                          {d.priorite === 'urgente' && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />}
                          {d.priorite === 'haute' && <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{d.reference}</div>
                        <div className="text-xs text-gray-400 mt-1">{TYPE_ACCIDENT_LABELS[d.type_accident]}</div>
                        <div className="flex items-center justify-between mt-2">
                          {d.juriste_nom && <span className="text-[10px] text-gray-400">{d.juriste_nom}</span>}
                          {d.jours_inactif >= 7 && (
                            <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                              <Clock size={8} /> {d.jours_inactif}j
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
