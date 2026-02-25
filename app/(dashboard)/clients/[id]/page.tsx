'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, Mail, Calendar, FolderOpen, Edit2, Save, X, MapPin, Euro, Briefcase, MessageSquare } from 'lucide-react'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type Etape } from '@/lib/types'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function ClientDetail() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [relances, setRelances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: d }, { data: r }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('dossiers').select('id, reference, etape, type_accident, created_at, montant_obtenu').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('relances').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
      ])
      if (c) { setClient(c); setForm(c) }
      if (d) setDossiers(d)
      if (r) setRelances(r)
      setLoading(false)
    }
    load()
  }, [id])

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.from('clients').update({
      nom: form.nom, prenom: form.prenom, telephone: form.telephone,
      telephone_whatsapp: form.telephone_whatsapp, email: form.email,
      adresse: form.adresse, code_postal: form.code_postal, ville: form.ville,
      profession: form.profession, statut_professionnel: form.statut_professionnel,
      revenus_annuels_nets: form.revenus_annuels_nets ? Number(form.revenus_annuels_nets) : null,
    }).eq('id', id).select().single()
    if (data) setClient(data)
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!client) return <div className="p-8 text-gray-500">Client introuvable</div>

  const totalObtenu = dossiers.reduce((s: number, d: any) => s + (d.montant_obtenu || 0), 0)
  const age = client.date_naissance ? Math.floor((Date.now() - new Date(client.date_naissance).getTime()) / (365.25 * 86400000)) : null

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{age && `${age} ans • `}{client.statut_professionnel && `${client.statut_professionnel} • `}{dossiers.length} dossier{dossiers.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(client) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-1 hover:bg-gray-50"><X size={14} /> Annuler</button>
              <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2"><Save size={14} />{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50"><Edit2 size={14} /> Modifier</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          <div className="card">
            <h3 className="font-semibold mb-4 text-sm text-gray-700">Coordonnées</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                {[['nom','Nom*'],['prenom','Prénom*'],['telephone','Téléphone'],['telephone_whatsapp','WhatsApp'],['email','Email'],['adresse','Adresse'],['code_postal','Code postal'],['ville','Ville']].map(([f,l]) => (
                  <div key={f}><label className="text-xs text-gray-500 font-medium block mb-1">{l}</label><input value={form[f] || ''} onChange={e => setForm((p: any) => ({...p,[f]:e.target.value}))} className="input-field" /></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {client.telephone && <Row icon={<Phone size={12}/>} label="Téléphone" value={client.telephone} />}
                {client.telephone_whatsapp && <Row icon={<MessageSquare size={12}/>} label="WhatsApp" value={client.telephone_whatsapp} />}
                {client.email && <Row icon={<Mail size={12}/>} label="Email" value={client.email} />}
                {(client.adresse || client.ville) && <Row icon={<MapPin size={12}/>} label="Adresse" value={[client.adresse, client.code_postal, client.ville].filter(Boolean).join(', ')} />}
                {client.date_naissance && <Row icon={<Calendar size={12}/>} label="Date de naissance" value={new Date(client.date_naissance).toLocaleDateString('fr-FR')} />}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 text-sm text-gray-700">Situation professionnelle</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 font-medium block mb-1">Profession</label><input value={form.profession||''} onChange={e=>setForm((p:any)=>({...p,profession:e.target.value}))} className="input-field"/></div>
                <div><label className="text-xs text-gray-500 font-medium block mb-1">Statut</label>
                  <select value={form.statut_professionnel||''} onChange={e=>setForm((p:any)=>({...p,statut_professionnel:e.target.value}))} className="input-field">
                    <option value="">—</option>
                    {['salarie','independant','fonctionnaire','sans_emploi','retraite','etudiant'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-gray-500 font-medium block mb-1">Revenus annuels nets (€)</label><input type="number" value={form.revenus_annuels_nets||''} onChange={e=>setForm((p:any)=>({...p,revenus_annuels_nets:e.target.value}))} className="input-field" placeholder="0"/></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div><div className="text-xs text-gray-400">Profession</div><div className="text-sm font-medium mt-0.5">{client.profession||'—'}</div></div>
                <div><div className="text-xs text-gray-400">Statut</div><div className="text-sm font-medium mt-0.5">{client.statut_professionnel||'—'}</div></div>
                <div><div className="text-xs text-gray-400">Revenus nets</div><div className="text-sm font-medium mt-0.5">{client.revenus_annuels_nets ? new Intl.NumberFormat('fr-FR').format(client.revenus_annuels_nets)+' €' : '—'}</div></div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-700">Dossiers ({dossiers.length})</h3>
              {totalObtenu > 0 && <span className="text-sm font-bold text-green-600">{new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(totalObtenu)} obtenus</span>}
            </div>
            {dossiers.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Aucun dossier</p> : (
              <div className="space-y-2">
                {dossiers.map((d:any) => (
                  <Link key={d.id} href={`/dossiers/${d.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="text-sm font-medium">{d.reference}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{(TYPE_ACCIDENT_LABELS as any)[d.type_accident]||d.type_accident} • {new Date(d.created_at).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {d.montant_obtenu && <span className="text-sm font-semibold text-green-600">{new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(d.montant_obtenu)}</span>}
                        <span className={`badge text-xs ${ETAPES_COULEURS[d.etape as Etape]??'bg-gray-100 text-gray-600'}`}>{ETAPES_LABELS[d.etape as Etape]??d.etape}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {relances.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 text-sm text-gray-700">Historique relances</h3>
              <div className="space-y-2">
                {relances.map((r:any) => (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full ${r.statut==='envoye'?'bg-green-400':r.statut==='echec'?'bg-red-400':'bg-gray-300'}`}/>
                    <div className="flex-1"><div className="text-sm text-gray-700">{r.motif}</div><div className="text-xs text-gray-400">{r.type} • {new Date(r.created_at).toLocaleDateString('fr-FR')}</div></div>
                    <span className={`text-xs ${r.statut==='envoye'?'text-green-600':'text-gray-400'}`}>{r.statut}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Résumé</h3>
            <div className="space-y-3">
              {[
                ['Dossiers actifs', dossiers.filter((d:any)=>!['archive','encaissement'].includes(d.etape)).length],
                ['Dossiers clôturés', dossiers.filter((d:any)=>['archive','encaissement','transaction'].includes(d.etape)).length],
                ['Total obtenu', totalObtenu>0 ? new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(totalObtenu) : '—'],
                ['Client depuis', new Date(client.created_at).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})],
              ].map(([l,v]:any)=>(
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{l}</span>
                  <span className="font-semibold text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Actions rapides</h3>
            <div className="space-y-1">
              {client.telephone && <a href={`tel:${client.telephone}`} className="flex items-center gap-2 text-sm text-gray-600 p-2 rounded-lg hover:bg-gray-50"><Phone size={14} className="text-green-500"/>Appeler</a>}
              {client.telephone_whatsapp && <a href={`https://wa.me/${client.telephone_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 p-2 rounded-lg hover:bg-gray-50"><MessageSquare size={14} className="text-green-600"/>WhatsApp</a>}
              {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-gray-600 p-2 rounded-lg hover:bg-gray-50"><Mail size={14} className="text-blue-500"/>Email</a>}
            </div>
          </div>

          <div className={`card ${client.portail_actif?'border-l-4 border-green-400':'border-l-4 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Portail client</span>
              <span className={`text-xs font-medium ${client.portail_actif?'text-green-600':'text-gray-400'}`}>{client.portail_actif?'● Actif':'○ Inactif'}</span>
            </div>
            {client.portail_derniere_connexion && <p className="text-xs text-gray-400">Dernière connexion : {new Date(client.portail_derniere_connexion).toLocaleDateString('fr-FR')}</p>}
            {!client.portail_actif && (
              <button onClick={async()=>{await supabase.from('clients').update({portail_actif:true}).eq('id',id);setClient((c:any)=>({...c,portail_actif:true}))}} className="mt-2 text-xs text-cabinet-blue hover:underline">Activer le portail →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <div><div className="text-xs text-gray-400">{label}</div><div className="text-sm text-gray-700">{value}</div></div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
