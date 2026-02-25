'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { AudienceVue } from '@/lib/types'

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<AudienceVue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('vue_audiences_a_venir').select('*').then(({ data }) => {
      if (data) setAudiences(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audiences à venir</h1>
          <p className="text-gray-500 text-sm mt-1">{audiences.length} audience(s) dans les 30 prochains jours</p>
        </div>
      </div>

      {audiences.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune audience prévue dans les 30 prochains jours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiences.map(a => (
            <div key={a.id} className={`card flex items-center justify-between border-l-4 ${
              a.jours_avant_audience <= 2 ? 'border-red-400' :
              a.jours_avant_audience <= 7 ? 'border-orange-400' :
              'border-cabinet-blue'
            }`}>
              <div className="flex items-center gap-6">
                {/* Compte à rebours */}
                <div className={`text-center w-16 ${
                  a.jours_avant_audience <= 2 ? 'text-red-500' :
                  a.jours_avant_audience <= 7 ? 'text-orange-500' :
                  'text-cabinet-blue'
                }`}>
                  <div className="text-2xl font-bold">J-{a.jours_avant_audience}</div>
                  <div className="text-xs">jours</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{a.client_nom}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {format(parseISO(a.date_audience), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{a.nature}</span>
                    {a.tribunal && <span className="text-xs text-gray-400">• {a.tribunal}</span>}
                    {a.avocat_nom && <span className="text-xs text-gray-400">• {a.avocat_nom}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/dossiers/${a.id}`} className="text-xs text-cabinet-blue hover:underline font-mono">
                  {a.dossier_reference}
                </Link>
                <div className="flex gap-2">
                  {!a.rappel_j15_envoye && a.jours_avant_audience <= 15 && (
                    <span className="badge bg-orange-100 text-orange-600 flex items-center gap-1">
                      <AlertTriangle size={10} /> Rappel J-15 à envoyer
                    </span>
                  )}
                  {!a.rappel_j2_envoye && a.jours_avant_audience <= 2 && (
                    <span className="badge bg-red-100 text-red-600 flex items-center gap-1">
                      <AlertTriangle size={10} /> Rappel J-2 urgent
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
