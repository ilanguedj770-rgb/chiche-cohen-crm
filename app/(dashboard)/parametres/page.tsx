'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Settings, Users, Building, Plus, Edit2, Save, X, Check, Shield, Mail } from 'lucide-react'

type Onglet = 'utilisateurs' | 'cabinet' | 'email'

const ROLE_LABELS: Record<string, string> = { admin: 'Administrateur', juriste: 'Juriste', avocat: 'Avocat', secretaire: 'Secrétaire', stagiaire: 'Stagiaire' }
const ROLE_COULEURS: Record<string, string> = { admin: 'bg-red-100 text-red-700', juriste: 'bg-blue-100 text-blue-700', avocat: 'bg-purple-100 text-purple-700', secretaire: 'bg-green-100 text-green-700', stagiaire: 'bg-gray-100 text-gray-600' }

export default function ParametresPage() {
  const [onglet, setOnglet] = useState<Onglet>('utilisateurs')
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ nom: '', prenom: '', email: '', role: 'juriste', initiales: '' })
  const [cabinet, setCabinet] = useState<any>(null)
  const [editCabinet, setEditCabinet] = useState(false)
  const [cabForm, setCabForm] = useState<any>({})

  const loadUtilisateurs = async () => {
    const { data } = await supabase.from('utilisateurs').select('*').order('nom')
    if (data) setUtilisateurs(data)
    setLoading(false)
  }

  const loadCabinet = async () => {
    const { data } = await supabase.from('cabinet_config').select('*').limit(1).maybeSingle()
    if (data) { setCabinet(data); setCabForm(data) }
  }

  useEffect(() => { loadUtilisateurs(); loadCabinet() }, [])

  const saveUser = async () => {
    setSaving(true)
    await supabase.from('utilisateurs').update({
      nom: editForm.nom, prenom: editForm.prenom, email: editForm.email,
      role: editForm.role, initiales: editForm.initiales, actif: editForm.actif,
    }).eq('id', editId)
    await loadUtilisateurs()
    setSaving(false)
    setEditId(null)
  }

  const createUser = async () => {
    if (!newForm.nom || !newForm.email) return
    setSaving(true)
    await supabase.from('utilisateurs').insert({
      ...newForm,
      initiales: newForm.initiales || `${newForm.prenom?.[0] || ''}${newForm.nom?.[0] || ''}`.toUpperCase(),
      actif: true,
    })
    await loadUtilisateurs()
    setSaving(false)
    setShowNew(false)
    setNewForm({ nom: '', prenom: '', email: '', role: 'juriste', initiales: '' })
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('utilisateurs').update({ actif: !actif }).eq('id', id)
    await loadUtilisateurs()
  }

  const saveCabinet = async () => {
    setSaving(true)
    if (cabinet) {
      await supabase.from('cabinet_config').update(cabForm).eq('id', cabinet.id)
    } else {
      await supabase.from('cabinet_config').insert(cabForm)
    }
    await loadCabinet()
    setSaving(false)
    setEditCabinet(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings size={22} className="text-cabinet-blue" />Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Configuration du cabinet et gestion des accès</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-8 border-b border-gray-200">
        {([['utilisateurs', 'Utilisateurs', <Users size={15} />], ['cabinet', 'Cabinet', <Building size={15} />], ['email', 'Email Gmail', <Mail size={15} />]] as [Onglet, string, any][]).map(([v, l, icon]) => (
          <button key={v} onClick={() => setOnglet(v)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${onglet === v ? 'border-cabinet-blue text-cabinet-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {icon} {l}
          </button>
        ))}
      </div>

      {/* Onglet Utilisateurs */}
      {onglet === 'utilisateurs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold">Équipe</h2>
              <p className="text-xs text-gray-400">{utilisateurs.filter(u => u.actif).length} actifs · {utilisateurs.length} au total</p>
            </div>
            <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
              <Plus size={14} /> Ajouter un membre
            </button>
          </div>

          {/* Formulaire nouveau */}
          {showNew && (
            <div className="card mb-4 border-t-4 border-cabinet-blue">
              <h3 className="font-semibold mb-4 text-sm">Nouveau membre</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[['prenom', 'Prénom'], ['nom', 'Nom *'], ['email', 'Email *']].map(([f, l]) => (
                  <div key={f}>
                    <label className="text-xs text-gray-500 font-medium block mb-1">{l}</label>
                    <input value={(newForm as any)[f]} onChange={e => setNewForm(p => ({ ...p, [f]: e.target.value }))} className="input-field" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Rôle</label>
                  <select value={newForm.role} onChange={e => setNewForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Initiales</label>
                  <input value={newForm.initiales} onChange={e => setNewForm(p => ({ ...p, initiales: e.target.value.toUpperCase() }))} className="input-field" maxLength={3} placeholder="Ex: JD" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createUser} disabled={saving || !newForm.nom || !newForm.email} className="btn-primary text-sm">{saving ? '...' : 'Créer'}</button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Annuler</button>
              </div>
            </div>
          )}

          {/* Table utilisateurs */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Membre', 'Rôle', 'Email', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateurs.map(u => editId === u.id ? (
                  <tr key={u.id} className="bg-blue-50/50">
                    <td className="px-4 py-2" colSpan={4}>
                      <div className="grid grid-cols-5 gap-2">
                        <input value={editForm.prenom || ''} onChange={e => setEditForm((f: any) => ({ ...f, prenom: e.target.value }))} className="input-field" placeholder="Prénom" />
                        <input value={editForm.nom || ''} onChange={e => setEditForm((f: any) => ({ ...f, nom: e.target.value }))} className="input-field" placeholder="Nom" />
                        <input value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} className="input-field" placeholder="Email" />
                        <select value={editForm.role || ''} onChange={e => setEditForm((f: any) => ({ ...f, role: e.target.value }))} className="input-field">
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <input value={editForm.initiales || ''} onChange={e => setEditForm((f: any) => ({ ...f, initiales: e.target.value.toUpperCase() }))} className="input-field" maxLength={3} placeholder="Init." />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={saveUser} disabled={saving} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"><Save size={13} /></button>
                        <button onClick={() => setEditId(null)} className="p-1.5 border border-gray-200 rounded hover:bg-gray-50"><X size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.actif ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cabinet-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.initiales || `${u.prenom?.[0] || ''}${u.nom?.[0] || ''}`}
                        </div>
                        <span className="font-medium text-sm">{u.prenom} {u.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${ROLE_COULEURS[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActif(u.id, u.actif)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors ${u.actif ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {u.actif ? <><Check size={10} /> Actif</> : <><X size={10} /> Inactif</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditId(u.id); setEditForm({ ...u }) }} className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 text-gray-400">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet Cabinet */}
      {onglet === 'cabinet' && (
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2"><Building size={16} className="text-gray-400" />Informations du cabinet</h2>
            {editCabinet ? (
              <div className="flex gap-2">
                <button onClick={() => setEditCabinet(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm flex items-center gap-1"><X size={13} /> Annuler</button>
                <button onClick={saveCabinet} disabled={saving} className="btn-primary flex items-center gap-2 text-sm py-1.5"><Save size={13} /> {saving ? '...' : 'Enregistrer'}</button>
              </div>
            ) : (
              <button onClick={() => setEditCabinet(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm flex items-center gap-1 text-gray-600 hover:bg-gray-50"><Edit2 size={13} /> Modifier</button>
            )}
          </div>
          {editCabinet ? (
            <div className="space-y-4">
              {[
                ['nom_cabinet', 'Nom du cabinet', 'text'],
                ['adresse', 'Adresse', 'text'],
                ['code_postal', 'Code postal', 'text'],
                ['ville', 'Ville', 'text'],
                ['telephone', 'Téléphone', 'text'],
                ['email', 'Email', 'email'],
                ['site_web', 'Site web', 'text'],
                ['siret', 'SIRET', 'text'],
                ['numero_barreau', 'N° Barreau', 'text'],
              ].map(([f, l, t]) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 font-medium block mb-1">{l}</label>
                  <input type={t} value={cabForm[f] || ''} onChange={e => setCabForm((p: any) => ({ ...p, [f]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Taux honoraires résultat par défaut (%)</label>
                <input type="number" value={cabForm.taux_honoraires_defaut || ''} onChange={e => setCabForm((p: any) => ({ ...p, taux_honoraires_defaut: e.target.value }))} className="input-field" min="0" max="100" />
              </div>
            </div>
          ) : cabinet ? (
            <div className="space-y-3">
              {[
                ['Cabinet', cabinet.nom_cabinet],
                ['Adresse', cabinet.adresse && `${cabinet.adresse}, ${cabinet.code_postal} ${cabinet.ville}`],
                ['Téléphone', cabinet.telephone],
                ['Email', cabinet.email],
                ['Site web', cabinet.site_web],
                ['SIRET', cabinet.siret],
                ['N° Barreau', cabinet.numero_barreau],
                ['Taux honoraires défaut', cabinet.taux_honoraires_defaut ? `${cabinet.taux_honoraires_defaut}%` : null],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l as string} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{l as string}</span>
                  <span className="text-sm font-medium">{v as string}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Building size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm mb-3">Aucune configuration cabinet</p>
              <button onClick={() => setEditCabinet(true)} className="btn-primary text-sm">Configurer</button>
            </div>
          )}
        </div>
      )}

      {/* Onglet Email */}
      {onglet === 'email' && (
        <EmailGmailTab />
      )}
    </div>
  )
}

function EmailGmailTab() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const success = searchParams?.get('success')
  const error = searchParams?.get('error')

  useEffect(() => {
    supabase.from('cabinet_config').select('gmail_connected, email').limit(1).single()
      .then(({ data, error }) => {
        setConfig(data || { gmail_connected: false })
        setLoading(false)
      })
  }, [])

  async function disconnect() {
    setDisconnecting(true)
    await supabase.from('cabinet_config').update({ gmail_connected: false, gmail_access_token: null, gmail_refresh_token: null, gmail_history_id: null }).eq('id', config?.id)
    setConfig((p: any) => ({ ...p, gmail_connected: false }))
    setDisconnecting(false)
  }

  function connect() {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${window.location.origin}/api/auth/gmail/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  // Si pas de config cabinet du tout, on affiche quand même le bouton connecter

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Connexion Gmail</h2>
      <p className="text-sm text-gray-500 mb-6">Connectez la boîte <strong>contact@ig-avocat.com</strong> pour envoyer des emails depuis le CRM et recevoir les réponses rattachées aux dossiers.</p>

      {success === 'connected' && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4 flex items-center gap-2">
          <Check size={16} /> Gmail connecté avec succès
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">
          Erreur de connexion Gmail. Réessayez.
        </div>
      )}

      <div className="card p-6">
        {config?.gmail_connected === true ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Gmail connecté</div>
                <div className="text-sm text-gray-500">{config.email || 'contact@ig-avocat.com'}</div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Envoi d'emails depuis le CRM</div>
              <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Rappels automatiques (expertises, audiences)</div>
              <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Réception et rattachement aux dossiers</div>
            </div>
            <button onClick={disconnect} disabled={disconnecting} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              {disconnecting ? 'Déconnexion...' : 'Déconnecter Gmail'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Mail size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-4">Gmail non connecté</p>
            <button onClick={connect} className="btn-primary flex items-center gap-2 mx-auto">
              <Mail size={15} /> Connecter contact@ig-avocat.com
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <strong>Rappels automatiques actifs :</strong>
        <ul className="mt-2 space-y-1 text-blue-600">
          <li>• Expertise médicale : rappel J-7 et J-2 au client</li>
          <li>• Audience : rappel J-15 et J-2 à l'avocat</li>
        </ul>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
