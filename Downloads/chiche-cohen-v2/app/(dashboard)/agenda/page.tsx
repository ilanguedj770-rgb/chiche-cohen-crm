'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, ChevronLeft, ChevronRight, Stethoscope, Scale, Clock } from 'lucide-react'
import Link from 'next/link'

type Evenement = {
  id: string
  date: string
  titre: string
  sous_titre: string
  type: 'audience' | 'expertise' | 'delibere'
  dossier_id?: string
  reference?: string
  couleur: string
}

const COULEURS = {
  audience: 'bg-blue-100 text-blue-700 border-blue-200',
  expertise: 'bg-purple-100 text-purple-700 border-purple-200',
  delibere: 'bg-orange-100 text-orange-700 border-orange-200',
}

function joursInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function premierJourOffset(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function AgendaPage() {
  const now = new Date()
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth())
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const debut = new Date(annee, mois, 1).toISOString().slice(0, 10)
      const fin = new Date(annee, mois + 1, 0).toISOString().slice(0, 10)

      const [{ data: aud }, { data: exp }, { data: del }] = await Promise.all([
        supabase.from('audiences')
          .select('id, date_audience, nature, tribunal, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .gte('date_audience', debut).lte('date_audience', fin),
        supabase.from('expertises')
          .select('id, date_expertise, type, lieu_expertise, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .gte('date_expertise', debut).lte('date_expertise', fin),
        supabase.from('procedures_judiciaires')
          .select('id, date_delibere, tribunal, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .gte('date_delibere', debut).lte('date_delibere', fin)
          .eq('decision', 'en_attente').not('date_delibere', 'is', null),
      ])

      const evts: Evenement[] = []

      aud?.forEach((a: any) => {
        const client = a.dossier?.client
        evts.push({
          id: 'aud-' + a.id,
          date: a.date_audience,
          titre: client ? client.nom + ' ' + (client.prenom || '') : 'Audience',
          sous_titre: (a.nature || 'Audience') + (a.tribunal ? ' — ' + a.tribunal : ''),
          type: 'audience', dossier_id: a.dossier_id, reference: a.dossier?.reference,
          couleur: COULEURS.audience,
        })
      })
      exp?.forEach((e: any) => {
        const client = e.dossier?.client
        evts.push({
          id: 'exp-' + e.id,
          date: e.date_expertise,
          titre: client ? client.nom + ' ' + (client.prenom || '') : 'Expertise',
          sous_titre: 'Expertise ' + (e.type || '') + (e.lieu_expertise ? ' — ' + e.lieu_expertise : ''),
          type: 'expertise', dossier_id: e.dossier_id, reference: e.dossier?.reference,
          couleur: COULEURS.expertise,
        })
      })
      del?.forEach((d: any) => {
        const client = d.dossier?.client
        evts.push({
          id: 'del-' + d.id,
          date: d.date_delibere,
          titre: client ? client.nom + ' ' + (client.prenom || '') : 'Délibéré',
          sous_titre: 'Délibéré' + (d.tribunal ? ' — ' + d.tribunal : ''),
          type: 'delibere', dossier_id: d.dossier_id, reference: d.dossier?.reference,
          couleur: COULEURS.delibere,
        })
      })

      setEvenements(evts.sort((a, b) => a.date.localeCompare(b.date)))
      setLoading(false)
    }
    load()
  }, [annee, mois])

  const parJour = useMemo(() => {
    const idx: Record<string, Evenement[]> = {}
    evenements.forEach(e => {
      if (!idx[e.date]) idx[e.date] = []
      idx[e.date].push(e)
    })
    return idx
  }, [evenements])

  const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const nbJours = joursInMonth(annee, mois)
  const premierOffset = premierJourOffset(annee, mois)
  const todayStr = now.toISOString().slice(0, 10)
  const evtsJourSelectionne = jourSelectionne ? (parJour[jourSelectionne] || []) : []
  const nomMois = new Date(annee, mois, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const navMois = (delta: number) => {
    if (delta < 0 && mois === 0) { setMois(11); setAnnee(a => a - 1) }
    else if (delta > 0 && mois === 11) { setMois(0); setAnnee(a => a + 1) }
    else setMois(m => m + delta)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar size={22} className="text-cabinet-blue" />Agenda</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{nomMois} — {evenements.length} événement{evenements.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMois(-1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><ChevronLeft size={16} /></button>
          <button onClick={() => { setAnnee(now.getFullYear()); setMois(now.getMonth()) }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Aujourd'hui</button>
          <button onClick={() => navMois(1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Audiences', count: evenements.filter(e => e.type === 'audience').length, cls: 'text-blue-700 bg-blue-50', icon: <Calendar size={16} className="text-blue-500" /> },
          { label: 'Expertises', count: evenements.filter(e => e.type === 'expertise').length, cls: 'text-purple-700 bg-purple-50', icon: <Stethoscope size={16} className="text-purple-500" /> },
          { label: 'Délibérés', count: evenements.filter(e => e.type === 'delibere').length, cls: 'text-orange-700 bg-orange-50', icon: <Scale size={16} className="text-orange-500" /> },
        ].map(s => (
          <div key={s.label} className={`card flex items-center gap-3 ${s.cls}`}>
            {s.icon}
            <div><span className="text-2xl font-bold">{s.count}</span><span className="text-sm ml-2">{s.label}</span></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendrier */}
        <div className="col-span-2 card">
          <div className="grid grid-cols-7 mb-2">
            {joursSemaine.map(j => (
              <div key={j} className="text-center text-xs font-semibold text-gray-400 py-2">{j}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
            {Array.from({ length: premierOffset }).map((_, i) => (
              <div key={'e' + i} className="bg-white h-24 p-1" />
            ))}
            {Array.from({ length: nbJours }).map((_, i) => {
              const jour = i + 1
              const dateStr = annee + '-' + String(mois + 1).padStart(2, '0') + '-' + String(jour).padStart(2, '0')
              const evts = parJour[dateStr] || []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === jourSelectionne
              const col = (premierOffset + i) % 7
              const isWeekend = col >= 5
              return (
                <div key={jour} onClick={() => setJourSelectionne(isSelected ? null : dateStr)}
                  className={'bg-white h-24 p-1.5 cursor-pointer transition-colors hover:bg-blue-50/40' + (isSelected ? ' ring-2 ring-cabinet-blue ring-inset' : '') + (isWeekend ? ' bg-gray-50/60' : '')}>
                  <div className={'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ' + (isToday ? 'bg-cabinet-blue text-white' : 'text-gray-700')}>
                    {jour}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {evts.slice(0, 3).map(e => (
                      <div key={e.id} className={'text-xs px-1 py-0.5 rounded truncate border ' + e.couleur}>{e.titre}</div>
                    ))}
                    {evts.length > 3 && <div className="text-xs text-gray-400 pl-1">+{evts.length - 3}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          {jourSelectionne && (
            <div className="card">
              <h3 className="font-semibold mb-3 text-sm">
                {new Date(jourSelectionne + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {evtsJourSelectionne.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun événement</p>
              ) : (
                <div className="space-y-2">
                  {evtsJourSelectionne.map(e => (
                    <Link key={e.id} href={e.dossier_id ? '/dossiers/' + e.dossier_id : '#'}>
                      <div className={'p-2.5 rounded-lg border ' + e.couleur + ' hover:opacity-80 transition-opacity'}>
                        <div className="font-medium text-xs">{e.titre}</div>
                        <div className="text-xs opacity-70 mt-0.5">{e.sous_titre}</div>
                        {e.reference && <div className="text-xs font-mono opacity-50 mt-0.5">{e.reference}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <Clock size={14} className="text-gray-400" /> Prochains événements
            </h3>
            {loading ? (
              <div className="text-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cabinet-blue mx-auto" /></div>
            ) : evenements.filter(e => e.date >= todayStr).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun événement à venir</p>
            ) : (
              <div className="space-y-2">
                {evenements.filter(e => e.date >= todayStr).slice(0, 8).map(e => {
                  const jours = Math.ceil((new Date(e.date).getTime() - new Date(todayStr).getTime()) / 86400000)
                  return (
                    <Link key={e.id} href={e.dossier_id ? '/dossiers/' + e.dossier_id : '#'}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                        <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + (e.type === 'audience' ? 'bg-blue-400' : e.type === 'expertise' ? 'bg-purple-400' : 'bg-orange-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{e.titre}</div>
                          <div className="text-xs text-gray-400 truncate">{e.sous_titre}</div>
                        </div>
                        <div className={'text-xs font-medium flex-shrink-0 ' + (jours === 0 ? 'text-red-500' : jours <= 3 ? 'text-orange-500' : 'text-gray-400')}>
                          {jours === 0 ? "Auj." : 'J-' + jours}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
