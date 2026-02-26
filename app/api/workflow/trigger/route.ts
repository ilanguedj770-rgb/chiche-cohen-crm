import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Etape } from '@/lib/types'
import type { WorkflowAction } from '@/lib/workflow-rules'

// Supabase client server-side (service role si dispo, sinon anon)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TriggerPayload {
  dossier_id: string
  etape_source: Etape
  etape_cible: Etape
  dossier: {
    juriste_id?: string
    avocat_id?: string
    client_id?: string
    voie?: string
    reference?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TriggerPayload = await request.json()
    const { dossier_id, etape_source, etape_cible, dossier } = body

    if (!dossier_id || !etape_source || !etape_cible) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Lire les règles actives depuis la base de données
    const { data: allRules, error: rulesError } = await supabaseAdmin
      .from('workflow_rules')
      .select('*')
      .eq('etape_source', etape_source)
      .eq('etape_cible', etape_cible)
      .eq('actif', true)

    if (rulesError) {
      // Table peut ne pas encore exister → retourner 0 actions sans erreur
      return NextResponse.json({ actions_executees: 0, taches_creees: [], relances_creees: [], notes_creees: [] })
    }

    // Filtrer selon la condition (voie du dossier)
    const rules = (allRules ?? []).filter((rule) => {
      if (rule.condition === 'voie_judiciaire' && dossier.voie !== 'judiciaire') return false
      if (rule.condition === 'voie_amiable' && dossier.voie === 'judiciaire') return false
      return true
    })

    if (rules.length === 0) {
      return NextResponse.json({ actions_executees: 0, taches_creees: [], relances_creees: [], notes_creees: [] })
    }

    const tachesCreees: string[] = []
    const relancesCreees: string[] = []
    const notesCreees: string[] = []

    for (const rule of rules) {
      const actions: WorkflowAction[] = Array.isArray(rule.actions) ? rule.actions : []

      for (const action of actions) {
        if (action.type === 'creer_tache') {
          const dateEcheance = new Date()
          dateEcheance.setDate(dateEcheance.getDate() + action.delai_jours)

          let assignee_id: string | null = null
          if (action.assigner_a === 'juriste' && dossier.juriste_id) {
            assignee_id = dossier.juriste_id
          } else if (action.assigner_a === 'avocat' && dossier.avocat_id) {
            assignee_id = dossier.avocat_id
          }

          const { data, error } = await supabaseAdmin
            .from('taches')
            .insert({
              dossier_id,
              titre: action.titre,
              description: action.description ?? null,
              priorite: action.priorite,
              statut: 'a_faire',
              date_echeance: dateEcheance.toISOString().split('T')[0],
              assignee_id,
            })
            .select('id, titre')
            .single()

          if (!error && data) tachesCreees.push(data.titre)
        }

        if (action.type === 'creer_relance') {
          const { data, error } = await supabaseAdmin
            .from('relances')
            .insert({
              dossier_id,
              client_id: dossier.client_id ?? null,
              type: action.type_relance,
              motif: action.motif,
              statut: 'planifiee',
            })
            .select('id, motif')
            .single()

          if (!error && data) relancesCreees.push(data.motif)
        }

        if (action.type === 'ajouter_note') {
          const { data, error } = await supabaseAdmin
            .from('notes')
            .insert({
              dossier_id,
              contenu: action.contenu,
              type: 'note',
            })
            .select('id')
            .single()

          if (!error && data) notesCreees.push(data.id)
        }
      }
    }

    // Note de log dans le dossier
    const totalActions = tachesCreees.length + relancesCreees.length + notesCreees.length
    if (totalActions > 0) {
      const lignes: string[] = []
      if (tachesCreees.length > 0) {
        lignes.push(`📋 ${tachesCreees.length} tâche(s) créée(s) :`)
        tachesCreees.forEach((t) => lignes.push(`  • ${t}`))
      }
      if (relancesCreees.length > 0) {
        lignes.push(`🔔 ${relancesCreees.length} relance(s) créée(s) :`)
        relancesCreees.forEach((r) => lignes.push(`  • ${r}`))
      }
      await supabaseAdmin.from('notes').insert({
        dossier_id,
        contenu: `🤖 Automatisation déclenchée (${etape_source} → ${etape_cible})\n${lignes.join('\n')}`,
        type: 'note',
      })
    }

    return NextResponse.json({
      actions_executees: totalActions,
      taches_creees: tachesCreees,
      relances_creees: relancesCreees,
      notes_creees: notesCreees,
    })
  } catch (error) {
    console.error('Workflow trigger error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
