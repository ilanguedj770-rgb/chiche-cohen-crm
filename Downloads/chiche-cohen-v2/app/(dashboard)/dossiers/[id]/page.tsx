'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETAPES_LABELS, ETAPES_COULEURS, TYPE_ACCIDENT_LABELS, type Dossier, type Client, type Etape, type Expertise, type Audience } from '@/lib/types'
import { ArrowLeft, Phone, Mail, Calendar, Scale, Stethoscope, Euro, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const ETAPES_ORDRE: Etape[] = ['qualification','mandat','constitution_dossier','expertise_amiable','offre_assureur','negociation','procedure_judiciaire','transaction','encaissement']

function formatEuro(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export default function DossierDetail() {
  const { id } = useParams() as { id: string }
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [expertises, setExpertises] = useState<Expertise[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [tab, setTab] = useState<'detail'|'expertises'|'audiences'|'financier'>('detail')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: d } = await supabase.from('dossiers').select('*').eq('id', id).single()
      if (d) {
        setDossier(d)
        const [{ data: c }, { data: e }, { data: a }] = await Promise.all([
          supabase.from('clients').select('*').eq('id', d.client_id).single(),
          supabase.from('expertises').select('*').eq('dossier_id', id),
          supabase.from('audiences').select('*').eq('dossier_id', id).order('date_audience'),
        ])
        if (c) setClient(c)
        if (e) setExpertises(e)
        if (a) setAudiences(a)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const avancer = async () => {
    if (!dossier) return
    const idx = ETAPES_ORDRE.indexOf(dossier.etape)
    if (idx < ETAPES_ORDRE.length - 1) {
      const { data } = await supabase.from('dossiers').update({ etape: ETAPES_ORDRE[idx + 1] }).eq('id', id).select().single()
      if (data) setDossier(data)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cabinet-blue" /></div>
  if (!dossier || !client) return <div className="p-8 text-gray-500">Dossier introuvable</div>

  const idx = ETAPES_ORDRE.indexOf(dossier.etape)

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dossiers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>
              <span className={`badge ${ETAPES_COULEURS[dossier.etape]}`}>{ETAPES_LABELS[dossier.etape]}</span>
              {dossier.voie === 'judiciaire' && <span className="badge bg-red-50 text-red-600">⚖️ Judiciaire</span>}
            </div>
            <div className="flex gap-3 mt-1">
              <span className="text-sm font-mono text-gray-400">{dossier.reference}</span>
              <span className="text-sm text-gray-400">{TYPE_ACCIDENT_LABELS[dossier.type_accident]}</span>
            </div>
          </div>
        </div>
        {idx < ETAPES_ORDRE.length - 1 && (
          <button onClick={avancer} className="btn-primary flex items-center gap-2">
            → {ETAPES_LABELS[ETAPES_ORDRE[idx + 1]]} <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {ETAPES_ORDRE.map((e, i) => (
          <div key={e} className="flex items-center gap-1 flex-shrink-0">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${i === idx ? 'bg-cabinet-blue text-white' : i < idx ? 'bg-blue-100 text-cabinet-blue' : 'bg-gray-100 text-gray-400'}`}>
              {i < idx && '✓ '}{ETAPES_LABELS[e]}
            </div>
            {i < ETAPES_ORDRE.length - 1 && <div className={`w-4 h-0.5 ${i < idx ? 'bg-cabinet-blue' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[['detail','Détail'],['expertises',`Expertises (${expertises.length})`],['audiences',`Audiences (${audiences.length})`],['financier','Financier']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-cabinet-blue text-cabinet-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {tab === 'detail' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Client</h3>
            <div className="space-y-3">
              <Info icon={<Phone size={14} />} label="Téléphone" value={client.telephone} />
              <Info icon={<Mail size={14} />} label="Email" value={client.email} />
              <Info icon={<Calendar size={14} />} label="Naissance" value={client.date_naissance ? new Date(client.date_naissance).toLocaleDateString('fr-FR') : undefined} />
              <Info label="Profession" value={client.profession} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Accident</h3>
            <div className="space-y-3">
              <Info label="Type" value={TYPE_ACCIDENT_LABELS[dossier.type_accident]} />
              <Info label="Date" value={dossier.date_accident ? new Date(dossier.date_accident).toLocaleDateString('fr-FR') : undefined} />
              <Info label="Lieu" value={dossier.lieu_accident} />
              <Info label="Assureur" value={dossier.assureur_nom} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Statut</h3>
            <div className="space-y-2">
              <Flag label="Consolidation atteinte" active={dossier.consolidation_atteinte} />
              <Flag label="Refus de garantie" active={dossier.refus_garantie} danger />
              <Flag label="Procédure FGAO" active={dossier.procedure_fgao} />
              <Flag label="Procédure CIVI" active={dossier.procedure_civi} />
            </div>
            {dossier.notes && <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">{dossier.notes}</div>}
          </div>
        </div>
      )}

      {tab === 'expertises' && (
        <div className="space-y-4">
          {expertises.length === 0 && <p className="text-center text-gray-400 py-12">Aucune expertise</p>}
          {expertises.map(e => (
            <div key={e.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <Stethoscope size={16} className="text-purple-500" />
                <span className="font-semibold capitalize">{e.type}</span>
                {e.date_expertise && <span className="text-sm text-gray-400">{new Date(e.date_expertise).toLocaleDateString('fr-FR')}</span>}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Info label="Expert" value={e.expert_nom} />
                <Info label="Médecin conseil" value={e.medecin_conseil_nom} />
                <Info label="DFP" value={e.taux_dfp ? `${e.taux_dfp}%` : undefined} />
                <Info label="ITT (jours)" value={e.duree_itt_jours?.toString()} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audiences' && (
        <div className="space-y-3">
          {audiences.length === 0 && <p className="text-center text-gray-400 py-12">Aucune audience</p>}
          {audiences.map(a => (
            <div key={a.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scale size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-semibold">{a.nature}</div>
                <div className="text-sm text-gray-400">{new Date(a.date_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}{a.tribunal && ` • ${a.tribunal}`}</div>
              </div>
              {a.resultat && <span className="badge bg-green-100 text-green-700 ml-auto">{a.resultat}</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'financier' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Offre assureur', value: dossier.offre_assureur, color: 'text-yellow-500' },
            { label: 'Montant réclamé', value: dossier.montant_reclame, color: 'text-blue-500' },
            { label: 'Montant obtenu', value: dossier.montant_obtenu, color: 'text-green-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <Euro size={24} className={`mx-auto mb-2 ${color}`} />
              <div className="text-2xl font-bold">{formatEuro(value)}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
          {dossier.offre_assureur && dossier.montant_obtenu && (
            <div className="col-span-3 card bg-green-50 border-green-100 text-center">
              <div className="text-3xl font-bold text-green-600">+{formatEuro(dossier.montant_obtenu - dossier.offre_assureur)}</div>
              <div className="text-sm text-green-600 mt-1">au-dessus de l'offre initiale</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">{icon}{value ?? <span className="text-gray-300">—</span>}</div>
    </div>
  )
}

function Flag({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${active ? (danger ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-50'}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${active ? (danger ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>{active ? '✓ Oui' : 'Non'}</span>
    </div>
  )
}

export const dynamic = 'force-dynamic'
