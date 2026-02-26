import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, interpolateTemplate, buildTemplateVars } from '@/lib/gmail'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, subject, corps, dossier_id, client_id, template_type, envoye_par } = body

    if (!to || !subject || !corps) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Envoyer via Gmail API
    const result = await sendEmail({ to, subject, body: corps })

    // Logger en base
    await supabase.from('emails').insert({
      dossier_id: dossier_id || null,
      client_id: client_id || null,
      direction: 'sent',
      from_email: process.env.GMAIL_CABINET_EMAIL || 'contact@cabinet.fr',
      to_email: to,
      subject,
      body_preview: corps.slice(0, 300),
      gmail_message_id: result.id,
      gmail_thread_id: result.threadId,
      template_type: template_type || null,
      envoye_par: envoye_par || null,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, messageId: result.id })
  } catch (e: any) {
    console.error('Send email error:', e)
    return NextResponse.json({ error: e.message || 'Erreur envoi' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dossier_id = searchParams.get('dossier_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('emails')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (dossier_id) {
    query = query.eq('dossier_id', dossier_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
