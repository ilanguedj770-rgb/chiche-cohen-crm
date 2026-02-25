'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Calendar, FileText, ChevronRight, Gavel } from 'lucide-react'
import Link from 'next/link'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function joursAvant(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function BadgeJours({ jours }: { jours: number }) {
  const color = jours <= 2 ? 'bg-red-100 text-red-700' : jours <= 7 ? 'bg-orange-100 text-orange-700' : jours <= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
  return <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>J-{jours}</span>
}

export default function JudiciaireePage() {
  const [audiences, setAudiences] = useState<any[]>([])
  const [deliberes, setDeliberes] = useState<any[]>([])
  const [expertises, setExpertises] = useState<any[]>([])
  const [dossiersJudiciaires, setDossiersJudiciaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'audiences' | 'deliberes' | 'expertises' | 'tous'>('audiences')

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]

      const [aud, del, exp, dos] = await Promise.all([
        supabase.from('audiences').select('id, date_audience, nature, tribunal, salle, rappel_j15_envoye, rappel_j2_envoye, dossier_id, avocat_id').gte('date_audience', today).lte('date_audience', in30).order('date_audience', { ascending: true }),
        supabase.from('procedures_judiciaires').select('id, tribunal, date_delibere, decision, dossier_id').eq('decision', 'en_attente').not('date_delibere', 'is', null).order('date_delibere', { ascending: true }),
        supabase.from('expertises').select('id, type, date_expertise, heure_expertise, lieu_expertise, expert_nom, medecin_conseil_nom, rappel_j7_envoye, dossier_id').gte('date_expertise', today).lte('date_expertise', in90).order('date_expertise', { ascending: true }),
        supabase.from('dossiers').select('id, reference, updated_at, client_id').eq('etape', 'procedure_judiciaire').order('updated_at', { ascending: false }).limit(20),
      ])

      // Charger les données liées
      const allIds = [
        ...(aud.data?.map(a => a.dossier_id) || []),
        ...(del.data?.map(d => d.dossier_id) || []),
        ...(exp.data?.map(e => e.dossier_id) || []),
        ...(dos.data?.map(d => d.id) || []),
      ]
      const dossierIds = allIds.filter((id, index) => id && allIds.indexOf(id) === index)

      const clientIds = dos.data?.map(d => d.client_id).filter(Boolean) || []

      const [dossResult, clientResult, utilisResult] = await Promise.all([
        dossierIds.length > 0 ? supabase.from('dossiers').select('id, reference, client_id').in('id', dossierIds) : { data: [] },
        clientIds.length > 0 ? supabase.from('clients').select('id, nom, prenom').in('id', clientIds) : { data: [] },
        supabase.from('utilisateurs').select('id, nom, prenom'),
      ])

      const dossMap: any = {}
      dossResult.data?.forEach(d => dossMap[d.id] = d)
      const clientMap: any = {}
      clientResult.data?.forEach(c => clientMap[c.id] = c)
      const utilMap: any = {}
      utilisResult.data?.forEach(u => utilMap[u.id] = u)

      // Enrichir les clients de tous les dossiers
      const allClientIdsRaw = Object.values(dossMap).map((d: any) => d.client_id).filter(Boolean)
      const allClientIds = allClientIdsRaw.filter((id: any, index: number) => allClientIdsRaw.indexOf(id) === index)
      if (allClientIds.length > 0) {
        const { data: allClients } = await supabase.from('clients').select('id, nom, prenom').in('id', allClientIds)
        allClients?.forEach(c => clientMap[c.id] = c)
      }

      const enrich = (item: any) => {
        const doss = dossMap[item.dossier_id]
        const client = doss ? clientMap[doss.client_id] : null
        return { ...item, dossier: { ...doss, client }, avocat: utilMap[item.avocat_id] }
      }

      setAudiences((aud.data || []).map(enrich))
      setDeliberes((del.data || []).map(enrich))
      setExpertises((exp.data || []).map(enrich))
      setDossiersJudiciaires((dos.data || []).map(d => ({ ...d, client: clientMap[d.client_id] })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  const tabs = [
    { id: 'audiences' as const, label: 'Audiences (30j)', count: audiences.length, icon: <Calendar size={14} /> },
    { id: 'deliberes' as const, label: 'Délibérés en attente', count: deliberes.length, icon: <Gavel size={14} /> },
    { id: 'expertises' as const, label: 'Expertises planifiées', count: expertises.length, icon: <FileText size={14} /> },
    { id: 'tous' as const, label: 'Tous dossiers judiciaires', count: dossiersJudiciaires.length, icon: <Scale size={14} /> },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale size={24} className="text-cabinet-blue" /> Tableau de bord judiciaire
        </h1>
        <p className="text-gray-500 text-sm mt-1">Suivi en temps réel des procédures, audiences et expertises</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Audiences dans 30j', value: audiences.length, icon: <Calendar size={20} className="text-cabinet-blue" />, bg: 'bg-blue-50', alert: audiences.filter(a => joursAvant(a.date_audience) <= 7).length },
          { label: 'Délibérés en attente', value: deliberes.length, icon: <Gavel size={20} className="text-purple-600" />, bg: 'bg-purple-50', alert: 0 },
          { label: 'Expertises planifiées', value: expertises.length, icon: <FileText size={20} className="text-green-600" />, bg: 'bg-green-50', alert: expertises.filter(e => joursAvant(e.date_expertise) <= 7).length },
          { label: 'Dossiers en procédure', value: dossiersJudiciaires.length, icon: <Scale size={20} className="text-orange-600" />, bg: 'bg-orange-50', alert: 0 },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              {s.alert > 0 && <div className="text-xs text-red-500 mt-0.5 font-medium">⚠ {s.alert} urgent{s.alert > 1 ? 's' : ''}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setOnglet(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${onglet === t.id ? 'border-cabinet-blue text-cabinet-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${onglet === t.id ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {onglet === 'audiences' && (
        <div className="space-y-3">
          {audiences.length === 0 ? (
            <div className="card text-center py-16 text-gray-400"><Calendar size={40} className="mx-auto mb-3 opacity-30" /><p>Aucune audience dans les 30 prochains jours</p></div>
          ) : audiences.map(a => {
            const jours = joursAvant(a.date_audience)
            const borderColor = jours <= 2 ? 'border-red-400' : jours <= 7 ? 'border-orange-400' : jours <= 15 ? 'border-yellow-400' : 'border-cabinet-blue'
            return (
              <Link key={a.id} href={`/dossiers/${a.dossier?.id}`}>
                <div className={`card border-l-4 ${borderColor} flex items-center justify-between hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-6">
                    <div className="text-center w-14">
                      <BadgeJours jours={jours} />
                      <div className="text-xs text-gray-400 mt-1">{new Date(a.date_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{a.dossier?.client?.nom} {a.dossier?.client?.prenom}</div>
                      <div className="text-sm text-gray-500">{a.dossier?.reference} • {a.nature}{a.tribunal && ` • ${a.tribunal}`}{a.salle && ` • Salle ${a.salle}`}</div>
                      {a.avocat && <div className="text-xs text-gray-400 mt-0.5">Avocat : {a.avocat.prenom} {a.avocat.nom}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right space-y-1">
                      {jours <= 15 && !a.rappel_j15_envoye && <div><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Rappel J-15 non envoyé</span></div>}
                      {jours <= 2 && !a.rappel_j2_envoye && <div><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rappel J-2 non envoyé</span></div>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {onglet === 'deliberes' && (
        <div className="space-y-3">
          {deliberes.length === 0 ? (
            <div className="card text-center py-16 text-gray-400"><Gavel size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun délibéré en attente</p></div>
          ) : deliberes.map(d => {
            const jours = d.date_delibere ? joursAvant(d.date_delibere) : null
            const passe = jours !== null && jours < 0
            return (
              <Link key={d.id} href={`/dossiers/${d.dossier?.id}`}>
                <div className={`card border-l-4 ${passe ? 'border-red-500' : 'border-purple-400'} flex items-center justify-between hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-6">
                    <div className="text-center w-20">
                      {jours !== null ? (passe ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">Rendu ?</span> : <BadgeJours jours={jours} />) : <span className="text-xs text-gray-400">Date ?</span>}
                      <div className="text-xs text-gray-400 mt-1">{formatDate(d.date_delibere)}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{d.dossier?.client?.nom} {d.dossier?.client?.prenom}</div>
                      <div className="text-sm text-gray-500">{d.dossier?.reference} • {d.tribunal}</div>
                      {passe && <div className="text-xs text-red-500 mt-0.5 font-medium">⚠ Date de délibéré dépassée — vérifier si jugement rendu</div>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {onglet === 'expertises' && (
        <div className="space-y-3">
          {expertises.length === 0 ? (
            <div className="card text-center py-16 text-gray-400"><FileText size={40} className="mx-auto mb-3 opacity-30" /><p>Aucune expertise planifiée dans les 90 prochains jours</p></div>
          ) : expertises.map(e => {
            const jours = joursAvant(e.date_expertise)
            const borderColor = jours <= 2 ? 'border-red-400' : jours <= 7 ? 'border-orange-400' : 'border-green-400'
            return (
              <Link key={e.id} href={`/dossiers/${e.dossier?.id}`}>
                <div className={`card border-l-4 ${borderColor} flex items-center justify-between hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-6">
                    <div className="text-center w-14">
                      <BadgeJours jours={jours} />
                      <div className="text-xs text-gray-400 mt-1">{new Date(e.date_expertise).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{e.dossier?.client?.nom} {e.dossier?.client?.prenom}</div>
                      <div className="text-sm text-gray-500">
                        {e.dossier?.reference}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${e.type === 'judiciaire' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                          {e.type === 'judiciaire' ? 'Judiciaire' : e.type === 'amiable' ? 'Amiable' : 'Sapiteur'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {e.heure_expertise && `${e.heure_expertise.slice(0,5)} • `}
                        {e.lieu_expertise && `${e.lieu_expertise} • `}
                        Expert : {e.expert_nom ?? 'Non désigné'}
                      </div>
                      {e.medecin_conseil_nom && <div className="text-xs text-gray-400">Médecin conseil : {e.medecin_conseil_nom}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {jours <= 7 && !e.rappel_j7_envoye && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Rappel J-7 non envoyé</span>}
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {onglet === 'tous' && (
        <div className="space-y-3">
          {dossiersJudiciaires.length === 0 ? (
            <div className="card text-center py-16 text-gray-400"><Scale size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun dossier en procédure judiciaire</p></div>
          ) : dossiersJudiciaires.map(d => (
            <Link key={d.id} href={`/dossiers/${d.id}`}>
              <div className="card flex items-center justify-between hover:shadow-md transition-shadow border-l-4 border-cabinet-blue">
                <div>
                  <div className="font-semibold">{d.client?.nom} {d.client?.prenom}</div>
                  <div className="text-sm text-gray-500">{d.reference}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Mis à jour {new Date(d.updated_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
