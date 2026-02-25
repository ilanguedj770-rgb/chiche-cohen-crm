'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckSquare, Plus, X, Clock, AlertTriangle, ChevronRight, Check, User, Calendar } from 'lucide-react'
import Link from 'next/link'

const STATUT_LABELS: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' }
const STATUT_COLORS: Record<string, string> = { a_faire: 'bg-gray-100 text-gray-600', en_cours: 'bg-blue-100 text-blue-700', terminee: 'bg-green-100 text-green-700', annulee: 'bg-gray-100 text-gray-400' }
const PRIO_COLORS: Record<string, string> = { urgente: 'text-red-500', haute: 'text-orange-500', normale: 'text-gray-400', basse: 'text-blue-400' }
const PRIO_DOTS: Record<string, string> = { urgente: 'bg-red-500', haute: 'bg-orange-400', normale: 'bg-gray-300', basse: 'bg-blue-300' }

type Filtre = 'actives' | 'a_faire' | 'en_cours' | 'terminee' | 'toutes'

export default function TachesPage() {
  const [taches, setTaches] = useState<any[]>([])
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('actives')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', priorite: 'normale', date_echeance: '', assignee_id: '', dossier_id: '' })

  const load = async () => {
    const [{ data: t }, { data: u }, { data: d }] = await Promise.all([
      supabase.from('taches').select('*, assignee:utilisateurs(nom, prenom), dossier:dossiers(reference, client:clients(nom, prenom))').order('date_echeance', { ascending: true, nullsFirst: false }),
      supabase.from('utilisateurs').select('id, nom, prenom').eq('actif', true).order('nom'),
      supabase.from('dossiers').select('id, reference, client:clients(nom, prenom)').neq('etape', 'archive').order('reference'),
    ])
    if (t) setTaches(t)
    if (u) setUtilisateurs(u)
    if (d) setDossiers(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtrees = useMemo(() => taches.filter(t => {
    if (filtre === 'actives') return t.statut === 'a_faire' || t.statut === 'en_cours'
    if (filtre === 'toutes') return true
    return t.statut === filtre
  }), [taches, filtre])

  const enRetard = taches.filter(t => t.date_echeance && new Date(t.date_echeance) < new Date() && t.statut !== 'terminee' && t.statut !== 'annulee')

  const changerStatut = async (id: string, statut: string) => {
    await supabase.from('taches').update({ statut, date_completee: statut === 'terminee' ? new Date().toISOString() : null }).eq('id', id)
    await load()
  }

  const creer = async () => {
    if (!form.titre.trim()) return
    setSaving(true)
    await supabase.from('taches').insert({ ...form, assignee_id: form.assignee_id || null, dossier_id: form.dossier_id || null, date_echeance: form.date_echeance || null })
    setForm({ titre: '', description: '', priorite: 'normale', date_echeance: '', assignee_id: '', dossier_id: '' })
    setShowModal(false)
    setSaving(false)
    await load()
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CheckSquare size={22} className="text-cabinet-blue" />Tâches</h1>
          <p className="text-gray-500 text-sm mt-1">
            {taches.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours').length} tâche{taches.filter(t => t.statut !== 'terminee').length > 1 ? 's' : ''} en cours
            {enRetard.length > 0 && <span className="text-red-500 font-medium ml-2">• {enRetard.length} en retard</span>}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} />Nouvelle tâche</button>
      </div>

      {/* Stats cliquables */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {([
          ['actives', 'Actives', taches.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours').length, 'text-blue-600 bg-blue-50'],
          ['a_faire', 'À faire', taches.filter(t => t.statut === 'a_faire').length, 'text-gray-600 bg-gray-50'],
          ['en_cours', 'En cours', taches.filter(t => t.statut === 'en_cours').length, 'text-blue-600 bg-blue-50'],
          ['terminee', 'Terminées', taches.filter(t => t.statut === 'terminee').length, 'text-green-600 bg-green-50'],
        ] as [Filtre, string, number, string][]).map(([v, l, count, cls]) => (
          <button key={v} onClick={() => setFiltre(v)}
            className={`card text-center cursor-pointer hover:shadow-md transition-all ${filtre === v ? 'ring-2 ring-cabinet-blue' : ''}`}>
            <div className={`text-2xl font-bold ${cls.split(' ')[0]}`}>{count}</div>
            <div className="text-xs text-gray-400 mt-1">{l}</div>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="card text-center py-16 text-gray-300">
          <CheckSquare size={40} className="mx-auto mb-3" />
          <p>Aucune tâche dans ce filtre</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtrees.map(t => {
            const retard = t.date_echeance && new Date(t.date_echeance) < new Date() && t.statut !== 'terminee'
            return (
              <div key={t.id} className={`card flex items-center gap-4 py-3 transition-all ${t.statut === 'terminee' ? 'opacity-50' : ''}`}>
                {/* Checkbox statut */}
                <button onClick={() => changerStatut(t.id, t.statut === 'terminee' ? 'a_faire' : 'terminee')}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.statut === 'terminee' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                  {t.statut === 'terminee' && <Check size={12} className="text-white" />}
                </button>

                {/* Dot priorité */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIO_DOTS[t.priorite]}`} title={t.priorite} />

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${t.statut === 'terminee' ? 'line-through text-gray-400' : ''}`}>{t.titre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS[t.statut]}`}>{STATUT_LABELS[t.statut]}</span>
                    {retard && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">⚠ En retard</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    {t.dossier && (
                      <Link href={`/dossiers/${t.dossier_id}`} className="hover:text-cabinet-blue flex items-center gap-1">
                        <span className="font-mono">{t.dossier.reference}</span>
                        <span>— {t.dossier.client?.nom} {t.dossier.client?.prenom}</span>
                      </Link>
                    )}
                    {t.assignee && <span className="flex items-center gap-1"><User size={10} />{t.assignee.prenom} {t.assignee.nom}</span>}
                    {t.date_echeance && (
                      <span className={`flex items-center gap-1 ${retard ? 'text-red-500 font-medium' : ''}`}>
                        <Calendar size={10} />
                        {new Date(t.date_echeance + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 mt-1 truncate">{t.description}</p>}
                </div>

                {/* Changer statut rapidement */}
                {t.statut === 'a_faire' && (
                  <button onClick={() => changerStatut(t.id, 'en_cours')}
                    className="flex-shrink-0 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                    Démarrer
                  </button>
                )}
                {t.statut === 'en_cours' && (
                  <button onClick={() => changerStatut(t.id, 'terminee')}
                    className="flex-shrink-0 px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                    Terminer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Nouvelle tâche</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Titre *</label>
                <input autoFocus value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                  className="input-field" placeholder="Ex: Envoyer pièces justificatives à l'assureur" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field" rows={2} placeholder="Détails optionnels..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Priorité</label>
                  <select value={form.priorite} onChange={e => setForm(p => ({ ...p, priorite: e.target.value }))} className="input-field">
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Échéance</label>
                  <input type="date" value={form.date_echeance} onChange={e => setForm(p => ({ ...p, date_echeance: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Assigné à</label>
                <select value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))} className="input-field">
                  <option value="">— Non assigné —</option>
                  {utilisateurs.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Dossier lié</label>
                <select value={form.dossier_id} onChange={e => setForm(p => ({ ...p, dossier_id: e.target.value }))} className="input-field">
                  <option value="">— Aucun dossier —</option>
                  {dossiers.map(d => <option key={d.id} value={d.id}>{d.reference} — {d.client?.nom} {d.client?.prenom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={creer} disabled={saving || !form.titre.trim()} className="btn-primary flex-1">
                {saving ? 'Création...' : 'Créer la tâche'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
