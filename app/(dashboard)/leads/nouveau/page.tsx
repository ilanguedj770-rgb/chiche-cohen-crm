'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Phone, User, Car, Stethoscope, Scale, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'

const SOURCES = [
  { value: 'appel_entrant', label: '📞 Appel entrant' },
  { value: 'recommandation', label: '🤝 Recommandation' },
  { value: 'apporteur', label: '💼 Apporteur d\'affaires' },
  { value: 'site_internet', label: '🌐 Site internet' },
  { value: 'autre', label: '➕ Autre' },
]

const TYPES_ACCIDENT = [
  { value: 'accident_route', label: '🚗 Accident de la route', icon: Car },
  { value: 'erreur_medicale', label: '🏥 Erreur médicale', icon: Stethoscope },
  { value: 'agression', label: '⚖️ Agression / Violence', icon: Scale },
  { value: 'accident_vie', label: '⚠️ Accident de la vie', icon: AlertCircle },
  { value: 'autre', label: '➕ Autre', icon: AlertCircle },
]

export default function NouveauLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Client
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    // Dossier
    type_accident: 'accident_route',
    date_accident: '',
    circonstances: '',
    source: 'appel_entrant',
    apporteur_nom: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.nom.trim() || !form.telephone.trim()) {
      setError('Le nom et le téléphone sont obligatoires.')
      return
    }
    setError('')
    setSaving(true)

    try {
      // 1. Créer le client
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert({ nom: form.nom.trim(), prenom: form.prenom.trim(), telephone: form.telephone.trim(), email: form.email.trim() || null })
        .select()
        .single()

      if (clientErr) throw clientErr

      // 2. Générer référence
      const ref = `CC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

      // 3. Créer le dossier en qualification
      const { data: dossier, error: dossierErr } = await supabase
        .from('dossiers')
        .insert({
          client_id: client.id,
          reference: ref,
          type_accident: form.type_accident,
          date_accident: form.date_accident || null,
          circonstances: form.circonstances || null,
          etape: 'qualification',
          source: form.source,
          notes: form.notes || null,
          priorite: 'normal',
          consolidation_atteinte: false,
          refus_garantie: false,
          procedure_fgao: false,
          procedure_civi: false,
          taux_honoraires_resultat: 15,
        })
        .select()
        .single()

      if (dossierErr) throw dossierErr

      setSaved(true)
      setTimeout(() => router.push(`/dossiers/${dossier.id}`), 1500)
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création')
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          <div className="text-xl font-bold text-gray-800">Lead créé !</div>
          <div className="text-gray-500 mt-1">Redirection vers le dossier…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Dossiers</span><ChevronRight size={14} /><span>Nouveau lead</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Phone size={24} className="text-cabinet-blue" />
          Nouveau lead — Saisie rapide
        </h1>
        <p className="text-gray-500 text-sm mt-1">Fiche à remplir en moins de 2 minutes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Identité client */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-cabinet-blue" />
            Identité de la victime
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nom *</label>
              <input className="form-input" placeholder="DUPONT" value={form.nom} onChange={e => set('nom', e.target.value.toUpperCase())} autoFocus />
            </div>
            <div>
              <label className="form-label">Prénom</label>
              <input className="form-input" placeholder="Jean" value={form.prenom} onChange={e => set('prenom', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Téléphone *</label>
              <input className="form-input" placeholder="06 12 34 56 78" type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" placeholder="jean.dupont@email.com" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Type d'accident */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-cabinet-blue" />
            Nature de l'accident
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {TYPES_ACCIDENT.map(t => (
              <button
                key={t.value}
                onClick={() => set('type_accident', t.value)}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${form.type_accident === t.value ? 'border-cabinet-blue bg-blue-50 font-medium text-cabinet-blue' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="form-label">Date de l'accident</label>
            <input className="form-input" type="date" value={form.date_accident} onChange={e => set('date_accident', e.target.value)} />
          </div>
        </div>

        {/* Source */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Source du contact</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {SOURCES.map(s => (
              <button
                key={s.value}
                onClick={() => set('source', s.value)}
                className={`p-2.5 rounded-lg border text-xs text-center transition-all ${form.source === s.value ? 'border-cabinet-blue bg-blue-50 font-medium text-cabinet-blue' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {form.source === 'apporteur' && (
            <div>
              <label className="form-label">Nom de l'apporteur</label>
              <input className="form-input" placeholder="Maître Durand, Dr. Martin…" value={form.apporteur_nom} onChange={e => set('apporteur_nom', e.target.value)} />
            </div>
          )}
        </div>

        {/* Notes rapides */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Notes rapides</h2>
          <textarea
            className="form-input resize-none"
            rows={3}
            placeholder="Circonstances, informations clés, urgences…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 py-3 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Création en cours…
              </span>
            ) : (
              '✓ Créer le dossier'
            )}
          </button>
          <button onClick={() => router.back()} className="btn-secondary px-6">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
