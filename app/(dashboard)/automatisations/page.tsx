'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WORKFLOW_RULES, type WorkflowRule } from '@/lib/workflow-rules'
import { ETAPES_LABELS, ETAPES_COULEURS } from '@/lib/types'
import { Zap, CheckSquare, Bell, FileText, ChevronRight, Clock, Bot } from 'lucide-react'

function ActionIcon({ type }: { type: string }) {
  if (type === 'creer_tache') return <CheckSquare size={13} className="text-blue-500" />
  if (type === 'creer_relance') return <Bell size={13} className="text-orange-500" />
  if (type === 'ajouter_note') return <FileText size={13} className="text-gray-500" />
  return null
}

function ActionLabel({ type }: { type: string }) {
  if (type === 'creer_tache') return <span className="text-blue-600 font-medium">Tâche</span>
  if (type === 'creer_relance') return <span className="text-orange-600 font-medium">Relance</span>
  if (type === 'ajouter_note') return <span className="text-gray-600 font-medium">Note</span>
  return null
}

function PrioriteTag({ priorite }: { priorite: string }) {
  const colors: Record<string, string> = {
    urgente: 'bg-red-100 text-red-700',
    haute: 'bg-orange-100 text-orange-700',
    normale: 'bg-blue-100 text-blue-700',
    basse: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[priorite] ?? 'bg-gray-100 text-gray-600'}`}>
      {priorite}
    </span>
  )
}

interface LogEntry {
  id: string
  contenu: string
  created_at: string
  dossier_id: string
  dossier_reference?: string
  client_nom?: string
}

export default function AutomatisationsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [statsTotal, setStatsTotal] = useState(0)
  const [statsThisMonth, setStatsThisMonth] = useState(0)

  useEffect(() => {
    async function loadLogs() {
      // Chercher les notes d'automatisation (celles qui commencent par l'emoji robot)
      const { data } = await supabase
        .from('notes')
        .select('id, contenu, created_at, dossier_id')
        .ilike('contenu', '🤖%')
        .order('created_at', { ascending: false })
        .limit(30)

      if (data && data.length > 0) {
        // Enrichir avec les infos dossier
        const dossierIds = [...new Set(data.map((n) => n.dossier_id))]
        const { data: dossiers } = await supabase
          .from('dossiers')
          .select('id, reference, client_id')
          .in('id', dossierIds)

        const clientIds = dossiers ? [...new Set(dossiers.map((d: any) => d.client_id))] : []
        const { data: clients } = clientIds.length
          ? await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
          : { data: [] }

        const dossiersMap = new Map((dossiers ?? []).map((d: any) => [d.id, d]))
        const clientsMap = new Map((clients ?? []).map((c: any) => [c.id, c]))

        const enriched: LogEntry[] = data.map((n) => {
          const dossier = dossiersMap.get(n.dossier_id)
          const client = dossier ? clientsMap.get(dossier.client_id) : null
          return {
            ...n,
            dossier_reference: dossier?.reference,
            client_nom: client ? `${client.nom} ${client.prenom}` : undefined,
          }
        })
        setLogs(enriched)

        const firstOfMonth = new Date()
        firstOfMonth.setDate(1)
        firstOfMonth.setHours(0, 0, 0, 0)
        setStatsTotal(data.length)
        setStatsThisMonth(
          data.filter((n) => new Date(n.created_at) >= firstOfMonth).length
        )
      }
      setLoadingLogs(false)
    }
    loadLogs()
  }, [])

  const reglesParTransition = WORKFLOW_RULES.reduce<Record<string, WorkflowRule[]>>((acc, rule) => {
    const key = `${rule.etape_source}__${rule.etape_cible}`
    if (!acc[key]) acc[key] = []
    acc[key].push(rule)
    return acc
  }, {})

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Extraire le résumé d'une note d'automatisation
  function resumeLog(contenu: string) {
    const lines = contenu.split('\n')
    return lines[0] // première ligne = "🤖 Automatisation déclenchée (x → y)"
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Zap size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatisations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Règles déclenchées automatiquement lors du changement d'étape d'un dossier
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{WORKFLOW_RULES.filter((r) => r.actif).length}</div>
          <div className="text-sm text-gray-500 mt-0.5">Règles actives</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-violet-600">{statsThisMonth}</div>
          <div className="text-sm text-gray-500 mt-0.5">Déclenchements ce mois</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{statsTotal}</div>
          <div className="text-sm text-gray-500 mt-0.5">Total déclenchements</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Règles */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Règles configurées</h2>

          {Object.entries(reglesParTransition).map(([key, rules]) => {
            const [src, cible] = key.split('__')
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Transition header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className={`badge ${ETAPES_COULEURS[src as keyof typeof ETAPES_COULEURS] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ETAPES_LABELS[src as keyof typeof ETAPES_LABELS] ?? src}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className={`badge ${ETAPES_COULEURS[cible as keyof typeof ETAPES_COULEURS] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ETAPES_LABELS[cible as keyof typeof ETAPES_LABELS] ?? cible}
                  </span>
                  {rules[0]?.condition && (
                    <span className="ml-auto text-xs text-gray-400 italic">
                      {rules[0].condition === 'voie_judiciaire' ? '⚖️ Voie judiciaire' : '🤝 Voie amiable'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="divide-y divide-gray-50">
                  {rules.map((rule) =>
                    rule.actions.map((action, i) => (
                      <div key={`${rule.id}-${i}`} className="px-4 py-3 flex items-start gap-3">
                        <div className="mt-0.5">
                          <ActionIcon type={action.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ActionLabel type={action.type} />
                            <span className="text-sm text-gray-800">
                              {action.type === 'creer_tache' && action.titre}
                              {action.type === 'creer_relance' && action.motif}
                              {action.type === 'ajouter_note' && action.contenu}
                            </span>
                          </div>
                          {action.type === 'creer_tache' && (
                            <div className="flex items-center gap-2 mt-1">
                              <PrioriteTag priorite={action.priorite} />
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={11} />
                                J+{action.delai_jours}
                              </span>
                              <span className="text-xs text-gray-400">
                                → {action.assigner_a === 'juriste' ? 'Juriste' : action.assigner_a === 'avocat' ? 'Avocat' : '—'}
                              </span>
                            </div>
                          )}
                          {action.type === 'creer_relance' && (
                            <div className="mt-1">
                              <span className="text-xs text-gray-400 capitalize">{action.type_relance}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Journal */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Journal des déclenchements</h2>

          {loadingLogs ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <Bot size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun déclenchement pour l'instant.</p>
              <p className="text-xs text-gray-400 mt-1">Les automatisations se déclencheront au premier changement d'étape.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start gap-2">
                    <Bot size={15} className="text-violet-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 font-medium leading-snug">
                        {resumeLog(log.contenu)}
                      </p>
                      {log.client_nom && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {log.client_nom}
                          {log.dossier_reference && (
                            <span className="ml-1 font-mono text-gray-400">· {log.dossier_reference}</span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
