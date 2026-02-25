import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ETAPES: Record<string, string> = {
  qualification: 'Qualification', mandat: 'Mandat', constitution_dossier: 'Constitution dossier',
  expertise_amiable: 'Expertise amiable', offre_assureur: 'Offre assureur',
  negociation: 'Négociation', procedure_judiciaire: 'Procédure judiciaire',
  transaction: 'Transaction', encaissement: 'Encaissement', archive: 'Archivé',
}

const TYPES: Record<string, string> = {
  accident_route: 'Accident de la route', erreur_medicale: 'Erreur médicale',
  agression: 'Agression', accident_vie: 'Accident de la vie', autre: 'Autre',
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('dossiers')
    .select(`
      reference, created_at, etape, type_accident, voie, priorite, source,
      date_accident, assureur_nom,
      offre_assureur, montant_reclame, montant_obtenu,
      honoraires_fixes, honoraires_resultat, taux_honoraires_resultat,
      client:clients(nom, prenom, telephone, email),
      juriste:utilisateurs!dossiers_juriste_id_fkey(nom, prenom)
    `)
    .neq('etape', 'archive')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error }, { status: 500 })

  const headers = [
    'Référence', 'Date création', 'Étape', 'Type accident', 'Voie', 'Priorité', 'Source',
    'Client nom', 'Client prénom', 'Client téléphone', 'Client email',
    'Date accident', 'Assureur',
    'Offre initiale (€)', 'Montant réclamé (€)', 'Montant obtenu (€)',
    'Honoraires fixes (€)', 'Honoraires résultat (€)', 'Taux honoraires (%)',
    'Juriste'
  ]

  const rows = (data || []).map((d: any) => [
    d.reference,
    d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '',
    ETAPES[d.etape] || d.etape,
    TYPES[d.type_accident] || d.type_accident,
    d.voie || '',
    d.priorite || '',
    d.source || '',
    d.client?.nom || '',
    d.client?.prenom || '',
    d.client?.telephone || '',
    d.client?.email || '',
    d.date_accident ? new Date(d.date_accident).toLocaleDateString('fr-FR') : '',
    d.assureur_nom || '',
    d.offre_assureur || '',
    d.montant_reclame || '',
    d.montant_obtenu || '',
    d.honoraires_fixes || '',
    d.honoraires_resultat || '',
    d.taux_honoraires_resultat || '',
    d.juriste ? `${d.juriste.prenom} ${d.juriste.nom}` : '',
  ])

  const escape = (v: any) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
  const bom = '\uFEFF'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dossiers_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
