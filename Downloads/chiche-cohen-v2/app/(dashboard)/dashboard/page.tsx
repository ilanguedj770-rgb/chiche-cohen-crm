'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, type DossierPipeline, type AudienceVue } from '@/lib/types'
import { FolderOpen, Users, TrendingUp, Euro, AlertTriangle, Clock, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'

function formatEuro(value?: number | null) {
  if (!value) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [dossiers, setDossiers] = useState<DossierPipeline[]>([])
  const [audiences, setAudiences] = useState<AudienceVue[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    async function load() {
      const [s, d, a, al] = await Promise.all([
        supabase.from('vue_tableau_bord_financier').select('*').single(),
        supabase.from('vue_pipeline').select('*').order('updated_at', { ascending: false }).limit(5),
        supabase.from('vue_audiences_a_venir').select('*').limit(5),
        supabase.from('vue_dossiers_a_relancer').select('*').limit(5),
      ])
      if (s.data) setStats(s.data)
      if (d.data) setDossiers(d.data)
      if (a.data) setAudiences(a.data)
      if (al.data) setAlertes(al.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau dossier
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: <FolderOpen size={20} className="text-cabinet-blue" />, label: 'Dossiers actifs', value: stats?.dossiers_actifs ?? 0, bg: 'bg-blue-50' },
          { icon: <Users size={20} className="text-blue-600" />, label: 'Nouveaux ce mois', value: stats?.nouveaux_ce_mois ?? 0, bg: 'bg-indigo-50' },
          { icon: <TrendingUp size={20} className="text-green-600" />, label: 'CA prévisionnel', value: formatEuro(stats?.ca_previsionnel), bg: 'bg-green-50' },
          { icon: <Euro size={20} className="text-emerald-600" />, label: 'Honoraires encaissés', value: formatEuro(stats?.honoraires_encaisses), bg: 'bg-emerald-50' },
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Dossiers récents</h2>
            <Link href="/dossiers" className="text-sm text-cabinet-blue hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {dossiers.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun dossier</p>}
            {dossiers.map(d => (
              <Link key={d.id} href={`/dossiers/${d.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div>
                    <div className="font-medium text-sm">{d.client_nom} {d.client_prenom}</div>
                    <div className="text-xs text-gray-400">{d.reference} • {d.juriste_nom ?? 'Non attribué'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.jours_inactif >= 7 && <span className="flex items-center gap-1 text-xs text-orange-500"><Clock size={12} />{d.jours_inactif}j</span>}
                    <span className={`badge ${ETAPES_COULEURS[d.etape]}`}>{ETAPES_LABELS[d.etape]}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2"><Calendar size={16} className="text-cabinet-blue" />Audiences (30j)</h2>
              <Link href="/audiences" className="text-xs text-cabinet-blue hover:underline">Tout →</Link>
            </div>
            <div className="space-y-2">
              {audiences.length === 0 && <p className="text-gray-400 text-xs">Aucune audience prévue</p>}
              {audiences.map(a => (
                <div key={a.id} className="p-2.5 rounded-lg bg-gray-50">
                  <div className="flex justify-between">
                    <div className="text-xs font-medium">{a.client_nom}</div>
                    <div className={`text-xs font-bold ${a.jours_avant_audience <= 2 ? 'text-red-500' : a.jours_avant_audience <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>J-{a.jours_avant_audience}</div>
                  </div>
                  <div className="text-xs text-gray-400">{formatDate(a.date_audience)} • {a.nature}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4"><AlertTriangle size={16} className="text-orange-500" />À relancer</h2>
            <div className="space-y-2">
              {alertes.length === 0 && <p className="text-gray-400 text-xs">Aucune relance urgente</p>}
              {alertes.map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`}>
                  <div className="p-2.5 rounded-lg bg-orange-50 hover:bg-orange-100">
                    <div className="flex justify-between">
                      <div className="text-xs font-medium">{d.client_nom}</div>
                      <div className="text-xs font-bold text-orange-500">{d.jours_inactif}j</div>
                    </div>
                    <div className="text-xs text-gray-400">{d.reference}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
