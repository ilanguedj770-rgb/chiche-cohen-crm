import { supabase } from './supabase'

const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GMAIL_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`

export function getOAuthUrl() {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.access_token) {
    const expiry = new Date(Date.now() + data.expires_in * 1000).toISOString()
    await supabase.from('cabinet_config').update({
      gmail_access_token: data.access_token,
      gmail_token_expiry: expiry,
    }).eq('id', (await getCabinetConfig())?.id)
  }
  return data.access_token
}

export async function getCabinetConfig() {
  const { data } = await supabase.from('cabinet_config').select('*').limit(1).single()
  return data
}

export async function getValidAccessToken(): Promise<string | null> {
  const config = await getCabinetConfig()
  if (!config?.gmail_refresh_token) return null

  const expiry = config.gmail_token_expiry ? new Date(config.gmail_token_expiry) : null
  const isExpired = !expiry || expiry <= new Date(Date.now() + 60000)

  if (isExpired) {
    return await refreshAccessToken(config.gmail_refresh_token)
  }
  return config.gmail_access_token
}

export async function sendEmail({
  to,
  subject,
  body,
  replyToMessageId,
}: {
  to: string
  subject: string
  body: string
  replyToMessageId?: string
}) {
  const accessToken = await getValidAccessToken()
  if (!accessToken) throw new Error('Gmail non connecté')

  const config = await getCabinetConfig()
  const from = config?.email || process.env.GMAIL_CABINET_EMAIL || 'contact@cabinet.fr'

  // Encoder l'email en base64
  const emailLines = [
    `From: ${config?.nom_cabinet || 'Cabinet'} <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ]

  if (replyToMessageId) {
    emailLines.splice(3, 0, `In-Reply-To: ${replyToMessageId}`)
    emailLines.splice(4, 0, `References: ${replyToMessageId}`)
  }

  const raw = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erreur envoi Gmail')
  }

  return res.json()
}

export async function fetchNewEmails(maxResults = 20) {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return []

  const config = await getCabinetConfig()
  const historyId = config?.gmail_history_id

  let messages: any[] = []

  if (historyId) {
    // Récupérer uniquement les nouveaux depuis le dernier historyId
    const histRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded&maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const histData = await histRes.json()

    if (histData.history) {
      for (const h of histData.history) {
        if (h.messagesAdded) {
          messages.push(...h.messagesAdded.map((m: any) => m.message))
        }
      }
    }

    // Mettre à jour le historyId
    if (histData.historyId) {
      await supabase.from('cabinet_config').update({ gmail_history_id: histData.historyId })
        .eq('id', config?.id)
    }
  } else {
    // Premier appel : récupérer les X derniers emails
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const listData = await listRes.json()
    messages = listData.messages || []

    // Stocker le historyId initial
    const profileRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const profile = await profileRes.json()
    if (profile.historyId) {
      await supabase.from('cabinet_config').update({ gmail_history_id: profile.historyId })
        .eq('id', config?.id)
    }
  }

  return messages
}

export async function getEmailDetails(messageId: string) {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return null

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

export function parseEmailHeaders(headers: any[]) {
  const get = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
  return {
    from: get('From'),
    to: get('To'),
    subject: get('Subject'),
    date: get('Date'),
    messageId: get('Message-ID'),
    inReplyTo: get('In-Reply-To'),
  }
}

export function extractEmailBody(payload: any): string {
  if (!payload) return ''

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      const nested = extractEmailBody(part)
      if (nested) return nested
    }
  }

  return ''
}

// Chercher le dossier correspondant à un email
export async function findDossierFromEmail(subject: string, fromEmail: string, body: string): Promise<string | null> {
  // 1. Chercher une référence dossier dans le sujet ou le corps (format CC-YYYY-NNN)
  const refPattern = /\b([A-Z]{2,4}-\d{4}-\d{3,4})\b/g
  const allText = `${subject} ${body}`
  const matches = allText.match(refPattern)

  if (matches) {
    for (const ref of matches) {
      const { data } = await supabase.from('dossiers').select('id').eq('reference', ref).single()
      if (data) return data.id
    }
  }

  // 2. Chercher par email du client
  const emailPattern = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g
  const fromClean = fromEmail.match(emailPattern)?.[0]
  if (fromClean) {
    const { data } = await supabase
      .from('clients')
      .select('id, dossiers(id)')
      .eq('email', fromClean)
      .limit(1)
      .single()
    if (data?.dossiers && Array.isArray(data.dossiers) && data.dossiers.length > 0) {
      return (data.dossiers[0] as any).id
    }
  }

  return null
}

// Interpoler les variables dans un template
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  }
  return result
}

// Construire les variables depuis un dossier
export function buildTemplateVars(dossier: any, client: any, cabinet: any, extra: Record<string, string> = {}): Record<string, string> {
  const typeAccident: Record<string, string> = {
    accident_route: 'accident de la circulation',
    erreur_medicale: 'erreur médicale',
    agression: 'agression',
    accident_vie: 'accident de la vie courante',
    autre: 'préjudice corporel',
  }

  return {
    reference: dossier?.reference || '',
    prenom: client?.prenom || '',
    nom: client?.nom || '',
    objet_accident: typeAccident[dossier?.type_accident] || dossier?.type_accident || '',
    date_accident: dossier?.date_accident ? new Date(dossier.date_accident + 'T12:00:00').toLocaleDateString('fr-FR') : '',
    assureur_nom: dossier?.assureur_nom || '',
    offre_montant: dossier?.offre_assureur ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.offre_assureur) : '',
    cabinet_nom: cabinet?.nom_cabinet || 'Cabinet Chiche Cohen',
    cabinet_email: cabinet?.email || '',
    cabinet_telephone: cabinet?.telephone || '',
    ...extra,
  }
}
