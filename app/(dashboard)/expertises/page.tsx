'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Stethoscope, Calendar, User, Plus, X, Save, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const TYPE_EXPERTISE = [
  { value: 'amiable', label: 'Expertise amiable' },
  { value: 'judiciaire', label: 'Expertise judiciaire' },
  { value: 'contra_expertisse', label: 'Contre-expertise' },
  { value: 'suivi', label: 'Expertise de suivi' },
]

type Filtre = 'a_venir' | 'passees' | 'toutes'

export default function ExpertisesPage() {
  const [expertises, setExpertises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('a_venir')
  const [showModal, setShowModal] = useState(false)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    dossier_id: '', type_expertise: 'amiable', date_expertise: '', heure: '10:00',
    lieu_expertise: '', expert_nom: '', medecin_conseil_victime: '', notes: ''
  })

  async function load() {
    const now = new Date().toISOString().split('T')[0]
    let q = supabase.from('expertises')
      .select(`*, dossiers(id, reference, client:clients(nom, prenom))`)
      .order('date_expertise', { ascending: filtre !== 'passees', nullsFirst: false })

    if (filtre === 'a_venir') q = q.gte('date_expertise', now)
    else if (filtre === 'passees') q = q.lt('date_expertise', now)

    const { data } = await q.limit(60)
    if (data) setExpertises(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filtre])

  useEffect(() => {
    supabase.from('dossiers')
      .select('id, reference, client:clients(nom, prenom)')
      .not('etape', 'in', '(archive,encaissement)')
      .order('reference')
      .then(({ data }) => { if (data) setDossiers(data) })
  }, [])

  const ajouter = async () => {
    if (!form.dossier_id || !form.date_expertise) return
    setSaving(true)
    const dateTime = form.heure ? `${form.date_expertise}T${form.heure}:00` : form.date_expertise
    await supabase.from('expertises').insert({
      dossier_id: form.dossier_id,
      type_expertise: form.type_expertise,
      date_expertise: dateTime,
      lieu_expertise: form.lieu_expertise || null,
      expert_nom: form.expert_nom || null,
      medecin_conseil_victime: form.medecin_conseil_victime || null,
      notes: form.notes || null,
    })
    await load()
    setSaving(false)
    setShowModal(false)
    setForm({ dossier_id: '', type_expertise: 'amiable', date_expertise: '', heure: '10:00', lieu_expertise: '', expert_nom: '', medecin_conseil_victime: '', notes: '' })
  }

  // Stats
  const now = new Date()
  const urgentes = expertises.filter(e => {
    if (!e.date_expertise) return false
    const j = Math.ceil((new Date(e.date_expertise).getTime() - now.getTime()) / 86400000)
    return j >= 0 && j <= 7
  })

  // Grouper par mois
  const parMois: Record<string, any[]> = {}
  expertises.forEach(e => {
    if (!e.date_expertise) { const k = 'Non datées'; if (!parMois[k]) parMois[k] = []; parMois[k].push(e); return }
    const mois = new Date(e.date_expertise).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!parMois[mois]) parMois[mois] = []
    parMois[mois].push(e)
  })

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Expertises</h1>
          <p className="text-gray-500 text-sm mt-1">
            {expertises.length} expertise{expertises.length > 1 ? 's' : ''}
            {filtre === 'a_venir' && urgentes.length > 0 && (
              <span className="text-red-500 font-medium ml-2">• {urgentes.length} urgente{urgentes.length > 1 ? 's' : ''} (≤ 7j)</span>
            )}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouvelle expertise
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {([['a_venir', '📅 À venir'], ['passees', '✓ Passées'], ['toutes', 'Toutes']] as [Filtre, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setFiltre(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtre === v ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      {expertises.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p>{filtre === 'a_venir' ? 'Aucune expertise à venir' : 'Aucune expertise'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(parMois).map(([mois, liste]) => (
            <div key={mois}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 capitalize">{mois}</h3>
              <div className="space-y-2">
                {liste.map(e => {
                  const jours = e.date_expertise ? Math.ceil((new Date(e.date_expertise).getTime() - now.getTime()) / 86400000) : null
                  const passe = jours !== null && jours < 0
                  const urgente = jours !== null && !passe && jours <= 7
                  const borderColor = !e.date_expertise || passe ? 'border-gray-200' : jours! <= 2 ? 'border-red-400' : jours! <= 7 ? 'border-orange-400' : 'border-cabinet-blue'

                  return (
                    <div key={e.id} className={`card flex items-center gap-5 border-l-4 ${borderColor} ${passe ? 'opacity-70' : ''}`}>
                      {/* Compte à rebours */}
                      <div className={`text-center w-14 flex-shrink-0 ${passe ? 'text-gray-400' : !jours ? 'text-gray-400' : jours <= 2 ? 'text-red-500' : jours <= 7 ? 'text-orange-500' : 'text-cabinet-blue'}`}>
                        {passe
                          ? <><CheckCircle size={20} className="mx-auto mb-0.5" /><div className="text-xs">Passée</div></>
                          : jours !== null
                            ? <><div className="text-2xl font-bold leading-none">J-{jours}</div><div className="text-xs mt-0.5">jours</div></>
                            : <><Clock size={20} className="mx-auto mb-0.5" /><div className="text-xs">À dater</div></>
                        }
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{e.dossiers?.client?.nom} {e.dossiers?.client?.prenom}</span>
                          <span className="badge bg-blue-100 text-blue-700 text-xs">{TYPE_EXPERTISE.find(t => t.value === e.type_expertise)?.label ?? e.type_expertise}</span>
                          {urgente && <span className="badge bg-red-100 text-red-600 text-xs">Urgent</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {e.date_expertise
                            ? new Date(e.date_expertise).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' • ' + new Date(e.date_expertise).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : 'Date non définie'
                          }
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {e.lieu_expertise && <span className="text-xs text-gray-400">📍 {e.lieu_expertise}</span>}
                          {e.expert_nom && <span className="text-xs text-gray-400">Dr {e.expert_nom}</span>}
                          {e.medecin_conseil_victime && <span className="text-xs text-gray-400">Médecin conseil: {e.medecin_conseil_victime}</span>}
                        </div>
                        {/* Résultats si passée */}
                        {passe && (e.taux_dfp || e.duree_itt_jours || e.quantum_doloris) && (
                          <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                            {e.taux_dfp && <span className="text-xs font-medium text-gray-600">DFP: <span className="text-cabinet-blue">{e.taux_dfp}%</span></span>}
                            {e.duree_itt_jours && <span className="text-xs font-medium text-gray-600">ITT: <span className="text-cabinet-blue">{e.duree_itt_jours}j</span></span>}
                            {e.quantum_doloris && <span className="text-xs font-medium text-gray-600">QD: <span className="text-cabinet-blue">{e.quantum_doloris}/7</span></span>}
                            {e.prejudice_esthetique && <span className="text-xs font-medium text-gray-600">PE: <span className="text-cabinet-blue">{e.prejudice_esthetique}/7</span></span>}
                          </div>
                        )}
                      </div>

                      {/* Ref dossier */}
                      <div className="flex-shrink-0">
                        <Link href={`/dossiers/${e.dossiers?.id}`} className="text-xs font-mono text-cabinet-blue hover:underline flex items-center gap-1">
                          {e.dossiers?.reference} <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold">Nouvelle expertise</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Dossier *</label>
                <select value={form.dossier_id} onChange={e => setForm(f => ({ ...f, dossier_id: e.target.value }))} className="input-field">
                  <option value="">— Sélectionner —</option>
                  {dossiers.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.reference} — {d.client?.nom} {d.client?.prenom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Type d'expertise</label>
                <select value={form.type_expertise} onChange={e => setForm(f => ({ ...f, type_expertise: e.target.value }))} className="input-field">
                  {TYPE_EXPERTISE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date *</label>
                  <input type="date" value={form.date_expertise} onChange={e => setForm(f => ({ ...f, date_expertise: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                  <input type="time" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Lieu</label>
                <input value={form.lieu_expertise} onChange={e => setForm(f => ({ ...f, lieu_expertise: e.target.value }))} className="input-field" placeholder="Adresse du cabinet médical..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Médecin expert</label>
                  <input value={form.expert_nom} onChange={e => setForm(f => ({ ...f, expert_nom: e.target.value }))} className="input-field" placeholder="Dr Dupont..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Médecin conseil victime</label>
                  <input value={form.medecin_conseil_victime} onChange={e => setForm(f => ({ ...f, medecin_conseil_victime: e.target.value }))} className="input-field" placeholder="Dr Martin..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={ajouter} disabled={saving || !form.dossier_id || !form.date_expertise} className="btn-primary flex items-center gap-2">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Plus size={14} /> Ajouter</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
