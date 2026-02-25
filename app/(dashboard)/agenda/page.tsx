'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, Stethoscope, Scale, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type VueMode = 'mois' | 'semaine' | 'liste'

interface Evenement {
  id: string
  type: 'audience' | 'expertise' | 'echeance'
  date: string
  heure?: string
  titre: string
  sous_titre?: string
  dossier_id?: string
  dossier_ref?: string
  couleur: string
  bg: string
  urgent?: boolean
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const r = new Date(d); r.setDate(d.getDate() + diff); r.setHours(0,0,0,0); return r
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d: Date): string { return d.toISOString().slice(0,10) }
function joursAvant(dateStr: string): number {
  return Math.ceil((new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
}
function badgeJours(j: number) {
  if (j < 0)  return { label: `Dépassé ${Math.abs(j)}j`, cls: 'bg-red-100 text-red-700 font-bold' }
  if (j === 0) return { label: "Aujourd'hui", cls: 'bg-red-500 text-white font-bold' }
  if (j <= 2)  return { label: `J-${j}`, cls: 'bg-red-100 text-red-700 font-bold' }
  if (j <= 7)  return { label: `J-${j}`, cls: 'bg-orange-100 text-orange-700 font-semibold' }
  if (j <= 15) return { label: `J-${j}`, cls: 'bg-yellow-100 text-yellow-700' }
  return { label: `J-${j}`, cls: 'bg-blue-50 text-blue-600' }
}

export default function AgendaPage() {
  const [vue, setVue] = useState<VueMode>('mois')
  const [curseur, setCurseur] = useState(new Date())
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [filtres, setFiltres] = useState({ audiences: true, expertises: true, echeances: true })
  const [selected, setSelected] = useState<Evenement | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = new Date(curseur.getFullYear(), curseur.getMonth() - 1, 1).toISOString().slice(0,10)
      const to   = new Date(curseur.getFullYear(), curseur.getMonth() + 2, 0).toISOString().slice(0,10)

      const [{ data: aud }, { data: exp }, { data: proc }] = await Promise.all([
        supabase.from('audiences')
          .select('id, date_audience, nature, tribunal, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .gte('date_audience', from).lte('date_audience', to).order('date_audience'),
        supabase.from('expertises')
          .select('id, date_expertise, heure_expertise, type, lieu_expertise, expert_nom, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .gte('date_expertise', from).lte('date_expertise', to).order('date_expertise'),
        supabase.from('procedures_judiciaires')
          .select('id, date_delibere, prochaine_audience, tribunal, decision, dossier_id, dossier:dossiers(reference, client:clients(nom, prenom))')
          .or(`date_delibere.gte.${from},prochaine_audience.gte.${from}`),
      ])

      const evts: Evenement[] = []

      aud?.forEach((a: any) => {
        const j = joursAvant(a.date_audience)
        evts.push({
          id: `aud-${a.id}`, type: 'audience',
          date: a.date_audience.slice(0,10),
          titre: `${a.dossier?.client?.nom || ''} ${a.dossier?.client?.prenom || ''}`.trim() || 'Audience',
          sous_titre: `${(a.nature || '').replace(/_/g,' ')}${a.tribunal ? ' • ' + a.tribunal : ''}`,
          dossier_id: a.dossier_id, dossier_ref: a.dossier?.reference,
          couleur: 'text-blue-700', bg: j <= 2 ? 'bg-red-100' : j <= 7 ? 'bg-orange-100' : 'bg-blue-100',
          urgent: j <= 7,
        })
      })

      exp?.forEach((e: any) => {
        const j = joursAvant(e.date_expertise)
        evts.push({
          id: `exp-${e.id}`, type: 'expertise',
          date: e.date_expertise.slice(0,10),
          heure: e.heure_expertise,
          titre: `${e.dossier?.client?.nom || ''} ${e.dossier?.client?.prenom || ''}`.trim() || 'Expertise',
          sous_titre: `${e.type || ''}${e.expert_nom ? ' • ' + e.expert_nom : ''}`,
          dossier_id: e.dossier_id, dossier_ref: e.dossier?.reference,
          couleur: 'text-purple-700', bg: j <= 2 ? 'bg-red-100' : j <= 7 ? 'bg-orange-100' : 'bg-purple-100',
          urgent: j <= 7,
        })
      })

      proc?.forEach((p: any) => {
        if (p.date_delibere) {
          const j = joursAvant(p.date_delibere)
          evts.push({
            id: `del-${p.id}`, type: 'echeance',
            date: p.date_delibere.slice(0,10),
            titre: `Délibéré — ${p.dossier?.client?.nom || ''}`,
            sous_titre: p.tribunal || '',
            dossier_id: p.dossier_id, dossier_ref: p.dossier?.reference,
            couleur: 'text-rose-700', bg: j <= 7 ? 'bg-red-100' : 'bg-rose-100',
            urgent: j <= 7,
          })
        }
        if (p.prochaine_audience && p.decision === 'en_attente') {
          evts.push({
            id: `paud-${p.id}`, type: 'audience',
            date: p.prochaine_audience.slice(0,10),
            titre: `Audience — ${p.dossier?.client?.nom || ''}`,
            sous_titre: p.tribunal || '',
            dossier_id: p.dossier_id, dossier_ref: p.dossier?.reference,
            couleur: 'text-blue-700', bg: 'bg-blue-100',
          })
        }
      })

      setEvenements(evts)
      setLoading(false)
    }
    load()
  }, [curseur])

  const evtsFiltres = useMemo(() => evenements.filter(e => {
    if (e.type === 'audience'  && !filtres.audiences)  return false
    if (e.type === 'expertise' && !filtres.expertises) return false
    if (e.type === 'echeance'  && !filtres.echeances)  return false
    return true
  }), [evenements, filtres])

  const evtsParDate = useMemo(() => {
    const map: Record<string, Evenement[]> = {}
    evtsFiltres.forEach(e => { (map[e.date] = map[e.date] || []).push(e) })
    return map
  }, [evtsFiltres])

  const naviguer = (dir: -1 | 1) => {
    const d = new Date(curseur)
    if (vue === 'semaine') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurseur(d)
  }

  const titre = vue === 'semaine'
    ? (() => { const lun = startOfWeek(curseur); const dim = addDays(lun, 6)
        return `${lun.getDate()} – ${dim.getDate()} ${MOIS_LABELS[dim.getMonth()]} ${dim.getFullYear()}` })()
    : `${MOIS_LABELS[curseur.getMonth()]} ${curseur.getFullYear()}`

  const urgents = evtsFiltres.filter(e => e.urgent && new Date(e.date) >= new Date()).length

  return (
    <div className="p-6 flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar size={22} className="text-cabinet-blue" /> Agenda
          </h1>
          {urgents > 0 && (
            <p className="text-sm text-orange-600 font-medium mt-0.5 flex items-center gap-1">
              <AlertTriangle size={13} /> {urgents} échéance{urgents > 1 ? 's' : ''} urgente{urgents > 1 ? 's' : ''} (≤ 7j)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {(['mois', 'semaine', 'liste'] as VueMode[]).map(v => (
              <button key={v} onClick={() => setVue(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${vue === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => naviguer(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurseur(new Date())} className="px-3 py-1 text-xs font-medium text-cabinet-blue hover:bg-blue-50 rounded-lg">Auj.</button>
            <button onClick={() => naviguer(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
          </div>
          <span className="font-semibold text-gray-700 min-w-[200px] text-right">{titre}</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400 font-medium">Afficher :</span>
        {([
          ['audiences', 'Audiences', 'bg-blue-100 text-blue-700 border-blue-300'],
          ['expertises', 'Expertises', 'bg-purple-100 text-purple-700 border-purple-300'],
          ['echeances', 'Délibérés', 'bg-rose-100 text-rose-700 border-rose-300'],
        ] as [keyof typeof filtres, string, string][]).map(([k, l, on]) => (
          <button key={k} onClick={() => setFiltres(f => ({ ...f, [k]: !f[k] }))}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filtres[k] ? `${on}` : 'bg-white text-gray-400 border-gray-200'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{evtsFiltres.length} événement{evtsFiltres.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {vue === 'mois'    && <VueMois    curseur={curseur} evtsParDate={evtsParDate} onSelect={setSelected} />}
          {vue === 'semaine' && <VueSemaine curseur={curseur} evtsParDate={evtsParDate} onSelect={setSelected} />}
          {vue === 'liste'   && <VueListe   curseur={curseur} evtsFiltres={evtsFiltres} onSelect={setSelected} />}
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${selected.bg}`}>
                {selected.type === 'expertise' ? <Stethoscope size={20} className={selected.couleur} /> :
                 selected.type === 'echeance'  ? <Scale size={20} className={selected.couleur} /> :
                 <Calendar size={20} className={selected.couleur} />}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
            </div>
            <h3 className="font-bold text-lg mb-1">{selected.titre}</h3>
            {selected.sous_titre && <p className="text-sm text-gray-500 mb-4 capitalize">{selected.sous_titre}</p>}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <span className="capitalize">{new Date(selected.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              {selected.heure && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{selected.heure}</span>
                </div>
              )}
              {(() => { const b = badgeJours(joursAvant(selected.date)); return (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${b.cls}`}>{b.label}</span>
                  {selected.dossier_ref && <span className="text-xs font-mono text-gray-400">{selected.dossier_ref}</span>}
                </div>
              )})()}
            </div>
            {selected.dossier_id && (
              <Link href={`/dossiers/${selected.dossier_id}`}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                onClick={() => setSelected(null)}>
                Ouvrir le dossier →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vue Mois ──────────────────────────────────────────────────────────────────
function VueMois({ curseur, evtsParDate, onSelect }: { curseur: Date, evtsParDate: Record<string, Evenement[]>, onSelect: (e: Evenement) => void }) {
  const annee = curseur.getFullYear(), mois = curseur.getMonth()
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7
  const nbJours  = new Date(annee, mois + 1, 0).getDate()
  const today    = toISO(new Date())
  const cellules: (string | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => toISO(new Date(annee, mois, i + 1))),
  ]
  while (cellules.length % 7 !== 0) cellules.push(null)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {JOURS.map(j => <div key={j} className="text-center py-2 text-xs font-semibold text-gray-500">{j}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {cellules.map((date, i) => {
          const evts = date ? (evtsParDate[date] || []) : []
          const isToday = date === today
          const isPast  = date && date < today
          return (
            <div key={i} className={`min-h-[90px] p-1.5 ${isPast ? 'bg-gray-50/50' : 'bg-white'} ${!date ? 'bg-gray-50' : ''}`}>
              {date && (
                <>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${
                    isToday ? 'bg-cabinet-blue text-white' : isPast ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(date + 'T12:00:00').getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {evts.slice(0, 3).map(e => (
                      <button key={e.id} onClick={() => onSelect(e)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${e.bg} ${e.couleur} hover:opacity-80 font-medium`}>
                        {e.heure && <span className="opacity-60 mr-1">{e.heure}</span>}{e.titre}
                      </button>
                    ))}
                    {evts.length > 3 && <div className="text-xs text-gray-400 pl-1">+{evts.length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vue Semaine ───────────────────────────────────────────────────────────────
function VueSemaine({ curseur, evtsParDate, onSelect }: { curseur: Date, evtsParDate: Record<string, Evenement[]>, onSelect: (e: Evenement) => void }) {
  const lun = startOfWeek(curseur)
  const jours = Array.from({ length: 7 }, (_, i) => addDays(lun, i))
  const today = toISO(new Date())
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {jours.map((jour, idx) => {
          const iso = toISO(jour), evts = evtsParDate[iso] || [], isToday = iso === today
          return (
            <div key={iso} className={`min-h-[320px] ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
              <div className={`text-center py-3 border-b border-gray-100 ${isToday ? 'bg-cabinet-blue text-white' : 'bg-gray-50 text-gray-600'}`}>
                <div className="text-xs font-semibold">{JOURS[idx]}</div>
                <div className="text-lg font-bold">{jour.getDate()}</div>
              </div>
              <div className="p-1.5 space-y-1">
                {evts.map(e => (
                  <button key={e.id} onClick={() => onSelect(e)}
                    className={`w-full text-left p-1.5 rounded-lg text-xs ${e.bg} ${e.couleur} hover:opacity-80`}>
                    {e.heure && <div className="font-bold opacity-70">{e.heure}</div>}
                    <div className="font-semibold truncate">{e.titre}</div>
                    {e.sous_titre && <div className="opacity-60 truncate capitalize text-xs">{e.sous_titre}</div>}
                  </button>
                ))}
                {evts.length === 0 && <div className="text-center py-8 text-gray-200 text-xs">—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vue Liste ─────────────────────────────────────────────────────────────────
function VueListe({ curseur, evtsFiltres, onSelect }: { curseur: Date, evtsFiltres: Evenement[], onSelect: (e: Evenement) => void }) {
  const mois = curseur.getMonth(), annee = curseur.getFullYear()
  const duMois = evtsFiltres
    .filter(e => { const d = new Date(e.date); return d.getMonth() === mois && d.getFullYear() === annee })
    .sort((a, b) => a.date.localeCompare(b.date))
  const grouped: Record<string, Evenement[]> = {}
  duMois.forEach(e => (grouped[e.date] = grouped[e.date] || []).push(e))

  if (duMois.length === 0) return (
    <div className="card text-center py-16 text-gray-300">
      <Calendar size={40} className="mx-auto mb-3" /><p>Aucun événement ce mois</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([date, evts]) => {
        const j = joursAvant(date), badge = badgeJours(j)
        const label = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-sm text-gray-700 capitalize">{label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="space-y-1.5 pl-3 border-l-2 border-gray-100">
              {evts.map(e => (
                <button key={e.id} onClick={() => onSelect(e)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl ${e.bg} hover:opacity-90`}>
                  <div className={`flex-shrink-0 ${e.couleur}`}>
                    {e.type === 'expertise' ? <Stethoscope size={15} /> : e.type === 'echeance' ? <Scale size={15} /> : <Calendar size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${e.couleur}`}>{e.titre}</div>
                    {e.sous_titre && <div className="text-xs opacity-70 capitalize truncate">{e.sous_titre}</div>}
                  </div>
                  {e.heure && <div className={`text-xs font-mono flex-shrink-0 ${e.couleur} opacity-70`}>{e.heure}</div>}
                  {e.dossier_ref && <div className="text-xs font-mono text-gray-400 flex-shrink-0">{e.dossier_ref}</div>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const dynamic = 'force-dynamic'
