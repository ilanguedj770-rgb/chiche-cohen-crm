'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Plus, ChevronRight, Clock, User, Car } from 'lucide-react'
import Link from 'next/link'
import { TYPE_ACCIDENT_LABELS } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('dossiers')
      .select('id, reference, created_at, source, type_accident, priorite, notes, client:clients(nom, prenom, telephone)')
      .eq('etape', 'qualification')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLeads(data); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Phone size={22} className="text-cabinet-blue" />Leads & Qualifications</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} dossier{leads.length > 1 ? 's' : ''} en qualification</p>
        </div>
        <Link href="/leads/nouveau" className="btn-primary flex items-center gap-2"><Plus size={16} />Nouveau lead</Link>
      </div>

      {leads.length === 0 ? (
        <div className="card text-center py-16">
          <Phone size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 mb-4">Aucun lead en cours</p>
          <Link href="/leads/nouveau" className="btn-primary inline-flex items-center gap-2"><Plus size={14} />Saisir un lead</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(l => (
            <Link key={l.id} href={`/dossiers/${l.id}`}>
              <div className="card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-cabinet-blue" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{l.client?.nom} {l.client?.prenom}</span>
                    {l.priorite === 'urgente' && <span className="badge bg-red-100 text-red-600 text-xs">🔴 Urgent</span>}
                    {l.priorite === 'haute' && <span className="badge bg-orange-100 text-orange-600 text-xs">🟠 Haute</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{TYPE_ACCIDENT_LABELS[l.type_accident] || l.type_accident}</span>
                    {l.client?.telephone && <span>• {l.client.telephone}</span>}
                    <span>• {l.source}</span>
                  </div>
                  {l.notes && <p className="text-xs text-gray-500 mt-1 truncate max-w-xl">{l.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{new Date(l.created_at).toLocaleDateString('fr-FR')}</div>
                  <div className="text-xs font-mono text-gray-300 mt-0.5">{l.reference}</div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
