'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type Dossier, type Client, type Etape, type Expertise, type Audience } from '@/lib/types'
import { ArrowLeft, Phone, Mail, Calendar, Scale, Stethoscope, Euro, ChevronRight, Plus, Save, AlertTriangle, FileText, Clock, Gavel, User, Upload, Download, Trash2 } from 'lucide-react'
import Link from 'next/link'
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
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<'detail' | 'procedure' | 'expertises' | 'audiences' | 'financier' | 'notes' | 'historique' | 'documents'>('detail')
  const [loading, setLoading] = useState(true)
  const [noteTexte, setNoteTexte] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showEtapeMenu, setShowEtapeMenu] = useState(false)
  const [editingEtape, setEditingEtape] = useState(false)

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
        if (u) setUtilisateurs(u)
      }
      // docs chargés via query 7
      const { data: docs7 } = await supabase.from('documents').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
      if (docs7) setDocuments(docs7)
      setLoading(false)
    }
    load()
  }, [id])

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
          {!procedure ? (
            <div className="card text-center py-12">
              <Gavel size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 mb-4">Aucune procédure judiciaire enregistrée</p>
              <button onClick={async () => {
                await supabase.from('procedures_judiciaires').insert({ dossier_id: id, tribunal: 'TJ Marseille', decision: 'en_attente' })
                const { data: p } = await supabase.from('procedures_judiciaires').select('*').eq('dossier_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
                if (p) setProcedure(p)
              }} className="btn-primary">
                <Plus size={14} className="inline mr-1" /> Créer la procédure
              </button>
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
          {expertises.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Stethoscope size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucune expertise enregistrée</p>
            </div>
          ) : expertises.map(e => (
            <div key={e.id} className="card border-l-4 border-purple-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Stethoscope size={16} className="text-purple-500" />
                  <span className="font-semibold capitalize">{e.type === 'judiciaire' ? 'Expertise judiciaire' : e.type === 'amiable' ? 'Expertise amiable' : 'Sapiteur'}</span>
                  {e.date_expertise && <span className="badge bg-purple-50 text-purple-700">{formatDateShort(e.date_expertise)}{e.heure_expertise && ` à ${e.heure_expertise.slice(0,5)}`}</span>}
                </div>
                {e.date_rapport && <span className="text-xs text-gray-400">Rapport : {formatDateShort(e.date_rapport)}</span>}
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Info label="Expert" value={e.expert_nom} />
                <Info label="Spécialité" value={e.expert_specialite} />
                <Info label="Médecin conseil" value={e.medecin_conseil_nom} />
                <Info label="Lieu" value={e.lieu_expertise} />
              </div>
              {(e.taux_dfp || e.duree_itt_jours || e.quantum_doloris || e.prejudice_esthetique) && (
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
                  <div className="font-semibold">{a.nature}</div>
                  <div className="text-sm text-gray-500">{formatDate(a.date_audience)}{a.tribunal && ` • ${a.tribunal}`}{a.salle && ` • Salle ${a.salle}`}</div>
                  {(a as any).avocat && <div className="text-xs text-gray-400 mt-0.5">Avocat : {(a as any).avocat.prenom} {(a as any).avocat.nom}</div>}
                </div>
                {a.resultat && <span className="badge bg-green-100 text-green-700">{a.resultat}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Onglet Financier */}
      {tab === 'financier' && (
        <div className="space-y-6">
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
              <Info label="Taux honoraires résultat" value={`${dossier.taux_honoraires_resultat}%`} />
              {dossier.honoraires_fixes && <Info label="Honoraires fixes" value={formatEuro(dossier.honoraires_fixes)} />}
              {dossier.honoraires_resultat && <Info label="Honoraires résultat" value={formatEuro(dossier.honoraires_resultat)} />}
            </div>
          </div>
        </div>
      )}

      {/* Onglet Notes */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Ajouter une note</h3>
            <textarea
              value={noteTexte}
              onChange={e => setNoteTexte(e.target.value)}
              placeholder="Saisir une note, action, ou alerte..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cabinet-blue/20"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button onClick={ajouterNote} disabled={savingNote || !noteTexte.trim()} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} /> {savingNote ? 'Enregistrement...' : 'Ajouter la note'}
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucune note pour ce dossier</p>
            </div>
          ) : notes.map(n => (
            <div key={n.id} className="card border-l-4 border-gray-200">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-700 flex-1">{n.contenu}</p>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {n.auteur && ` • ${n.auteur.prenom} ${n.auteur.nom}`}
              </div>
            </div>
          ))}
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
    </div>
  )
}

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
