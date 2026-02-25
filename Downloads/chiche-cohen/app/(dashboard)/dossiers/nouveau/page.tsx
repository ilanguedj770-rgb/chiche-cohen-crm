'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import type { Utilisateur } from '@/lib/types'

export default function NouveauDossier() {
  const router = useRouter()
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    // Client
    client_nom: '',
    client_prenom: '',
    client_telephone: '',
    client_email: '',
    client_date_naissance: '',
    client_profession: '',
    // Dossier
    type_accident: 'accident_route',
    date_accident: '',
    lieu_accident: '',
    circonstances: '',
    assureur_nom: '',
    juriste_id: '',
    avocat_id: '',
    score_potentiel: '3',
    source: 'telephone',
    voie: 'judiciaire',
    notes: '',
  })

  useEffect(() => {
    supabase.from('utilisateurs').select('*').eq('actif', true).then(({ data }) => {
      if (data) setUtilisateurs(data)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Créer le client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          nom: form.client_nom.toUpperCase(),
          prenom: form.client_prenom,
          telephone: form.client_telephone,
          email: form.client_email || null,
          date_naissance: form.client_date_naissance || null,
          profession: form.client_profession || null,
        })
        .select()
        .single()

      if (clientError) throw clientError

      // 2. Créer le dossier
      const { data: dossier, error: dossierError } = await supabase
        .from('dossiers')
        .insert({
          client_id: client.id,
          type_accident: form.type_accident,
          date_accident: form.date_accident || null,
          lieu_accident: form.lieu_accident || null,
          circonstances: form.circonstances || null,
          assureur_nom: form.assureur_nom || null,
          juriste_id: form.juriste_id || null,
          avocat_id: form.avocat_id || null,
          score_potentiel: parseInt(form.score_potentiel),
          source: form.source,
          voie: form.voie,
          notes: form.notes || null,
          etape: 'qualification',
          reference: '',
        })
        .select()
        .single()

      if (dossierError) throw dossierError

      router.push(`/dossiers/${dossier.id}`)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la création du dossier')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const juristes = utilisateurs.filter(u => u.role === 'juriste' || u.role === 'collaborateur')
  const avocats = utilisateurs.filter(u => u.role === 'associe' || u.role === 'collaborateur')

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dossiers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau dossier</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Informations client</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *" required>
              <input type="text" required value={form.client_nom} onChange={e => set('client_nom', e.target.value)} className="input" placeholder="DUPONT" />
            </Field>
            <Field label="Prénom *" required>
              <input type="text" required value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} className="input" placeholder="Jean" />
            </Field>
            <Field label="Téléphone *">
              <input type="tel" required value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} className="input" placeholder="06 xx xx xx xx" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className="input" placeholder="jean@email.fr" />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={form.client_date_naissance} onChange={e => set('client_date_naissance', e.target.value)} className="input" />
            </Field>
            <Field label="Profession">
              <input type="text" value={form.client_profession} onChange={e => set('client_profession', e.target.value)} className="input" placeholder="Infirmier" />
            </Field>
          </div>
        </div>

        {/* Accident */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Informations accident</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type d'accident *">
              <select required value={form.type_accident} onChange={e => set('type_accident', e.target.value)} className="input">
                <option value="accident_route">🚗 Accident de la route</option>
                <option value="erreur_medicale">🏥 Erreur médicale</option>
                <option value="agression">⚖️ Agression</option>
                <option value="accident_vie">⚠️ Accident de la vie</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Date de l'accident">
              <input type="date" value={form.date_accident} onChange={e => set('date_accident', e.target.value)} className="input" />
            </Field>
            <Field label="Lieu de l'accident">
              <input type="text" value={form.lieu_accident} onChange={e => set('lieu_accident', e.target.value)} className="input" placeholder="Marseille, A7..." />
            </Field>
            <Field label="Assureur adverse">
              <input type="text" value={form.assureur_nom} onChange={e => set('assureur_nom', e.target.value)} className="input" placeholder="MAIF, AXA..." />
            </Field>
            <Field label="Circonstances" className="col-span-2">
              <textarea value={form.circonstances} onChange={e => set('circonstances', e.target.value)} className="input" rows={3} placeholder="Décrire brièvement les circonstances..." />
            </Field>
          </div>
        </div>

        {/* Attribution et paramètres */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Attribution et paramètres</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Juriste référent">
              <select value={form.juriste_id} onChange={e => set('juriste_id', e.target.value)} className="input">
                <option value="">— Non attribué —</option>
                {juristes.map(u => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Avocat responsable">
              <select value={form.avocat_id} onChange={e => set('avocat_id', e.target.value)} className="input">
                <option value="">— Non attribué —</option>
                {avocats.map(u => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Source du lead">
              <select value={form.source} onChange={e => set('source', e.target.value)} className="input">
                <option value="telephone">📞 Téléphone</option>
                <option value="recommandation">👥 Recommandation</option>
                <option value="apporteur">🤝 Apporteur</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="site_web">🌐 Site internet</option>
              </select>
            </Field>
            <Field label="Voie envisagée">
              <select value={form.voie} onChange={e => set('voie', e.target.value)} className="input">
                <option value="judiciaire">⚖️ Judiciaire (90%)</option>
                <option value="amiable">🤝 Amiable</option>
              </select>
            </Field>
            <Field label="Score de potentiel">
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('score_potentiel', String(n))}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      parseInt(form.score_potentiel) >= n
                        ? 'bg-cabinet-blue text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes internes">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input" rows={2} placeholder="Observations, points d'attention..." />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/dossiers" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Création...' : 'Créer le dossier'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children, className = '', required }: { label: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
