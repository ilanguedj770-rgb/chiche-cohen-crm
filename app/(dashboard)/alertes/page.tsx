'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, Clock, Calendar, Scale, FileWarning, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ETAPES_LABELS, ETAPES_COULEURS, type Etape } from '@/lib/types'

function joursLabel(j: number) {
  if (j === 0) return "Aujourd'hui"
  if (j < 0) return `Dépassé de ${Math.abs(j)}j`
  return `Dans ${j}j`
}

function couleurJours(j: number, type: 'urgence' | 'info' = 'urgence') {
  if (j <= 0) return 'text-red-600 font-bold'
  if (j <= 7) return 'text-red-500 font-semibold'
  if (j <= 15) return 'text-orange-500 font-semibold'
  return type === 'urgence' ? 'text-orange-400' : 'text-gray-500'
}

export default function AlertesPage() {
  const [dormants, setDormants] = useState<any[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [expertises, setExpertises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [d, a, e] = await Promise.all([
        supabase.from('vue_dossiers_a_relancer').select('*').order('jours_inactif', { ascending: false }),
        supabase.from('vue_audiences_a_venir').select('*').order('jours_avant_audience', { ascending: true }),
        supabase.from('vue_expertises_a_venir').select('*').order('jours_avant_expertise', { ascending: true }),
      ])
      if (d.data) setDormants(d.data)
      if (a.data) setAudiences(a.data)
      if (e.data) setExpertises(e.data)
      setLoading(false)
    }
    load()
  }, [])

  const total = dormants.length + audiences.filter(a => a.jours_avant_audience <= 15).length + expertises.filter(e => e.jours_avant_expertise <= 7).length

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes & Relances</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total > 0
              ? <span className="text-orange-600 font-medium">{total} action(s) requise(s)</span>
              : <span className="text-green-600 font-medium">Tout est à jour ✓</span>
            }
          </p>
        </div>
      </div>

      {/* Section dossiers dormants */}
      <Section
        icon={<Clock size={18} className="text-orange-500" />}
        titre="Dossiers sans activité"
        count={dormants.length}
        couleur="orange"
      >
        {dormants.length === 0 ? (
          <Vide texte="Aucun dossier dormant" />
        ) : (
          dormants.map(d => (
            <LigneAlerte
              key={d.id}
              href={`/dossiers/${d.id}`}
              titre={`${d.client_nom} ${d.client_prenom || ''}`}
              sous_titre={`${d.reference} • ${ETAPES_LABELS[d.etape as Etape] ?? d.etape}`}
              badge_label={ETAPES_LABELS[d.etape as Etape] ?? d.etape}
              badge_couleur={ETAPES_COULEURS[d.etape as Etape] ?? 'bg-gray-100 text-gray-700'}
              valeur={`${d.jours_inactif} jours`}
              valeur_couleur={d.jours_inactif >= 30 ? 'text-red-600 font-bold' : d.jours_inactif >= 14 ? 'text-orange-500 font-semibold' : 'text-gray-500'}
            />
          ))
        )}
      </Section>

      {/* Section audiences urgentes */}
      <Section
        icon={<Calendar size={18} className="text-cabinet-blue" />}
        titre="Rappels audiences (J-15 et moins)"
        count={audiences.filter(a => a.jours_avant_audience <= 15).length}
        couleur="blue"
      >
        {audiences.filter(a => a.jours_avant_audience <= 15).length === 0 ? (
          <Vide texte="Aucun rappel audience urgent" />
        ) : (
          audiences.filter(a => a.jours_avant_audience <= 15).map(a => (
            <LigneAlerte
              key={a.id}
              href={`/dossiers/${a.id}`}
              titre={a.client_nom}
              sous_titre={`${a.nature} • ${a.tribunal ?? 'Tribunal non précisé'}`}
              badge_label={new Date(a.date_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              badge_couleur="bg-blue-100 text-blue-700"
              valeur={joursLabel(a.jours_avant_audience)}
              valeur_couleur={couleurJours(a.jours_avant_audience)}
              extra={
                <div className="flex gap-2 mt-1">
                  {!a.rappel_j15_envoye && a.jours_avant_audience <= 15 && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">J-15 à envoyer</span>
                  )}
                  {!a.rappel_j2_envoye && a.jours_avant_audience <= 2 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">⚠ J-2 URGENT</span>
                  )}
                </div>
              }
            />
          ))
        )}
      </Section>

      {/* Section expertises à venir */}
      <Section
        icon={<FileWarning size={18} className="text-purple-500" />}
        titre="Expertises à préparer (J-7 et moins)"
        count={expertises.filter(e => e.jours_avant_expertise <= 7).length}
        couleur="purple"
      >
        {expertises.filter(e => e.jours_avant_expertise <= 7).length === 0 ? (
          <Vide texte="Aucune expertise imminente" />
        ) : (
          expertises.filter(e => e.jours_avant_expertise <= 7).map(e => (
            <LigneAlerte
              key={e.id}
              href={`/dossiers/${e.dossier_id}`}
              titre={e.client_nom ?? 'Client'}
              sous_titre={`${e.type_expertise ?? 'Expertise'} • ${e.expert_nom ?? 'Expert non désigné'}`}
              badge_label={new Date(e.date_expertise).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              badge_couleur="bg-purple-100 text-purple-700"
              valeur={joulsLabel(e.jours_avant_expertise)}
              valeur_couleur={couleurJours(e.jours_avant_expertise)}
              extra={
                <span className="text-xs text-gray-400 mt-1 block">Checklist client à envoyer J-7</span>
              }
            />
          ))
        )}
      </Section>

      {/* Toutes les audiences à venir */}
      {audiences.filter(a => a.jours_avant_audience > 15).length > 0 && (
        <Section
          icon={<Scale size={18} className="text-gray-500" />}
          titre="Audiences planifiées (dans plus de 15j)"
          count={audiences.filter(a => a.jours_avant_audience > 15).length}
          couleur="gray"
          collapsed
        >
          {audiences.filter(a => a.jours_avant_audience > 15).map(a => (
            <LigneAlerte
              key={a.id}
              href={`/dossiers/${a.id}`}
              titre={a.client_nom}
              sous_titre={`${a.nature} • ${a.tribunal ?? ''}`}
              badge_label={new Date(a.date_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              badge_couleur="bg-gray-100 text-gray-600"
              valeur={joulsLabel(a.jours_avant_audience)}
              valeur_couleur="text-gray-400"
            />
          ))}
        </Section>
      )}
    </div>
  )
}

function joulsLabel(j: number) {
  return joursLabel(j)
}

function Section({ icon, titre, count, couleur, children, collapsed = false }: {
  icon: React.ReactNode
  titre: string
  count: number
  couleur: string
  children: React.ReactNode
  collapsed?: boolean
}) {
  const [open, setOpen] = useState(!collapsed)
  const borderColors: Record<string, string> = {
    orange: 'border-orange-200',
    blue: 'border-blue-200',
    purple: 'border-purple-200',
    gray: 'border-gray-200',
  }
  return (
    <div className={`card mb-6 border-t-4 ${borderColors[couleur] ?? 'border-gray-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between mb-1"
      >
        <h2 className="font-semibold flex items-center gap-2">
          {icon}
          {titre}
          {count > 0 && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{count}</span>
          )}
        </h2>
        <ChevronRight size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="mt-4 space-y-2">{children}</div>}
    </div>
  )
}

function LigneAlerte({ href, titre, sous_titre, badge_label, badge_couleur, valeur, valeur_couleur, extra }: {
  href: string
  titre: string
  sous_titre: string
  badge_label: string
  badge_couleur: string
  valeur: string
  valeur_couleur: string
  extra?: React.ReactNode
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{titre}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${badge_couleur}`}>{badge_label}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{sous_titre}</div>
          {extra}
        </div>
        <div className={`text-sm ml-4 whitespace-nowrap ${valeur_couleur}`}>{valeur}</div>
      </div>
    </Link>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p className="text-gray-400 text-sm text-center py-4">{texte}</p>
}

export const dynamic = 'force-dynamic'
