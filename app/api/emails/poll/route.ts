import { NextRequest, NextResponse } from 'next/server'
import { fetchNewEmails, getEmailDetails, parseEmailHeaders, extractEmailBody, findDossierFromEmail } from '@/lib/gmail'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // Vérifier le secret CRON
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const messages = await fetchNewEmails(50)
    let processed = 0
    let rattaches = 0

    for (const msg of messages) {
      // Vérifier si déjà traité
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .single()

      if (existing) continue

      // Récupérer les détails complets
      const details = await getEmailDetails(msg.id)
      if (!details || details.error) continue

      const headers = parseEmailHeaders(details.payload?.headers || [])
      const body = extractEmailBody(details.payload)

      // Chercher le dossier correspondant
      const dossier_id = await findDossierFromEmail(headers.subject, headers.from, body)
      if (dossier_id) rattaches++

      // Chercher le client
      let client_id = null
      const emailMatch = headers.from.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('email', emailMatch[0])
          .single()
        if (client) client_id = client.id
      }

      // Enregistrer en base
      await supabase.from('emails').insert({
        dossier_id,
        client_id,
        direction: 'received',
        from_email: headers.from,
        to_email: headers.to,
        subject: headers.subject,
        body_preview: body.slice(0, 300),
        gmail_message_id: msg.id,
        gmail_thread_id: details.threadId,
        rattache_auto: !!dossier_id,
        lu: false,
        sent_at: headers.date ? new Date(headers.date).toISOString() : new Date().toISOString(),
      })

      processed++
    }

    return NextResponse.json({ success: true, processed, rattaches })
  } catch (e: any) {
    console.error('Poll emails error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
