import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('clients')
    .select('nom, prenom, telephone, telephone_whatsapp, email, date_naissance, adresse, code_postal, ville, profession, statut_professionnel, created_at')
    .order('nom')

  if (error) return NextResponse.json({ error }, { status: 500 })

  const headers = ['Nom', 'Prénom', 'Téléphone', 'WhatsApp', 'Email', 'Date naissance', 'Adresse', 'Code postal', 'Ville', 'Profession', 'Statut professionnel', 'Date création']
  const rows = (data || []).map((c: any) => [
    c.nom, c.prenom, c.telephone, c.telephone_whatsapp, c.email,
    c.date_naissance ? new Date(c.date_naissance).toLocaleDateString('fr-FR') : '',
    c.adresse, c.code_postal, c.ville, c.profession, c.statut_professionnel,
    c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '',
  ])

  const escape = (v: any) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clients_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
