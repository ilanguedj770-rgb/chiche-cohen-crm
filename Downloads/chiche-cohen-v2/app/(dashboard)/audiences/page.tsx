'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, AlertTriangle, Plus, ChevronDown, Scale, Clock, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'

type Filtre = 'a_venir' | 'passees' | 'toutes'

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('a_venir')
  const [showModal, setShowModal] = useState(false)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ dossier_id: '', date_audience: '', heure: '09:00', tribunal: '', salle: '', nature: 'audience_orientation', avocat_id: '', notes: '' })

  const NATURES = [
    { value: 'audience_orientation', label: 'Audience d\'orientation' },
    { value: 'audience_fond', label: 'Audience au fond' },
    { value: 'delibere', label: 'Délibéré' },
    { value: 'refere', label: 'Référé' },
    { value: 'expertise_judiciaire', label: 'Expertise judiciaire' },
    { value: 'conciliation', label: 'Conciliation' },
  ]

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    let q = supabase.from('audiences')
      .select('*, dossier:dossiers(id, reference, client:clients(nom, prenom)), avocat:utilisateurs!audiences_avocat_id_fkey(nom, prenom)')
      .order('date_audience', { ascending: filtre !== 'passees' })

    if (filtre === 'a_venir') q = q.gte('date_audience', today)
    else if (filtre === 'passees') q = q.lt('date_audience', today)

    const { data } = await q.limit(50)
    if (data) setAudiences(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filtre])

  useEffect(() => {
    Promise.all([
      supabase.from('dossiers').select('id, reference, client:clients(nom, prenom)').not('etape', 'in', '(archive,encaissement)').order('reference'),
      supabase.from('utilisateurs').select('id, nom, prenom').eq('actif', true),
    ]).then(([{ data: d }, { data: u }]) => {
      if (d) setDossiers(d)
      if (u) setUtilisateurs(u)
    })
  }, [])

  const ajouter = async () => {
    if (!form.dossier_id || !form.date_audience) return
    setSaving(true)
    const dateTime = form.heure ? `${form.date_audience}T${form.heure}:00` : form.date_audience
    await supabase.from('audiences').insert({
      dossier_id: form.dossier_id,
      date_audience: dateTime,
      tribunal: form.tribunal || null,
      salle: form.salle || null,
      nature: form.nature,
      avocat_id: form.avocat_id || null,
      notes: form.notes || null,
      rappel_j15_envoye: false,
      rappel_j2_envoye: false,
    })
    await load()
    setSaving(false)
    setShowModal(false)
    setForm({ dossier_id: '', date_audience: '', heure: '09:00', tribunal: '', salle: '', nature: 'audience_orientation', avocat_id: '', notes: '' })
  }

  // Grouper par mois
  const parMois: Record<string, any[]> = {}
  audiences.forEach(a => {
    const mois = new Date(a.date_audience).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!parMois[mois]) parMois[mois] = []
    parMois[mois].push(a)
  })

  const comptesRendus = { total: audiences.length, urgentes: audiences.filter(a => { const j = Math.ceil((new Date(a.date_audience).getTime() - Date.now()) / 86400000); return j >= 0 && j <= 7 }).length }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audiences</h1>
          <p className="text-gray-500 text-sm mt-1">
            {comptesRendus.total} audience{comptesRendus.total > 1 ? 's' : ''}
            {filtre === 'a_venir' && comptesRendus.urgentes > 0 && <span className="text-red-500 font-medium ml-2">• {comptesRendus.urgentes} urgente{comptesRendus.urgentes > 1 ? 's' : ''} (≤ 7j)</span>}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouvelle audience
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {([['a_venir', 'À venir'], ['passees', 'Passées'], ['toutes', 'Toutes']] as [Filtre, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setFiltre(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtre === v ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      {audiences.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>{filtre === 'a_venir' ? 'Aucune audience à venir' : filtre === 'passees' ? 'Aucune audience passée' : 'Aucune audience'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(parMois).map(([mois, liste]) => (
            <div key={mois}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 capitalize">{mois}</h3>
              <div className="space-y-2">
                {liste.map(a => {
                  const jours = Math.ceil((new Date(a.date_audience).getTime() - Date.now()) / 86400000)
                  const passe = jours < 0
                  const urgente = !passe && jours <= 7
                  const borderColor = passe ? 'border-gray-200' : jours <= 2 ? 'border-red-400' : jours <= 7 ? 'border-orange-400' : 'border-cabinet-blue'

                  return (
                    <div key={a.id} className={`card flex items-center gap-5 border-l-4 ${borderColor} ${passe ? 'opacity-70' : ''}`}>
                      {/* Compte à rebours */}
                      <div className={`text-center w-14 flex-shrink-0 ${passe ? 'text-gray-400' : jours <= 2 ? 'text-red-500' : jours <= 7 ? 'text-orange-500' : 'text-cabinet-blue'}`}>
                        {passe
                          ? <><CheckCircle size={20} className="mx-auto mb-0.5" /><div className="text-xs">Passée</div></>
                          : <><div className="text-2xl font-bold leading-none">J-{jours}</div><div className="text-xs mt-0.5">jours</div></>
                        }
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {a.dossier?.client?.nom} {a.dossier?.client?.prenom}
                          </span>
                          {urgente && <span className="badge bg-red-100 text-red-600 text-xs flex items-center gap-1"><AlertTriangle size={10} />Urgent</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {new Date(a.date_audience).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {' • '}
                          {new Date(a.date_audience).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-gray-400">{NATURES.find(n => n.value === a.nature)?.label ?? a.nature}</span>
                          {a.tribunal && <span className="text-xs text-gray-400">• {a.tribunal}</span>}
                          {a.salle && <span className="text-xs text-gray-400">• Salle {a.salle}</span>}
                          {a.avocat && <span className="text-xs text-gray-400">• {a.avocat.prenom} {a.avocat.nom}</span>}
                        </div>
                      </div>

                      {/* Ref dossier + alertes */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Link href={`/dossiers/${a.dossier?.id}`} className="text-xs font-mono text-cabinet-blue hover:underline">
                          {a.dossier?.reference}
                        </Link>
                        <div className="flex gap-1">
                          {!a.rappel_j15_envoye && !passe && jours <= 15 && jours > 2 && (
                            <span className="badge bg-orange-100 text-orange-600 text-xs">J-15 à envoyer</span>
                          )}
                          {!a.rappel_j2_envoye && !passe && jours <= 2 && jours >= 0 && (
                            <span className="badge bg-red-100 text-red-600 text-xs">J-2 urgent</span>
                          )}
                        </div>
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
              <h2 className="text-lg font-bold">Nouvelle audience</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date *</label>
                  <input type="date" value={form.date_audience} onChange={e => setForm(f => ({ ...f, date_audience: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Heure</label>
                  <input type="time" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Nature</label>
                <select value={form.nature} onChange={e => setForm(f => ({ ...f, nature: e.target.value }))} className="input-field">
                  {NATURES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Tribunal</label>
                  <input value={form.tribunal} onChange={e => setForm(f => ({ ...f, tribunal: e.target.value }))} className="input-field" placeholder="TJ Marseille..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Salle</label>
                  <input value={form.salle} onChange={e => setForm(f => ({ ...f, salle: e.target.value }))} className="input-field" placeholder="Salle 3..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Avocat</label>
                <select value={form.avocat_id} onChange={e => setForm(f => ({ ...f, avocat_id: e.target.value }))} className="input-field">
                  <option value="">— Non affecté —</option>
                  {utilisateurs.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={ajouter} disabled={saving || !form.dossier_id || !form.date_audience} className="btn-primary flex items-center gap-2">
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
