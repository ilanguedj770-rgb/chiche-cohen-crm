'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, FolderOpen, Euro, Users, Award } from 'lucide-react'
import { ETAPES_LABELS, type Etape } from '@/lib/types'

function formatEuro(v?: number | null) {
  if (!v) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export default function StatistiquesPage() {
  const [stats, setStats] = useState<any>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: p }, { data: types }, { data: sources }] = await Promise.all([
        supabase.from('vue_tableau_bord_financier').select('*').single(),
        supabase.from('dossiers').select('etape').neq('etape', 'archive'),
        supabase.from('dossiers').select('type_accident').neq('etape', 'archive'),
        supabase.from('dossiers').select('source').neq('etape', 'archive'),
      ])
      if (s) setStats(s)

      // Compter par étape
      const etapeCounts: Record<string, number> = {}
      p?.forEach((d: any) => { etapeCounts[d.etape] = (etapeCounts[d.etape] ?? 0) + 1 })
      setPipeline(Object.entries(etapeCounts).map(([etape, count]) => ({ etape, count })))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  const total = pipeline.reduce((acc, e) => acc + e.count, 0) || 1

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble du cabinet</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: <FolderOpen size={20} className="text-cabinet-blue" />, label: 'Dossiers actifs', value: stats?.dossiers_actifs ?? 0, bg: 'bg-blue-50' },
          { icon: <Users size={20} className="text-indigo-600" />, label: 'Nouveaux ce mois', value: stats?.nouveaux_ce_mois ?? 0, bg: 'bg-indigo-50' },
          { icon: <Euro size={20} className="text-green-600" />, label: 'CA prévisionnel', value: formatEuro(stats?.ca_previsionnel), bg: 'bg-green-50' },
          { icon: <Award size={20} className="text-emerald-600" />, label: 'Honoraires encaissés', value: formatEuro(stats?.honoraires_encaisses), bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-cabinet-blue" />Répartition par étape</h2>
        <div className="space-y-3">
          {pipeline
            .sort((a, b) => b.count - a.count)
            .map(({ etape, count }) => (
              <div key={etape} className="flex items-center gap-4">
                <div className="w-40 text-sm text-gray-600 flex-shrink-0">{ETAPES_LABELS[etape as Etape] ?? etape}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-cabinet-blue rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((count / total) * 100, 4)}%` }}
                  >
                    <span className="text-xs text-white font-medium">{count}</span>
                  </div>
                </div>
                <div className="w-10 text-right text-xs text-gray-400">{Math.round((count / total) * 100)}%</div>
              </div>
            ))}
        </div>
      </div>

      {/* Financier */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-cabinet-blue">{formatEuro(stats.ca_previsionnel)}</div>
            <div className="text-sm text-gray-500 mt-1">CA prévisionnel total</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">{formatEuro(stats.honoraires_encaisses)}</div>
            <div className="text-sm text-gray-500 mt-1">Honoraires encaissés</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-500">{formatEuro((stats.ca_previsionnel ?? 0) - (stats.honoraires_encaisses ?? 0))}</div>
            <div className="text-sm text-gray-500 mt-1">Honoraires à venir</div>
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
