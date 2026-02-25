'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, Mail, Briefcase, Euro, FolderOpen, Edit2, Save, X, TrendingUp } from 'lucide-react'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS } from '@/lib/types'
import Link from 'next/link'
import { useParams } from 'next/navigation'

function eur(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export default function ApporteurDetail() {
  const { id } = useParams() as { id: string }
  const [apporteur, setApporteur] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: d }] = await Promise.all([
        supabase.from('apporteurs').select('*').eq('id', id).single(),
        supabase.from('dossiers')
          .select('id, reference, etape, type_accident, created_at, montant_obtenu, honoraires_resultat, honoraires_fixes, client:clients(nom, prenom)')
          .eq('apporteur_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (a) { setApporteur(a); setForm(a) }
      if (d) setDossiers(d)
      setLoading(false)
    }
    load()
  }, [id])

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.from('apporteurs').update({
      nom: form.nom, prenom: form.prenom, telephone: form.telephone,
      email: form.email, profession: form.profession, type: form.type,
      taux_commission: Number(form.taux_commission), notes: form.notes,
    }).eq('id', id).select().single()
    if (data) setApporteur(data)
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!apporteur) return <div className="p-8 text-gray-500">Apporteur introuvable</div>

  // Stats
  const clos = dossiers.filter(d => d.etape === 'encaissement' || d.etape === 'transaction')
  const caTotal = clos.reduce((s, d) => s + (d.montant_obtenu || 0), 0)
  const honorairesTotal = dossiers.reduce((s, d) => s + (d.honoraires_resultat || 0) + (d.honoraires_fixes || 0), 0)
  const commission = honorairesTotal * (apporteur.taux_commission / 100)

  return (
    <div className="p-8 max-w-5xl">
      {/* Retour */}
      <Link href="/apporteurs" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} /> Retour aux apporteurs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl font-bold text-cabinet-blue">
            {apporteur.nom[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{apporteur.nom} {apporteur.prenom}</h1>
            <p className="text-gray-500 text-sm">{apporteur.type} • {apporteur.profession || 'Profession non précisée'}</p>
            <div className="flex gap-3 mt-1">
              {apporteur.telephone && <a href={`tel:${apporteur.telephone}`} className="text-xs text-gray-400 flex items-center gap-1 hover:text-cabinet-blue"><Phone size={11} />{apporteur.telephone}</a>}
              {apporteur.email && <a href={`mailto:${apporteur.email}`} className="text-xs text-gray-400 flex items-center gap-1 hover:text-cabinet-blue"><Mail size={11} />{apporteur.email}</a>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm flex items-center gap-1"><X size={13} /> Annuler</button>
              <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm py-1.5"><Save size={13} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm flex items-center gap-1 text-gray-600 hover:bg-gray-50"><Edit2 size={13} /> Modifier</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Dossiers apportés', value: dossiers.length, icon: <FolderOpen size={18} className="text-cabinet-blue" />, bg: 'bg-blue-50' },
          { label: 'Dossiers clôturés', value: clos.length, icon: <TrendingUp size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'CA généré (clients)', value: eur(caTotal), icon: <Euro size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: `Commission estimée (${apporteur.taux_commission}%)`, value: eur(commission), icon: <Briefcase size={18} className="text-yellow-600" />, bg: 'bg-yellow-50' },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Formulaire / Infos */}
        <div className="card">
          <h3 className="font-semibold mb-4">Informations</h3>
          {editing ? (
            <div className="space-y-3">
              {[['nom', 'Nom'], ['prenom', 'Prénom'], ['telephone', 'Téléphone'], ['email', 'Email'], ['profession', 'Profession']].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 font-medium block mb-1">{l}</label>
                  <input value={form[f] || ''} onChange={e => setForm((p: any) => ({ ...p, [f]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Type</label>
                <select value={form.type || ''} onChange={e => setForm((p: any) => ({ ...p, type: e.target.value }))} className="input-field">
                  <option value="particulier">Particulier</option>
                  <option value="professionnel">Professionnel</option>
                  <option value="partenaire">Partenaire</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Taux commission (%)</label>
                <input type="number" min="0" max="100" value={form.taux_commission || ''} onChange={e => setForm((p: any) => ({ ...p, taux_commission: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} className="input-field" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                ['Type', apporteur.type],
                ['Profession', apporteur.profession],
                ['Téléphone', apporteur.telephone],
                ['Email', apporteur.email],
                ['Commission', `${apporteur.taux_commission}%`],
                ['Actif', apporteur.actif ? 'Oui' : 'Non'],
              ].map(([l, v]) => v ? (
                <div key={l} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{l}</span>
                  <span className="text-sm font-medium">{v}</span>
                </div>
              ) : null)}
              {apporteur.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-400 mb-1">Notes</div>
                  <p className="text-sm text-gray-600">{apporteur.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Liste dossiers */}
        <div className="col-span-2">
          <h3 className="font-semibold mb-4">Dossiers apportés ({dossiers.length})</h3>
          {dossiers.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <FolderOpen size={36} className="mx-auto mb-2 opacity-20" />
              <p>Aucun dossier apporté</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dossiers.map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`}>
                  <div className="card flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.client?.nom} {d.client?.prenom}</span>
                        <span className={`badge text-xs ${ETAPES_COULEURS[d.etape]}`}>{ETAPES_LABELS[d.etape]}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">{d.reference}</span>
                        <span>•</span>
                        <span>{(TYPE_ACCIDENT_LABELS as any)[d.type_accident] || d.type_accident}</span>
                        <span>•</span>
                        <span>{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    {d.montant_obtenu && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-green-600">{eur(d.montant_obtenu)}</div>
                        <div className="text-xs text-gray-400">obtenu</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
