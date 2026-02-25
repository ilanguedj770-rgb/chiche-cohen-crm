import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLEU = [26, 82, 160] as [number, number, number]
const GRIS = [100, 100, 100] as [number, number, number]
const GRIS_CLAIR = [240, 242, 245] as [number, number, number]
const NOIR = [30, 30, 30] as [number, number, number]

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

function eur(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function dateStr(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function exportDossierPDF(dossier: any, client: any, cabinet?: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = 210
  const margin = 18
  let y = 0

  // === EN-TÊTE ===
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, w, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(cabinet?.nom_cabinet || 'Cabinet Chiche Cohen', margin, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (cabinet?.adresse) doc.text(`${cabinet.adresse} — ${cabinet.code_postal} ${cabinet.ville}`, margin, 17)
  if (cabinet?.telephone) doc.text(`Tél: ${cabinet.telephone}`, margin, 22)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('RÉCAPITULATIF DOSSIER', w - margin - 1, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(dossier.reference, w - margin - 1, 18, { align: 'right' })
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, w - margin - 1, 23, { align: 'right' })

  y = 36

  // === IDENTITÉ CLIENT ===
  doc.setFillColor(...GRIS_CLAIR)
  doc.roundedRect(margin, y, w - margin * 2, 28, 3, 3, 'F')

  doc.setTextColor(...BLEU)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${client?.nom?.toUpperCase()} ${client?.prenom || ''}`, margin + 5, y + 8)

  doc.setTextColor(...GRIS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  const infosClient = [
    client?.date_naissance && `Né(e) le ${dateStr(client.date_naissance)}`,
    client?.telephone && `📞 ${client.telephone}`,
    client?.email && `✉ ${client.email}`,
    client?.profession && `Profession: ${client.profession}`,
    client?.adresse && `${client.adresse}, ${client.code_postal} ${client.ville}`,
  ].filter(Boolean)

  const col1 = infosClient.slice(0, Math.ceil(infosClient.length / 2))
  const col2 = infosClient.slice(Math.ceil(infosClient.length / 2))
  col1.forEach((line, i) => doc.text(line as string, margin + 5, y + 15 + i * 5))
  col2.forEach((line, i) => doc.text(line as string, margin + 90, y + 15 + i * 5))

  // Badge étape
  doc.setFillColor(...BLEU)
  doc.roundedRect(w - margin - 42, y + 4, 40, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(ETAPES[dossier.etape] || dossier.etape, w - margin - 22, y + 9.5, { align: 'center' })

  y += 35

  // === ACCIDENT ===
  sectionTitle(doc, 'ACCIDENT & CIRCONSTANCES', margin, y)
  y += 7

  const lignesAccident = [
    ['Type', TYPES[dossier.type_accident] || dossier.type_accident],
    ['Date', dateStr(dossier.date_accident)],
    ['Lieu', dossier.lieu_accident || '—'],
    ['Voie', dossier.voie === 'judiciaire' ? 'Judiciaire' : dossier.voie === 'amiable' ? 'Amiable' : '—'],
    ['Assureur', dossier.assureur_nom || '—'],
    ['Réf. sinistre', dossier.assureur_reference_sinistre || '—'],
  ]

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [], body: lignesAccident,
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', textColor: GRIS, fontSize: 8 }, 1: { textColor: NOIR, fontSize: 8 } },
    styles: { cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [252, 252, 252] },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  if (dossier.circonstances) {
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(margin, y, w - margin * 2, 20, 2, 2, 'FD')
    doc.setTextColor(...GRIS)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('Circonstances', margin + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    const lines = doc.splitTextToSize(dossier.circonstances, w - margin * 2 - 6)
    doc.text(lines.slice(0, 3), margin + 3, y + 10)
    y += 25
  }

  // === FINANCIER ===
  if (y > 220) { doc.addPage(); y = 20 }

  sectionTitle(doc, 'VOLET FINANCIER', margin, y)
  y += 7

  const lignesFinancier = [
    ['Offre assureur initiale', eur(dossier.offre_assureur), 'Montant réclamé', eur(dossier.montant_reclame)],
    ['Montant obtenu', eur(dossier.montant_obtenu), 'Écart vs offre', dossier.montant_obtenu && dossier.offre_assureur ? eur(dossier.montant_obtenu - dossier.offre_assureur) : '—'],
    ['Honoraires fixes', eur(dossier.honoraires_fixes), 'Honoraires résultat', eur(dossier.honoraires_resultat)],
    ['Taux honoraires résultat', dossier.taux_honoraires_resultat ? `${dossier.taux_honoraires_resultat}%` : '—', 'Net client estimé',
      dossier.montant_obtenu && dossier.honoraires_resultat ? eur(dossier.montant_obtenu - (dossier.honoraires_fixes || 0) - (dossier.honoraires_resultat || 0)) : '—'],
  ]

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [],
    body: lignesFinancier,
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: GRIS, fontSize: 8 },
      1: { cellWidth: 40, textColor: NOIR, fontSize: 8, fontStyle: 'bold' },
      2: { cellWidth: 50, fontStyle: 'bold', textColor: GRIS, fontSize: 8 },
      3: { cellWidth: 40, textColor: NOIR, fontSize: 8, fontStyle: 'bold' },
    },
    styles: { cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [252, 252, 252] },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // === ÉQUIPE ===
  if (dossier.juriste || dossier.avocat) {
    sectionTitle(doc, 'ÉQUIPE', margin, y)
    y += 7
    const lignesEquipe = [
      dossier.juriste && ['Juriste responsable', `${dossier.juriste.prenom} ${dossier.juriste.nom}`],
      dossier.avocat && ['Avocat', `${dossier.avocat.prenom} ${dossier.avocat.nom}`],
    ].filter(Boolean) as string[][]

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [], body: lignesEquipe,
      columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold', textColor: GRIS, fontSize: 8 }, 1: { textColor: NOIR, fontSize: 8 } },
      styles: { cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // === NOTES ===
  if (dossier.notes) {
    if (y > 240) { doc.addPage(); y = 20 }
    sectionTitle(doc, 'NOTES', margin, y)
    y += 7
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(220, 220, 220)
    const lines = doc.splitTextToSize(dossier.notes, w - margin * 2 - 6)
    const noteH = Math.min(lines.length * 4.5 + 6, 40)
    doc.roundedRect(margin, y, w - margin * 2, noteH, 2, 2, 'FD')
    doc.setTextColor(...NOIR)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(lines.slice(0, 8), margin + 3, y + 6)
    y += noteH + 5
  }

  // === PIED DE PAGE ===
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, 287, w - margin, 287)
    doc.setTextColor(160, 160, 160)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Document confidentiel — ${cabinet?.nom_cabinet || 'Cabinet'} — ${dossier.reference}`, margin, 292)
    doc.text(`Page ${i} / ${totalPages}`, w - margin, 292, { align: 'right' })
  }

  doc.save(`Dossier_${dossier.reference}_${client?.nom || 'client'}.pdf`)
}

function sectionTitle(doc: jsPDF, titre: string, x: number, y: number) {
  doc.setFillColor(...BLEU)
  doc.rect(x, y - 1, 4, 6, 'F')
  doc.setTextColor(...BLEU)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(titre, x + 7, y + 4)
  doc.setDrawColor(...BLEU)
  doc.setLineWidth(0.3)
  doc.line(x + 7 + doc.getTextWidth(titre) + 3, y + 2, 192, y + 2)
}
