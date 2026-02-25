'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Calendar, Gavel, AlertTriangle, CheckCircle, Clock, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Filtre = 'tout' | 'deliberes' | 'audiences' | 'appels' | 'favorables'

export default function ProcedurePage() {
  const [procedures, setProcedures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('tout')

  useEffect(() => {
    supabase
      .from('procedures_judiciaires')
      .select(`
        *,
        dossier:dossiers(
          id, reference, voie, type_accident, etape,
          client:clients(nom, prenom),
          juriste:utilisateurs!dossiers_juriste_id_fkey(nom, prenom),
          avocat:utilisateurs!dossiers_avocat_id_fkey(nom, prenom)
        )
      `)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProcedures(data)
        setLoading(false)
      })
  }, [])

  const now = Date.now()

  const filtrees = useMemo(() => {
    switch (filtre) {
      case 'deliberes':
        return procedures.filter(p => p.date_delibere && new Date(p.date_delibere) > new Date() && p.decision === 'en_attente')
      case 'audiences':
        return procedures.filter(p => p.prochaine_audience && new Date(p.prochaine_audience) > new Date())
      case 'appels':
        return procedures.filter(p => p.appel_interjete)
      case 'favorables':
        return procedures.filter(p => p.decision === 'favorable' || p.decision === 'partiel')
      default:
        return procedures
    }
  }, [procedures, filtre])

  // Métriques
  const stats = useMemo(() => ({
    total: procedures.length,
    deliberesProchains: procedures.filter(p => {
      if (!p.date_delibere || p.decision !== 'en_attente') return false
      const j = Math.ceil((new Date(p.date_delibere).getTime() - now) / 86400000)
      return j >= 0 && j <= 30
    }).length,
    audiencesProchaines: procedures.filter(p => {
      if (!p.prochaine_audience) return false
      const j = Math.ceil((new Date(p.prochaine_audience).getTime() - now) / 86400000)
      return j >= 0 && j <= 15
    }).length,
    appels: procedures.filter(p => p.appel_interjete).length,
    favorables: procedures.filter(p => p.decision === 'favorable').length,
  }), [procedures, now])

  const FILTRES: [Filtre, string, number][] = [
    ['tout', 'Toutes les procédures', stats.total],
    ['deliberes', '⚖️ Délibérés à venir (30j)', stats.deliberesProchains],
    ['audiences', '📅 Audiences à venir (15j)', stats.audiencesProchaines],
    ['appels', '📋 Appels interjetés', stats.appels],
    ['favorables', '✓ Décisions favorables', stats.favorables],
  ]

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Suivi des procédures judiciaires</h1>
        <p className="text-gray-500 text-sm mt-1">{procedures.length} procédure{procedures.length > 1 ? 's' : ''} enregistrée{procedures.length > 1 ? 's' : ''}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card bg-red-50 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltre('deliberes')}>
          <div className="text-2xl font-bold text-red-600">{stats.deliberesProchains}</div>
          <div className="text-xs text-gray-500 mt-1">Délibérés ≤ 30 jours</div>
        </div>
        <div className="card bg-orange-50 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltre('audiences')}>
          <div className="text-2xl font-bold text-orange-600">{stats.audiencesProchaines}</div>
          <div className="text-xs text-gray-500 mt-1">Audiences ≤ 15 jours</div>
        </div>
        <div className="card bg-purple-50 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltre('appels')}>
          <div className="text-2xl font-bold text-purple-600">{stats.appels}</div>
          <div className="text-xs text-gray-500 mt-1">Appels interjetés</div>
        </div>
        <div className="card bg-green-50 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltre('favorables')}>
          <div className="text-2xl font-bold text-green-600">{stats.favorables}</div>
          <div className="text-xs text-gray-500 mt-1">Décisions favorables</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTRES.map(([v, l, count]) => (
          <button key={v} onClick={() => setFiltre(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filtre === v ? 'bg-cabinet-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {l} <span className={`text-xs px-1.5 py-0.5 rounded-full ${filtre === v ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Scale size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune procédure correspondante</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrees.map(p => {
            const client = p.dossier?.client
            const joursDelibere = p.date_delibere ? Math.ceil((new Date(p.date_delibere).getTime() - now) / 86400000) : null
            const joursAudience = p.prochaine_audience ? Math.ceil((new Date(p.prochaine_audience).getTime() - now) / 86400000) : null
            const isUrgentDelibere = joursDelibere !== null && joursDelibere >= 0 && joursDelibere <= 7
            const isUrgentAudience = joursAudience !== null && joursAudience >= 0 && joursAudience <= 7

            let borderColor = 'border-gray-200'
            if (p.appel_interjete) borderColor = 'border-purple-400'
            else if (isUrgentDelibere || isUrgentAudience) borderColor = 'border-red-400'
            else if (p.decision === 'favorable') borderColor = 'border-green-400'
            else if (p.decision === 'partiel') borderColor = 'border-yellow-400'
            else if (p.decision === 'defavorable') borderColor = 'border-red-300'
            else if (joursDelibere !== null && joursDelibere >= 0 && joursDelibere <= 30) borderColor = 'border-orange-300'

            return (
              <div key={p.id} className={`card border-l-4 ${borderColor}`}>
                <div className="flex items-start gap-4">
                  {/* Infos client + dossier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{client?.nom} {client?.prenom}</span>
                      <Link href={`/dossiers/${p.dossier?.id}`} className="text-xs font-mono text-cabinet-blue hover:underline flex items-center gap-0.5">
                        {p.dossier?.reference} <ChevronRight size={11} />
                      </Link>
                      {/* Badge décision */}
                      {p.decision && p.decision !== 'en_attente' ? (
                        <span className={`badge text-xs ${p.decision === 'favorable' ? 'bg-green-100 text-green-700' : p.decision === 'partiel' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                          {p.decision === 'favorable' ? '✓ Favorable' : p.decision === 'partiel' ? '~ Partiel' : '✗ Défavorable'}
                        </span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">En attente</span>
                      )}
                      {p.appel_interjete && <span className="badge bg-purple-100 text-purple-700 text-xs">📋 Appel</span>}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-400">Tribunal</div>
                        <div className="text-gray-700 font-medium">{p.tribunal || '—'}</div>
                        {p.numero_affaire && <div className="text-xs text-gray-400 font-mono">{p.numero_affaire}</div>}
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Assignation</div>
                        <div className="text-gray-600">{formatDate(p.date_assignation)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Avocat</div>
                        <div className="text-gray-600">{p.dossier?.avocat ? `${p.dossier.avocat.prenom} ${p.dossier.avocat.nom}` : '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Juriste</div>
                        <div className="text-gray-600">{p.dossier?.juriste ? `${p.dossier.juriste.prenom} ${p.dossier.juriste.nom}` : '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Dates clés à droite */}
                  <div className="flex-shrink-0 flex gap-3">
                    {/* Prochaine audience */}
                    {p.prochaine_audience && (
                      <div className={`text-center px-3 py-2 rounded-lg ${joursAudience !== null && joursAudience >= 0 ? (joursAudience <= 7 ? 'bg-red-50 border border-red-200' : joursAudience <= 15 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-100') : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Calendar size={10} /> Audience</div>
                        <div className={`text-sm font-bold ${joursAudience !== null && joursAudience >= 0 && joursAudience <= 7 ? 'text-red-600' : joursAudience !== null && joursAudience >= 0 && joursAudience <= 15 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {joursAudience !== null && joursAudience >= 0 ? `J-${joursAudience}` : formatDate(p.prochaine_audience)}
                        </div>
                        {joursAudience !== null && joursAudience >= 0 && (
                          <div className="text-xs text-gray-400">{formatDate(p.prochaine_audience)}</div>
                        )}
                      </div>
                    )}

                    {/* Délibéré */}
                    {p.date_delibere && p.decision === 'en_attente' && (
                      <div className={`text-center px-3 py-2 rounded-lg ${joursDelibere !== null && joursDelibere >= 0 ? (joursDelibere <= 7 ? 'bg-red-50 border border-red-200' : joursDelibere <= 30 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-100') : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Gavel size={10} /> Délibéré</div>
                        <div className={`text-sm font-bold ${joursDelibere !== null && joursDelibere >= 0 && joursDelibere <= 7 ? 'text-red-600' : joursDelibere !== null && joursDelibere >= 0 && joursDelibere <= 30 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {joursDelibere !== null && joursDelibere >= 0 ? `J-${joursDelibere}` : formatDate(p.date_delibere)}
                        </div>
                        {joursDelibere !== null && joursDelibere >= 0 && (
                          <div className="text-xs text-gray-400">{formatDate(p.date_delibere)}</div>
                        )}
                      </div>
                    )}

                    {/* Résultat si décision rendue */}
                    {p.decision && p.decision !== 'en_attente' && p.montant_alloue && (
                      <div className="text-center px-3 py-2 rounded-lg bg-green-50 border border-green-100">
                        <div className="text-xs text-gray-400 mb-0.5">Montant alloué</div>
                        <div className="text-sm font-bold text-green-700">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.montant_alloue)}
                        </div>
                        {p.article_700 && <div className="text-xs text-gray-400">Art. 700 : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.article_700)}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {p.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 italic">{p.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
