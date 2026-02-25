'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Euro, FolderOpen, Users, Award, Target, Clock, BarChart2, Download } from 'lucide-react'
import { ETAPES_LABELS, TYPE_ACCIDENT_LABELS, type Etape, type TypeAccident } from '@/lib/types'

function eur(v?: number | null) {
  if (!v) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

type Periode = '3m' | '6m' | '12m' | 'all'

export default function StatistiquesPage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<Periode>('12m')
  const [onglet, setOnglet] = useState<'global' | 'financier' | 'equipe'>('global')

  useEffect(() => {
    Promise.all([
      supabase.from('dossiers').select('id, etape, type_accident, source, montant_obtenu, offre_assureur, montant_reclame, honoraires_resultat, honoraires_fixes, taux_honoraires_resultat, created_at, updated_at, voie, priorite, juriste_id, avocat_id'),
      supabase.from('utilisateurs').select('id, nom, prenom, role, initiales').eq('actif', true),
    ]).then(([{ data: d }, { data: u }]) => {
      if (d) setDossiers(d)
      if (u) setUtilisateurs(u)
      setLoading(false)
    })
  }, [])

  const filtres = useMemo(() => {
    const cutoff = periode === 'all' ? null :
      new Date(Date.now() - (periode === '3m' ? 90 : periode === '6m' ? 180 : 365) * 86400000)
    return cutoff ? dossiers.filter(d => new Date(d.created_at) >= cutoff) : dossiers
  }, [dossiers, periode])

  const actifs = filtres.filter(d => d.etape !== 'archive')
  const clos = filtres.filter(d => d.etape === 'encaissement' || d.etape === 'transaction')
  const judiciaires = filtres.filter(d => d.voie === 'judiciaire')
  const totalHonoraires = filtres.reduce((s, d) => s + (d.honoraires_resultat || 0) + (d.honoraires_fixes || 0), 0)
  const totalObtenu = clos.reduce((s, d) => s + (d.montant_obtenu || 0), 0)
  const totalOffres = clos.filter(d => d.offre_assureur).reduce((s, d) => s + d.offre_assureur, 0)
  const gainVsOffre = totalObtenu - totalOffres
  const tauxSucces = clos.length ? Math.round(clos.filter(d => d.montant_obtenu && d.offre_assureur && d.montant_obtenu > d.offre_assureur).length / clos.length * 100) : 0

  // Graphique honoraires mensuels (12 derniers mois)
  const moisHonoraires = useMemo(() => {
    const map: Record<string, { honoraires: number; dossiers: number; montant: number }> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      map[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { honoraires: 0, dossiers: 0, montant: 0 }
    }
    dossiers.forEach(d => {
      const k = d.created_at?.slice(0, 7)
      if (k && map[k] !== undefined) {
        map[k].dossiers++
        map[k].honoraires += (d.honoraires_resultat || 0) + (d.honoraires_fixes || 0)
        map[k].montant += d.montant_obtenu || 0
      }
    })
    return Object.entries(map).map(([mois, v]) => ({ mois, ...v, label: new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) }))
  }, [dossiers])

  const maxH = Math.max(...moisHonoraires.map(m => m.honoraires)) || 1
  const maxD = Math.max(...moisHonoraires.map(m => m.dossiers)) || 1

  // Par étape
  const parEtape: Record<string, number> = {}
  actifs.forEach(d => { parEtape[d.etape] = (parEtape[d.etape] || 0) + 1 })

  // Par type accident
  const parType: Record<string, number> = {}
  actifs.forEach(d => { parType[d.type_accident] = (parType[d.type_accident] || 0) + 1 })

  // Par source
  const parSource: Record<string, number> = {}
  actifs.forEach(d => { parSource[d.source] = (parSource[d.source] || 0) + 1 })

  // Stats par juriste
  const parJuriste = useMemo(() => {
    const map: Record<string, { actifs: number; clos: number; honoraires: number; montant: number; id: string }> = {}
    filtres.forEach(d => {
      const id = d.juriste_id || 'non_assigne'
      if (!map[id]) map[id] = { actifs: 0, clos: 0, honoraires: 0, montant: 0, id }
      if (d.etape !== 'archive') map[id].actifs++
      if (d.etape === 'encaissement' || d.etape === 'transaction') {
        map[id].clos++
        map[id].montant += d.montant_obtenu || 0
        map[id].honoraires += (d.honoraires_resultat || 0) + (d.honoraires_fixes || 0)
      }
    })
    return Object.entries(map).map(([id, v]) => {
      const u = utilisateurs.find(u => u.id === id)
      return { ...v, nom: u ? `${u.prenom} ${u.nom}` : 'Non assigné', initiales: u?.initiales || '?' }
    }).sort((a, b) => b.actifs - a.actifs)
  }, [filtres, utilisateurs])

  const etapesOrdre: Etape[] = ['qualification', 'mandat', 'constitution_dossier', 'expertise_amiable', 'offre_assureur', 'negociation', 'procedure_judiciaire', 'transaction', 'encaissement']

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Statistiques cabinet</h1>
          <p className="text-gray-500 text-sm mt-1">{filtres.length} dossiers sur la période</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtre période */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([['3m', '3 mois'], ['6m', '6 mois'], ['12m', '12 mois'], ['all', 'Tout']] as [Periode, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setPeriode(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${periode === v ? 'bg-white shadow text-cabinet-blue' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <a href="/api/export/dossiers" download
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['global', 'Vue globale'], ['financier', 'Financier'], ['equipe', 'Équipe']] as ['global' | 'financier' | 'equipe', string][]).map(([v, l]) => (
          <button key={v} onClick={() => setOnglet(v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${onglet === v ? 'border-cabinet-blue text-cabinet-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* KPIs communs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: <FolderOpen size={20} className="text-cabinet-blue" />, label: 'Dossiers actifs', value: actifs.length, bg: 'bg-blue-50' },
          { icon: <Euro size={20} className="text-green-600" />, label: 'Honoraires générés', value: eur(totalHonoraires), bg: 'bg-green-50' },
          { icon: <TrendingUp size={20} className="text-purple-600" />, label: 'Gains clients', value: eur(totalObtenu), bg: 'bg-purple-50' },
          { icon: <Award size={20} className="text-yellow-600" />, label: 'Gain vs offres initiales', value: gainVsOffre > 0 ? `+${eur(gainVsOffre)}` : '—', bg: 'bg-yellow-50' },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* === VUE GLOBALE === */}
      {onglet === 'global' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Activité mensuelle */}
          <div className="col-span-2 card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Nouveaux dossiers — 12 derniers mois</h3>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {moisHonoraires.map(m => (
                <div key={m.mois} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400 font-medium" style={{ fontSize: '10px' }}>{m.dossiers || ''}</div>
                  <div className="w-full bg-cabinet-blue/80 rounded-t-sm transition-all hover:bg-cabinet-blue"
                    style={{ height: `${Math.round((m.dossiers / maxD) * 80)}px`, minHeight: m.dossiers > 0 ? '4px' : '0' }} />
                  <div className="text-gray-300" style={{ fontSize: '9px' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Perf */}
          <div className="space-y-4">
            <div className="card bg-gradient-to-br from-cabinet-blue to-blue-700 text-white">
              <div className="flex items-center gap-2 mb-1"><Target size={16} />Taux de succès</div>
              <div className="text-4xl font-bold">{tauxSucces}%</div>
              <div className="text-xs opacity-70 mt-1">Dossiers &gt; offre initiale</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Judiciaires</div>
              <div className="text-3xl font-bold text-red-500">{judiciaires.length}</div>
              <div className="text-xs text-gray-400">{actifs.length ? Math.round(judiciaires.length / actifs.length * 100) : 0}% du portefeuille</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Clôturés</div>
              <div className="text-3xl font-bold text-green-500">{clos.length}</div>
              <div className="text-xs text-gray-400">Transaction / encaissement</div>
            </div>
          </div>

          {/* Par étape */}
          <div className="card">
            <h3 className="font-semibold mb-4">Pipeline par étape</h3>
            <div className="space-y-3">
              {etapesOrdre.filter(e => parEtape[e]).map(e => {
                const count = parEtape[e] || 0
                const pct = Math.round(count / actifs.length * 100) || 0
                return (
                  <div key={e}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{ETAPES_LABELS[e]}</span>
                      <span className="text-xs font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cabinet-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {actifs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aucun dossier</p>}
            </div>
          </div>

          {/* Par type */}
          <div className="card">
            <h3 className="font-semibold mb-4">Type d'accident</h3>
            <div className="space-y-3">
              {Object.entries(parType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round(count / actifs.length * 100) || 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{TYPE_ACCIDENT_LABELS[type as TypeAccident] || type}</span>
                      <span className="text-xs font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Par source */}
          <div className="card">
            <h3 className="font-semibold mb-4">Sources d'acquisition</h3>
            <div className="space-y-3">
              {Object.entries(parSource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                const pct = Math.round(count / actifs.length * 100) || 0
                const labels: Record<string, string> = { telephone: '📞 Téléphone', whatsapp: '💬 WhatsApp', site_web: '🌐 Site web', recommandation: '🤝 Recommandation', apporteur: '💼 Apporteur' }
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{labels[source] || source}</span>
                      <span className="text-xs font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* === FINANCIER === */}
      {onglet === 'financier' && (
        <div className="space-y-6">
          {/* Graphique honoraires mensuels */}
          <div className="card">
            <h3 className="font-semibold mb-6">Honoraires générés — 12 derniers mois</h3>
            <div className="flex items-end gap-2 h-40">
              {moisHonoraires.map(m => (
                <div key={m.mois} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {m.label}: {eur(m.honoraires)}
                  </div>
                  <div className="w-full bg-green-500/80 rounded-t-sm hover:bg-green-500 transition-colors"
                    style={{ height: `${Math.round((m.honoraires / maxH) * 120)}px`, minHeight: m.honoraires > 0 ? '4px' : '0' }} />
                  <div className="text-gray-300" style={{ fontSize: '9px' }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400">Total 12 mois : <span className="font-semibold text-gray-700">{eur(moisHonoraires.reduce((s, m) => s + m.honoraires, 0))}</span></div>
              <div className="text-xs text-gray-400">Moy. mensuelle : <span className="font-semibold text-gray-700">{eur(moisHonoraires.reduce((s, m) => s + m.honoraires, 0) / 12)}</span></div>
            </div>
          </div>

          {/* Tableau dossiers rentables */}
          <div className="card">
            <h3 className="font-semibold mb-4">Top 10 — Dossiers par montant obtenu</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Référence', 'Étape', 'Montant obtenu', 'Offre initiale', 'Gain', 'Honoraires'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtres.filter(d => d.montant_obtenu).sort((a, b) => b.montant_obtenu - a.montant_obtenu).slice(0, 10).map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{d.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2"><span className="badge text-xs bg-gray-100 text-gray-600">{ETAPES_LABELS[d.etape as Etape]}</span></td>
                      <td className="px-3 py-2 text-sm font-bold text-purple-600">{eur(d.montant_obtenu)}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{eur(d.offre_assureur)}</td>
                      <td className="px-3 py-2 text-sm font-medium text-green-600">
                        {d.montant_obtenu && d.offre_assureur ? `+${eur(d.montant_obtenu - d.offre_assureur)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{eur((d.honoraires_resultat || 0) + (d.honoraires_fixes || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prévisionnel */}
          <div className="card">
            <h3 className="font-semibold mb-4">Prévisionnel honoraires (dossiers actifs)</h3>
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Honoraires fixes confirmés', value: filtres.reduce((s, d) => s + (d.honoraires_fixes || 0), 0), color: 'text-blue-600' },
                { label: 'Honoraires résultat (acquis)', value: filtres.filter(d => d.honoraires_resultat).reduce((s, d) => s + d.honoraires_resultat, 0), color: 'text-green-600' },
                { label: 'Prévisionnel résultat (15% montants réclamés)', value: actifs.filter(d => d.montant_reclame).reduce((s, d) => s + d.montant_reclame * 0.15, 0), color: 'text-purple-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center py-4 bg-gray-50 rounded-xl">
                  <div className={`text-2xl font-bold ${color}`}>{eur(value)}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === ÉQUIPE === */}
      {onglet === 'equipe' && (
        <div className="space-y-6">
          {/* Tableau par juriste */}
          <div className="card">
            <h3 className="font-semibold mb-4">Performance par juriste</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Juriste', 'Dossiers actifs', 'Dossiers clôturés', 'CA clients', 'Honoraires'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parJuriste.map(j => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-cabinet-blue text-white text-xs font-bold flex items-center justify-center">{j.initiales}</div>
                          <span className="font-medium text-sm">{j.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{j.actifs}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-24">
                            <div className="h-full bg-cabinet-blue rounded-full" style={{ width: `${actifs.length ? (j.actifs / actifs.length * 100) : 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">{j.clos}</td>
                      <td className="px-4 py-3 font-semibold text-purple-600">{eur(j.montant)}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{eur(j.honoraires)}</td>
                    </tr>
                  ))}
                  {parJuriste.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Répartition charge */}
          <div className="card">
            <h3 className="font-semibold mb-4">Répartition de la charge</h3>
            <div className="space-y-4">
              {parJuriste.filter(j => j.actifs > 0).map(j => (
                <div key={j.id} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-gray-700 truncate">{j.nom}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cabinet-blue to-blue-400 rounded-lg flex items-center px-2"
                      style={{ width: `${actifs.length ? (j.actifs / actifs.length * 100) : 0}%` }}>
                      <span className="text-white text-xs font-bold">{j.actifs}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 w-12 text-right">{actifs.length ? Math.round(j.actifs / actifs.length * 100) : 0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
