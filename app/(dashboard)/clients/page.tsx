'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Phone, Mail, FolderOpen } from 'lucide-react'
import Link from 'next/link'

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
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')

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

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s)</p>
        </div>
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
    </div>
  )
}

export const dynamic = 'force-dynamic'
