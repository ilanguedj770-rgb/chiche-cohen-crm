'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search, Users, Phone, Mail, MapPin, Briefcase, Calendar, FolderOpen
} from 'lucide-react'
import Link from 'next/link'

interface ClientAvecDossiers extends Client {
  nb_dossiers: number
  dernier_dossier_id?: string
  dernier_dossier_reference?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientAvecDossiers[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      // Charger les clients avec le nombre de dossiers
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsData) {
        // Pour chaque client, compter les dossiers
        const enriched = await Promise.all(
          clientsData.map(async (c: Client) => {
            const { data: dossiers } = await supabase
              .from('dossiers')
              .select('id, reference')
              .eq('client_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1)

            return {
              ...c,
              nb_dossiers: dossiers?.length ?? 0,
              dernier_dossier_id: dossiers?.[0]?.id,
              dernier_dossier_reference: dossiers?.[0]?.reference,
            } as ClientAvecDossiers
          })
        )

        // Re-compter les dossiers de chaque client
        const { data: counts } = await supabase
          .from('dossiers')
          .select('client_id')

        if (counts) {
          const countMap: Record<string, number> = {}
          counts.forEach((d: { client_id: string }) => {
            countMap[d.client_id] = (countMap[d.client_id] || 0) + 1
          })
          enriched.forEach(c => {
            c.nb_dossiers = countMap[c.id] || 0
          })
        }

        setClients(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredClients = clients.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return [c.nom, c.prenom, c.telephone, c.email, c.ville, c.profession]
      .filter(Boolean)
      .some(v => v!.toLowerCase().includes(s))
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" />
    </div>
  )

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredClients.length} client(s)</p>
        </div>
        <Link href="/dossiers/nouveau" className="btn-primary flex items-center gap-2">
          <Users size={16} />
          Nouveau client (via dossier)
        </Link>
      </div>

      {/* Recherche */}
      <div className="card mb-6 !p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email, ville..."
            className="input !pl-10"
          />
        </div>
      </div>

      {/* Liste des clients */}
      {filteredClients.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>{search ? 'Aucun client ne correspond à votre recherche' : 'Aucun client pour l\'instant'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredClients.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{c.nom} {c.prenom}</h3>
                  {c.created_at && (
                    <span className="text-xs text-gray-400">
                      Client depuis {format(parseISO(c.created_at), 'MMMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${c.nb_dossiers > 0 ? 'bg-cabinet-blue-light text-cabinet-blue' : 'bg-gray-100 text-gray-400'}`}>
                    <FolderOpen size={10} className="mr-1" /> {c.nb_dossiers} dossier(s)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {c.telephone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{c.telephone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
                    <Mail size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.ville && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{c.ville}</span>
                  </div>
                )}
                {c.profession && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{c.profession}</span>
                  </div>
                )}
                {c.date_naissance && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{format(parseISO(c.date_naissance), 'd MMMM yyyy', { locale: fr })}</span>
                  </div>
                )}
              </div>

              {c.dernier_dossier_id && (
                <div className="pt-3 border-t border-gray-100">
                  <Link
                    href={`/dossiers/${c.dernier_dossier_id}`}
                    className="text-xs text-cabinet-blue hover:underline font-mono"
                  >
                    Dernier dossier: {c.dernier_dossier_reference || 'Voir'}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
