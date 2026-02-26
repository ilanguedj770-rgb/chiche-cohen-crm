'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WORKFLOW_RULES } from '@/lib/workflow-rules'
import { ETAPES_LABELS, ETAPES_COULEURS, type Etape } from '@/lib/types'
import type { WorkflowAction, ActionCreerTache, ActionCreerRelance, ActionAjouterNote } from '@/lib/workflow-rules'
import { Zap, Plus, Trash2, ChevronRight, CheckSquare, Bell, FileText, Bot, Save, X, ToggleLeft, ToggleRight, Download, Edit2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rule {
  id: string
  nom: string
  description: string
  etape_source: string
  etape_cible: string
  condition: string | null
  actif: boolean
  actions: WorkflowAction[]
  created_at: string
  updated_at: string
}

interface LogEntry {
  id: string
  contenu: string
  created_at: string
  dossier_id: string
  dossier_reference?: string
  client_nom?: string
}

const ETAPES_OPTIONS: { value: Etape; label: string }[] = [
  { value: 'qualification', label: 'Qualification' },
  { value: 'mandat', label: 'Mandat' },
  { value: 'constitution_dossier', label: 'Constitution dossier' },
  { value: 'expertise_amiable', label: 'Expertise amiable' },
  { value: 'offre_assureur', label: 'Offre assureur' },
  { value: 'negociation', label: 'Négociation' },
  { value: 'procedure_judiciaire', label: 'Procédure judiciaire' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'encaissement', label: 'Encaissement' },
  { value: 'archive', label: 'Archivé' },
]

const BLANK_TACHE: ActionCreerTache = {
  type: 'creer_tache',
  titre: '',
  description: '',
  priorite: 'normale',
  delai_jours: 7,
  assigner_a: 'juriste',
}

const BLANK_RELANCE: ActionCreerRelance = {
  type: 'creer_relance',
  type_relance: 'email',
  motif: '',
}

const BLANK_NOTE: ActionAjouterNote = {
  type: 'ajouter_note',
  contenu: '',
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ActionCard({
  action,
  onDelete,
}: {
  action: WorkflowAction
  onDelete: () => void
}) {
  const isTask = action.type === 'creer_tache'
  const isRelance = action.type === 'creer_relance'

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="mt-0.5 shrink-0">
        {isTask && <CheckSquare size={14} className="text-blue-500" />}
        {isRelance && <Bell size={14} className="text-orange-500" />}
        {action.type === 'ajouter_note' && <FileText size={14} className="text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isTask && (
            <>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Tâche</span>
              <span className="text-sm text-gray-800 font-medium">{(action as ActionCreerTache).titre}</span>
            </>
          )}
          {isRelance && (
            <>
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded capitalize">{(action as ActionCreerRelance).type_relance}</span>
              <span className="text-sm text-gray-800">{(action as ActionCreerRelance).motif}</span>
            </>
          )}
          {action.type === 'ajouter_note' && (
            <>
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Note</span>
              <span className="text-sm text-gray-800">{(action as ActionAjouterNote).contenu}</span>
            </>
          )}
        </div>
        {isTask && (
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span className={`px-1.5 py-0.5 rounded font-medium ${
              (action as ActionCreerTache).priorite === 'urgente' ? 'bg-red-100 text-red-700' :
              (action as ActionCreerTache).priorite === 'haute' ? 'bg-orange-100 text-orange-700' :
              (action as ActionCreerTache).priorite === 'normale' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {(action as ActionCreerTache).priorite}
            </span>
            <span>J+{(action as ActionCreerTache).delai_jours}</span>
            <span>→ {(action as ActionCreerTache).assigner_a === 'juriste' ? 'Juriste' : (action as ActionCreerTache).assigner_a === 'avocat' ? 'Avocat' : '—'}</span>
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
        title="Supprimer cette action"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Formulaire d'action ──────────────────────────────────────────────────────

function NewActionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (action: WorkflowAction) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<'creer_tache' | 'creer_relance' | 'ajouter_note'>('creer_tache')
  const [tache, setTache] = useState<ActionCreerTache>({ ...BLANK_TACHE })
  const [relance, setRelance] = useState<ActionCreerRelance>({ ...BLANK_RELANCE })
  const [note, setNote] = useState<ActionAjouterNote>({ ...BLANK_NOTE })

  const handleAdd = () => {
    if (type === 'creer_tache') {
      if (!tache.titre.trim()) return
      onAdd({ ...tache })
    } else if (type === 'creer_relance') {
      if (!relance.motif.trim()) return
      onAdd({ ...relance })
    } else {
      if (!note.contenu.trim()) return
      onAdd({ ...note })
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
      {/* Type selector */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1.5">Type d'action</label>
        <div className="flex gap-2">
          {(['creer_tache', 'creer_relance', 'ajouter_note'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                type === t
                  ? 'bg-cabinet-blue text-white border-cabinet-blue'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t === 'creer_tache' && <><CheckSquare size={12} />Tâche</>}
              {t === 'creer_relance' && <><Bell size={12} />Relance</>}
              {t === 'ajouter_note' && <><FileText size={12} />Note</>}
            </button>
          ))}
        </div>
      </div>

      {/* Tâche */}
      {type === 'creer_tache' && (
        <div className="space-y-2">
          <input
            placeholder="Titre de la tâche *"
            value={tache.titre}
            onChange={(e) => setTache((p) => ({ ...p, titre: e.target.value }))}
            className="input w-full"
          />
          <input
            placeholder="Description (optionnel)"
            value={tache.description ?? ''}
            onChange={(e) => setTache((p) => ({ ...p, description: e.target.value }))}
            className="input w-full"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Priorité</label>
              <select
                value={tache.priorite}
                onChange={(e) => setTache((p) => ({ ...p, priorite: e.target.value as any }))}
                className="input w-full"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 block mb-1">Délai (jours)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={tache.delai_jours}
                onChange={(e) => setTache((p) => ({ ...p, delai_jours: Number(e.target.value) }))}
                className="input w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Assigner à</label>
              <select
                value={tache.assigner_a}
                onChange={(e) => setTache((p) => ({ ...p, assigner_a: e.target.value as any }))}
                className="input w-full"
              >
                <option value="juriste">Juriste</option>
                <option value="avocat">Avocat</option>
                <option value="aucun">Non assigné</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Relance */}
      {type === 'creer_relance' && (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Type de relance</label>
            <select
              value={relance.type_relance}
              onChange={(e) => setRelance((p) => ({ ...p, type_relance: e.target.value as any }))}
              className="input w-full"
            >
              <option value="email">Email</option>
              <option value="telephone">Téléphone</option>
              <option value="courrier">Courrier</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <input
            placeholder="Motif / description *"
            value={relance.motif}
            onChange={(e) => setRelance((p) => ({ ...p, motif: e.target.value }))}
            className="input w-full"
          />
        </div>
      )}

      {/* Note */}
      {type === 'ajouter_note' && (
        <textarea
          placeholder="Contenu de la note *"
          value={note.contenu}
          onChange={(e) => setNote((p) => ({ ...p, contenu: e.target.value }))}
          rows={3}
          className="input w-full resize-none"
        />
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleAdd} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={14} /> Ajouter
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AutomatisationsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Rule> & { actions: WorkflowAction[] }>({
    nom: '',
    description: '',
    etape_source: 'qualification',
    etape_cible: 'mandat',
    condition: null,
    actif: true,
    actions: [],
  })
  const [isNew, setIsNew] = useState(false)
  const [showActionForm, setShowActionForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'regles' | 'journal'>('regles')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // ── Chargement ──────────────────────────────────────────────────────────────

  async function loadRules() {
    setLoading(true)
    const { data } = await supabase
      .from('workflow_rules')
      .select('*')
      .order('etape_source')
      .order('created_at')
    setRules(data ?? [])
    setLoading(false)
  }

  async function loadLogs() {
    setLoadingLogs(true)
    const { data } = await supabase
      .from('notes')
      .select('id, contenu, created_at, dossier_id')
      .ilike('contenu', '🤖%')
      .order('created_at', { ascending: false })
      .limit(30)

    if (data && data.length > 0) {
      const dossierIds = [...new Set(data.map((n) => n.dossier_id))]
      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('id, reference, client_id')
        .in('id', dossierIds)
      const clientIds = dossiers ? [...new Set(dossiers.map((d: any) => d.client_id))] : []
      const { data: clients } = clientIds.length
        ? await supabase.from('clients').select('id, nom, prenom').in('id', clientIds)
        : { data: [] }
      const dm = new Map((dossiers ?? []).map((d: any) => [d.id, d]))
      const cm = new Map((clients ?? []).map((c: any) => [c.id, c]))
      setLogs(
        data.map((n) => {
          const dossier = dm.get(n.dossier_id)
          const client = dossier ? cm.get(dossier.client_id) : null
          return {
            ...n,
            dossier_reference: dossier?.reference,
            client_nom: client ? `${client.nom} ${client.prenom}` : undefined,
          }
        })
      )
    } else {
      setLogs([])
    }
    setLoadingLogs(false)
  }

  useEffect(() => {
    loadRules()
  }, [])

  useEffect(() => {
    if (activeTab === 'journal') loadLogs()
  }, [activeTab])

  // ── Sélection d'une règle ───────────────────────────────────────────────────

  function selectRule(rule: Rule) {
    setSelectedId(rule.id)
    setIsNew(false)
    setShowActionForm(false)
    setEditForm({
      nom: rule.nom,
      description: rule.description,
      etape_source: rule.etape_source,
      etape_cible: rule.etape_cible,
      condition: rule.condition,
      actif: rule.actif,
      actions: rule.actions ?? [],
    })
  }

  function openNew() {
    setSelectedId(null)
    setIsNew(true)
    setShowActionForm(false)
    setEditForm({
      nom: '',
      description: '',
      etape_source: 'qualification',
      etape_cible: 'mandat',
      condition: null,
      actif: true,
      actions: [],
    })
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async function toggleRule(rule: Rule) {
    await supabase.from('workflow_rules').update({ actif: !rule.actif }).eq('id', rule.id)
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, actif: !r.actif } : r)))
    if (selectedId === rule.id) setEditForm((f) => ({ ...f, actif: !f.actif }))
  }

  async function saveRule() {
    if (!editForm.nom?.trim()) return
    setSaving(true)
    const payload = {
      nom: editForm.nom,
      description: editForm.description ?? '',
      etape_source: editForm.etape_source,
      etape_cible: editForm.etape_cible,
      condition: editForm.condition ?? null,
      actif: editForm.actif ?? true,
      actions: editForm.actions,
    }
    if (isNew) {
      const { data } = await supabase.from('workflow_rules').insert(payload).select().single()
      if (data) {
        setRules((prev) => [...prev, data])
        setSelectedId(data.id)
        setIsNew(false)
      }
    } else if (selectedId) {
      const { data } = await supabase.from('workflow_rules').update(payload).eq('id', selectedId).select().single()
      if (data) {
        setRules((prev) => prev.map((r) => (r.id === selectedId ? data : r)))
      }
    }
    setSaving(false)
  }

  async function deleteRule() {
    if (!selectedId) return
    if (!confirm('Supprimer cette règle ? Les tâches et relances déjà créées ne seront pas affectées.')) return
    setDeleting(true)
    await supabase.from('workflow_rules').delete().eq('id', selectedId)
    setRules((prev) => prev.filter((r) => r.id !== selectedId))
    setSelectedId(null)
    setIsNew(false)
    setDeleting(false)
  }

  // ── Seed ────────────────────────────────────────────────────────────────────

  async function seedDefaultRules() {
    setSeeding(true)
    const toInsert = WORKFLOW_RULES.map((r) => ({
      nom: r.nom,
      description: r.description,
      etape_source: r.etape_source,
      etape_cible: r.etape_cible,
      condition: r.condition ?? null,
      actif: r.actif,
      actions: r.actions,
    }))
    await supabase.from('workflow_rules').insert(toInsert)
    await loadRules()
    setSeeding(false)
  }

  // ── Actions inline ──────────────────────────────────────────────────────────

  function addAction(action: WorkflowAction) {
    setEditForm((f) => ({ ...f, actions: [...(f.actions ?? []), action] }))
    setShowActionForm(false)
  }

  function removeAction(index: number) {
    setEditForm((f) => ({ ...f, actions: (f.actions ?? []).filter((_, i) => i !== index) }))
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function etapeLabel(e: string) {
    return ETAPES_LABELS[e as Etape] ?? e
  }

  function etapeColor(e: string) {
    return ETAPES_COULEURS[e as Etape] ?? 'bg-gray-100 text-gray-600'
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const selectedRule = rules.find((r) => r.id === selectedId)
  const hasPanel = isNew || selectedId !== null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automatisations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Actions automatiques déclenchées lors du changement d'étape d'un dossier
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && !loading && (
            <button
              onClick={seedDefaultRules}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <Download size={15} />
              {seeding ? 'Import…' : 'Importer les règles par défaut'}
            </button>
          )}
          <button
            onClick={openNew}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Nouvelle règle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-6">
        {(['regles', 'journal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-cabinet-blue text-cabinet-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'regles' ? `Règles${rules.length > 0 ? ` (${rules.length})` : ''}` : 'Journal'}
          </button>
        ))}
      </div>

      {/* ── Onglet Règles ── */}
      {activeTab === 'regles' && (
        <div className="flex gap-5 items-start">
          {/* Liste des règles */}
          <div className="w-72 shrink-0 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
              </div>
            ) : rules.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <Zap size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune règle configurée.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Importez les règles par défaut ou créez-en une.
                </p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => selectRule(rule)}
                  className={`bg-white rounded-xl border cursor-pointer transition-all p-3 ${
                    selectedId === rule.id
                      ? 'border-cabinet-blue ring-1 ring-cabinet-blue/20'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${rule.actif ? 'text-gray-900' : 'text-gray-400'}`}>
                        {rule.nom}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className={`badge text-xs ${etapeColor(rule.etape_source)}`}>
                          {etapeLabel(rule.etape_source)}
                        </span>
                        <ChevronRight size={10} className="text-gray-300" />
                        <span className={`badge text-xs ${etapeColor(rule.etape_cible)}`}>
                          {etapeLabel(rule.etape_cible)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {rule.actions?.length ?? 0} action{(rule.actions?.length ?? 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                    {/* Toggle actif */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRule(rule) }}
                      className="mt-0.5 shrink-0"
                      title={rule.actif ? 'Désactiver' : 'Activer'}
                    >
                      {rule.actif
                        ? <ToggleRight size={22} className="text-cabinet-blue" />
                        : <ToggleLeft size={22} className="text-gray-300" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panneau droit : éditeur */}
          {hasPanel ? (
            <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Header panneau */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  {isNew ? (
                    <><Plus size={16} className="text-violet-500" /> Nouvelle règle</>
                  ) : (
                    <><Edit2 size={16} className="text-violet-500" /> Modifier la règle</>
                  )}
                </h2>
                <button
                  onClick={() => { setSelectedId(null); setIsNew(false) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Champs principaux */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Nom de la règle *</label>
                    <input
                      value={editForm.nom ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))}
                      placeholder="Ex : Signature du mandat"
                      className="input w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <input
                      value={editForm.description ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Décrivez ce que fait cette règle…"
                      className="input w-full"
                    />
                  </div>

                  {/* Transition */}
                  <div>
                    <label className="label">Quand l'étape passe de</label>
                    <select
                      value={editForm.etape_source ?? 'qualification'}
                      onChange={(e) => setEditForm((f) => ({ ...f, etape_source: e.target.value }))}
                      className="input w-full"
                    >
                      {ETAPES_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">À l'étape</label>
                    <select
                      value={editForm.etape_cible ?? 'mandat'}
                      onChange={(e) => setEditForm((f) => ({ ...f, etape_cible: e.target.value }))}
                      className="input w-full"
                    >
                      {ETAPES_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="label">Condition (optionnel)</label>
                    <select
                      value={editForm.condition ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, condition: e.target.value || null }))}
                      className="input w-full"
                    >
                      <option value="">Toujours déclencher</option>
                      <option value="voie_judiciaire">Seulement si voie judiciaire</option>
                      <option value="voie_amiable">Seulement si voie amiable</option>
                    </select>
                  </div>

                  {/* Actif */}
                  <div className="flex flex-col justify-end">
                    <label className="label">Statut</label>
                    <button
                      onClick={() => setEditForm((f) => ({ ...f, actif: !f.actif }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        editForm.actif
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {editForm.actif
                        ? <><ToggleRight size={18} /> Règle active</>
                        : <><ToggleLeft size={18} /> Règle inactive</>}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label mb-0">
                      Actions à déclencher ({editForm.actions?.length ?? 0})
                    </label>
                  </div>

                  <div className="space-y-2 mb-3">
                    {(editForm.actions ?? []).length === 0 && !showActionForm && (
                      <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                        Aucune action. Cliquez sur "+ Ajouter" pour en créer une.
                      </p>
                    )}
                    {(editForm.actions ?? []).map((action, i) => (
                      <ActionCard
                        key={i}
                        action={action}
                        onDelete={() => removeAction(i)}
                      />
                    ))}
                  </div>

                  {showActionForm ? (
                    <NewActionForm
                      onAdd={addAction}
                      onCancel={() => setShowActionForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowActionForm(true)}
                      className="flex items-center gap-1.5 text-sm text-cabinet-blue hover:text-cabinet-blue/80 font-medium"
                    >
                      <Plus size={14} /> Ajouter une action
                    </button>
                  )}
                </div>

                {/* Boutons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button
                      onClick={saveRule}
                      disabled={saving || !editForm.nom?.trim()}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <Save size={14} />
                      {saving ? 'Sauvegarde…' : isNew ? 'Créer la règle' : 'Sauvegarder'}
                    </button>
                    <button
                      onClick={() => { setSelectedId(null); setIsNew(false) }}
                      className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                  </div>
                  {!isNew && (
                    <button
                      onClick={deleteRule}
                      disabled={deleting}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                      {deleting ? 'Suppression…' : 'Supprimer la règle'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20 text-center">
              <div>
                <Zap size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sélectionnez une règle pour la modifier</p>
                <p className="text-gray-300 text-xs mt-1">ou cliquez sur "Nouvelle règle"</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Journal ── */}
      {activeTab === 'journal' && (
        <div className="max-w-2xl">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <Bot size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucun déclenchement enregistré pour l'instant.</p>
              <p className="text-gray-300 text-xs mt-1">
                Les automatisations s'afficheront ici lors du premier changement d'étape.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium whitespace-pre-line leading-snug">
                        {log.contenu.split('\n')[0]}
                      </p>
                      {log.contenu.split('\n').slice(1).map((line, i) => (
                        <p key={i} className="text-xs text-gray-500 leading-relaxed">{line}</p>
                      ))}
                      {log.client_nom && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs text-gray-500">{log.client_nom}</span>
                          {log.dossier_reference && (
                            <span className="text-xs font-mono text-gray-400">· {log.dossier_reference}</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
