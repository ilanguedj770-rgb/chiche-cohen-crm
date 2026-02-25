'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type DossierPipeline, type Etape, type TypeAccident } from '@/lib/types'
import {
  BarChart3, TrendingUp, Euro, FolderOpen, Users,
  Scale, Stethoscope, Clock, Target
} from 'lucide-react'

export default function StatistiquesPage() {
  const [dossiers, setDossiers] = useState<DossierPipeline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('vue_pipeline').select('*')
      if (data) setDossiers(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  // Calculs statistiques
  const total = dossiers.length
  const judiciaires = dossiers.filter(d => d.voie === 'judiciaire').length
  const amiables = dossiers.filter(d => d.voie === 'amiable').length

  // Répartition par étape
  const parEtape: Record<string, number> = {}
  dossiers.forEach(d => {
    parEtape[d.etape] = (parEtape[d.etape] || 0) + 1
  })

  // Répartition par type accident
  const parType: Record<string, number> = {}
  dossiers.forEach(d => {
    parType[d.type_accident] = (parType[d.type_accident] || 0) + 1
  })

  // Financier
  const dossiersAvecMontant = dossiers.filter(d => d.montant_obtenu)
  const totalObtenu = dossiersAvecMontant.reduce((sum, d) => sum + (d.montant_obtenu || 0), 0)
  const totalReclame = dossiers.reduce((sum, d) => sum + (d.montant_reclame || 0), 0)
  const totalOffres = dossiers.reduce((sum, d) => sum + (d.offre_assureur || 0), 0)
  const totalHonoraires = dossiers.reduce((sum, d) => sum + (d.honoraires_resultat || 0), 0)
  const moyenneObtenu = dossiersAvecMontant.length > 0 ? totalObtenu / dossiersAvecMontant.length : 0

  // Scores potentiel
  const dossiersAvecScore = dossiers.filter(d => d.score_potentiel)
  const moyenneScore = dossiersAvecScore.length > 0
    ? dossiersAvecScore.reduce((sum, d) => sum + (d.score_potentiel || 0), 0) / dossiersAvecScore.length
    : 0

  // Dossiers inactifs
  const inactifs7j = dossiers.filter(d => d.jours_inactif >= 7).length
  const inactifs30j = dossiers.filter(d => d.jours_inactif >= 30).length

  // Priorités
  const urgents = dossiers.filter(d => d.priorite === 'urgente').length
  const hauts = dossiers.filter(d => d.priorite === 'haute').length

  // Source
  const parSource: Record<string, number> = {}
  dossiers.forEach(d => {
    parSource[d.source] = (parSource[d.source] || 0) + 1
  })

  const SOURCE_LABELS: Record<string, string> = {
    telephone: 'Téléphone',
    recommandation: 'Recommandation',
    apporteur: 'Apporteur',
    whatsapp: 'WhatsApp',
    site_web: 'Site internet',
  }

  const maxParEtape = Math.max(...Object.values(parEtape), 1)
  const maxParType = Math.max(...Object.values(parType), 1)
  const maxParSource = Math.max(...Object.values(parSource), 1)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble de l&apos;activité du cabinet</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KPI icon={<FolderOpen size={18} className="text-cabinet-blue" />} label="Total dossiers" value={total} bg="bg-cabinet-blue-light" />
        <KPI icon={<Scale size={18} className="text-red-500" />} label="Judiciaires" value={`${judiciaires} (${total > 0 ? Math.round(judiciaires / total * 100) : 0}%)`} bg="bg-red-50" />
        <KPI icon={<Users size={18} className="text-green-500" />} label="Amiables" value={`${amiables} (${total > 0 ? Math.round(amiables / total * 100) : 0}%)`} bg="bg-green-50" />
        <KPI icon={<Clock size={18} className="text-orange-500" />} label="Inactifs > 7j" value={inactifs7j} bg="bg-orange-50" />
        <KPI icon={<Target size={18} className="text-purple-500" />} label="Score moyen" value={moyenneScore.toFixed(1) + '/5'} bg="bg-purple-50" />
      </div>

      {/* Financier */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <Euro size={20} className="mx-auto mb-2 text-green-500" />
          <div className="text-xl font-bold text-gray-900">{formatEuro(totalObtenu)}</div>
          <div className="text-xs text-gray-500 mt-1">Total obtenu</div>
        </div>
        <div className="card text-center">
          <Euro size={20} className="mx-auto mb-2 text-blue-500" />
          <div className="text-xl font-bold text-gray-900">{formatEuro(totalReclame)}</div>
          <div className="text-xs text-gray-500 mt-1">Total réclamé</div>
        </div>
        <div className="card text-center">
          <Euro size={20} className="mx-auto mb-2 text-yellow-500" />
          <div className="text-xl font-bold text-gray-900">{formatEuro(totalOffres)}</div>
          <div className="text-xs text-gray-500 mt-1">Offres assureurs</div>
        </div>
        <div className="card text-center">
          <TrendingUp size={20} className="mx-auto mb-2 text-emerald-500" />
          <div className="text-xl font-bold text-gray-900">{formatEuro(moyenneObtenu)}</div>
          <div className="text-xs text-gray-500 mt-1">Moyenne par dossier</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Répartition par étape (barres horizontales) */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-cabinet-blue" />
            Pipeline — Répartition par étape
          </h2>
          <div className="space-y-3">
            {(Object.keys(ETAPES_LABELS) as Etape[]).filter(e => e !== 'archive').map(etape => {
              const count = parEtape[etape] || 0
              const pct = maxParEtape > 0 ? (count / maxParEtape) * 100 : 0
              return (
                <div key={etape}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{ETAPES_LABELS[etape]}</span>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${ETAPES_COULEURS[etape].replace('text-', 'bg-').split(' ')[0]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Répartition par type d'accident */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope size={16} className="text-purple-500" />
            Types d&apos;accidents
          </h2>
          <div className="space-y-3">
            {(Object.keys(TYPE_ACCIDENT_LABELS) as TypeAccident[]).map(type => {
              const count = parType[type] || 0
              const pct = maxParType > 0 ? (count / maxParType) * 100 : 0
              const colors: Record<TypeAccident, string> = {
                accident_route: 'bg-blue-400',
                erreur_medicale: 'bg-red-400',
                agression: 'bg-purple-400',
                accident_vie: 'bg-orange-400',
                autre: 'bg-gray-400',
              }
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{TYPE_ACCIDENT_LABELS[type]}</span>
                    <span className="text-xs font-bold text-gray-900">{count} ({total > 0 ? Math.round(count / total * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${colors[type]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sources de leads */}
          <h2 className="font-semibold text-gray-900 mt-8 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" />
            Sources des dossiers
          </h2>
          <div className="space-y-3">
            {Object.entries(parSource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => {
                const pct = maxParSource > 0 ? (count / maxParSource) * 100 : 0
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{SOURCE_LABELS[source] || source}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all bg-green-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Alertes */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`card border-l-4 ${urgents > 0 ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
          <div className="text-3xl font-bold text-gray-900">{urgents}</div>
          <div className="text-sm text-gray-500 mt-1">Dossiers urgents</div>
        </div>
        <div className={`card border-l-4 ${inactifs30j > 0 ? 'border-orange-400 bg-orange-50/30' : 'border-gray-200'}`}>
          <div className="text-3xl font-bold text-gray-900">{inactifs30j}</div>
          <div className="text-sm text-gray-500 mt-1">Inactifs &gt; 30 jours</div>
        </div>
        <div className="card border-l-4 border-emerald-400 bg-emerald-50/30">
          <div className="text-3xl font-bold text-gray-900">{formatEuro(totalHonoraires)}</div>
          <div className="text-sm text-gray-500 mt-1">Honoraires générés</div>
        </div>
      </div>
    </div>
  )
}

function KPI({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: any; bg: string }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
      <div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

function formatEuro(value?: number | null) {
  if (!value) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
