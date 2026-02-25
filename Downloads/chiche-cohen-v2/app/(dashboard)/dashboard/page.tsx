'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, type Etape } from '@/lib/types'
import { FolderOpen, Users, TrendingUp, Euro, AlertTriangle, Clock, Calendar, Plus, ArrowRight, Scale, Stethoscope, Phone } from 'lucide-react'
import Link from 'next/link'

function eur(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}
function dateShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function joursLabel(j: number) {
  if (j === 0) return "Aujourd'hui"
  if (j < 0) return `Dépassé ${Math.abs(j)}j`
  return `J-${j}`
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [expertises, setExpertises] = useState<any[]>([])
  const [pipeline, setPipeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

      const [statsR, dossiersR, audiencesR, expertisesR, alertesR, pipeR] = await Promise.all([
        supabase.from('dossiers').select('etape, montant_obtenu, honoraires_resultat, honoraires_fixes, created_at').neq('etape', 'archive'),
        supabase.from('dossiers').select('id, reference, etape, priorite, updated_at, client:clients(nom, prenom)').neq('etape', 'archive').order('updated_at', { ascending: false }).limit(6),
        supabase.from('audiences').select('id, date_audience, nature, tribunal, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))').gte('date_audience', today).lte('date_audience', in30).order('date_audience').limit(8),
        supabase.from('expertises').select('id, date_expertise, type, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))').gte('date_expertise', today).lte('date_expertise', in7).order('date_expertise').limit(5),
        supabase.from('dossiers').select('id, reference, updated_at, client:clients(nom, prenom), etape').neq('etape', 'archive').neq('etape', 'encaissement').lte('updated_at', ago30).order('updated_at').limit(5),
        supabase.from('dossiers').select('etape').neq('etape', 'archive'),
      ])

      if (statsR.data) {
        const d = statsR.data
        const actifs = d.length
        const moisDebut = new Date(); moisDebut.setDate(1)
        const nouveaux = d.filter(x => new Date(x.created_at) >= moisDebut).length
        const encaisses = d.filter(x => x.etape === 'encaissement').reduce((s, x) => s + (x.honoraires_resultat || 0) + (x.honoraires_fixes || 0), 0)
        const previsionnel = d.reduce((s, x) => s + (x.montant_obtenu ? (x.montant_obtenu * 0.15) : 0), 0)
        setStats({ actifs, nouveaux, encaisses, previsionnel })
      }
      if (dossiersR.data) setDossiers(dossiersR.data)
      if (audiencesR.data) setAudiences(audiencesR.data)
      if (expertisesR.data) setExpertises(expertisesR.data)
      if (alertesR.data) setAlertes(alertesR.data)
      if (pipeR.data) {
        const counts: Record<string, number> = {}
        pipeR.data.forEach((d: any) => { counts[d.etape] = (counts[d.etape] || 0) + 1 })
        setPipeline(Object.entries(counts).map(([etape, count]) => ({ etape, count })))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/nouveau" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <Phone size={14} /> Nouveau lead
          </Link>
          <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nouveau dossier
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: <FolderOpen size={20} className="text-cabinet-blue" />, label: 'Dossiers actifs', value: stats?.actifs ?? 0, bg: 'bg-blue-50', href: '/dossiers' },
          { icon: <Users size={20} className="text-indigo-600" />, label: 'Nouveaux ce mois', value: stats?.nouveaux ?? 0, bg: 'bg-indigo-50', href: '/dossiers' },
          { icon: <TrendingUp size={20} className="text-green-600" />, label: 'Honoraires encaissés', value: eur(stats?.encaisses), bg: 'bg-green-50', href: '/statistiques' },
          { icon: <Euro size={20} className="text-emerald-600" />, label: 'CA prévisionnel', value: eur(stats?.previsionnel), bg: 'bg-emerald-50', href: '/statistiques' },
        ].map((s, i) => (
          <Link key={i} href={s.href}>
            <div className="card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="col-span-2 space-y-6">

          {/* Alertes urgentes */}
          {(alertes.length > 0 || expertises.length > 0) && (
            <div className="card border-l-4 border-orange-400">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" />Actions requises</h2>
                <Link href="/alertes" className="text-xs text-cabinet-blue hover:underline">Tout voir →</Link>
              </div>
              <div className="space-y-2">
                {expertises.map(e => {
                  const j = Math.ceil((new Date(e.date_expertise).getTime() - Date.now()) / 86400000)
                  return (
                    <Link key={e.id} href={`/dossiers/${e.dossier_id}`}>
                      <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <Stethoscope size={14} className="text-purple-500" />
                          <span className="text-sm font-medium">{e.dossier?.client?.nom} {e.dossier?.client?.prenom}</span>
                          <span className="text-xs text-gray-400">{e.type} • {e.dossier?.reference}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${j <= 2 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{joursLabel(j)}</span>
                      </div>
                    </Link>
                  )
                })}
                {alertes.slice(0, 3).map(a => (
                  <Link key={a.id} href={`/dossiers/${a.id}`}>
                    <div className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-orange-500" />
                        <span className="text-sm font-medium">{a.client?.nom} {a.client?.prenom}</span>
                        <span className="text-xs text-gray-400">{a.reference}</span>
                      </div>
                      <span className="text-xs text-orange-600 font-medium">
                        Inactif {Math.floor((Date.now() - new Date(a.updated_at).getTime()) / 86400000)}j
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Dossiers récents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Dossiers récents</h2>
              <Link href="/dossiers" className="text-xs text-cabinet-blue hover:underline flex items-center gap-1">Tous les dossiers <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-2">
              {dossiers.map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cabinet-blue/10 flex items-center justify-center text-xs font-bold text-cabinet-blue">
                        {d.client?.nom?.[0]}{d.client?.prenom?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{d.client?.nom} {d.client?.prenom}</div>
                        <div className="text-xs text-gray-400">{d.reference}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.priorite === 'urgente' && <span className="text-xs text-red-600 font-bold">🔴</span>}
                      {d.priorite === 'haute' && <span className="text-xs text-orange-500 font-bold">🟠</span>}
                      <span className={`badge text-xs ${ETAPES_COULEURS[d.etape as Etape] ?? 'bg-gray-100 text-gray-600'}`}>{ETAPES_LABELS[d.etape as Etape] ?? d.etape}</span>
                      <span className="text-xs text-gray-400">{dateShort(d.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="card">
            <h2 className="font-semibold mb-4">Pipeline</h2>
            <div className="space-y-2">
              {pipeline.sort((a, b) => {
                const ordre = ['qualification','mandat','constitution_dossier','expertise_amiable','offre_assureur','negociation','procedure_judiciaire','transaction','encaissement']
                return ordre.indexOf(a.etape) - ordre.indexOf(b.etape)
              }).map(p => {
                const total = pipeline.reduce((s, x) => s + x.count, 0) || 1
                const pct = Math.round(p.count / total * 100)
                return (
                  <div key={p.etape}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{ETAPES_LABELS[p.etape as Etape] ?? p.etape}</span>
                      <span className="text-xs font-semibold text-gray-700">{p.count} dossier{p.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cabinet-blue rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {pipeline.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun dossier actif</p>}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Audiences à venir */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><Calendar size={16} className="text-cabinet-blue" />Audiences (30j)</h2>
              <Link href="/audiences" className="text-xs text-cabinet-blue hover:underline">Tout →</Link>
            </div>
            {audiences.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Aucune audience prévue</p>
            ) : (
              <div className="space-y-3">
                {audiences.map(a => {
                  const j = Math.ceil((new Date(a.date_audience).getTime() - Date.now()) / 86400000)
                  return (
                    <Link key={a.id} href={`/dossiers/${a.dossier_id}`}>
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`text-center w-10 flex-shrink-0 ${j <= 2 ? 'text-red-500' : j <= 7 ? 'text-orange-500' : 'text-cabinet-blue'}`}>
                          <div className="text-lg font-bold leading-none">{j}</div>
                          <div className="text-xs">j</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{a.dossier?.client?.nom} {a.dossier?.client?.prenom}</div>
                          <div className="text-xs text-gray-400">{a.nature}</div>
                          <div className="text-xs text-gray-400">{dateShort(a.date_audience)}{a.tribunal && ` • ${a.tribunal}`}</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Liens rapides */}
          <div className="card">
            <h2 className="font-semibold mb-3">Accès rapides</h2>
            <div className="space-y-1">
              {[
                ['/alertes', '🔔', 'Alertes & relances'],
                ['/judiciaire', '⚖️', 'Suivi judiciaire'],
                ['/expertises', '🏥', 'Expertises'],
                ['/dintilhac', '🧮', 'Calculateur Dintilhac'],
                ['/statistiques', '📊', 'Statistiques'],
              ].map(([href, emoji, label]) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                    <span>{emoji}</span><span>{label}</span><ArrowRight size={12} className="ml-auto text-gray-300" />
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
