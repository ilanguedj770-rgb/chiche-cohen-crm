'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Euro, FolderOpen, Users, Award, Target, Clock } from 'lucide-react'
import { ETAPES_LABELS, TYPE_ACCIDENT_LABELS, type Etape, type TypeAccident } from '@/lib/types'

function eur(v?: number | null) {
  if (!v) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export default function StatistiquesPage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('dossiers')
      .select('etape, type_accident, source, montant_obtenu, offre_assureur, montant_reclame, honoraires_resultat, honoraires_fixes, created_at, voie, priorite')
      .then(({ data }) => { if (data) setDossiers(data); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  const actifs = dossiers.filter(d => d.etape !== 'archive')
  const clos = dossiers.filter(d => d.etape === 'encaissement' || d.etape === 'transaction')
  const judiciaires = dossiers.filter(d => d.voie === 'judiciaire')
  const totalHonoraires = dossiers.reduce((s, d) => s + (d.honoraires_resultat || 0) + (d.honoraires_fixes || 0), 0)
  const totalObtenu = clos.reduce((s, d) => s + (d.montant_obtenu || 0), 0)
  const totalOffres = clos.filter(d => d.offre_assureur).reduce((s, d) => s + d.offre_assureur, 0)
  const gainVsOffre = totalObtenu - totalOffres
  const tauxSucces = clos.length ? Math.round(clos.filter(d => d.montant_obtenu && d.offre_assureur && d.montant_obtenu > d.offre_assureur).length / clos.length * 100) : 0

  // Par étape
  const parEtape: Record<string, number> = {}
  actifs.forEach(d => { parEtape[d.etape] = (parEtape[d.etape] || 0) + 1 })

  // Par type accident
  const parType: Record<string, number> = {}
  actifs.forEach(d => { parType[d.type_accident] = (parType[d.type_accident] || 0) + 1 })

  // Par source
  const parSource: Record<string, number> = {}
  actifs.forEach(d => { parSource[d.source] = (parSource[d.source] || 0) + 1 })

  // Par mois (12 derniers mois)
  const parMois: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    parMois[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
  }
  dossiers.forEach(d => {
    const k = d.created_at?.slice(0, 7)
    if (k && parMois[k] !== undefined) parMois[k]++
  })
  const maxMois = Math.max(...Object.values(parMois)) || 1

  const etapesOrdre: Etape[] = ['qualification','mandat','constitution_dossier','expertise_amiable','offre_assureur','negociation','procedure_judiciaire','transaction','encaissement']

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Statistiques cabinet</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble — {dossiers.length} dossiers au total</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: <FolderOpen size={20} className="text-cabinet-blue" />, label: 'Dossiers actifs', value: actifs.length, bg: 'bg-blue-50' },
          { icon: <Euro size={20} className="text-green-600" />, label: 'Honoraires totaux', value: eur(totalHonoraires), bg: 'bg-green-50' },
          { icon: <TrendingUp size={20} className="text-purple-600" />, label: 'Gains clients obtenus', value: eur(totalObtenu), bg: 'bg-purple-50' },
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

      <div className="grid grid-cols-3 gap-6">
        {/* Activité mensuelle */}
        <div className="col-span-2 card">
          <h3 className="font-semibold mb-6">Nouveaux dossiers — 12 derniers mois</h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(parMois).map(([mois, count]) => (
              <div key={mois} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-400 font-medium">{count || ''}</div>
                <div className="w-full bg-cabinet-blue rounded-t-sm transition-all"
                  style={{ height: `${Math.round((count / maxMois) * 96)}px`, minHeight: count > 0 ? '4px' : '0' }} />
                <div className="text-xs text-gray-300 rotate-0" style={{ fontSize: '10px' }}>
                  {new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métriques performance */}
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-cabinet-blue to-blue-700 text-white">
            <div className="flex items-center gap-2 mb-1"><Target size={16} />Taux de succès</div>
            <div className="text-4xl font-bold">{tauxSucces}%</div>
            <div className="text-xs opacity-70 mt-1">Dossiers avec montant &gt; offre</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-gray-500 mb-1">Dossiers judiciaires</div>
            <div className="text-3xl font-bold text-red-500">{judiciaires.length}</div>
            <div className="text-xs text-gray-400">{actifs.length ? Math.round(judiciaires.length / actifs.length * 100) : 0}% du portefeuille</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-gray-500 mb-1">Dossiers clôturés</div>
            <div className="text-3xl font-bold text-green-500">{clos.length}</div>
            <div className="text-xs text-gray-400">Transaction ou encaissement</div>
          </div>
        </div>

        {/* Pipeline par étape */}
        <div className="card">
          <h3 className="font-semibold mb-4">Répartition par étape</h3>
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
            {actifs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aucun dossier actif</p>}
          </div>
        </div>

        {/* Par type d'accident */}
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
    </div>
  )
}

export const dynamic = 'force-dynamic'
