'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Send, ChevronDown, Loader2, Sparkles } from 'lucide-react'

interface Props {
  onClose: () => void
  onSent: () => void
  dossier?: any
  client?: any
  replyTo?: any
  defaultTemplate?: string
}

const TYPE_ACCIDENT: Record<string, string> = {
  accident_route: 'accident de la circulation',
  erreur_medicale: 'erreur médicale',
  agression: 'agression',
  accident_vie: 'accident de la vie courante',
  autre: 'préjudice corporel',
}

export default function ComposeModal({ onClose, onSent, dossier: initDossier, client: initClient, replyTo, defaultTemplate }: Props) {
  const [templates, setTemplates] = useState<any[]>([])
  const [dossiers, setDossiers] = useState<any[]>([])
  const [cabinet, setCabinet] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  const [form, setForm] = useState({
    to: replyTo?.from_email?.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0] || initClient?.email || '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    corps: '',
    dossier_id: initDossier?.id || replyTo?.dossier_id || '',
    template_type: defaultTemplate || '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: d }, { data: c }] = await Promise.all([
        supabase.from('email_templates').select('*').eq('actif', true).order('label'),
        supabase.from('dossiers').select('id, reference, client:clients(id, nom, prenom, email)').neq('etape', 'archive').order('reference'),
        supabase.from('cabinet_config').select('*').limit(1).single(),
      ])
      if (t) setTemplates(t)
      if (d) setDossiers(d)
      if (c) setCabinet(c)

      // Appliquer template par défaut
      if (defaultTemplate && t) {
        const tpl = t.find((x: any) => x.type === defaultTemplate)
        if (tpl) applyTemplate(tpl, initDossier, initClient, c)
      }
    }
    load()
  }, [])

  function buildVars(dossierData: any, clientData: any, cabinetData: any) {
    const expert = dossierData?.expertises?.[0]
    return {
      reference: dossierData?.reference || '',
      prenom: clientData?.prenom || '',
      nom: clientData?.nom || '',
      objet_accident: TYPE_ACCIDENT[dossierData?.type_accident] || '',
      date_accident: dossierData?.date_accident ? new Date(dossierData.date_accident + 'T12:00:00').toLocaleDateString('fr-FR') : '',
      assureur_nom: dossierData?.assureur_nom || '',
      offre_montant: dossierData?.offre_assureur ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossierData.offre_assureur) : '',
      cabinet_nom: cabinetData?.nom_cabinet || 'Cabinet Chiche Cohen',
      cabinet_email: cabinetData?.email || '',
      cabinet_telephone: cabinetData?.telephone || '',
      date_expertise: expert?.date_expertise ? new Date(expert.date_expertise + 'T12:00:00').toLocaleDateString('fr-FR') : '',
      heure_expertise: expert?.heure_expertise?.slice(0, 5) || '',
      lieu_expertise: expert?.lieu_expertise || '',
      expert_nom: expert?.expert_nom || '',
      juriste_nom: dossierData?.juriste ? `${dossierData.juriste.prenom} ${dossierData.juriste.nom}` : '',
    }
  }

  function interpolate(text: string, vars: Record<string, string>) {
    let result = text
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), v)
    }
    return result
  }

  function applyTemplate(tpl: any, dossierData: any, clientData: any, cabinetData: any) {
    const vars = buildVars(dossierData, clientData, cabinetData)
    setForm(p => ({
      ...p,
      subject: interpolate(tpl.sujet, vars),
      corps: interpolate(tpl.corps, vars),
      template_type: tpl.type,
    }))
  }

  async function onSelectDossier(dossier_id: string) {
    setForm(p => ({ ...p, dossier_id }))
    if (!dossier_id) return

    // Charger les infos du dossier pour pré-remplir
    const { data: d } = await supabase
      .from('dossiers')
      .select('*, client:clients(*), juriste:utilisateurs!dossiers_juriste_id_fkey(nom, prenom)')
      .eq('id', dossier_id)
      .single()

    if (d?.client?.email && !form.to) {
      setForm(p => ({ ...p, to: d.client.email }))
    }
  }

  async function handleSend() {
    if (!form.to || !form.subject || !form.corps) {
      setError('Destinataire, sujet et message sont obligatoires')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.to,
          subject: form.subject,
          corps: form.corps,
          dossier_id: form.dossier_id || null,
          template_type: form.template_type || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      onSent()
    } catch (e: any) {
      setError(e.message)
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-end p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Send size={16} className="text-cabinet-blue" />
            {replyTo ? 'Répondre' : 'Nouvel email'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Templates */}
          <div className="relative">
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 text-cabinet-blue rounded-lg text-sm hover:bg-blue-100 transition-colors">
              <span className="flex items-center gap-2">
                <Sparkles size={14} />
                {form.template_type
                  ? templates.find(t => t.type === form.template_type)?.label || 'Template appliqué'
                  : 'Utiliser un template'}
              </span>
              <ChevronDown size={14} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                <div className="p-1">
                  {templates.map(t => (
                    <button key={t.type} onClick={async () => {
                      // Charger le dossier si sélectionné
                      let dossierData = initDossier
                      let clientData = initClient
                      if (form.dossier_id && !initDossier) {
                        const { data: d } = await supabase.from('dossiers').select('*, client:clients(*)').eq('id', form.dossier_id).single()
                        if (d) { dossierData = d; clientData = d.client }
                      }
                      applyTemplate(t, dossierData, clientData, cabinet)
                      setShowTemplates(false)
                    }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="text-sm font-medium text-gray-900">{t.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t.sujet}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dossier lié */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Dossier lié</label>
            <select value={form.dossier_id} onChange={e => onSelectDossier(e.target.value)} className="input-field">
              <option value="">— Aucun dossier —</option>
              {dossiers.map(d => (
                <option key={d.id} value={d.id}>{d.reference} — {(d.client as any)?.nom} {(d.client as any)?.prenom}</option>
              ))}
            </select>
          </div>

          {/* Destinataire */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">À *</label>
            <input type="email" value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
              className="input-field" placeholder="email@exemple.fr" />
          </div>

          {/* Sujet */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Sujet *</label>
            <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              className="input-field" placeholder="Objet de l'email" />
          </div>

          {/* Corps */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Message *</label>
            <textarea value={form.corps} onChange={e => setForm(p => ({ ...p, corps: e.target.value }))}
              className="input-field font-mono text-xs leading-relaxed" rows={12}
              placeholder="Rédigez votre message..." />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-2">
          <button onClick={handleSend} disabled={sending || !form.to || !form.subject || !form.corps}
            className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {sending ? <><Loader2 size={15} className="animate-spin" /> Envoi...</> : <><Send size={15} /> Envoyer</>}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
