'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, Mail, Calendar, FolderOpen } from 'lucide-react'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS } from '@/lib/types'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ClientDetail() {
  const { id } = useParams() as { id: string }
  const [client, setClient] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('dossiers').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ])
      if (c) setClient(c)
      if (d) setDossiers(d)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!client) return <div className="p-8 text-gray-500">Client introuvable</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>
          <p className="text-gray-500 text-sm">Client depuis {new Date(client.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card col-span-1">
          <h3 className="font-semibold mb-4">Informations</h3>
          <div className="space-y-3">
            {client.telephone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-gray-400" />{client.telephone}</div>}
            {client.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400" />{client.email}</div>}
            {client.date_naissance && <div className="flex items-center gap-2 text-sm"><Calendar size={14} className="text-gray-400" />{new Date(client.date_naissance).toLocaleDateString('fr-FR')}</div>}
            {client.profession && <div className="text-sm text-gray-600">{client.profession}</div>}
          </div>
        </div>

        <div className="card col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={16} className="text-cabinet-blue" />
            <h3 className="font-semibold">Dossiers ({dossiers.length})</h3>
          </div>
          {dossiers.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun dossier</p>
          ) : (
            <div className="space-y-2">
              {dossiers.map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <div>
                      <div className="text-sm font-mono text-cabinet-blue">{d.reference}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{TYPE_ACCIDENT_LABELS[d.type_accident as keyof typeof TYPE_ACCIDENT_LABELS]}</div>
                    </div>
                    <span className={`badge ${ETAPES_COULEURS[d.etape as keyof typeof ETAPES_COULEURS]}`}>{ETAPES_LABELS[d.etape as keyof typeof ETAPES_LABELS]}</span>
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
