'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Phone, Mail, FolderOpen, X, UserPlus, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  nom: string
  prenom: string
  telephone?: string
  email?: string
  profession?: string
  created_at: string
  nb_dossiers?: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', profession: '', date_naissance: '' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clients')
        .select('*, dossiers(count)')
        .order('nom')
      if (data) {
        setClients(data.map((c: any) => ({
          ...c,
          nb_dossiers: c.dossiers?.[0]?.count ?? 0
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtres = clients.filter(c => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.telephone?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  const creerClient = async () => {
    if (!form.nom.trim()) return
    setSaving(true)
    const { data } = await supabase.from('clients').insert({
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim(),
      telephone: form.telephone || null,
      email: form.email || null,
      profession: form.profession || null,
      date_naissance: form.date_naissance || null,
    }).select().single()
    if (data) {
      router.push(`/clients/${data.id}`)
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Nouveau client
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Rechercher un client..." value={recherche} onChange={e => setRecherche(e.target.value)} className="input pl-9" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtres.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Aucun client trouvé</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client', 'Contact', 'Profession', 'Dossiers', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtres.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nom} {c.prenom}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Depuis {new Date(c.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.telephone && <div className="flex items-center gap-1 text-sm text-gray-600"><Phone size={12} />{c.telephone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5"><Mail size={12} />{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.profession ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600"><FolderOpen size={14} />{c.nb_dossiers}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="text-xs text-cabinet-blue hover:underline">Voir →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nouveau client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold">Nouveau client</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Nom *</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="input-field" placeholder="DUPONT" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className="input-field" placeholder="Marie" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="input-field" placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date de naissance</label>
                  <input type="date" value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="marie.dupont@email.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Profession</label>
                <input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} className="input-field" placeholder="Infirmière, Chauffeur..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={creerClient} disabled={saving || !form.nom.trim()} className="btn-primary flex items-center gap-2">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><UserPlus size={14} /> Créer et ouvrir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
