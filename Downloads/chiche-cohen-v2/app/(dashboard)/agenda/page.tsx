'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, Scale, Stethoscope, Bell, Clock, MapPin, User } from 'lucide-react'

type EventType = 'audience' | 'expertise' | 'echeance' | 'tache'

interface CalEvent {
  id: string
  type: EventType
  date: string
  heure?: string
  titre: string
  sousTitre?: string
  lieu?: string
  dossier_id?: string
  dossier_ref?: string
  client_nom?: string
}

const TYPE_CONFIG = {
  audience:  { label: 'Audience',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',  icon: Scale },
  expertise: { label: 'Expertise',  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', icon: Stethoscope },
  echeance:  { label: 'Échéance',   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', icon: Bell },
  tache:     { label: 'Tâche',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  icon: Clock },
} as const

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function AgendaPage() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [viewMode, setViewMode] = useState<'mois' | 'liste'>('mois')
  const [filter, setFilter] = useState<EventType | 'tous'>('tous')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => { loadEvents() }, [year, month])

  async function loadEvents() {
    setLoading(true)
    const pad = (n: number) => String(n).padStart(2, '0')
    const from = `${year}-${pad(month + 1)}-01`
    const to = `${year}-${pad(month + 1)}-${getDaysInMonth(year, month)}`

    const [audRes, expRes, tachRes] = await Promise.all([
      supabase.from('audiences')
        .select('id, date_audience, nature, tribunal, salle, dossier_id, dossiers(reference, clients(nom, prenom))')
        .gte('date_audience', from).lte('date_audience', to + 'T23:59:59'),
      supabase.from('expertises')
        .select('id, date_expertise, heure_expertise, type, lieu_expertise, expert_nom, dossier_id, dossiers(reference, clients(nom, prenom))')
        .gte('date_expertise', from).lte('date_expertise', to),
      supabase.from('taches')
        .select('id, date_echeance, titre, priorite, statut, dossier_id, dossiers(reference, clients(nom, prenom))')
        .gte('date_echeance', from).lte('date_echeance', to)
        .neq('statut', 'terminee').neq('statut', 'annulee'),
    ])

    const all: CalEvent[] = []

    for (const a of (audRes.data as any[] || [])) {
      const client = a.dossiers?.clients
      all.push({
        id: a.id, type: 'audience',
        date: a.date_audience?.slice(0, 10),
        heure: a.date_audience?.slice(11, 16),
        titre: a.nature || 'Audience',
        sousTitre: a.tribunal,
        lieu: a.salle,
        dossier_id: a.dossier_id,
        dossier_ref: a.dossiers?.reference,
        client_nom: client ? `${client.prenom} ${client.nom}` : undefined,
      })
    }

    for (const e of (expRes.data as any[] || [])) {
      const client = e.dossiers?.clients
      all.push({
        id: e.id, type: 'expertise',
        date: e.date_expertise,
        heure: e.heure_expertise?.slice(0, 5),
        titre: e.type === 'judiciaire' ? 'Expertise judiciaire' : e.type === 'amiable' ? 'Expertise amiable' : 'Sapiteur',
        sousTitre: e.expert_nom,
        lieu: e.lieu_expertise,
        dossier_id: e.dossier_id,
        dossier_ref: e.dossiers?.reference,
        client_nom: client ? `${client.prenom} ${client.nom}` : undefined,
      })
    }

    for (const t of (tachRes.data as any[] || [])) {
      const client = t.dossiers?.clients
      all.push({
        id: t.id, type: 'tache',
        date: t.date_echeance,
        titre: t.titre,
        sousTitre: t.priorite === 'urgente' ? '🔴 Urgente' : t.priorite === 'haute' ? '🟠 Haute' : undefined,
        dossier_id: t.dossier_id,
        dossier_ref: t.dossiers?.reference,
        client_nom: client ? `${client.prenom} ${client.nom}` : undefined,
      })
    }

    all.sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      return d !== 0 ? d : (a.heure || '00:00').localeCompare(b.heure || '00:00')
    })
    setEvents(all)
    setLoading(false)
  }

  const filtered = useMemo(() =>
    filter === 'tous' ? events : events.filter(e => e.type === filter),
    [events, filter]
  )

  const byDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {}
    filtered.forEach(e => {
      const day = parseInt(e.date.slice(8))
      if (!map[day]) map[day] = []
      map[day].push(e)
    })
    return map
  }, [filtered])

  const selectedEvents = useMemo(() =>
    selectedDay !== null ? filtered.filter(e => parseInt(e.date.slice(8)) === selectedDay) : [],
    [filtered, selectedDay]
  )

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  while (cells.length % 7 !== 0) cells.push(null)

  const stats = {
    audiences: events.filter(e => e.type === 'audience').length,
    expertises: events.filter(e => e.type === 'expertise').length,
    taches: events.filter(e => e.type === 'tache').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue centralisée des audiences, expertises et tâches</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('mois')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'mois' ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Mois
          </button>
          <button onClick={() => setViewMode('liste')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'liste' ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Liste
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {([
          { label: 'Audiences', count: stats.audiences, type: 'audience', icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Expertises', count: stats.expertises, type: 'expertise', icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Tâches', count: stats.taches, type: 'tache', icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
        ] as const).map(s => (
          <button key={s.type} onClick={() => setFilter(filter === s.type ? 'tous' : s.type)}
            className={`card p-4 flex items-center gap-3 text-left transition-all hover:shadow-md ${filter === s.type ? 'ring-2 ring-cabinet-blue' : ''}`}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.count}</div>
              <div className="text-xs text-gray-500">{s.label} ce mois</div>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 capitalize">{formatMonthYear(currentDate)}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
        </div>
      ) : viewMode === 'mois' ? (
        <>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">{d}</div>
              ))}
              {cells.map((day, i) => {
                const isToday = day === today.getDate() && year === today.getFullYear() && month === today.getMonth()
                const isSelected = day === selectedDay
                const dayEvs = day ? (byDay[day] || []) : []
                const isWeekend = (i % 7) >= 5
                return (
                  <div key={i}
                    onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                    className={`min-h-[90px] p-1.5 border-b border-r border-gray-100 transition-colors
                      ${day ? 'cursor-pointer hover:bg-blue-50/30' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${isWeekend && day ? 'bg-gray-50/50' : ''}
                      ${!day ? 'bg-gray-50/30' : ''}
                    `}>
                    {day && (
                      <>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1
                          ${isToday ? 'bg-cabinet-blue text-white' : 'text-gray-700'}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvs.slice(0, 3).map(ev => {
                            const cfg = TYPE_CONFIG[ev.type]
                            return (
                              <div key={ev.id} className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.color} border-l-2 ${cfg.border}`}>
                                {ev.heure && <span className="opacity-70">{ev.heure} </span>}
                                {ev.titre}
                              </div>
                            )
                          })}
                          {dayEvs.length > 3 && <div className="text-xs text-gray-400 px-1">+{dayEvs.length - 3}</div>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedDay !== null && (
            <div className="mt-4 card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {new Date(year, month, selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.length === 0
                ? <p className="text-sm text-gray-400">Aucun événement ce jour</p>
                : <div className="space-y-2">{selectedEvents.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
              }
            </div>
          )}
        </>
      ) : (
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              Aucun événement ce mois
            </div>
          ) : (
            Object.entries(
              filtered.reduce((acc: Record<string, CalEvent[]>, ev) => {
                if (!acc[ev.date]) acc[ev.date] = []
                acc[ev.date].push(ev)
                return acc
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([date, evs]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-gray-500 uppercase px-1 mb-1 mt-4 first:mt-0 capitalize">
                  {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="space-y-2">{evs.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ ev }: { ev: CalEvent }) {
  const cfg = TYPE_CONFIG[ev.type]
  const Icon = cfg.icon
  const inner = (
    <div className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${cfg.color}`}><Icon size={15} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            {ev.heure && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Clock size={11} />{ev.heure}</span>}
            {ev.dossier_ref && <span className="text-xs text-gray-400 font-mono">{ev.dossier_ref}</span>}
          </div>
          <div className="font-medium text-gray-900 text-sm mt-0.5 truncate">{ev.titre}</div>
          {ev.client_nom && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <User size={11} />{ev.client_nom}
            </div>
          )}
          {ev.sousTitre && <div className="text-xs text-gray-500 mt-0.5">{ev.sousTitre}</div>}
          {ev.lieu && (
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={11} />{ev.lieu}
            </div>
          )}
        </div>
      </div>
    </div>
  )
  return ev.dossier_id ? <Link href={`/dossiers/${ev.dossier_id}`}>{inner}</Link> : inner
}
