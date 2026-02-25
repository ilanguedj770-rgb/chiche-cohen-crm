'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, MessageSquare, Mail, CheckCircle, Clock, Filter, X, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

const TYPE_ICONS: Record<string, any> = {
  telephone: <Phone size={14} className="text-blue-500" />,
  whatsapp: <MessageSquare size={14} className="text-green-500" />,
  email: <Mail size={14} className="text-purple-500" />,
  courrier: <Mail size={14} className="text-gray-500" />,
}

const TYPE_LABELS: Record<string, string> = {
  telephone: 'Téléphone', whatsapp: 'WhatsApp', email: 'Email', courrier: 'Courrier',
}

const STATUT_COULEURS: Record<string, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  effectuee: 'bg-green-100 text-green-700',
  sans_reponse: 'bg-gray-100 text-gray-600',
  planifiee: 'bg-blue-100 text-blue-700',
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente', effectuee: 'Effectuée', sans_reponse: 'Sans réponse', planifiee: 'Planifiée',
}

export default function RelancesPage() {
  const [relances, setRelances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('en_attente')
  const [filtreType, setFiltreType] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('relances')
      .select('*, dossier:dossiers(id, reference, etape, client:clients(nom, prenom, telephone))')
      .order('created_at', { ascending: false })
    if (data) setRelances(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtrees = useMemo(() => relances.filter(r => {
    if (filtreStatut && r.statut !== filtreStatut) return false
    if (filtreType && r.type !== filtreType) return false
    return true
  }), [relances, filtreStatut, filtreType])

  const marquerEffectuee = async (id: string) => {
    setCompleting(id)
    await supabase.from('relances').update({ statut: 'effectuee' }).eq('id', id)
    await load()
    setCompleting(null)
  }

  const stats = useMemo(() => ({
    enAttente: relances.filter(r => r.statut === 'en_attente').length,
    planifiees: relances.filter(r => r.statut === 'planifiee').length,
    effectuees: relances.filter(r => r.statut === 'effectuee').length,
    sansReponse: relances.filter(r => r.statut === 'sans_reponse').length,
  }), [relances])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Phone size={22} className="text-cabinet-blue" />Relances</h1>
          <p className="text-gray-500 text-sm mt-1">
            {stats.enAttente > 0
              ? <span className="text-orange-600 font-medium">{stats.enAttente} relance{stats.enAttente > 1 ? 's' : ''} en attente</span>
              : <span className="text-green-600">Tout est à jour ✓</span>
            }
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'En attente', value: stats.enAttente, color: 'text-orange-600', bg: 'bg-orange-50', statut: 'en_attente' },
          { label: 'Planifiées', value: stats.planifiees, color: 'text-blue-600', bg: 'bg-blue-50', statut: 'planifiee' },
          { label: 'Effectuées', value: stats.effectuees, color: 'text-green-600', bg: 'bg-green-50', statut: 'effectuee' },
          { label: 'Sans réponse', value: stats.sansReponse, color: 'text-gray-500', bg: 'bg-gray-50', statut: 'sans_reponse' },
        ].map(s => (
          <button key={s.statut} onClick={() => setFiltreStatut(p => p === s.statut ? '' : s.statut)}
            className={`card text-center transition-all hover:shadow-md ${filtreStatut === s.statut ? 'ring-2 ring-cabinet-blue' : ''}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-5">
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="input-field max-w-xs">
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filtreStatut || filtreType) && (
          <button onClick={() => { setFiltreStatut(''); setFiltreType('') }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X size={14} /> Réinitialiser
          </button>
        )}
        <span className="text-sm text-gray-400 ml-auto">{filtrees.length} résultat{filtrees.length > 1 ? 's' : ''}</span>
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Phone size={40} className="mx-auto mb-3 opacity-20" />
          <p>Aucune relance {filtreStatut ? `"${STATUT_LABELS[filtreStatut]}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrees.map(r => {
            const joursDepuis = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
            return (
              <div key={r.id} className="card flex items-center gap-4">
                <div className="flex-shrink-0">{TYPE_ICONS[r.type] || <Phone size={14} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/dossiers/${r.dossier?.id}`} className="font-medium text-sm hover:text-cabinet-blue">
                      {r.dossier?.client?.nom} {r.dossier?.client?.prenom}
                    </Link>
                    <span className={`badge text-xs ${STATUT_COULEURS[r.statut] || 'bg-gray-100 text-gray-600'}`}>{STATUT_LABELS[r.statut] || r.statut}</span>
                    <span className="text-xs text-gray-400">{TYPE_LABELS[r.type] || r.type}</span>
                  </div>
                  {r.motif && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.motif}</p>}
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-300">
                    <span className="font-mono">{r.dossier?.reference}</span>
                    {r.dossier?.client?.telephone && (
                      <a href={`tel:${r.dossier.client.telephone}`} className="hover:text-cabinet-blue">📞 {r.dossier.client.telephone}</a>
                    )}
                    <span className={joursDepuis >= 3 ? 'text-orange-400 font-medium' : ''}>
                      <Clock size={10} className="inline mr-0.5" />
                      {joursDepuis === 0 ? "Aujourd'hui" : `il y a ${joursDepuis}j`}
                    </span>
                  </div>
                  {r.resultat && <p className="text-xs text-green-600 mt-1">✓ {r.resultat}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/dossiers/${r.dossier?.id}`} className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                    Dossier <ChevronRight size={11} />
                  </Link>
                  {r.statut === 'en_attente' || r.statut === 'planifiee' ? (
                    <button onClick={() => marquerEffectuee(r.id)} disabled={completing === r.id}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100">
                      {completing === r.id ? '...' : <><CheckCircle size={11} /> Fait</>}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
