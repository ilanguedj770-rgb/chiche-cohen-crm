'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function NouveauDossier() {
  const router = useRouter()
  const [utilisateurs, setUtilisateurs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_nom: '', client_prenom: '', client_telephone: '', client_email: '',
    client_date_naissance: '', client_profession: '',
    type_accident: 'accident_route', date_accident: '', lieu_accident: '',
    circonstances: '', assureur_nom: '', juriste_id: '', avocat_id: '',
    score_potentiel: '3', source: 'telephone', voie: 'judiciaire', notes: '',
  })

  useEffect(() => {
    supabase.from('utilisateurs').select('*').eq('actif', true).then(({ data }) => { if (data) setUtilisateurs(data) })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: client, error: ce } = await supabase.from('clients').insert({
        nom: form.client_nom.toUpperCase(), prenom: form.client_prenom,
        telephone: form.client_telephone, email: form.client_email || null,
        date_naissance: form.client_date_naissance || null, profession: form.client_profession || null,
      }).select().single()
      if (ce) throw ce

      const { data: dossier, error: de } = await supabase.from('dossiers').insert({
        client_id: client.id, type_accident: form.type_accident,
        date_accident: form.date_accident || null, lieu_accident: form.lieu_accident || null,
        circonstances: form.circonstances || null, assureur_nom: form.assureur_nom || null,
        juriste_id: form.juriste_id || null, avocat_id: form.avocat_id || null,
        score_potentiel: parseInt(form.score_potentiel), source: form.source,
        voie: form.voie, notes: form.notes || null, etape: 'qualification', reference: '',
      }).select().single()
      if (de) throw de

      router.push(`/dossiers/${dossier.id}`)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la création')
    } finally { setLoading(false) }
  }

  const juristes = utilisateurs.filter(u => ['juriste', 'collaborateur'].includes(u.role))
  const avocats = utilisateurs.filter(u => ['associe', 'collaborateur'].includes(u.role))

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dossiers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">Nouveau dossier</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Client</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *"><input required className="input" value={form.client_nom} onChange={e => set('client_nom', e.target.value)} placeholder="DUPONT" /></Field>
            <Field label="Prénom *"><input required className="input" value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} placeholder="Jean" /></Field>
            <Field label="Téléphone *"><input required type="tel" className="input" value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} placeholder="06 xx xx xx xx" /></Field>
            <Field label="Email"><input type="email" className="input" value={form.client_email} onChange={e => set('client_email', e.target.value)} /></Field>
            <Field label="Date de naissance"><input type="date" className="input" value={form.client_date_naissance} onChange={e => set('client_date_naissance', e.target.value)} /></Field>
            <Field label="Profession"><input className="input" value={form.client_profession} onChange={e => set('client_profession', e.target.value)} /></Field>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Accident</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type *">
              <select required className="input" value={form.type_accident} onChange={e => set('type_accident', e.target.value)}>
                <option value="accident_route">🚗 Accident de la route</option>
                <option value="erreur_medicale">🏥 Erreur médicale</option>
                <option value="agression">⚖️ Agression</option>
                <option value="accident_vie">⚠️ Accident de la vie</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Date"><input type="date" className="input" value={form.date_accident} onChange={e => set('date_accident', e.target.value)} /></Field>
            <Field label="Lieu"><input className="input" value={form.lieu_accident} onChange={e => set('lieu_accident', e.target.value)} placeholder="Marseille, A7..." /></Field>
            <Field label="Assureur adverse"><input className="input" value={form.assureur_nom} onChange={e => set('assureur_nom', e.target.value)} placeholder="MAIF, AXA..." /></Field>
            <div className="col-span-2"><Field label="Circonstances"><textarea className="input" rows={3} value={form.circonstances} onChange={e => set('circonstances', e.target.value)} /></Field></div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Attribution</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Juriste">
              <select className="input" value={form.juriste_id} onChange={e => set('juriste_id', e.target.value)}>
                <option value="">— Non attribué —</option>
                {juristes.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </Field>
            <Field label="Avocat">
              <select className="input" value={form.avocat_id} onChange={e => set('avocat_id', e.target.value)}>
                <option value="">— Non attribué —</option>
                {avocats.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select className="input" value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="telephone">📞 Téléphone</option>
                <option value="recommandation">👥 Recommandation</option>
                <option value="apporteur">🤝 Apporteur</option>
                <option value="site_web">🌐 Site web</option>
              </select>
            </Field>
            <Field label="Voie">
              <select className="input" value={form.voie} onChange={e => set('voie', e.target.value)}>
                <option value="judiciaire">⚖️ Judiciaire</option>
                <option value="amiable">🤝 Amiable</option>
              </select>
            </Field>
            <Field label="Score potentiel">
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button type="button" key={n} onClick={() => set('score_potentiel', String(n))}
                    className={`w-8 h-8 rounded-full text-sm font-medium ${parseInt(form.score_potentiel) >= n ? 'bg-cabinet-blue text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4"><Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dossiers" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />{loading ? 'Création...' : 'Créer le dossier'}
          </button>
        </div>
      </form>
    </div>
  )
}

export const dynamic = 'force-dynamic'
