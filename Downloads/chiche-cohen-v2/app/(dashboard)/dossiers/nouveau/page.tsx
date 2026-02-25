'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, User, Car, Stethoscope, Scale, AlertCircle, CheckCircle, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const TYPES = [
  { value: 'accident_route', label: '🚗 Accident de la route', icon: Car },
  { value: 'erreur_medicale', label: '🏥 Erreur médicale', icon: Stethoscope },
  { value: 'agression', label: '⚖️ Agression / Violence', icon: Scale },
  { value: 'accident_vie', label: '⚠️ Accident de la vie', icon: AlertCircle },
  { value: 'autre', label: '➕ Autre', icon: AlertCircle },
]

const SOURCES = [
  { value: 'telephone', label: '📞 Appel entrant' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'recommandation', label: '🤝 Recommandation' },
  { value: 'apporteur', label: '💼 Apporteur d\'affaires' },
  { value: 'site_web', label: '🌐 Site internet' },
]

function F({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

export default function NouveauDossier() {
  const router = useRouter()
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [apporteurs, setApporteurs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1=client, 2=accident, 3=affectation
  const [clientSearch, setClientSearch] = useState('')
  const [clientsFound, setClientsFound] = useState<any[]>([])
  const [clientSelectionne, setClientSelectionne] = useState<any>(null)
  const [nouveauClient, setNouveauClient] = useState(true)

  const [form, setForm] = useState({
    client_nom: '', client_prenom: '', client_telephone: '', client_whatsapp: '',
    client_email: '', client_date_naissance: '', client_profession: '',
    client_statut_pro: 'salarie', client_revenus: '',
    type_accident: 'accident_route', date_accident: '', lieu_accident: '',
    circonstances: '', assureur_nom: '', assureur_ref: '',
    responsable_nom: '', refus_garantie: false, procedure_fgao: false,
    juriste_id: '', avocat_id: '', apporteur_id: '',
    score_potentiel: '3', priorite: 'normale', source: 'telephone',
    voie: 'amiable', notes: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      supabase.from('utilisateurs').select('*').eq('actif', true),
      supabase.from('apporteurs').select('*').eq('actif', true).order('nom'),
    ]).then(([{ data: u }, { data: a }]) => {
      if (u) setUtilisateurs(u)
      if (a) setApporteurs(a)
    })
  }, [])

  // Recherche client existant
  useEffect(() => {
    if (clientSearch.length < 2) { setClientsFound([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clients')
        .select('id, nom, prenom, telephone, email, dossiers(count)')
        .or(`nom.ilike.%${clientSearch}%,prenom.ilike.%${clientSearch}%,telephone.ilike.%${clientSearch}%`)
        .limit(5)
      if (data) setClientsFound(data)
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  const handleSubmit = async () => {
    if (!nouveauClient && !clientSelectionne) { setError('Sélectionnez ou créez un client'); return }
    if (nouveauClient && !form.client_nom) { setError('Le nom est requis'); return }
    setSaving(true)
    setError('')
    try {
      let clientId = clientSelectionne?.id
      if (nouveauClient) {
        const { data: cl, error: ce } = await supabase.from('clients').insert({
          nom: form.client_nom.toUpperCase(), prenom: form.client_prenom,
          telephone: form.client_telephone || null, telephone_whatsapp: form.client_whatsapp || null,
          email: form.client_email || null, date_naissance: form.client_date_naissance || null,
          profession: form.client_profession || null, statut_professionnel: form.client_statut_pro || null,
          revenus_annuels_nets: form.client_revenus ? Number(form.client_revenus) : null,
        }).select().single()
        if (ce) throw ce
        clientId = cl.id
      }

      const year = new Date().getFullYear()
      const { count } = await supabase.from('dossiers').select('id', { count: 'exact', head: true }).like('reference', `CC-${year}-%`)
      const num = String((count || 0) + 1).padStart(4, '0')
      const reference = `CC-${year}-${num}`

      const { data: dossier, error: de } = await supabase.from('dossiers').insert({
        client_id: clientId, reference,
        type_accident: form.type_accident,
        date_accident: form.date_accident || null, lieu_accident: form.lieu_accident || null,
        circonstances: form.circonstances || null,
        assureur_nom: form.assureur_nom || null, assureur_reference_sinistre: form.assureur_ref || null,
        responsable_nom: form.responsable_nom || null,
        refus_garantie: form.refus_garantie, procedure_fgao: form.procedure_fgao,
        juriste_id: form.juriste_id || null, avocat_id: form.avocat_id || null,
        apporteur_id: form.apporteur_id || null,
        score_potentiel: Number(form.score_potentiel), priorite: form.priorite,
        source: form.source, voie: form.voie, notes: form.notes || null,
        etape: 'qualification',
      }).select().single()
      if (de) throw de

      await supabase.from('historique_etapes').insert({
        dossier_id: dossier.id, etape_nouvelle: 'qualification', commentaire: 'Création du dossier'
      })

      router.push(`/dossiers/${dossier.id}`)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création')
      setSaving(false)
    }
  }

  const avocats = utilisateurs.filter(u => ['associe', 'collaborateur'].includes(u.role))
  const juristes = utilisateurs.filter(u => ['juriste', 'associe', 'collaborateur'].includes(u.role))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dossiers" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau dossier</h1>
          <p className="text-gray-400 text-sm mt-0.5">Étape {step}/3</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-2 mb-8">
        {[['1','Client'],['2','Accident'],['3','Affectation']].map(([s, l]) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(Number(s))} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${Number(s) === step ? 'bg-cabinet-blue text-white' : Number(s) < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {Number(s) < step ? <CheckCircle size={14} /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs">{s}</span>}
              {l}
            </button>
            {Number(s) < 3 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {/* Étape 1 — Client */}
      {step === 1 && (
        <div className="card space-y-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => setNouveauClient(true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${nouveauClient ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                Nouveau client
              </button>
              <button onClick={() => setNouveauClient(false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${!nouveauClient ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                Client existant
              </button>
            </div>

            {!nouveauClient && (
              <div className="mb-6">
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Rechercher par nom, prénom, téléphone..." className="input-field pl-9" />
                </div>
                {clientsFound.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {clientsFound.map(c => (
                      <button key={c.id} onClick={() => { setClientSelectionne(c); setClientSearch(''); setClientsFound([]) }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-left transition-colors ${clientSelectionne?.id === c.id ? 'bg-blue-50' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-cabinet-blue/10 flex items-center justify-center text-xs font-bold text-cabinet-blue">{c.nom?.[0]}{c.prenom?.[0]}</div>
                        <div>
                          <div className="font-medium text-sm">{c.nom} {c.prenom}</div>
                          <div className="text-xs text-gray-400">{c.telephone} • {(c.dossiers?.[0] as any)?.count || 0} dossier(s)</div>
                        </div>
                        {clientSelectionne?.id === c.id && <CheckCircle size={16} className="ml-auto text-green-500" />}
                      </button>
                    ))}
                  </div>
                )}
                {clientSelectionne && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm font-medium text-green-700">Client sélectionné : {clientSelectionne.nom} {clientSelectionne.prenom}</span>
                    <button onClick={() => setClientSelectionne(null)} className="ml-auto text-xs text-gray-400 hover:text-red-500">Changer</button>
                  </div>
                )}
              </div>
            )}

            {nouveauClient && (
              <div className="grid grid-cols-2 gap-4">
                <F label="Nom" required><input value={form.client_nom} onChange={e => set('client_nom', e.target.value)} className="input-field" placeholder="DUPONT" /></F>
                <F label="Prénom"><input value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} className="input-field" placeholder="Jean" /></F>
                <F label="Téléphone"><input value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} className="input-field" placeholder="06 XX XX XX XX" /></F>
                <F label="WhatsApp"><input value={form.client_whatsapp} onChange={e => set('client_whatsapp', e.target.value)} className="input-field" placeholder="06 XX XX XX XX" /></F>
                <F label="Email"><input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className="input-field" /></F>
                <F label="Date de naissance"><input type="date" value={form.client_date_naissance} onChange={e => set('client_date_naissance', e.target.value)} className="input-field" /></F>
                <F label="Profession"><input value={form.client_profession} onChange={e => set('client_profession', e.target.value)} className="input-field" /></F>
                <F label="Statut professionnel">
                  <select value={form.client_statut_pro} onChange={e => set('client_statut_pro', e.target.value)} className="input-field">
                    {['salarie','independant','fonctionnaire','sans_emploi','retraite','etudiant'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
                <F label="Revenus annuels nets (€)"><input type="number" value={form.client_revenus} onChange={e => set('client_revenus', e.target.value)} className="input-field" placeholder="0" /></F>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => {
              if (nouveauClient && !form.client_nom) { setError('Le nom du client est requis'); return }
              if (!nouveauClient && !clientSelectionne) { setError('Sélectionnez un client'); return }
              setError(''); setStep(2)
            }} className="btn-primary flex items-center gap-2">
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 — Accident */}
      {step === 2 && (
        <div className="card space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">Type d'accident</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => set('type_accident', t.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium text-left transition-colors ${form.type_accident === t.value ? 'border-cabinet-blue bg-blue-50 text-cabinet-blue' : 'border-gray-200 hover:border-gray-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <F label="Date de l'accident"><input type="date" value={form.date_accident} onChange={e => set('date_accident', e.target.value)} className="input-field" /></F>
              <F label="Lieu de l'accident"><input value={form.lieu_accident} onChange={e => set('lieu_accident', e.target.value)} className="input-field" /></F>
              <div className="col-span-2">
                <F label="Circonstances"><textarea value={form.circonstances} onChange={e => set('circonstances', e.target.value)} rows={3} className="input-field" placeholder="Décrire brièvement les circonstances..." /></F>
              </div>
              <F label="Assureur adverse"><input value={form.assureur_nom} onChange={e => set('assureur_nom', e.target.value)} className="input-field" /></F>
              <F label="Référence sinistre"><input value={form.assureur_ref} onChange={e => set('assureur_ref', e.target.value)} className="input-field" /></F>
              <F label="Responsable / Auteur"><input value={form.responsable_nom} onChange={e => set('responsable_nom', e.target.value)} className="input-field" /></F>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.refus_garantie} onChange={e => set('refus_garantie', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-600">Refus de garantie</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.procedure_fgao} onChange={e => set('procedure_fgao', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-600">Procédure FGAO</span>
                </label>
              </div>
              <div>
                <F label="Source">
                  <select value={form.source} onChange={e => set('source', e.target.value)} className="input-field">
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </F>
              </div>
              <div>
                <F label="Voie envisagée">
                  <select value={form.voie} onChange={e => set('voie', e.target.value)} className="input-field">
                    <option value="amiable">Amiable</option>
                    <option value="judiciaire">Judiciaire</option>
                  </select>
                </F>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Retour</button>
            <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2">Suivant <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Étape 3 — Affectation */}
      {step === 3 && (
        <div className="card space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <F label="Juriste responsable">
              <select value={form.juriste_id} onChange={e => set('juriste_id', e.target.value)} className="input-field">
                <option value="">— Non affecté —</option>
                {juristes.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>)}
              </select>
            </F>
            <F label="Avocat référent">
              <select value={form.avocat_id} onChange={e => set('avocat_id', e.target.value)} className="input-field">
                <option value="">— Non affecté —</option>
                {avocats.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </F>
            <F label="Apporteur d'affaires">
              <select value={form.apporteur_id} onChange={e => set('apporteur_id', e.target.value)} className="input-field">
                <option value="">— Aucun —</option>
                {apporteurs.map(a => <option key={a.id} value={a.id}>{a.nom} {a.prenom} ({a.type})</option>)}
              </select>
            </F>
            <F label="Priorité">
              <select value={form.priorite} onChange={e => set('priorite', e.target.value)} className="input-field">
                {[['basse','🔵 Basse'],['normale','⚪ Normale'],['haute','🟠 Haute'],['urgente','🔴 Urgente']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </F>
            <F label="Score potentiel (1-5)">
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => set('score_potentiel', String(n))}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${Number(form.score_potentiel) === n ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </F>
            <div className="col-span-2">
              <F label="Notes initiales"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className="input-field" placeholder="Observations, informations importantes..." /></F>
            </div>
          </div>

          {/* Résumé */}
          <div className="p-4 bg-gray-50 rounded-lg text-sm">
            <p className="font-semibold text-gray-700 mb-2">Récapitulatif</p>
            <div className="grid grid-cols-2 gap-1 text-gray-500">
              <span>Client :</span><span className="text-gray-800 font-medium">{clientSelectionne ? `${clientSelectionne.nom} ${clientSelectionne.prenom}` : `${form.client_nom.toUpperCase()} ${form.client_prenom}`}</span>
              <span>Type :</span><span className="text-gray-800">{TYPES.find(t => t.value === form.type_accident)?.label}</span>
              {form.date_accident && <><span>Date accident :</span><span className="text-gray-800">{new Date(form.date_accident).toLocaleDateString('fr-FR')}</span></>}
              <span>Voie :</span><span className="text-gray-800 capitalize">{form.voie}</span>
              <span>Source :</span><span className="text-gray-800">{SOURCES.find(s => s.value === form.source)?.label}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Retour</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
              {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/></> : '✓ Créer le dossier'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
