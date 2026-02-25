'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type Dossier, type Client, type Etape, type Expertise, type Audience } from '@/lib/types'
import { ArrowLeft, Download, Phone, Mail, Calendar, Scale, Stethoscope, Euro, ChevronRight, Plus, Save, AlertTriangle, FileText, Clock, Gavel, User, Upload, Download, Trash2, Edit2, X } from 'lucide-react'
import Link from 'next/link'
import { exportDossierPDF } from '@/lib/export-pdf'
import { useParams } from 'next/navigation'

const ETAPES_ORDRE: Etape[] = ['qualification','mandat','constitution_dossier','expertise_amiable','offre_assureur','negociation','procedure_judiciaire','transaction','encaissement']

function formatEuro(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DossierDetail() {
  const { id } = useParams() as { id: string }
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [expertises, setExpertises] = useState<Expertise[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [procedure, setProcedure] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [historique, setHistorique] = useState<any[]>([])
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [cabinet, setCabinet] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<'detail' | 'procedure' | 'expertises' | 'audiences' | 'financier' | 'notes' | 'historique' | 'documents'>('detail')
  const [loading, setLoading] = useState(true)
  const [noteTexte, setNoteTexte] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [relances, setRelances] = useState<any[]>([])
  const [relanceForm, setRelanceForm] = useState({ type: 'telephone', motif: '', statut: 'envoye' })
  const [savingRelance, setSavingRelance] = useState(false)
  const [noteMode, setNoteMode] = useState<'note' | 'relance'>('note')
  const [showEtapeMenu, setShowEtapeMenu] = useState(false)
  const [showAddExpertise, setShowAddExpertise] = useState(false)
  const [expertiseForm, setExpertiseForm] = useState({ type_expertise: 'amiable', date_expertise: '', heure: '10:00', lieu_expertise: '', expert_nom: '', medecin_conseil_victime: '' })
  const [savingExpertise, setSavingExpertise] = useState(false)
  const [editingExpertise, setEditingExpertise] = useState<string | null>(null)
  const [expertiseResultForm, setExpertiseResultForm] = useState<any>({})
  const [showAddAudience, setShowAddAudience] = useState(false)
  const [audienceForm, setAudienceForm] = useState({ nature: 'audience_orientation', date_audience: '', heure: '09:00', tribunal: '', salle: '', avocat_id: '' })
  const [savingAudience, setSavingAudience] = useState(false)
  const [editingEtape, setEditingEtape] = useState(false)
  const [editFinancier, setEditFinancier] = useState(false)
  const [editProcedure, setEditProcedure] = useState(false)
  const [procForm, setProcForm] = useState<any>({})
  const [savingProc, setSavingProc] = useState(false)
  const [showNouvelleProc, setShowNouvelleProc] = useState(false)
  const [finForm, setFinForm] = useState({ offre_assureur: '', montant_reclame: '', montant_obtenu: '', honoraires_fixes: '', honoraires_resultat: '', taux_honoraires_resultat: '' })
  const [savingFin, setSavingFin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: d } = await supabase.from('dossiers').select('*').eq('id', id).single()
      if (d) {
        setDossier(d)
        const [{ data: c }, { data: e }, { data: a }, { data: p }, { data: n }, { data: h }, { data: u }] = await Promise.all([
          supabase.from('clients').select('*').eq('id', d.client_id).single(),
          supabase.from('expertises').select('*').eq('dossier_id', id).order('date_expertise'),
          supabase.from('audiences').select('*, avocat:utilisateurs(nom, prenom)').eq('dossier_id', id).order('date_audience'),
          supabase.from('procedures_judiciaires').select('*').eq('dossier_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('notes').select('*, auteur:utilisateurs(nom, prenom)').eq('dossier_id', id).order('created_at', { ascending: false }),
          supabase.from('historique_etapes').select('*, utilisateur:utilisateurs(nom, prenom)').eq('dossier_id', id).order('created_at', { ascending: false }),
          supabase.from('utilisateurs').select('id, nom, prenom, role').eq('actif', true),
          supabase.from('documents').select('*').eq('dossier_id', id).order('created_at', { ascending: false }),
        ])
        if (c) setClient(c)
        if (e) setExpertises(e)
        if (a) setAudiences(a)
        if (p) setProcedure(p)
        if (n) setNotes(n)
        if (h) setHistorique(h)
        const { data: relancesData } = await supabase.from('relances').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
        if (relancesData) setRelances(relancesData)
        if (u) setUtilisateurs(u)
      }
      // docs chargés via query 7
      const { data: docs7 } = await supabase.from('documents').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
      if (docs7) setDocuments(docs7)
      setLoading(false)
    }
    load()
  }, [id])

  const ajouterExpertise = async () => {
    setSavingExpertise(true)
    const dt = expertiseForm.heure ? `${expertiseForm.date_expertise}T${expertiseForm.heure}:00` : expertiseForm.date_expertise
    await supabase.from('expertises').insert({
      dossier_id: id, type_expertise: expertiseForm.type_expertise,
      date_expertise: expertiseForm.date_expertise ? dt : null,
      lieu_expertise: expertiseForm.lieu_expertise || null,
      expert_nom: expertiseForm.expert_nom || null,
      medecin_conseil_victime: expertiseForm.medecin_conseil_victime || null,
    })
    const { data: e } = await supabase.from('expertises').select('*').eq('dossier_id', id).order('date_expertise')
    if (e) setExpertises(e)
    setSavingExpertise(false)
    setShowAddExpertise(false)
    setExpertiseForm({ type_expertise: 'amiable', date_expertise: '', heure: '10:00', lieu_expertise: '', expert_nom: '', medecin_conseil_victime: '' })
  }

  const saveExpertiseResults = async (expertiseId: string) => {
    await supabase.from('expertises').update({
      taux_dfp: expertiseResultForm.taux_dfp ? Number(expertiseResultForm.taux_dfp) : null,
      duree_itt_jours: expertiseResultForm.duree_itt_jours ? Number(expertiseResultForm.duree_itt_jours) : null,
      quantum_doloris: expertiseResultForm.quantum_doloris ? Number(expertiseResultForm.quantum_doloris) : null,
      prejudice_esthetique: expertiseResultForm.prejudice_esthetique ? Number(expertiseResultForm.prejudice_esthetique) : null,
      date_rapport: expertiseResultForm.date_rapport || null,
    }).eq('id', expertiseId)
    const { data: e } = await supabase.from('expertises').select('*').eq('dossier_id', id).order('date_expertise')
    if (e) setExpertises(e)
    setEditingExpertise(null)
  }

  const ajouterAudience = async () => {
    setSavingAudience(true)
    const dt = audienceForm.heure ? `${audienceForm.date_audience}T${audienceForm.heure}:00` : audienceForm.date_audience
    await supabase.from('audiences').insert({
      dossier_id: id, nature: audienceForm.nature,
      date_audience: dt,
      tribunal: audienceForm.tribunal || null,
      salle: audienceForm.salle || null,
      avocat_id: audienceForm.avocat_id || null,
      rappel_j15_envoye: false, rappel_j2_envoye: false,
    })
    const { data: a } = await supabase.from('audiences').select('*, avocat:utilisateurs(nom, prenom)').eq('dossier_id', id).order('date_audience')
    if (a) setAudiences(a)
    setSavingAudience(false)
    setShowAddAudience(false)
    setAudienceForm({ nature: 'audience_orientation', date_audience: '', heure: '09:00', tribunal: '', salle: '', avocat_id: '' })
  }

  const saveProcedure = async () => {
    setSavingProc(true)
    if (procedure) {
      const { data } = await supabase.from('procedures_judiciaires').update(procForm).eq('id', procedure.id).select().single()
      if (data) setProcedure(data)
    } else {
      const { data } = await supabase.from('procedures_judiciaires').insert({ dossier_id: id, decision: 'en_attente', ...procForm }).select().single()
      if (data) setProcedure(data)
    }
    setSavingProc(false)
    setEditProcedure(false)
    setShowNouvelleProc(false)
  }

  const saveFinancier = async () => {
    setSavingFin(true)
    const update: any = {}
    if (finForm.offre_assureur) update.offre_assureur = Number(finForm.offre_assureur)
    if (finForm.montant_reclame) update.montant_reclame = Number(finForm.montant_reclame)
    if (finForm.montant_obtenu) update.montant_obtenu = Number(finForm.montant_obtenu)
    if (finForm.honoraires_fixes) update.honoraires_fixes = Number(finForm.honoraires_fixes)
    if (finForm.honoraires_resultat) update.honoraires_resultat = Number(finForm.honoraires_resultat)
    if (finForm.taux_honoraires_resultat) update.taux_honoraires_resultat = Number(finForm.taux_honoraires_resultat)
    const { data } = await supabase.from('dossiers').update(update).eq('id', id).select().single()
    if (data) setDossier(data)
    setSavingFin(false)
    setEditFinancier(false)
  }

  const ajouterRelance = async () => {
    if (!relanceForm.motif.trim()) return
    setSavingRelance(true)
    await supabase.from('relances').insert({ dossier_id: id, client_id: dossier?.client_id, ...relanceForm })
    const { data: r } = await supabase.from('relances').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
    if (r) setRelances(r)
    setRelanceForm({ type: 'telephone', motif: '', statut: 'envoye' })
    setSavingRelance(false)
  }

  const changerEtape = async (nouvelleEtape: Etape) => {
    if (!dossier || nouvelleEtape === dossier.etape) return
    setEditingEtape(true)
    const etapePrecedente = dossier.etape
    const { data } = await supabase.from('dossiers').update({ etape: nouvelleEtape }).eq('id', id).select().single()
    if (data) {
      setDossier(data)
      await supabase.from('historique_etapes').insert({ dossier_id: id, etape_precedente: etapePrecedente, etape_nouvelle: nouvelleEtape })
      const { data: h } = await supabase.from('historique_etapes').select('*, utilisateur:utilisateurs(nom, prenom)').eq('dossier_id', id).order('created_at', { ascending: false })
      if (h) setHistorique(h)
    }
    setEditingEtape(false)
    setShowEtapeMenu(false)
  }

  const ajouterNote = async () => {
    if (!noteTexte.trim()) return
    setSavingNote(true)
    await supabase.from('notes').insert({ dossier_id: id, contenu: noteTexte, type: 'note' })
    const { data: n } = await supabase.from('notes').select('*, auteur:utilisateurs(nom, prenom)').eq('dossier_id', id).order('created_at', { ascending: false })
    if (n) setNotes(n)
    setNoteTexte('')
    setSavingNote(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!dossier || !client) return <div className="p-8 text-gray-500">Dossier introuvable</div>

  const idx = ETAPES_ORDRE.indexOf(dossier.etape)
  const avocats = utilisateurs.filter(u => u.role === 'associe' || u.role === 'collaborateur')
  const juristes = utilisateurs.filter(u => u.role === 'juriste')
  const nextEtape = idx < ETAPES_ORDRE.length - 1 ? ETAPES_ORDRE[idx + 1] : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dossiers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>
              <span className={`badge ${ETAPES_COULEURS[dossier.etape]}`}>{ETAPES_LABELS[dossier.etape]}</span>
              {dossier.voie === 'judiciaire' && <span className="badge bg-red-50 text-red-600">⚖️ Judiciaire</span>}
              {dossier.priorite === 'urgente' && <span className="badge bg-red-100 text-red-700 font-bold">🔴 URGENT</span>}
              {dossier.priorite === 'haute' && <span className="badge bg-orange-100 text-orange-700">🟠 Priorité haute</span>}
              {dossier.refus_garantie && <span className="badge bg-red-100 text-red-700">⚠ Refus garantie</span>}
            </div>
            <div className="flex gap-3 mt-1 text-sm text-gray-400">
              <span className="font-mono">{dossier.reference}</span>
              <span>•</span>
              <span>{TYPE_ACCIDENT_LABELS[dossier.type_accident]}</span>
              {dossier.date_accident && <><span>•</span><span>{formatDateShort(dossier.date_accident)}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextEtape && (
            <button onClick={() => changerEtape(nextEtape)} disabled={editingEtape}
              className="btn-primary flex items-center gap-2 text-sm">
              Passer à : {ETAPES_LABELS[nextEtape]} <ChevronRight size={14} />
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowEtapeMenu(m => !m)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Changer étape ▾
            </button>
            {showEtapeMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
                {ETAPES_ORDRE.map(e => (
                  <button key={e} onClick={() => changerEtape(e)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${e === dossier.etape ? 'text-cabinet-blue font-semibold' : ''}`}>
                    {ETAPES_LABELS[e]}
                    {e === dossier.etape && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {ETAPES_ORDRE.map((e, i) => (
          <div key={e} className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => changerEtape(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${i === idx ? 'bg-cabinet-blue text-white' : i < idx ? 'bg-blue-100 text-cabinet-blue hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
              {i < idx && '✓ '}{ETAPES_LABELS[e]}
            </button>
            {i < ETAPES_ORDRE.length - 1 && <div className={`w-4 h-0.5 ${i < idx ? 'bg-cabinet-blue' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {[
          ['detail', 'Détail'],
          ['procedure', `Procédure${procedure ? ' ✓' : ''}`],
          ['expertises', `Expertises (${expertises.length})`],
          ['audiences', `Audiences (${audiences.length})`],
          ['financier', 'Financier'],
          ['notes', `Notes (${notes.length})`],
          ['historique', 'Historique'],
          ['documents', `Documents (${documents.length})`],
        ].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-cabinet-blue text-cabinet-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Détail */}
      {tab === 'detail' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><User size={16} className="text-gray-400" />Client</h3>
            <div className="space-y-3">
              <Info icon={<Phone size={13} />} label="Téléphone" value={client.telephone} />
              <Info icon={<Mail size={13} />} label="Email" value={client.email} />
              <Info icon={<Calendar size={13} />} label="Date de naissance" value={client.date_naissance ? formatDate(client.date_naissance) : null} />
              <Info label="Profession" value={client.profession} />
              <Info label="Statut pro" value={client.statut_professionnel} />
              {client.revenus_annuels_nets && <Info label="Revenus annuels" value={formatEuro(client.revenus_annuels_nets)} />}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link href={`/clients/${client.id}`} className="text-xs text-cabinet-blue hover:underline">Voir fiche client complète →</Link>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-gray-400" />Accident</h3>
            <div className="space-y-3">
              <Info label="Type d'accident" value={TYPE_ACCIDENT_LABELS[dossier.type_accident]} />
              <Info label="Date" value={formatDate(dossier.date_accident)} />
              <Info label="Lieu" value={dossier.lieu_accident} />
              <Info label="Assureur adverse" value={dossier.assureur_nom} />
              <Info label="Réf. sinistre" value={dossier.assureur_reference_sinistre} />
              {dossier.date_consolidation && <Info label="Date consolidation" value={formatDate(dossier.date_consolidation)} />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Scale size={16} className="text-gray-400" />Équipe & statut</h3>
              <div className="space-y-2">
                {dossier.avocat_id && <Info label="Avocat" value={utilisateurs.find(u => u.id === dossier.avocat_id) ? `${utilisateurs.find(u => u.id === dossier.avocat_id)?.prenom} ${utilisateurs.find(u => u.id === dossier.avocat_id)?.nom}` : null} />}
                {dossier.juriste_id && <Info label="Juriste" value={utilisateurs.find(u => u.id === dossier.juriste_id) ? `${utilisateurs.find(u => u.id === dossier.juriste_id)?.prenom} ${utilisateurs.find(u => u.id === dossier.juriste_id)?.nom}` : null} />}
                <Info label="Source" value={dossier.source} />
                <Info label="Voie" value={dossier.voie} />
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3">Flags</h3>
              <div className="space-y-2">
                <Flag label="Consolidation atteinte" active={dossier.consolidation_atteinte} />
                <Flag label="Refus de garantie" active={dossier.refus_garantie} danger />
                <Flag label="Procédure FGAO" active={dossier.procedure_fgao} />
                <Flag label="Procédure CIVI" active={dossier.procedure_civi} />
              </div>
            </div>
            {dossier.notes && (
              <div className="card">
                <h3 className="font-semibold mb-2 text-sm">Notes générales</h3>
                <p className="text-sm text-gray-600">{dossier.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Procédure */}
      {tab === 'procedure' && (
        <div className="space-y-4">
          {/* Bouton édition */}
          <div className="flex justify-end">
            {editProcedure ? (
              <div className="flex gap-2">
                <button onClick={() => setEditProcedure(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"><X size={13} /> Annuler</button>
                <button onClick={saveProcedure} disabled={savingProc} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                  <Save size={13} /> {savingProc ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            ) : procedure && (
              <button onClick={() => { setProcForm({ ...procedure }); setEditProcedure(true) }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                <Edit2 size={13} /> Modifier
              </button>
            )}
          </div>

          {!procedure && !editProcedure ? (
            <div className="card text-center py-12">
              <Gavel size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 mb-4">Aucune procédure judiciaire enregistrée</p>
              <button onClick={() => { setProcForm({}); setEditProcedure(true) }} className="btn-primary">
                <Plus size={14} className="inline mr-1" /> Créer la procédure
              </button>
            </div>
          ) : editProcedure ? (
            <div className="card space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Gavel size={16} className="text-purple-500" />Procédure judiciaire</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Tribunal</label>
                  <input value={procForm.tribunal || ''} onChange={e => setProcForm((f: any) => ({ ...f, tribunal: e.target.value }))} className="input-field" placeholder="TJ Aix-en-Provence..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">N° affaire</label>
                  <input value={procForm.numero_affaire || ''} onChange={e => setProcForm((f: any) => ({ ...f, numero_affaire: e.target.value }))} className="input-field" placeholder="24/12345" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Juge</label>
                  <input value={procForm.juge_nom || ''} onChange={e => setProcForm((f: any) => ({ ...f, juge_nom: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date d'assignation</label>
                  <input type="date" value={procForm.date_assignation?.slice(0,10) || ''} onChange={e => setProcForm((f: any) => ({ ...f, date_assignation: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date signification</label>
                  <input type="date" value={procForm.date_signification?.slice(0,10) || ''} onChange={e => setProcForm((f: any) => ({ ...f, date_signification: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Prochaine audience</label>
                  <input type="date" value={procForm.prochaine_audience?.slice(0,10) || ''} onChange={e => setProcForm((f: any) => ({ ...f, prochaine_audience: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Nature audience</label>
                  <select value={procForm.nature_prochaine_audience || ''} onChange={e => setProcForm((f: any) => ({ ...f, nature_prochaine_audience: e.target.value }))} className="input-field">
                    <option value="">—</option>
                    {['audience_orientation','audience_fond','delibere','refere','conciliation'].map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date délibéré</label>
                  <input type="date" value={procForm.date_delibere?.slice(0,10) || ''} onChange={e => setProcForm((f: any) => ({ ...f, date_delibere: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Décision</label>
                  <select value={procForm.decision || 'en_attente'} onChange={e => setProcForm((f: any) => ({ ...f, decision: e.target.value }))} className="input-field">
                    <option value="en_attente">En attente</option>
                    <option value="favorable">Favorable</option>
                    <option value="partiel">Partiel</option>
                    <option value="defavorable">Défavorable</option>
                  </select>
                </div>
                {(procForm.decision === 'favorable' || procForm.decision === 'partiel') && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Montant alloué</label>
                      <input type="number" value={procForm.montant_alloue || ''} onChange={e => setProcForm((f: any) => ({ ...f, montant_alloue: e.target.value }))} className="input-field" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Article 700</label>
                      <input type="number" value={procForm.article_700 || ''} onChange={e => setProcForm((f: any) => ({ ...f, article_700: e.target.value }))} className="input-field" />
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Notes procédure</label>
                <textarea value={procForm.notes || ''} onChange={e => setProcForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} className="input-field" />
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={procForm.appel_interjete || false} onChange={e => setProcForm((f: any) => ({ ...f, appel_interjete: e.target.checked }))} />
                  Appel interjeté
                </label>
                {procForm.appel_interjete && (
                  <input type="date" value={procForm.date_appel?.slice(0,10) || ''} onChange={e => setProcForm((f: any) => ({ ...f, date_appel: e.target.value }))} className="input-field w-40" />
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Gavel size={16} className="text-purple-500" />Procédure judiciaire</h3>
                <div className="space-y-3">
                  <Info label="Tribunal" value={procedure.tribunal} />
                  <Info label="N° affaire" value={procedure.numero_affaire} />
                  <Info label="Juge" value={procedure.juge_nom} />
                  <Info label="Date d'assignation" value={formatDate(procedure.date_assignation)} />
                  <Info label="Date de signification" value={formatDate(procedure.date_signification)} />
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Calendrier & décision</h3>
                <div className="space-y-3">
                  <Info label="Prochaine audience" value={formatDate(procedure.prochaine_audience)} />
                  <Info label="Nature prochaine audience" value={procedure.nature_prochaine_audience} />
                  <Info label="Date de délibéré" value={formatDate(procedure.date_delibere)} />
                  {procedure.date_jugement && <Info label="Date du jugement" value={formatDate(procedure.date_jugement)} />}
                  {procedure.decision && procedure.decision !== 'en_attente' && (
                    <div>
                      <div className="text-xs text-gray-400 font-medium">Décision</div>
                      <span className={`badge mt-1 ${procedure.decision === 'favorable' ? 'bg-green-100 text-green-700' : procedure.decision === 'partiel' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {procedure.decision === 'favorable' ? '✓ Favorable' : procedure.decision === 'partiel' ? '~ Partiel' : '✗ Défavorable'}
                      </span>
                    </div>
                  )}
                  {procedure.montant_alloue && <Info label="Montant alloué" value={formatEuro(procedure.montant_alloue)} />}
                  {procedure.article_700 && <Info label="Article 700" value={formatEuro(procedure.article_700)} />}
                  {procedure.appel_interjete && <div className="px-3 py-2 bg-orange-50 rounded-lg text-xs text-orange-700 font-medium">⚠ Appel interjeté le {formatDateShort(procedure.date_appel)}</div>}
                </div>
              </div>
              {procedure.notes && (
                <div className="col-span-2 card">
                  <h3 className="font-semibold mb-2 text-sm">Notes procédure</h3>
                  <p className="text-sm text-gray-600">{procedure.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Onglet Expertises */}
      {tab === 'expertises' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddExpertise(s => !s)} className="btn-primary flex items-center gap-2 text-sm py-1.5">
              <Plus size={14} /> Ajouter une expertise
            </button>
          </div>

          {/* Formulaire ajout rapide */}
          {showAddExpertise && (
            <div className="card border border-purple-100 bg-purple-50/30">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2"><Stethoscope size={14} className="text-purple-500" />Nouvelle expertise</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Type</label>
                  <select value={expertiseForm.type_expertise} onChange={e => setExpertiseForm(f => ({ ...f, type_expertise: e.target.value }))} className="input-field">
                    <option value="amiable">Amiable</option>
                    <option value="judiciaire">Judiciaire</option>
                    <option value="contra_expertisse">Contre-expertise</option>
                    <option value="suivi">Suivi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date</label>
                  <input type="date" value={expertiseForm.date_expertise} onChange={e => setExpertiseForm(f => ({ ...f, date_expertise: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                  <input type="time" value={expertiseForm.heure} onChange={e => setExpertiseForm(f => ({ ...f, heure: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Médecin expert</label>
                  <input value={expertiseForm.expert_nom} onChange={e => setExpertiseForm(f => ({ ...f, expert_nom: e.target.value }))} className="input-field" placeholder="Dr Dupont..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Médecin conseil victime</label>
                  <input value={expertiseForm.medecin_conseil_victime} onChange={e => setExpertiseForm(f => ({ ...f, medecin_conseil_victime: e.target.value }))} className="input-field" placeholder="Dr Martin..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Lieu</label>
                  <input value={expertiseForm.lieu_expertise} onChange={e => setExpertiseForm(f => ({ ...f, lieu_expertise: e.target.value }))} className="input-field" placeholder="Adresse..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddExpertise(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"><X size={13} /> Annuler</button>
                <button onClick={ajouterExpertise} disabled={savingExpertise} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                  <Save size={13} /> {savingExpertise ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          {expertises.length === 0 && !showAddExpertise ? (
            <div className="card text-center py-12 text-gray-400">
              <Stethoscope size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucune expertise enregistrée</p>
            </div>
          ) : expertises.map(e => (
            <div key={e.id} className="card border-l-4 border-purple-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Stethoscope size={16} className="text-purple-500" />
                  <span className="font-semibold capitalize">{e.type_expertise === 'judiciaire' ? 'Expertise judiciaire' : e.type_expertise === 'amiable' ? 'Expertise amiable' : e.type_expertise === 'contra_expertisse' ? 'Contre-expertise' : 'Expertise de suivi'}</span>
                  {e.date_expertise && <span className="badge bg-purple-50 text-purple-700">{formatDateShort(e.date_expertise)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {e.date_rapport && <span className="text-xs text-gray-400">Rapport : {formatDateShort(e.date_rapport)}</span>}
                  <button onClick={() => { setEditingExpertise(e.id === editingExpertise ? null : e.id); setExpertiseResultForm({ taux_dfp: e.taux_dfp || '', duree_itt_jours: e.duree_itt_jours || '', quantum_doloris: e.quantum_doloris || '', prejudice_esthetique: e.prejudice_esthetique || '', date_rapport: e.date_rapport?.slice(0,10) || '' }) }} className="text-xs text-cabinet-blue hover:underline flex items-center gap-1">
                    <Edit2 size={11} /> Résultats
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Info label="Expert" value={e.expert_nom} />
                <Info label="Médecin conseil" value={e.medecin_conseil_victime || e.medecin_conseil_nom} />
                <Info label="Lieu" value={e.lieu_expertise} />
                <Info label="Date rapport" value={formatDateShort(e.date_rapport)} />
              </div>

              {/* Formulaire résultats médicaux */}
              {editingExpertise === e.id && (
                <div className="border-t border-purple-100 pt-4 mt-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Résultats médicaux</h4>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">DFP (%)</label>
                      <input type="number" step="0.5" min="0" max="100" value={expertiseResultForm.taux_dfp} onChange={e => setExpertiseResultForm((f: any) => ({ ...f, taux_dfp: e.target.value }))} className="input-field" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">ITT (jours)</label>
                      <input type="number" value={expertiseResultForm.duree_itt_jours} onChange={e => setExpertiseResultForm((f: any) => ({ ...f, duree_itt_jours: e.target.value }))} className="input-field" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Quantum doloris /7</label>
                      <input type="number" step="0.5" min="0" max="7" value={expertiseResultForm.quantum_doloris} onChange={e => setExpertiseResultForm((f: any) => ({ ...f, quantum_doloris: e.target.value }))} className="input-field" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Préj. esthétique /7</label>
                      <input type="number" step="0.5" min="0" max="7" value={expertiseResultForm.prejudice_esthetique} onChange={e => setExpertiseResultForm((f: any) => ({ ...f, prejudice_esthetique: e.target.value }))} className="input-field" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Date rapport</label>
                      <input type="date" value={expertiseResultForm.date_rapport} onChange={ev => setExpertiseResultForm((f: any) => ({ ...f, date_rapport: ev.target.value }))} className="input-field" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setEditingExpertise(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1"><X size={11} /> Annuler</button>
                    <button onClick={() => saveExpertiseResults(e.id)} className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3">
                      <Save size={11} /> Enregistrer les résultats
                    </button>
                  </div>
                </div>
              )}

              {(e.taux_dfp || e.duree_itt_jours || e.quantum_doloris || e.prejudice_esthetique) && editingExpertise !== e.id && (
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  {e.taux_dfp && <Info label="DFP" value={`${e.taux_dfp}%`} />}
                  {e.duree_itt_jours && <Info label="ITT" value={`${e.duree_itt_jours} jours`} />}
                  {e.quantum_doloris && <Info label="Quantum doloris" value={`${e.quantum_doloris}/7`} />}
                  {e.prejudice_esthetique && <Info label="Préj. esthétique" value={`${e.prejudice_esthetique}/7`} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Onglet Audiences */}
      {tab === 'audiences' && (
        <div className="space-y-3">
          {audiences.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucune audience enregistrée</p>
            </div>
          ) : audiences.map(a => {
            const jours = Math.ceil((new Date(a.date_audience).getTime() - Date.now()) / 86400000)
            const future = jours > 0
            return (
              <div key={a.id} className={`card flex items-center gap-4 border-l-4 ${future ? (jours <= 2 ? 'border-red-400' : jours <= 7 ? 'border-orange-400' : 'border-cabinet-blue') : 'border-gray-200'}`}>
                <div className={`text-center w-12 ${future ? (jours <= 7 ? 'text-red-500' : 'text-cabinet-blue') : 'text-gray-300'}`}>
                  {future ? <><div className="text-xl font-bold">J-{jours}</div><div className="text-xs">jours</div></> : <div className="text-xs">Passée</div>}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{a.nature?.replace(/_/g,' ')}</div>
                  <div className="text-sm text-gray-500">{formatDate(a.date_audience)}{a.tribunal && ` • ${a.tribunal}`}{a.salle && ` • Salle ${a.salle}`}</div>
                  {(a as any).avocat && <div className="text-xs text-gray-400 mt-0.5">Avocat : {(a as any).avocat.prenom} {(a as any).avocat.nom}</div>}
                </div>
                {a.resultat && <span className="badge bg-green-100 text-green-700">{a.resultat}</span>}
              </div>
            )
          })}

          {/* Bouton + formulaire ajout audience */}
          <div className="flex justify-end">
            <button onClick={() => setShowAddAudience(s => !s)} className="flex items-center gap-2 text-sm text-cabinet-blue hover:underline">
              <Plus size={14} /> Ajouter une audience
            </button>
          </div>
          {showAddAudience && (
            <div className="card border border-blue-100 bg-blue-50/20">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2"><Calendar size={14} className="text-cabinet-blue" />Nouvelle audience</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Nature</label>
                  <select value={audienceForm.nature} onChange={e => setAudienceForm(f => ({ ...f, nature: e.target.value }))} className="input-field">
                    {[['audience_orientation','Orientation'],['audience_fond','Fond'],['delibere','Délibéré'],['refere','Référé'],['conciliation','Conciliation']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date *</label>
                  <input type="date" value={audienceForm.date_audience} onChange={e => setAudienceForm(f => ({ ...f, date_audience: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                  <input type="time" value={audienceForm.heure} onChange={e => setAudienceForm(f => ({ ...f, heure: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Tribunal</label>
                  <input value={audienceForm.tribunal} onChange={e => setAudienceForm(f => ({ ...f, tribunal: e.target.value }))} className="input-field" placeholder="TJ Aix..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Salle</label>
                  <input value={audienceForm.salle} onChange={e => setAudienceForm(f => ({ ...f, salle: e.target.value }))} className="input-field" placeholder="3B..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Avocat</label>
                  <select value={audienceForm.avocat_id} onChange={e => setAudienceForm(f => ({ ...f, avocat_id: e.target.value }))} className="input-field">
                    <option value="">— Non affecté —</option>
                    {utilisateurs.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddAudience(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"><X size={13} /> Annuler</button>
                <button onClick={ajouterAudience} disabled={savingAudience || !audienceForm.date_audience} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                  <Save size={13} /> {savingAudience ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onglet Financier */}
      {tab === 'financier' && (
        <div className="space-y-6">
          {/* Header avec bouton édition */}
          <div className="flex justify-end">
            {editFinancier ? (
              <div className="flex gap-2">
                <button onClick={() => setEditFinancier(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <X size={13} /> Annuler
                </button>
                <button onClick={saveFinancier} disabled={savingFin} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                  <Save size={13} /> {savingFin ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            ) : (
              <button onClick={() => {
                setFinForm({
                  offre_assureur: dossier.offre_assureur?.toString() || '',
                  montant_reclame: dossier.montant_reclame?.toString() || '',
                  montant_obtenu: dossier.montant_obtenu?.toString() || '',
                  honoraires_fixes: dossier.honoraires_fixes?.toString() || '',
                  honoraires_resultat: dossier.honoraires_resultat?.toString() || '',
                  taux_honoraires_resultat: dossier.taux_honoraires_resultat?.toString() || '',
                })
                setEditFinancier(true)
              }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                <Edit2 size={13} /> Modifier les montants
              </button>
            )}
          </div>

          {/* Montants éditables */}
          {editFinancier ? (
            <div className="card">
              <h3 className="font-semibold mb-4 text-sm">Montants (€)</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  ['offre_assureur', 'Offre assureur'],
                  ['montant_reclame', 'Montant réclamé'],
                  ['montant_obtenu', 'Montant obtenu'],
                  ['honoraires_fixes', 'Honoraires fixes'],
                  ['honoraires_resultat', 'Honoraires résultat'],
                  ['taux_honoraires_resultat', 'Taux hono résultat (%)'],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
                    <input type="number" value={(finForm as any)[field]} onChange={e => setFinForm(f => ({ ...f, [field]: e.target.value }))}
                      className="input-field" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Offre assureur', value: dossier.offre_assureur, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Montant réclamé', value: dossier.montant_reclame, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Montant obtenu', value: dossier.montant_obtenu, color: 'text-green-600', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`card text-center ${bg}`}>
                    <Euro size={24} className={`mx-auto mb-2 ${color}`} />
                    <div className={`text-3xl font-bold ${color}`}>{formatEuro(value)}</div>
                    <div className="text-sm text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {dossier.offre_assureur && dossier.montant_reclame && (
                <div className="card bg-blue-50 border border-blue-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Différence réclamé / offre</div>
                      <div className="text-xl font-bold text-blue-700">+{formatEuro((dossier.montant_reclame || 0) - (dossier.offre_assureur || 0))}</div>
                    </div>
                    {dossier.montant_obtenu && dossier.offre_assureur && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Gain vs offre initiale</div>
                        <div className="text-xl font-bold text-green-700">+{formatEuro(dossier.montant_obtenu - dossier.offre_assureur)}</div>
                      </div>
                    )}
                    {dossier.montant_obtenu && dossier.montant_reclame && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Taux d'obtention</div>
                        <div className="text-xl font-bold text-purple-700">{Math.round(dossier.montant_obtenu / dossier.montant_reclame * 100)}%</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="font-semibold mb-4">Honoraires</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Info label="Taux honoraires résultat" value={`${dossier.taux_honoraires_resultat || 0}%`} />
                  {dossier.honoraires_fixes && <Info label="Honoraires fixes" value={formatEuro(dossier.honoraires_fixes)} />}
                  {dossier.honoraires_resultat && <Info label="Honoraires résultat" value={formatEuro(dossier.honoraires_resultat)} />}
                </div>
              </div>

              {dossier.montant_obtenu && dossier.taux_honoraires_resultat && (
                <div className="card bg-green-50 border border-green-100">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Honoraires calculés</div>
                      <div className="text-2xl font-bold text-green-700">
                        {formatEuro(dossier.montant_obtenu * (dossier.taux_honoraires_resultat / 100))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">({dossier.taux_honoraires_resultat}% × {formatEuro(dossier.montant_obtenu)})</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Net client estimé</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {formatEuro(dossier.montant_obtenu - (dossier.montant_obtenu * (dossier.taux_honoraires_resultat / 100)))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Onglet Notes + Relances */}
      {tab === 'notes' && (
        <div className="space-y-4">
          {/* Sélecteur mode */}
          <div className="flex gap-2 border-b border-gray-100 pb-3">
            <button onClick={() => setNoteMode('note')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${noteMode === 'note' ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              ✏️ Note interne
            </button>
            <button onClick={() => setNoteMode('relance')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${noteMode === 'relance' ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              📞 Enregistrer une relance
            </button>
          </div>

          {/* Formulaire note */}
          {noteMode === 'note' && (
            <div className="card">
              <textarea value={noteTexte} onChange={e => setNoteTexte(e.target.value)}
                placeholder="Saisir une note, observation, action à suivre..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cabinet-blue/20" rows={3} />
              <div className="flex justify-end mt-2">
                <button onClick={ajouterNote} disabled={savingNote || !noteTexte.trim()} className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={14} /> {savingNote ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          {/* Formulaire relance */}
          {noteMode === 'relance' && (
            <div className="card">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Type de contact</label>
                  <select value={relanceForm.type} onChange={e => setRelanceForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                    {[['telephone','📞 Téléphone'],['whatsapp','💬 WhatsApp'],['email','📧 Email'],['courrier','📬 Courrier'],['sms','💬 SMS']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Statut</label>
                  <select value={relanceForm.statut} onChange={e => setRelanceForm(f => ({ ...f, statut: e.target.value }))} className="input-field">
                    {[['envoye','✅ Envoyé / Effectué'],['en_attente','⏳ En attente'],['echec','❌ Échec / Pas de réponse']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-500 font-medium block mb-1">Motif / Résumé *</label>
                  <input value={relanceForm.motif} onChange={e => setRelanceForm(f => ({ ...f, motif: e.target.value }))}
                    className="input-field" placeholder="Ex: Appel pour suivi offre assureur..." />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={ajouterRelance} disabled={savingRelance || !relanceForm.motif.trim()} className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={14} /> {savingRelance ? 'Enregistrement...' : 'Enregistrer la relance'}
                </button>
              </div>
            </div>
          )}

          {/* Fil chronologique : notes + relances mélangées */}
          {(() => {
            const tous = [
              ...notes.map(n => ({ ...n, _kind: 'note' as const })),
              ...relances.map(r => ({ ...r, _kind: 'relance' as const })),
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            if (tous.length === 0) return (
              <div className="card text-center py-12 text-gray-400">
                <FileText size={40} className="mx-auto mb-3 opacity-20" />
                <p>Aucune note ni relance pour ce dossier</p>
              </div>
            )

            return tous.map(item => item._kind === 'note' ? (
              <div key={`note-${item.id}`} className="card border-l-4 border-gray-200">
                <div className="flex items-start gap-2">
                  <span className="text-gray-300 mt-0.5">✏️</span>
                  <p className="text-sm text-gray-700 flex-1 whitespace-pre-wrap">{item.contenu}</p>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {item.auteur && ` • ${item.auteur.prenom} ${item.auteur.nom}`}
                </div>
              </div>
            ) : (
              <div key={`relance-${item.id}`} className={`card border-l-4 ${item.statut === 'envoye' ? 'border-green-400' : item.statut === 'echec' ? 'border-red-300' : 'border-orange-300'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{item.type === 'telephone' ? '📞' : item.type === 'whatsapp' ? '💬' : item.type === 'email' ? '📧' : '📬'}</span>
                    <p className="text-sm text-gray-700 flex-1">{item.motif}</p>
                  </div>
                  <span className={`badge text-xs ml-2 flex-shrink-0 ${item.statut === 'envoye' ? 'bg-green-100 text-green-700' : item.statut === 'echec' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    {item.statut === 'envoye' ? '✓ Effectué' : item.statut === 'echec' ? '✗ Échec' : '⏳ En attente'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Relance {item.type} • {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Onglet Historique */}
      {tab === 'historique' && (
        <div className="space-y-3">
          {historique.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Clock size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucun historique disponible</p>
            </div>
          ) : historique.map(h => (
            <div key={h.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-cabinet-blue flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm">
                  {h.etape_precedente ? (
                    <span>Passage de <span className="font-medium">{ETAPES_LABELS[h.etape_precedente as Etape] ?? h.etape_precedente}</span> → <span className="font-medium text-cabinet-blue">{ETAPES_LABELS[h.etape_nouvelle as Etape] ?? h.etape_nouvelle}</span></span>
                  ) : (
                    <span>Dossier créé à l'étape <span className="font-medium text-cabinet-blue">{ETAPES_LABELS[h.etape_nouvelle as Etape] ?? h.etape_nouvelle}</span></span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {h.utilisateur && ` • ${h.utilisateur.prenom} ${h.utilisateur.nom}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Onglet Documents */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Ajouter un document</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Type</label>
                <select id="doc-type" className="input-field">
                  {['constat_police','certificat_medical','hospitalisation','bulletin_salaire','avis_imposition','rapport_expertise','courrier_assureur','mandat','conclusions','jugement','autre'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-cabinet-blue hover:bg-blue-50 transition-colors w-full justify-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500">{uploading ? 'Upload...' : 'Choisir un fichier'}</span>
                  <input type="file" className="hidden" disabled={uploading} onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploading(true)
                    try {
                      const docType = (document.getElementById('doc-type') as HTMLSelectElement)?.value || 'autre'
                      const filePath = `${id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
                      const { error: upError } = await supabase.storage.from('documents').upload(filePath, file)
                      if (!upError) {
                        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
                        await supabase.from('documents').insert({
                          dossier_id: id, type_document: docType,
                          nom_fichier: file.name, url_stockage: urlData.publicUrl,
                          taille_octets: file.size, uploade_par: 'cabinet'
                        })
                        const { data: freshDocs } = await supabase.from('documents').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
                        if (freshDocs) setDocuments(freshDocs)
                      }
                    } finally { setUploading(false) }
                  }} />
                </label>
              </div>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucun document pour ce dossier</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="card flex items-center gap-3 border-l-4 border-blue-200">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-cabinet-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.nom_fichier}</div>
                    <div className="text-xs text-gray-400">{doc.type_document?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-400">{doc.taille_octets ? `${Math.round(doc.taille_octets / 1024)} Ko • ` : ''}{new Date(doc.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {doc.url_stockage && (
                      <a href={doc.url_stockage} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-cabinet-blue transition-colors">
                        <Download size={14} />
                      </a>
                    )}
                    <button onClick={async () => {
                      await supabase.from('documents').delete().eq('id', doc.id)
                      setDocuments(prev => prev.filter(d => d.id !== doc.id))
                    }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
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

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">{icon}{value ?? <span className="text-gray-300">—</span>}</div>
    </div>
  )
}

function Flag({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${active ? (danger ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-50'}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${active ? (danger ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>{active ? '✓ Oui' : 'Non'}</span>
    </div>
  )
}

export const dynamic = 'force-dynamic'
