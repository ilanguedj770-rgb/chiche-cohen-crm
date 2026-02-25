'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { genererDocument, TEMPLATES, TypeDocument } from '@/lib/generate-word'
import { FileText, Download, Loader2, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function DocumentsModelesPage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [selectedDossier, setSelectedDossier] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [cabinet, setCabinet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<TypeDocument | null>(null)
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<'select' | 'generate'>('select')

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: c }] = await Promise.all([
        supabase.from('dossiers')
          .select('id, reference, etape, client:clients(id, nom, prenom, telephone, email, date_naissance, adresse, code_postal, ville)')
          .neq('etape', 'archive')
          .order('reference'),
        supabase.from('cabinet_config').select('*').limit(1).single(),
      ])
      if (d) setDossiers(d)
      if (c) setCabinet(c)
      setLoading(false)
    }
    load()
  }, [])

  async function selectDossier(d: any) {
    setSelectedDossier(d)
    setClient(d.client)
    // Charger le dossier complet
    const { data } = await supabase.from('dossiers').select('*').eq('id', d.id).single()
    if (data) setSelectedDossier({ ...d, ...data })
    setStep('generate')
  }

  async function generer(type: TypeDocument) {
    if (!selectedDossier || !client) return
    setGenerating(type)
    try {
      const blob = await genererDocument({ type, dossier: selectedDossier, client, cabinet })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const labels: Record<TypeDocument, string> = {
        lettre_mission: 'Lettre_Mission',
        mise_en_demeure: 'Mise_en_Demeure',
        courrier_synthese: 'Synthese_Dossier',
        demande_pieces: 'Demande_Pieces',
      }
      a.href = url
      a.download = `${labels[type]}_${selectedDossier.reference}_${client.nom}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
    setGenerating(null)
  }

  const filtres = dossiers.filter(d => {
    const q = search.toLowerCase()
    if (!q) return true
    const ref = d.reference?.toLowerCase() || ''
    const nom = `${d.client?.nom} ${d.client?.prenom}`.toLowerCase()
    return ref.includes(q) || nom.includes(q)
  })

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={22} className="text-cabinet-blue" />
            Générateur de documents
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Créez des courriers et documents pré-remplis au format Word</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Colonne gauche — sélection dossier */}
        <div className="col-span-2">
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {step === 'generate' && selectedDossier
                ? <button onClick={() => setStep('select')} className="text-cabinet-blue hover:underline flex items-center gap-1">← Changer de dossier</button>
                : '1. Sélectionner un dossier'}
            </div>

            {step === 'generate' && selectedDossier ? (
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="font-mono text-sm font-bold text-cabinet-blue">{selectedDossier.reference}</div>
                <div className="font-medium text-gray-900 mt-1">{client?.prenom} {client?.nom}</div>
                <div className="text-xs text-gray-500 mt-0.5">{client?.email}</div>
                <Link href={`/dossiers/${selectedDossier.id}`} className="text-xs text-cabinet-blue hover:underline mt-2 flex items-center gap-1">
                  Voir le dossier <ChevronRight size={12} />
                </Link>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un dossier..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:border-cabinet-blue focus:ring-1 focus:ring-cabinet-blue/20 outline-none"
                  />
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {filtres.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Aucun dossier trouvé</p>
                  ) : filtres.map(d => (
                    <button key={d.id} onClick={() => selectDossier(d)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-colors group">
                      <div className="font-mono text-xs text-cabinet-blue font-bold">{d.reference}</div>
                      <div className="text-sm font-medium text-gray-900">{d.client?.prenom} {d.client?.nom}</div>
                      <div className="text-xs text-gray-400 flex items-center justify-between mt-0.5">
                        <span>{d.etape?.replace(/_/g, ' ')}</span>
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cabinet-blue" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Colonne droite — templates */}
        <div className="col-span-3">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3 px-1">
            2. Choisir un document à générer
          </div>
          {!selectedDossier ? (
            <div className="card p-8 text-center text-gray-300">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-gray-400">Sélectionnez d'abord un dossier</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {TEMPLATES.map(t => (
                <button key={t.type} onClick={() => generer(t.type)}
                  disabled={!!generating}
                  className={`card p-5 text-left hover:shadow-lg transition-all group border-2
                    ${generating === t.type ? 'border-cabinet-blue bg-blue-50' : 'border-transparent hover:border-blue-200'}
                    ${generating && generating !== t.type ? 'opacity-50' : ''}
                  `}>
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <div className="font-semibold text-gray-900 mb-1">{t.label}</div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{t.description}</p>
                  <div className={`flex items-center gap-2 text-sm font-medium transition-colors
                    ${generating === t.type ? 'text-cabinet-blue' : 'text-gray-400 group-hover:text-cabinet-blue'}`}>
                    {generating === t.type ? (
                      <><Loader2 size={14} className="animate-spin" /> Génération...</>
                    ) : (
                      <><Download size={14} /> Télécharger .docx</>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedDossier && (
            <div className="mt-4 card p-4 bg-amber-50 border-amber-100">
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>💡 Astuce :</strong> Les documents sont pré-remplis avec les informations du dossier. Vous pouvez les modifier dans Word avant de les envoyer ou les imprimer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
