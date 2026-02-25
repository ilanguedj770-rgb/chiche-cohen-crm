'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, FolderOpen, Users, Briefcase, User, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS } from '@/lib/types'

type Categorie = 'tous' | 'dossiers' | 'clients' | 'apporteurs'

export default function RecherchePage() {
  const searchParams = useSearchParams()
  const qInit = searchParams.get('q') || ''
  const [query, setQuery] = useState(qInit)
  const [categorie, setCategorie] = useState<Categorie>('tous')
  const [dossiers, setDossiers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [apporteurs, setApporteurs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const rechercher = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) return
    setLoading(true)
    const like = `%${q}%`

    const [{ data: dos }, { data: cli }, { data: app }] = await Promise.all([
      supabase.from('dossiers')
        .select('id, reference, etape, type_accident, created_at, client:clients(nom, prenom, telephone)')
        .or(`reference.ilike.${like},notes.ilike.${like}`)
        .neq('etape', 'archive')
        .limit(10),
      supabase.from('clients')
        .select('id, nom, prenom, telephone, email, profession')
        .or(`nom.ilike.${like},prenom.ilike.${like},telephone.ilike.${like},email.ilike.${like}`)
        .limit(10),
      supabase.from('apporteurs')
        .select('id, nom, prenom, telephone, email, type')
        .or(`nom.ilike.${like},prenom.ilike.${like},telephone.ilike.${like}`)
        .eq('actif', true)
        .limit(5),
    ])

    // Chercher aussi dans clients liés aux dossiers
    if (cli?.length) {
      const clientIds = cli.map((c: any) => c.id)
      const { data: dosClients } = await supabase.from('dossiers')
        .select('id, reference, etape, type_accident, created_at, client:clients(nom, prenom, telephone)')
        .in('client_id', clientIds)
        .neq('etape', 'archive')
        .limit(10)
      if (dosClients) {
        const existing = new Set(dos?.map((d: any) => d.id) || [])
        const extras = dosClients.filter((d: any) => !existing.has(d.id))
        setDossiers([...(dos || []), ...extras])
      } else {
        setDossiers(dos || [])
      }
    } else {
      setDossiers(dos || [])
    }

    setClients(cli || [])
    setApporteurs(app || [])
    setSearched(true)
    setLoading(false)
  }, [])

  useEffect(() => { if (qInit) rechercher(qInit) }, [qInit, rechercher])

  const totalResults = dossiers.length + clients.length + apporteurs.length

  const afficherDossiers = categorie === 'tous' || categorie === 'dossiers'
  const afficherClients = categorie === 'tous' || categorie === 'clients'
  const afficherApporteurs = categorie === 'tous' || categorie === 'apporteurs'

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Recherche</h1>

        {/* Barre de recherche */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rechercher(query)}
              placeholder="Nom client, référence, numéro de téléphone..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:border-cabinet-blue focus:ring-2 focus:ring-cabinet-blue/20 outline-none"
            />
          </div>
          <button onClick={() => rechercher(query)} disabled={loading || !query.trim()}
            className="btn-primary px-6 py-3 text-base">
            {loading ? <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-white" /> : 'Chercher'}
          </button>
        </div>
      </div>

      {searched && (
        <>
          {/* Résumé + filtres */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading ? 'Recherche en cours...' : `${totalResults} résultat${totalResults > 1 ? 's' : ''} pour « ${query} »`}
            </p>
            <div className="flex gap-1">
              {([
                ['tous', 'Tout', totalResults],
                ['dossiers', 'Dossiers', dossiers.length],
                ['clients', 'Clients', clients.length],
                ['apporteurs', 'Apporteurs', apporteurs.length],
              ] as [Categorie, string, number][]).map(([v, l, count]) => (
                <button key={v} onClick={() => setCategorie(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categorie === v ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              ))}
            </div>
          </div>

          {totalResults === 0 && !loading ? (
            <div className="card text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucun résultat pour « {query} »</p>
              <p className="text-xs mt-2">Vérifiez l'orthographe ou essayez un autre terme</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dossiers */}
              {afficherDossiers && dossiers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FolderOpen size={13} /> Dossiers ({dossiers.length})
                  </h3>
                  <div className="space-y-1.5">
                    {dossiers.map(d => (
                      <Link key={d.id} href={`/dossiers/${d.id}`}>
                        <div className="card flex items-center gap-4 py-3 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <FolderOpen size={16} className="text-cabinet-blue" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{d.client?.nom} {d.client?.prenom}</span>
                              <span className={`badge text-xs ${ETAPES_COULEURS[d.etape]}`}>{ETAPES_LABELS[d.etape]}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              <span className="font-mono">{d.reference}</span>
                              <span className="mx-1">·</span>
                              <span>{(TYPE_ACCIDENT_LABELS as any)[d.type_accident]}</span>
                              {d.client?.telephone && <><span className="mx-1">·</span><span>{d.client.telephone}</span></>}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients */}
              {afficherClients && clients.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={13} /> Clients ({clients.length})
                  </h3>
                  <div className="space-y-1.5">
                    {clients.map(c => (
                      <Link key={c.id} href={`/clients/${c.id}`}>
                        <div className="card flex items-center gap-4 py-3 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                            {c.nom?.[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{c.nom} {c.prenom}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {[c.telephone, c.email, c.profession].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Apporteurs */}
              {afficherApporteurs && apporteurs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Briefcase size={13} /> Apporteurs ({apporteurs.length})
                  </h3>
                  <div className="space-y-1.5">
                    {apporteurs.map(a => (
                      <Link key={a.id} href={`/apporteurs/${a.id}`}>
                        <div className="card flex items-center gap-4 py-3 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-yellow-50 flex items-center justify-center text-sm font-bold text-yellow-700 flex-shrink-0">
                            {a.nom?.[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{a.nom} {a.prenom}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{a.type} {a.telephone && `· ${a.telephone}`}</div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="text-center py-16 text-gray-300">
          <Search size={48} className="mx-auto mb-4" />
          <p>Tapez votre recherche et appuyez sur Entrée</p>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
