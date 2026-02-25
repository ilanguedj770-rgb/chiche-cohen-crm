'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Briefcase, Phone, Mail } from 'lucide-react'

export default function ApporteursPage() {
  const [apporteurs, setApporteurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', type: 'partenaire', profession: '', email: '', telephone: '', taux_commission: '10' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('apporteurs').select('*, dossiers:dossiers(id)').eq('actif', true).order('nom')
    if (data) setApporteurs(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    await supabase.from('apporteurs').insert({ ...form, taux_commission: Number(form.taux_commission) })
    await load()
    setForm({ nom: '', prenom: '', type: 'partenaire', profession: '', email: '', telephone: '', taux_commission: '10' })
    setShowForm(false)
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase size={22} className="text-cabinet-blue" />Apporteurs d'affaires</h1>
          <p className="text-gray-500 text-sm mt-1">{apporteurs.length} apporteur{apporteurs.length > 1 ? 's' : ''} actif{apporteurs.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} />Ajouter</button>
      </div>

      {showForm && (
        <div className="card mb-6 border-t-4 border-cabinet-blue">
          <h3 className="font-semibold mb-4">Nouvel apporteur</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[['nom','Nom*'],['prenom','Prénom'],['profession','Profession'],['email','Email'],['telephone','Téléphone'],['taux_commission','Commission (%)']].map(([f, l]) => (
              <div key={f}>
                <label className="text-xs text-gray-500 font-medium block mb-1">{l}</label>
                <input value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} className="input-field" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
                <option value="partenaire">Partenaire</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.nom} className="btn-primary">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {apporteurs.map(a => (
          <div key={a.id} className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-lg font-bold text-cabinet-blue flex-shrink-0">
              {a.nom[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{a.nom} {a.prenom}</div>
              <div className="text-xs text-gray-400">{a.type} • {a.profession || 'Non précisé'}</div>
              <div className="flex gap-3 mt-1">
                {a.telephone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{a.telephone}</span>}
                {a.email && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{a.email}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cabinet-blue">{a.dossiers?.length || 0}</div>
              <div className="text-xs text-gray-400">dossiers</div>
              <div className="text-xs text-gray-400 mt-0.5">{a.taux_commission}% commission</div>
            </div>
          </div>
        ))}
        {apporteurs.length === 0 && (
          <div className="col-span-2 card text-center py-12 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-20" />
            <p>Aucun apporteur enregistré</p>
          </div>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
