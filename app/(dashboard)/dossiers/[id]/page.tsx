'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type Dossier, type Client, type Etape, type Expertise, type Audience } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, Phone, Mail, Calendar, ChevronRight, Scale, Stethoscope, Euro, X, Save, Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const ETAPES_ORDRE: Etape[] = [
  'qualification', 'mandat', 'constitution_dossier', 'expertise_amiable',
  'offre_assureur', 'negociation', 'procedure_judiciaire', 'transaction', 'encaissement'
]

export default function DossierDetail() {
  const params = useParams()
  const id = params.id as string
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [expertises, setExpertises] = useState<Expertise[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'detail' | 'expertises' | 'audiences' | 'documents' | 'financier'>('detail')
  const [showExpertiseModal, setShowExpertiseModal] = useState(false)
  const [showAudienceModal, setShowAudienceModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const { data: d } = await supabase.from('dossiers').select('*').eq('id', id).single()
    if (d) {
      setDossier(d)
      const [{ data: c }, { data: e }, { data: a }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', d.client_id).single(),
        supabase.from('expertises').select('*').eq('dossier_id', id).order('date_expertise'),
        supabase.from('audiences').select('*').eq('dossier_id', id).order('date_audience'),
      ])
      if (c) setClient(c)
      if (e) setExpertises(e)
      if (a) setAudiences(a)
    }
    setLoading(false)
  }

  const avancerEtape = async () => {
    if (!dossier) return
    const idx = ETAPES_ORDRE.indexOf(dossier.etape)
    if (idx < ETAPES_ORDRE.length - 1) {
      const nouvelleEtape = ETAPES_ORDRE[idx + 1]
      const { data } = await supabase.from('dossiers').update({ etape: nouvelleEtape }).eq('id', id).select().single()
      if (data) setDossier(data)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!dossier || !client) return <div className="p-8 text-gray-500">Dossier introuvable</div>

  const idxEtape = ETAPES_ORDRE.indexOf(dossier.etape)

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dossiers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.nom} {client.prenom}</h1>
              <span className={`badge ${ETAPES_COULEURS[dossier.etape]}`}>{ETAPES_LABELS[dossier.etape]}</span>
              {dossier.voie === 'judiciaire' && <span className="badge bg-red-50 text-red-600">Judiciaire</span>}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm font-mono text-gray-400">{dossier.reference}</span>
              <span className="text-sm text-gray-400">{TYPE_ACCIDENT_LABELS[dossier.type_accident]}</span>
            </div>
          </div>
        </div>
        {idxEtape < ETAPES_ORDRE.length - 1 && (
          <button onClick={avancerEtape} className="btn-primary flex items-center gap-2">
            Passer à : {ETAPES_LABELS[ETAPES_ORDRE[idxEtape + 1]]}
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Timeline étapes */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {ETAPES_ORDRE.map((etape, i) => {
          const done = i < idxEtape
          const active = i === idxEtape
          return (
            <div key={etape} className="flex items-center gap-1 flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                active ? 'bg-cabinet-blue text-white' :
                done ? 'bg-cabinet-blue-light text-cabinet-blue' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done && '✓ '}{ETAPES_LABELS[etape]}
              </div>
              {i < ETAPES_ORDRE.length - 1 && (
                <div className={`w-6 h-0.5 ${done ? 'bg-cabinet-blue' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { id: 'detail', label: 'Détail' },
          { id: 'expertises', label: `Expertises (${expertises.length})` },
          { id: 'audiences', label: `Audiences (${audiences.length})` },
          { id: 'documents', label: 'Documents' },
          { id: 'financier', label: 'Financier' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-cabinet-blue text-cabinet-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglets */}
      {activeTab === 'detail' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-cabinet-blue-light rounded-full flex items-center justify-center text-xs text-cabinet-blue font-bold">C</span>
              Client
            </h3>
            <div className="space-y-3">
              <InfoRow icon={<Phone size={14} />} label="Téléphone" value={client.telephone} />
              <InfoRow icon={<Mail size={14} />} label="Email" value={client.email} />
              <InfoRow icon={<Calendar size={14} />} label="Naissance" value={client.date_naissance ? format(parseISO(client.date_naissance), 'd MMMM yyyy', { locale: fr }) : undefined} />
              <InfoRow label="Profession" value={client.profession} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Accident</h3>
            <div className="space-y-3">
              <InfoRow label="Type" value={TYPE_ACCIDENT_LABELS[dossier.type_accident]} />
              <InfoRow label="Date" value={dossier.date_accident ? format(parseISO(dossier.date_accident), 'd MMMM yyyy', { locale: fr }) : undefined} />
              <InfoRow label="Lieu" value={dossier.lieu_accident} />
              <InfoRow label="Assureur" value={dossier.assureur_nom} />
              <InfoRow label="Réf. sinistre" value={dossier.assureur_reference_sinistre} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Statut</h3>
            <div className="space-y-2 mb-4">
              <Flag label="Consolidation atteinte" active={dossier.consolidation_atteinte} />
              <Flag label="Refus de garantie" active={dossier.refus_garantie} danger />
              <Flag label="Procédure FGAO" active={dossier.procedure_fgao} />
              <Flag label="Procédure CIVI" active={dossier.procedure_civi} />
            </div>
            {dossier.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{dossier.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'expertises' && (
        <div className="space-y-4">
          {expertises.length === 0 && <EmptyState label="Aucune expertise enregistrée" />}
          {expertises.map(e => (
            <div key={e.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope size={16} className="text-purple-500" />
                  <span className="font-semibold capitalize">{e.type}</span>
                  {e.date_expertise && <span className="text-sm text-gray-400">{format(parseISO(e.date_expertise), 'd MMMM yyyy', { locale: fr })}</span>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <InfoRow label="Expert" value={e.expert_nom} />
                <InfoRow label="Médecin conseil" value={e.medecin_conseil_nom} />
                <InfoRow label="Lieu" value={e.lieu_expertise} />
                <InfoRow label="DFP" value={e.taux_dfp ? `${e.taux_dfp}%` : undefined} />
                <InfoRow label="ITT (jours)" value={e.duree_itt_jours?.toString()} />
                <InfoRow label="Quantum doloris" value={e.quantum_doloris ? `${e.quantum_doloris}/7` : undefined} />
                <InfoRow label="Préjudice esthétique" value={e.prejudice_esthetique ? `${e.prejudice_esthetique}/7` : undefined} />
              </div>
              {e.observations && <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">{e.observations}</div>}
            </div>
          ))}
          <button onClick={() => setShowExpertiseModal(true)} className="btn-secondary flex items-center gap-2">
            <Plus size={16} /> Ajouter une expertise
          </button>
        </div>
      )}

      {activeTab === 'audiences' && (
        <div className="space-y-4">
          {audiences.length === 0 && <EmptyState label="Aucune audience enregistrée" />}
          {audiences.map(a => (
            <div key={a.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Scale size={18} className="text-red-500" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{a.nature}</div>
                  <div className="text-sm text-gray-400">
                    {format(parseISO(a.date_audience), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    {a.tribunal && ` • ${a.tribunal}`}
                  </div>
                </div>
              </div>
              {a.resultat && <span className="badge bg-green-100 text-green-700">{a.resultat}</span>}
            </div>
          ))}
          <button onClick={() => setShowAudienceModal(true)} className="btn-secondary flex items-center gap-2">
            <Plus size={16} /> Ajouter une audience
          </button>
        </div>
      )}

      {activeTab === 'financier' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <Euro size={24} className="mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{formatEuro(dossier.offre_assureur)}</div>
            <div className="text-sm text-gray-500 mt-1">Offre assureur</div>
          </div>
          <div className="card text-center">
            <Euro size={24} className="mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{formatEuro(dossier.montant_reclame)}</div>
            <div className="text-sm text-gray-500 mt-1">Montant réclamé</div>
          </div>
          <div className="card text-center">
            <Euro size={24} className="mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{formatEuro(dossier.montant_obtenu)}</div>
            <div className="text-sm text-gray-500 mt-1">Montant obtenu</div>
          </div>
          {dossier.offre_assureur && dossier.montant_obtenu && (
            <div className="col-span-3 card bg-green-50 border-green-100">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  +{formatEuro(dossier.montant_obtenu - dossier.offre_assureur)}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  au-dessus de l&apos;offre initiale ({Math.round((dossier.montant_obtenu / dossier.offre_assureur - 1) * 100)}% de plus)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <EmptyState label="Gestion documentaire — disponible prochainement" />
      )}

      {/* Modal Expertise */}
      {showExpertiseModal && (
        <ExpertiseModal
          dossierId={id}
          onClose={() => setShowExpertiseModal(false)}
          onSaved={() => {
            setShowExpertiseModal(false)
            loadData()
          }}
        />
      )}

      {/* Modal Audience */}
      {showAudienceModal && (
        <AudienceModal
          dossierId={id}
          onClose={() => setShowAudienceModal(false)}
          onSaved={() => {
            setShowAudienceModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// ─── Modal Expertise ────────────────────────────────────────────────────────────

function ExpertiseModal({ dossierId, onClose, onSaved }: { dossierId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'amiable' as 'amiable' | 'judiciaire' | 'sapiteur',
    expert_nom: '',
    medecin_conseil_nom: '',
    medecin_conseil_telephone: '',
    date_expertise: '',
    heure_expertise: '',
    lieu_expertise: '',
    taux_dfp: '',
    duree_itt_jours: '',
    quantum_doloris: '',
    prejudice_esthetique: '',
    observations: '',
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('expertises').insert({
        dossier_id: dossierId,
        type: form.type,
        expert_nom: form.expert_nom || null,
        medecin_conseil_nom: form.medecin_conseil_nom || null,
        medecin_conseil_telephone: form.medecin_conseil_telephone || null,
        date_expertise: form.date_expertise || null,
        heure_expertise: form.heure_expertise || null,
        lieu_expertise: form.lieu_expertise || null,
        taux_dfp: form.taux_dfp ? parseFloat(form.taux_dfp) : null,
        duree_itt_jours: form.duree_itt_jours ? parseInt(form.duree_itt_jours) : null,
        quantum_doloris: form.quantum_doloris ? parseInt(form.quantum_doloris) : null,
        prejudice_esthetique: form.prejudice_esthetique ? parseInt(form.prejudice_esthetique) : null,
        observations: form.observations || null,
        rappel_j7_envoye: false,
        rappel_j2_envoye: false,
      })
      if (error) throw error
      onSaved()
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'ajout de l\'expertise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Stethoscope size={18} className="text-purple-500" />
            Nouvelle expertise
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Type d'expertise *">
              <select required value={form.type} onChange={e => set('type', e.target.value)} className="input">
                <option value="amiable">Amiable</option>
                <option value="judiciaire">Judiciaire</option>
                <option value="sapiteur">Sapiteur</option>
              </select>
            </ModalField>
            <ModalField label="Expert">
              <input type="text" value={form.expert_nom} onChange={e => set('expert_nom', e.target.value)} className="input" placeholder="Dr Martin" />
            </ModalField>
            <ModalField label="Médecin conseil">
              <input type="text" value={form.medecin_conseil_nom} onChange={e => set('medecin_conseil_nom', e.target.value)} className="input" placeholder="Dr Dupont" />
            </ModalField>
            <ModalField label="Tél. médecin conseil">
              <input type="tel" value={form.medecin_conseil_telephone} onChange={e => set('medecin_conseil_telephone', e.target.value)} className="input" placeholder="06 xx xx xx xx" />
            </ModalField>
            <ModalField label="Date">
              <input type="date" value={form.date_expertise} onChange={e => set('date_expertise', e.target.value)} className="input" />
            </ModalField>
            <ModalField label="Heure">
              <input type="time" value={form.heure_expertise} onChange={e => set('heure_expertise', e.target.value)} className="input" />
            </ModalField>
            <ModalField label="Lieu" className="col-span-2">
              <input type="text" value={form.lieu_expertise} onChange={e => set('lieu_expertise', e.target.value)} className="input" placeholder="Cabinet médical, adresse..." />
            </ModalField>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Résultats médicaux (si disponibles)</p>
            <div className="grid grid-cols-4 gap-4">
              <ModalField label="DFP (%)">
                <input type="number" min="0" max="100" step="0.5" value={form.taux_dfp} onChange={e => set('taux_dfp', e.target.value)} className="input" placeholder="0" />
              </ModalField>
              <ModalField label="ITT (jours)">
                <input type="number" min="0" value={form.duree_itt_jours} onChange={e => set('duree_itt_jours', e.target.value)} className="input" placeholder="0" />
              </ModalField>
              <ModalField label="Quantum doloris (0-7)">
                <input type="number" min="0" max="7" value={form.quantum_doloris} onChange={e => set('quantum_doloris', e.target.value)} className="input" placeholder="0" />
              </ModalField>
              <ModalField label="Préj. esthétique (0-7)">
                <input type="number" min="0" max="7" value={form.prejudice_esthetique} onChange={e => set('prejudice_esthetique', e.target.value)} className="input" placeholder="0" />
              </ModalField>
            </div>
          </div>

          <ModalField label="Observations">
            <textarea value={form.observations} onChange={e => set('observations', e.target.value)} className="input" rows={3} placeholder="Notes, points d'attention..." />
          </ModalField>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={14} />
              {saving ? 'Enregistrement...' : 'Ajouter l\'expertise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Audience ─────────────────────────────────────────────────────────────

function AudienceModal({ dossierId, onClose, onSaved }: { dossierId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date_audience: '',
    heure_audience: '',
    nature: '',
    tribunal: '',
    salle: '',
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dateAudience = form.heure_audience
        ? `${form.date_audience}T${form.heure_audience}`
        : `${form.date_audience}T09:00`

      const { error } = await supabase.from('audiences').insert({
        dossier_id: dossierId,
        date_audience: dateAudience,
        nature: form.nature,
        tribunal: form.tribunal || null,
        salle: form.salle || null,
        rappel_j15_envoye: false,
        rappel_j2_envoye: false,
      })
      if (error) throw error
      onSaved()
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'ajout de l\'audience')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Scale size={18} className="text-red-500" />
            Nouvelle audience
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Date *">
              <input type="date" required value={form.date_audience} onChange={e => set('date_audience', e.target.value)} className="input" />
            </ModalField>
            <ModalField label="Heure">
              <input type="time" value={form.heure_audience} onChange={e => set('heure_audience', e.target.value)} className="input" />
            </ModalField>
            <ModalField label="Nature *" className="col-span-2">
              <select required value={form.nature} onChange={e => set('nature', e.target.value)} className="input">
                <option value="">— Sélectionner —</option>
                <option value="Mise en état">Mise en état</option>
                <option value="Plaidoirie">Plaidoirie</option>
                <option value="Jugement">Jugement</option>
                <option value="Référé">Référé</option>
                <option value="Conciliation">Conciliation</option>
                <option value="Médiation">Médiation</option>
                <option value="Audience CIVI">Audience CIVI</option>
                <option value="Autre">Autre</option>
              </select>
            </ModalField>
            <ModalField label="Tribunal">
              <input type="text" value={form.tribunal} onChange={e => set('tribunal', e.target.value)} className="input" placeholder="TJ Marseille, CA Aix..." />
            </ModalField>
            <ModalField label="Salle">
              <input type="text" value={form.salle} onChange={e => set('salle', e.target.value)} className="input" placeholder="Salle 2.14" />
            </ModalField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={14} />
              {saving ? 'Enregistrement...' : 'Ajouter l\'audience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Composants utilitaires ─────────────────────────────────────────────────────

function ModalField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
        {icon}
        {value ?? <span className="text-gray-300">—</span>}
      </div>
    </div>
  )
}

function Flag({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${active ? (danger ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-50'}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${active ? (danger ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>
        {active ? '✓ Oui' : 'Non'}
      </span>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{label}</div>
}

function formatEuro(value?: number | null) {
  if (!value) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
