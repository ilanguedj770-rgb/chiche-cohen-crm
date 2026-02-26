'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Send, Inbox, Search, RefreshCw, Plus, ChevronRight, Check, Clock, AlertCircle, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import ComposeModal from '@/components/emails/ComposeModal'

export default function EmailsPage() {
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'sent' | 'received' | 'non_rattaches'>('tous')
  const [selected, setSelected] = useState<any>(null)
  const [showCompose, setShowCompose] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: e }, { data: config }] = await Promise.all([
      supabase.from('emails').select('*, dossier:dossiers(reference), client:clients(nom, prenom)').order('sent_at', { ascending: false }).limit(100),
      supabase.from('cabinet_config').select('gmail_connected').limit(1).single(),
    ])
    if (e) setEmails(e)
    if (config) setGmailConnected(!!config.gmail_connected)
    setLoading(false)
  }

  async function pollEmails() {
    setPolling(true)
    try {
      await fetch('/api/emails/poll', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
      })
      await loadData()
    } catch (e) { console.error(e) }
    setPolling(false)
  }

  const filtered = useMemo(() => {
    let list = emails
    if (filtre === 'sent') list = list.filter(e => e.direction === 'sent')
    if (filtre === 'received') list = list.filter(e => e.direction === 'received')
    if (filtre === 'non_rattaches') list = list.filter(e => !e.dossier_id)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.subject?.toLowerCase().includes(q) ||
        e.from_email?.toLowerCase().includes(q) ||
        e.to_email?.toLowerCase().includes(q) ||
        e.dossier?.reference?.toLowerCase().includes(q)
      )
    }
    return list
  }, [emails, filtre, search])

  const stats = {
    total: emails.length,
    recus: emails.filter(e => e.direction === 'received').length,
    envoyes: emails.filter(e => e.direction === 'sent').length,
    nonLus: emails.filter(e => e.direction === 'received' && !e.lu).length,
    nonRattaches: emails.filter(e => !e.dossier_id).length,
  }

  if (!gmailConnected) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="card p-12">
          <Mail size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Gmail non connecté</h2>
          <p className="text-gray-500 mb-6">Connectez votre boîte Gmail pour envoyer des emails depuis le CRM et recevoir les emails rattachés aux dossiers.</p>
          <Link href="/parametres?tab=email" className="btn-primary inline-flex items-center gap-2">
            Connecter Gmail dans les paramètres
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Colonne gauche */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-gray-900 flex items-center gap-2">
              <Mail size={18} className="text-cabinet-blue" /> Emails
            </h1>
            <div className="flex items-center gap-1">
              <button onClick={pollEmails} disabled={polling}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Vérifier nouveaux emails">
                <RefreshCw size={15} className={polling ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setShowCompose(true)}
                className="p-1.5 rounded-lg bg-cabinet-blue text-white hover:bg-blue-700 transition-colors"
                title="Composer un email">
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Stats mini */}
          <div className="grid grid-cols-3 gap-1 text-center mb-3">
            <div className="text-xs">
              <div className="font-bold text-gray-900">{stats.recus}</div>
              <div className="text-gray-400">Reçus</div>
            </div>
            <div className="text-xs">
              <div className="font-bold text-gray-900">{stats.envoyes}</div>
              <div className="text-gray-400">Envoyés</div>
            </div>
            <div className="text-xs">
              <div className={`font-bold ${stats.nonRattaches > 0 ? 'text-orange-500' : 'text-gray-900'}`}>{stats.nonRattaches}</div>
              <div className="text-gray-400">Sans dossier</div>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:border-cabinet-blue outline-none" />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-1 p-2 border-b border-gray-100">
          {([
            ['tous', 'Tous'],
            ['received', 'Reçus'],
            ['sent', 'Envoyés'],
            ['non_rattaches', 'Sans dossier'],
          ] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltre(v)}
              className={`flex-1 text-xs py-1 rounded-lg transition-colors ${filtre === v ? 'bg-cabinet-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Liste emails */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cabinet-blue" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <Mail size={32} className="mx-auto mb-2" />
              <p className="text-xs">Aucun email</p>
            </div>
          ) : (
            filtered.map(email => (
              <button key={email.id} onClick={() => setSelected(email)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-blue-50/50 transition-colors
                  ${selected?.id === email.id ? 'bg-blue-50 border-l-2 border-l-cabinet-blue' : ''}
                  ${email.direction === 'received' && !email.lu ? 'bg-blue-50/30' : ''}
                `}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 ${email.direction === 'sent' ? 'text-blue-400' : 'text-green-400'}`}>
                    {email.direction === 'sent' ? <Send size={12} /> : <Inbox size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${email.direction === 'received' && !email.lu ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {email.direction === 'sent' ? `→ ${email.to_email}` : email.from_email.replace(/<.*>/, '').trim()}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(email.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${email.direction === 'received' && !email.lu ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                      {email.subject}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {email.dossier ? (
                        <span className="text-xs text-cabinet-blue font-mono">{email.dossier.reference}</span>
                      ) : (
                        <span className="text-xs text-orange-400 flex items-center gap-0.5">
                          <AlertCircle size={10} /> Sans dossier
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panneau détail email */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selected ? (
          <EmailDetail email={selected} onReload={loadData} onReply={() => setShowCompose(true)} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-3 opacity-30" />
              <p>Sélectionnez un email</p>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); loadData() }}
          replyTo={selected?.direction === 'received' ? selected : undefined}
        />
      )}
    </div>
  )
}

function EmailDetail({ email, onReload, onReply }: { email: any; onReload: () => void; onReply: () => void }) {
  const [rattaching, setRattaching] = useState(false)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [showRattach, setShowRattach] = useState(false)

  useEffect(() => {
    if (!email.lu && email.direction === 'received') {
      supabase.from('emails').update({ lu: true }).eq('id', email.id).then(() => onReload())
    }
  }, [email.id])

  async function loadDossiers() {
    const { data } = await supabase.from('dossiers').select('id, reference, client:clients(nom, prenom)').neq('etape', 'archive').order('reference')
    if (data) setDossiers(data)
    setShowRattach(true)
  }

  async function rattacher(dossier_id: string) {
    setRattaching(true)
    await supabase.from('emails').update({ dossier_id, rattache_auto: false }).eq('id', email.id)
    setShowRattach(false)
    setRattaching(false)
    onReload()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card p-6">
        {/* Header email */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{email.subject}</h2>
            <div className="space-y-1 text-sm text-gray-500">
              <div><span className="font-medium">De :</span> {email.from_email}</div>
              <div><span className="font-medium">À :</span> {email.to_email}</div>
              <div><span className="font-medium">Date :</span> {new Date(email.sent_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {email.direction === 'received' && (
              <button onClick={onReply} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <Send size={12} /> Répondre
              </button>
            )}
          </div>
        </div>

        {/* Rattachement dossier */}
        <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${email.dossier_id ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <FolderOpen size={16} className={email.dossier_id ? 'text-cabinet-blue' : 'text-orange-500'} />
          {email.dossier_id ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-gray-700">Rattaché au dossier</span>
              <Link href={`/dossiers/${email.dossier_id}`} className="font-mono text-sm text-cabinet-blue font-bold hover:underline flex items-center gap-1">
                {email.dossier?.reference} <ChevronRight size={12} />
              </Link>
              {email.rattache_auto && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Auto</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-orange-700">Non rattaché à un dossier</span>
              <button onClick={loadDossiers} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-200 transition-colors">
                Rattacher
              </button>
            </div>
          )}
        </div>

        {/* Sélecteur de rattachement */}
        {showRattach && (
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">Choisir le dossier</div>
            <div className="max-h-48 overflow-y-auto">
              {dossiers.map(d => (
                <button key={d.id} onClick={() => rattacher(d.id)}
                  className="w-full text-left p-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-2 transition-colors">
                  <span className="font-mono text-xs text-cabinet-blue font-bold">{d.reference}</span>
                  <span className="text-sm text-gray-700">{d.client?.prenom} {d.client?.nom}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Corps de l'email */}
        <div className="border-t border-gray-100 pt-4">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
            {email.body_preview || 'Contenu non disponible'}
          </pre>
        </div>
      </div>
    </div>
  )
}
