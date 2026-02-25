'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type DossierPipeline, type Etape } from '@/lib/types'
import { Plus, Search, Clock, Calendar, Filter, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const ETAPES_PIPELINE: Etape[] = [
  'qualification','mandat','constitution_dossier','expertise_amiable',
  'offre_assureur','negociation','procedure_judiciaire','transaction','encaissement'
]

const PRIORITE_LABELS: Record<string, string> = { basse:'Basse', normale:'Normale', haute:'Haute', urgente:'Urgente' }
const PRIORITE_COULEURS: Record<string, string> = { basse:'bg-blue-100 text-blue-600', normale:'bg-gray-100 text-gray-600', haute:'bg-orange-100 text-orange-600', urgente:'bg-red-100 text-red-600' }

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<DossierPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [vue, setVue] = useState<'kanban' | 'liste'>('kanban')
  const [recherche, setRecherche] = useState('')
  const [filtreEtape, setFiltreEtape] = useState<string>('')
  const [filtreType, setFiltreType] = useState<string>('')
  const [filtreVoie, setFiltreVoie] = useState<string>('')
  const [filtrePriorite, setFiltrePriorite] = useState<string>('')
  const [filtreDormant, setFiltreDormant] = useState(false)
  const [showFiltres, setShowFiltres] = useState(false)
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [filtreJuriste, setFiltreJuriste] = useState<string>('')

  useEffect(() => {
    Promise.all([
      supabase.from('vue_pipeline').select('*').order('updated_at', { ascending: false }),
      supabase.from('utilisateurs').select('id, nom, prenom').eq('actif', true),
    ]).then(([{ data: d }, { data: u }]) => {
      if (d) setDossiers(d)
      if (u) setUtilisateurs(u)
      setLoading(false)
    })
  }, [])

  const filtres = useMemo(() => dossiers.filter(d => {
    if (recherche) {
      const q = recherche.toLowerCase()
      if (!d.client_nom?.toLowerCase().includes(q) && !d.client_prenom?.toLowerCase().includes(q) && !d.reference?.toLowerCase().includes(q)) return false
    }
    if (filtreEtape && d.etape !== filtreEtape) return false
    if (filtreType && d.type_accident !== filtreType) return false
    if (filtreVoie && (d as any).voie !== filtreVoie) return false
    if (filtrePriorite && (d as any).priorite !== filtrePriorite) return false
    if (filtreJuriste && (d as any).juriste_id !== filtreJuriste) return false
    if (filtreDormant && (d.jours_inactif ?? 0) < 7) return false
    return true
  }), [dossiers, recherche, filtreEtape, filtreType, filtreVoie, filtrePriorite, filtreJuriste, filtreDormant])

  const nbFiltresActifs = [filtreEtape, filtreType, filtreVoie, filtrePriorite, filtreJuriste, filtreDormant ? '1' : ''].filter(Boolean).length

  const resetFiltres = () => {
    setFiltreEtape(''); setFiltreType(''); setFiltreVoie(''); setFiltrePriorite(''); setFiltreJuriste(''); setFiltreDormant(false)
  }

  // Stats rapides
  const stats = useMemo(() => ({
    total: dossiers.length,
    urgents: dossiers.filter(d => (d as any).priorite === 'urgente').length,
    dormants: dossiers.filter(d => (d.jours_inactif ?? 0) >= 7).length,
    audiences: dossiers.filter(d => d.prochaine_audience && new Date(d.prochaine_audience).getTime() - Date.now() < 7 * 86400000 && new Date(d.prochaine_audience) > new Date()).length,
  }), [dossiers])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dossiers</h1>
          <p className="text-gray-500 text-sm mt-1">{filtres.length} / {dossiers.length} dossiers</p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau dossier
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total actifs', value: stats.total, color: 'text-gray-700', bg: 'bg-white', onClick: resetFiltres },
          { label: 'Urgents', value: stats.urgents, color: 'text-red-600', bg: 'bg-red-50', onClick: () => { resetFiltres(); setFiltrePriorite('urgente') } },
          { label: 'Dormants (7j+)', value: stats.dormants, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => { resetFiltres(); setFiltreDormant(true) } },
          { label: 'Audiences <7j', value: stats.audiences, color: 'text-cabinet-blue', bg: 'bg-blue-50', onClick: undefined },
        ].map(({ label, value, color, bg, onClick }) => (
          <button key={label} onClick={onClick} className={`card ${bg} text-center transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </button>
        ))}
      </div>

      {/* Barre recherche + filtres */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, référence..." value={recherche}
            onChange={e => setRecherche(e.target.value)} className="input pl-9 w-full" />
        </div>
        <button onClick={() => setShowFiltres(f => !f)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFiltres || nbFiltresActifs > 0 ? 'bg-cabinet-blue text-white border-cabinet-blue' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Filter size={15} /> Filtres {nbFiltresActifs > 0 && `(${nbFiltresActifs})`}
        </button>
        {nbFiltresActifs > 0 && (
          <button onClick={resetFiltres} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X size={14} /> Réinitialiser
          </button>
        )}
        <div className="flex bg-white border border-gray-200 rounded-lg p-1 ml-auto">
          {(['kanban', 'liste'] as const).map(v => (
            <button key={v} onClick={() => setVue(v)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vue === v ? 'bg-cabinet-blue text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'kanban' ? 'Pipeline' : 'Liste'}
            </button>
          ))}
        </div>
      </div>

      {/* Panneau filtres avancés */}
      {showFiltres && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Étape</label>
            <select value={filtreEtape} onChange={e => setFiltreEtape(e.target.value)} className="input-field">
              <option value="">Toutes</option>
              {ETAPES_PIPELINE.map(e => <option key={e} value={e}>{ETAPES_LABELS[e]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Type d'accident</label>
            <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="input-field">
              <option value="">Tous</option>
              {Object.entries(TYPE_ACCIDENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Voie</label>
            <select value={filtreVoie} onChange={e => setFiltreVoie(e.target.value)} className="input-field">
              <option value="">Toutes</option>
              <option value="amiable">Amiable</option>
              <option value="judiciaire">Judiciaire</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Priorité</label>
            <select value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)} className="input-field">
              <option value="">Toutes</option>
              {Object.entries(PRIORITE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Juriste</label>
            <select value={filtreJuriste} onChange={e => setFiltreJuriste(e.target.value)} className="input-field">
              <option value="">Tous</option>
              {utilisateurs.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </div>
          <div className="col-span-5 flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={filtreDormant} onChange={e => setFiltreDormant(e.target.checked)} className="rounded" />
              Afficher uniquement les dossiers dormants (≥ 7 jours sans activité)
            </label>
          </div>
        </div>
      )}

      {/* Vue Kanban */}
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
                        <div className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer ${d.jours_inactif >= 7 ? 'border-orange-200' : 'border-gray-100'} ${(d as any).priorite === 'urgente' ? 'border-l-4 border-l-red-400' : (d as any).priorite === 'haute' ? 'border-l-4 border-l-orange-400' : ''}`}>
                          <div className="font-medium text-sm leading-tight">{d.client_nom} {d.client_prenom}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{d.reference}</div>
                          <div className="text-xs text-gray-400 mt-1">{TYPE_ACCIDENT_LABELS[d.type_accident]}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400 truncate max-w-20">{d.juriste_nom ?? '—'}</span>
                            <div className="flex items-center gap-1">
                              {d.prochaine_audience && (
                                <span className="text-xs text-blue-500 flex items-center gap-0.5">
                                  <Calendar size={10} />
                                  {new Date(d.prochaine_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {d.jours_inactif >= 7 && (
                                <span className="text-xs text-orange-500 flex items-center gap-0.5"><Clock size={10} />{d.jours_inactif}j</span>
                              )}
                            </div>
                          </div>
                          {(d as any).priorite && (d as any).priorite !== 'normale' && (
                            <div className="mt-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITE_COULEURS[(d as any).priorite]}`}>
                                {PRIORITE_LABELS[(d as any).priorite]}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                    {items.length === 0 && <div className="text-xs text-gray-300 text-center py-4">—</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vue Liste */}
      {vue === 'liste' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Référence', 'Client', 'Type', 'Voie', 'Étape', 'Priorité', 'Juriste', 'Inactivité', 'Prochaine audience'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtres.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">Aucun dossier trouvé</td></tr>
              ) : filtres.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dossiers/${d.id}`} className="text-sm font-mono text-cabinet-blue hover:underline">{d.reference}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dossiers/${d.id}`} className="text-sm font-medium hover:text-cabinet-blue">{d.client_nom} {d.client_prenom}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{TYPE_ACCIDENT_LABELS[d.type_accident]}</td>
                  <td className="px-4 py-3">
                    {(d as any).voie && <span className={`badge text-xs ${(d as any).voie === 'judiciaire' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{(d as any).voie}</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${ETAPES_COULEURS[d.etape]}`}>{ETAPES_LABELS[d.etape]}</span></td>
                  <td className="px-4 py-3">
                    {(d as any).priorite && <span className={`badge text-xs ${PRIORITE_COULEURS[(d as any).priorite]}`}>{PRIORITE_LABELS[(d as any).priorite]}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.juriste_nom ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${(d.jours_inactif ?? 0) >= 14 ? 'text-red-500' : (d.jours_inactif ?? 0) >= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {d.jours_inactif ?? 0}j
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.prochaine_audience ? (
                      <span className={`text-xs flex items-center gap-1 ${new Date(d.prochaine_audience).getTime() - Date.now() < 7 * 86400000 ? 'text-red-500 font-medium' : 'text-blue-500'}`}>
                        <Calendar size={11} />
                        {new Date(d.prochaine_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
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
