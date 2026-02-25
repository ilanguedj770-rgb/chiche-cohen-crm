'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Plus, ChevronRight, Clock, User, Search, CheckCircle, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TYPE_ACCIDENT_LABELS } from '@/lib/types'

const PRIORITE_COULEURS: Record<string, string> = {
  urgente: 'border-l-red-400 bg-red-50/30',
  haute: 'border-l-orange-400 bg-orange-50/20',
  normale: 'border-l-gray-200',
  basse: 'border-l-blue-200',
}

const SOURCE_LABELS: Record<string, string> = {
  telephone: '📞 Téléphone', whatsapp: '💬 WhatsApp', site_web: '🌐 Site web',
  recommandation: '🤝 Recommandation', apporteur: '💼 Apporteur', autre: '📋 Autre',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [filtrePriorite, setFiltrePriorite] = useState('')
  const [filtreSource, setFiltreSource] = useState('')

  const load = async () => {
    const { data } = await supabase.from('dossiers')
      .select('id, reference, created_at, source, type_accident, priorite, notes, voie, updated_at, client:clients(nom, prenom, telephone, email)')
      .eq('etape', 'qualification')
      .order('created_at', { ascending: false })
    if (data) setLeads(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtres = useMemo(() => leads.filter(l => {
    if (recherche) {
      const q = recherche.toLowerCase()
      if (!l.client?.nom?.toLowerCase().includes(q) && !l.client?.prenom?.toLowerCase().includes(q) && !l.reference?.includes(q)) return false
    }
    if (filtrePriorite && l.priorite !== filtrePriorite) return false
    if (filtreSource && l.source !== filtreSource) return false
    return true
  }), [leads, recherche, filtrePriorite, filtreSource])

  const avancer = async (id: string) => {
    setAdvancing(id)
    await supabase.from('dossiers').update({ etape: 'mandat' }).eq('id', id)
    await load()
    setAdvancing(null)
    setShowConfirm(null)
  }

  const archiver = async (id: string) => {
    await supabase.from('dossiers').update({ etape: 'archive' }).eq('id', id)
    await load()
    setShowConfirm(null)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  const urgents = leads.filter(l => l.priorite === 'urgente' || l.priorite === 'haute')

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Phone size={22} className="text-cabinet-blue" />Leads & Qualifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} dossier{leads.length > 1 ? 's' : ''} en qualification
            {urgents.length > 0 && <span className="text-red-500 font-medium ml-2">• {urgents.length} urgent{urgents.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Link href="/leads/nouveau" className="btn-primary flex items-center gap-2"><Plus size={16} />Nouveau lead</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total leads', value: leads.length, onClick: () => { setFiltrePriorite(''); setFiltreSource('') }, active: !filtrePriorite && !filtreSource },
          { label: '🔴 Urgents', value: leads.filter(l => l.priorite === 'urgente').length, onClick: () => setFiltrePriorite(p => p === 'urgente' ? '' : 'urgente'), active: filtrePriorite === 'urgente' },
          { label: '🟠 Haute priorité', value: leads.filter(l => l.priorite === 'haute').length, onClick: () => setFiltrePriorite(p => p === 'haute' ? '' : 'haute'), active: filtrePriorite === 'haute' },
          { label: '📞 Téléphone', value: leads.filter(l => l.source === 'telephone').length, onClick: () => setFiltreSource(p => p === 'telephone' ? '' : 'telephone'), active: filtreSource === 'telephone' },
        ].map(({ label, value, onClick, active }) => (
          <button key={label} onClick={onClick}
            className={`card text-center transition-all hover:shadow-md cursor-pointer ${active ? 'ring-2 ring-cabinet-blue' : ''}`}>
            <div className="text-2xl font-bold text-gray-700">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="input pl-9 w-full" />
        </div>
        <select value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)} className="input-field">
          <option value="">Toutes priorités</option>
          <option value="urgente">Urgente</option>
          <option value="haute">Haute</option>
          <option value="normale">Normale</option>
          <option value="basse">Basse</option>
        </select>
        <select value={filtreSource} onChange={e => setFiltreSource(e.target.value)} className="input-field">
          <option value="">Toutes sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filtrePriorite || filtreSource) && (
          <button onClick={() => { setFiltrePriorite(''); setFiltreSource('') }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X size={14} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Liste */}
      {filtres.length === 0 ? (
        <div className="card text-center py-16">
          <Phone size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 mb-4">Aucun lead trouvé</p>
          <Link href="/leads/nouveau" className="btn-primary inline-flex items-center gap-2"><Plus size={14} />Saisir un lead</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtres.map(l => {
            const joursDepuis = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000)
            return (
              <div key={l.id} className={`card flex items-center gap-4 border-l-4 ${PRIORITE_COULEURS[l.priorite] || PRIORITE_COULEURS.normale}`}>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-cabinet-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/dossiers/${l.id}`} className="font-semibold hover:text-cabinet-blue">{l.client?.nom} {l.client?.prenom}</Link>
                    {l.priorite === 'urgente' && <span className="badge bg-red-100 text-red-600 text-xs">🔴 Urgent</span>}
                    {l.priorite === 'haute' && <span className="badge bg-orange-100 text-orange-600 text-xs">🟠 Haute</span>}
                    {l.voie && <span className={`badge text-xs ${l.voie === 'judiciaire' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{l.voie}</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    <span>{(TYPE_ACCIDENT_LABELS as any)[l.type_accident] || l.type_accident}</span>
                    {l.client?.telephone && (
                      <a href={`tel:${l.client.telephone}`} className="hover:text-cabinet-blue">📞 {l.client.telephone}</a>
                    )}
                    <span>{SOURCE_LABELS[l.source] || l.source}</span>
                    <span className={`flex items-center gap-0.5 ${joursDepuis >= 3 ? 'text-orange-400 font-medium' : ''}`}>
                      <Clock size={10} /> {joursDepuis === 0 ? "Aujourd'hui" : `il y a ${joursDepuis}j`}
                    </span>
                  </div>
                  {l.notes && <p className="text-xs text-gray-500 mt-1 truncate max-w-xl">{l.notes}</p>}
                </div>
                {/* Actions rapides */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {showConfirm === l.id ? (
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                      <button onClick={() => avancer(l.id)} disabled={advancing === l.id}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600">
                        {advancing === l.id ? '...' : <><CheckCircle size={12} /> Passer au mandat</>}
                      </button>
                      <button onClick={() => archiver(l.id)} className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">Archiver</button>
                      <button onClick={() => setShowConfirm(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <Link href={`/dossiers/${l.id}`} className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                        Ouvrir <ChevronRight size={11} />
                      </Link>
                      <button onClick={() => setShowConfirm(l.id)}
                        className="px-2 py-1 bg-cabinet-blue/10 text-cabinet-blue rounded-lg text-xs font-medium hover:bg-cabinet-blue/20 flex items-center gap-1">
                        <ArrowRight size={11} /> Qualifier
                      </button>
                    </>
                  )}
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
