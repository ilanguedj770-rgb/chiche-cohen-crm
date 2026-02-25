'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, type DossierPipeline, type AudienceVue } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FolderOpen, Users, Calendar, TrendingUp,
  AlertTriangle, Clock, Euro, Scale, Plus
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  dossiers_actifs: number
  nouveaux_ce_mois: number
  ca_previsionnel: number
  honoraires_encaisses: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [dossiersRecents, setDossiersRecents] = useState<DossierPipeline[]>([])
  const [audiencesVenir, setAudiencesVenir] = useState<AudienceVue[]>([])
  const [dossiersAlerte, setDossiersAlerte] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [statsRes, dossiersRes, audiencesRes, alertesRes] = await Promise.all([
        supabase.from('vue_tableau_bord_financier').select('*').single(),
        supabase.from('vue_pipeline').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('vue_audiences_a_venir').select('*').limit(5),
        supabase.from('vue_dossiers_a_relancer').select('*').limit(5),
      ])
      if (statsRes.data) setStats(statsRes.data)
      if (dossiersRes.data) setDossiersRecents(dossiersRes.data)
      if (audiencesRes.data) setAudiencesVenir(audiencesRes.data)
      if (alertesRes.data) setDossiersAlerte(alertesRes.data)
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
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau dossier
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FolderOpen size={20} className="text-cabinet-blue" />}
          label="Dossiers actifs"
          value={stats?.dossiers_actifs ?? 0}
          bg="bg-cabinet-blue-light"
        />
        <StatCard
          icon={<Users size={20} className="text-blue-600" />}
          label="Nouveaux ce mois"
          value={stats?.nouveaux_ce_mois ?? 0}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-green-600" />}
          label="CA prévisionnel"
          value={formatEuro(stats?.ca_previsionnel)}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Euro size={20} className="text-emerald-600" />}
          label="Honoraires encaissés"
          value={formatEuro(stats?.honoraires_encaisses)}
          bg="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Dossiers récents */}
        <div className="col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Dossiers récents</h2>
            <Link href="/dossiers" className="text-sm text-cabinet-blue hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-3">
            {dossiersRecents.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Aucun dossier pour l'instant</p>
            )}
            {dossiersRecents.map(d => (
              <Link key={d.id} href={`/dossiers/${d.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">{d.client_nom} {d.client_prenom}</div>
                      <div className="text-xs text-gray-400">{d.reference} • {d.juriste_nom ?? 'Non attribué'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.jours_inactif > 0 && d.jours_inactif >= 7 && (
                      <span className="flex items-center gap-1 text-xs text-orange-500">
                        <Clock size={12} /> {d.jours_inactif}j
                      </span>
                    )}
                    <span className={`badge ${ETAPES_COULEURS[d.etape]}`}>
                      {ETAPES_LABELS[d.etape]}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Audiences à venir */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={16} className="text-cabinet-blue" />
                Audiences (30j)
              </h2>
              <Link href="/audiences" className="text-sm text-cabinet-blue hover:underline">Tout →</Link>
            </div>
            <div className="space-y-2">
              {audiencesVenir.length === 0 && (
                <p className="text-gray-400 text-sm">Aucune audience prévue</p>
              )}
              {audiencesVenir.map(a => (
                <div key={a.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-700">{a.client_nom}</div>
                    <div className={`text-xs font-bold ${a.jours_avant_audience <= 2 ? 'text-red-500' : a.jours_avant_audience <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                      J-{a.jours_avant_audience}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {format(parseISO(a.date_audience), "d MMM", { locale: fr })} • {a.nature}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes relances */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Dossiers à relancer
              </h2>
            </div>
            <div className="space-y-2">
              {dossiersAlerte.length === 0 && (
                <p className="text-gray-400 text-sm">Aucune relance urgente</p>
              )}
              {dossiersAlerte.map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`}>
                  <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-700">{d.client_nom}</div>
                      <div className="text-xs font-bold text-orange-500">{d.jours_inactif}j sans activité</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.reference} • {ETAPES_LABELS[d.etape as keyof typeof ETAPES_LABELS]}</div>
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

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: any; bg: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function formatEuro(value?: number | null) {
  if (!value) return '0 €'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
