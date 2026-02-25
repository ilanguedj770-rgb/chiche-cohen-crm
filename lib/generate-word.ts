import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, Header, Footer, PageNumber,
  NumberFormat,
} from 'docx'

export type TypeDocument = 'lettre_mission' | 'mise_en_demeure' | 'courrier_synthese' | 'demande_pieces'

interface DocData {
  type: TypeDocument
  dossier: any
  client: any
  cabinet?: any
}

function formatDate(d?: string | null) {
  if (!d) return '___________'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMontant(m?: number | null) {
  if (m == null) return '___________'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m)
}

function para(text: string, opts: { bold?: boolean; size?: number; align?: typeof AlignmentType[keyof typeof AlignmentType]; spacingBefore?: number; spacingAfter?: number; italic?: boolean } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { before: opts.spacingBefore ?? 0, after: opts.spacingAfter ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: (opts.size ?? 11) * 2,
        font: 'Calibri',
      }),
    ],
  })
}

function titre(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({ text, bold: true, size: 28, font: 'Calibri', color: '1A52A0' }),
    ],
  })
}

function sousTitre(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 400 },
    children: [
      new TextRun({ text, size: 22, font: 'Calibri', color: '555555', italics: true }),
    ],
  })
}

function separation() {
  return new Paragraph({
    thematicBreak: true,
    spacing: { before: 200, after: 200 },
    children: [],
  })
}

function enteteDocument(cabinet: any, client: any, dossier: any) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const nomCabinet = cabinet?.nom_cabinet || 'Cabinet Chiche Cohen'
  const adresse = [cabinet?.adresse, cabinet?.code_postal, cabinet?.ville].filter(Boolean).join(' ') || '___________'
  const tel = cabinet?.telephone || '___________'
  const emailCabinet = cabinet?.email || '___________'
  const nomClient = `${client?.prenom || ''} ${client?.nom || ''}`.trim() || '___________'
  const adresseClient = [client?.adresse, client?.code_postal, client?.ville].filter(Boolean).join(' ') || '___________'

  return [
    para(`${nomCabinet}`, { bold: true, size: 13 }),
    para(adresse, { size: 10 }),
    para(`Tél : ${tel}`, { size: 10 }),
    para(`Email : ${emailCabinet}`, { size: 10, spacingAfter: 300 }),
    para(`À ${adresseClient.split(' ')[adresseClient.split(' ').length - 1] || 'votre ville'}, le ${today}`, { align: AlignmentType.RIGHT, spacingAfter: 300 }),
    para(nomClient, { bold: true }),
    para(adresseClient, { spacingAfter: 400 }),
    para(`Dossier n° : ${dossier?.reference || '___________'}`, { bold: true, spacingAfter: 50 }),
    para(`Objet : ${getObjet(dossier)}`, { bold: true, spacingAfter: 50 }),
    para(`Réf. sinistre : ${dossier?.assureur_reference_sinistre || '___________'}`, { spacingAfter: 300 }),
  ]
}

function getObjet(dossier: any) {
  const types: Record<string, string> = {
    accident_route: 'Accident de la circulation',
    erreur_medicale: 'Erreur médicale',
    agression: 'Agression',
    accident_vie: "Accident de la vie",
    autre: 'Préjudice corporel',
  }
  const type = types[dossier?.type_accident] || 'Préjudice corporel'
  const date = formatDate(dossier?.date_accident)
  return `${type} du ${date}`
}

// ─── LETTRE DE MISSION ─────────────────────────────────────────────────────────

function genLettreMission(data: DocData): Document {
  const { dossier, client, cabinet } = data
  const nomClient = `${client?.prenom || ''} ${client?.nom || ''}`.trim()
  const nomCabinet = cabinet?.nom_cabinet || 'Cabinet Chiche Cohen'
  const taux = dossier?.taux_honoraires_resultat || cabinet?.taux_honoraires_defaut || 15

  return new Document({
    sections: [{
      properties: {},
      children: [
        ...enteteDocument(cabinet, client, dossier),
        titre('LETTRE DE MISSION'),
        sousTitre(`Convention d'honoraires — Représentation en indemnisation de préjudice corporel`),
        separation(),

        para('Madame, Monsieur,', { spacingAfter: 240 }),

        para(`Par la présente, le ${nomCabinet} (ci-après « le Cabinet ») accepte de représenter et d'assister Madame / Monsieur ${nomClient} (ci-après « le Client ») dans le cadre du litige l'opposant à son assureur ou au responsable de l'accident survenu le ${formatDate(dossier?.date_accident)}${dossier?.lieu_accident ? ` à ${dossier.lieu_accident}` : ''}.`, { spacingAfter: 240 }),

        para('1. OBJET DE LA MISSION', { bold: true, spacingAfter: 120 }),
        para(`Le Cabinet est mandaté pour défendre les intérêts du Client dans le cadre de l'indemnisation de ses préjudices corporels résultant de ${getObjet(dossier)}. La mission comprend notamment : la constitution du dossier médical et administratif, la représentation lors des expertises médicales, la négociation amiable avec l'assureur adverse, et si nécessaire, la saisine des juridictions compétentes.`, { spacingAfter: 240 }),

        para('2. HONORAIRES', { bold: true, spacingAfter: 120 }),
        para(`Les honoraires sont calculés sur la base d'un honoraire de résultat fixé à ${taux}% (hors taxes) du montant total des indemnités obtenues pour le Client, déduction faite des provisions éventuellement versées.`, { spacingAfter: 120 }),
        para(`Des honoraires de diligence forfaitaires pourront s'ajouter en cas de procédure judiciaire ou de recours d'appel, après accord préalable du Client.`, { spacingAfter: 120 }),
        para(`En cas d'échec total de la procédure, aucun honoraire de résultat ne sera dû par le Client.`, { spacingAfter: 240 }),

        para('3. OBLIGATIONS DU CLIENT', { bold: true, spacingAfter: 120 }),
        para(`Le Client s'engage à : (i) communiquer au Cabinet l'intégralité des pièces nécessaires à la constitution du dossier (rapports médicaux, bulletins de salaire, avis d'imposition, etc.) ; (ii) informer le Cabinet de tout contact avec l'assureur adverse ; (iii) se présenter aux convocations d'expertise médicale.`, { spacingAfter: 240 }),

        para('4. DURÉE ET RÉSILIATION', { bold: true, spacingAfter: 120 }),
        para(`La présente lettre de mission prend effet à compter de sa signature et jusqu'à la clôture définitive du dossier. Chaque partie peut y mettre fin à tout moment par lettre recommandée avec avis de réception, sous réserve du règlement des prestations effectuées.`, { spacingAfter: 400 }),

        para('Fait en deux exemplaires originaux.', { spacingAfter: 120 }),
        para(`${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, { spacingAfter: 400 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    para('Pour le Cabinet :', { bold: true }),
                    para(' '),
                    para(' '),
                    para('Signature :'),
                    para('___________________________'),
                  ],
                }),
                new TableCell({
                  children: [
                    para('Le Client :', { bold: true }),
                    para('(Précédé de la mention "Lu et approuvé")'),
                    para(' '),
                    para('Signature :'),
                    para('___________________________'),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  })
}

// ─── MISE EN DEMEURE ────────────────────────────────────────────────────────────

function genMiseEnDemeure(data: DocData): Document {
  const { dossier, client, cabinet } = data
  const nomClient = `${client?.prenom || ''} ${client?.nom || ''}`.trim()
  const nomAssureur = dossier?.assureur_nom || '___________'
  const refSinistre = dossier?.assureur_reference_sinistre || '___________'

  return new Document({
    sections: [{
      properties: {},
      children: [
        ...enteteDocument(cabinet, client, dossier),

        para(`${nomAssureur}`, { bold: true }),
        para('Compagnie d\'assurances', { spacingAfter: 400 }),

        titre('MISE EN DEMEURE'),
        separation(),

        para('Madame, Monsieur,', { spacingAfter: 240 }),

        para(`Nous avons l'honneur de vous informer que notre cabinet a été mandaté pour défendre et représenter les intérêts de Madame / Monsieur ${nomClient} suite à ${getObjet(dossier)}.`, { spacingAfter: 240 }),

        para(`Référence sinistre : ${refSinistre}`, { bold: true, spacingAfter: 120 }),
        para(`Date de l'accident : ${formatDate(dossier?.date_accident)}`, { spacingAfter: 120 }),
        dossier?.lieu_accident ? para(`Lieu : ${dossier.lieu_accident}`, { spacingAfter: 240 }) : para('', { spacingAfter: 0 }),

        para('EXPOSÉ DES FAITS', { bold: true, spacingAfter: 120 }),
        para(dossier?.circonstances || 'Notre client a subi un accident causant des préjudices corporels importants dont la réalité et l\'étendue sont dûment établies par les pièces médicales que nous tenons à votre disposition.', { spacingAfter: 240 }),

        para('MISE EN DEMEURE', { bold: true, spacingAfter: 120 }),
        para(`Par la présente, nous vous mettons solennellement en demeure de :`, { spacingAfter: 120 }),
        para(`1° Nous communiquer, dans un délai de quinze (15) jours à compter de la présente, votre position quant à la prise en charge du sinistre et l'étendue des garanties ;`, { spacingAfter: 80 }),
        para(`2° Procéder à la désignation d'un expert médical et de nous en notifier la date dans le même délai ;`, { spacingAfter: 80 }),
        para(`3° Nous adresser une offre d'indemnisation provisionnelle compte tenu des préjudices déjà constatés.`, { spacingAfter: 240 }),

        para(`À défaut de réponse dans ce délai, nous nous réservons le droit de saisir les juridictions compétentes et de solliciter la désignation judiciaire d'un expert, ainsi que toutes mesures conservatoires nécessaires à la préservation des droits de notre mandant.`, { spacingAfter: 240 }),

        para('Dans l\'attente de votre réponse, nous vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.', { spacingAfter: 400 }),

        para(`${cabinet?.nom_cabinet || 'Cabinet Chiche Cohen'}`, { bold: true }),
        para(`Pour le mandataire`),
      ],
    }],
  })
}

// ─── COURRIER SYNTHÈSE ────────────────────────────────────────────────────────

function genCourrierSynthese(data: DocData): Document {
  const { dossier, client, cabinet } = data
  const nomClient = `${client?.prenom || ''} ${client?.nom || ''}`.trim()

  return new Document({
    sections: [{
      properties: {},
      children: [
        ...enteteDocument(cabinet, client, dossier),
        titre('SYNTHÈSE DU DOSSIER'),
        sousTitre(`État au ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`),
        separation(),

        para('1. IDENTITÉ DU CLIENT', { bold: true, spacingAfter: 120 }),
        para(`Nom : ${nomClient}`, { spacingAfter: 40 }),
        para(`Date de naissance : ${formatDate(client?.date_naissance)}`, { spacingAfter: 40 }),
        para(`Téléphone : ${client?.telephone || '___________'}`, { spacingAfter: 40 }),
        para(`Email : ${client?.email || '___________'}`, { spacingAfter: 240 }),

        para('2. CIRCONSTANCES DE L\'ACCIDENT', { bold: true, spacingAfter: 120 }),
        para(`Type : ${getObjet(dossier)}`, { spacingAfter: 40 }),
        para(`Date : ${formatDate(dossier?.date_accident)}`, { spacingAfter: 40 }),
        dossier?.lieu_accident ? para(`Lieu : ${dossier.lieu_accident}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        dossier?.assureur_nom ? para(`Assureur adverse : ${dossier.assureur_nom}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        dossier?.assureur_reference_sinistre ? para(`Réf. sinistre : ${dossier.assureur_reference_sinistre}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        dossier?.circonstances ? para(`\nCirconstances :\n${dossier.circonstances}`, { spacingAfter: 240 }) : para('', { spacingAfter: 240 }),

        para('3. ÉTAT D\'AVANCEMENT', { bold: true, spacingAfter: 120 }),
        para(`Étape actuelle : ${dossier?.etape || '___________'}`, { spacingAfter: 40 }),
        para(`Voie : ${dossier?.voie || 'À déterminer'}`, { spacingAfter: 40 }),
        dossier?.date_consolidation ? para(`Date de consolidation : ${formatDate(dossier.date_consolidation)}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        para('', { spacingAfter: 200 }),

        para('4. ÉLÉMENTS FINANCIERS', { bold: true, spacingAfter: 120 }),
        dossier?.offre_assureur != null ? para(`Offre assureur : ${formatMontant(dossier.offre_assureur)}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        dossier?.montant_reclame != null ? para(`Montant réclamé : ${formatMontant(dossier.montant_reclame)}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        dossier?.montant_obtenu != null ? para(`Montant obtenu : ${formatMontant(dossier.montant_obtenu)}`, { spacingAfter: 40 }) : para('', { spacingAfter: 0 }),
        para('', { spacingAfter: 240 }),

        dossier?.notes ? para(`5. NOTES\n\n${dossier.notes}`, { spacingAfter: 240 }) : para('', { spacingAfter: 0 }),

        separation(),
        para(`Document établi par ${cabinet?.nom_cabinet || 'Cabinet Chiche Cohen'} — Confidentiel`, { italic: true, size: 9, align: AlignmentType.CENTER }),
      ],
    }],
  })
}

// ─── DEMANDE DE PIÈCES ────────────────────────────────────────────────────────

function genDemandePieces(data: DocData): Document {
  const { dossier, client, cabinet } = data
  const nomClient = `${client?.prenom || ''} ${client?.nom || ''}`.trim()

  return new Document({
    sections: [{
      properties: {},
      children: [
        ...enteteDocument(cabinet, client, dossier),
        titre('LISTE DES PIÈCES NÉCESSAIRES'),
        sousTitre('Constitution du dossier d\'indemnisation'),
        separation(),

        para(`Madame, Monsieur ${nomClient},`, { spacingAfter: 240 }),

        para(`Afin de constituer votre dossier d'indemnisation et de défendre au mieux vos intérêts, nous vous remercions de bien vouloir nous faire parvenir les pièces suivantes :`, { spacingAfter: 240 }),

        para('PIÈCES D\'IDENTITÉ ET ADMINISTRATIVES', { bold: true, spacingAfter: 120 }),
        ...[
          '☐  Copie de votre pièce d\'identité (carte nationale d\'identité ou passeport)',
          '☐  Relevé d\'identité bancaire (RIB)',
          '☐  Attestation d\'assurance (votre assurance personnelle)',
          '☐  Procès-verbal de police ou de gendarmerie (si établi)',
          '☐  Constat amiable (si accident de la route)',
        ].map(t => para(t, { spacingAfter: 60 })),

        para('PIÈCES MÉDICALES', { bold: true, spacingAfter: 120, spacingBefore: 240 }),
        ...[
          '☐  Certificat médical initial (constatant les blessures)',
          '☐  Comptes-rendus d\'hospitalisation',
          '☐  Ordonnances et factures de médicaments',
          '☐  Factures de frais médicaux non remboursés',
          '☐  Rapports d\'expertise médicale éventuels',
          '☐  Certificat de consolidation (quand disponible)',
        ].map(t => para(t, { spacingAfter: 60 })),

        para('PIÈCES PROFESSIONNELLES ET FINANCIÈRES', { bold: true, spacingAfter: 120, spacingBefore: 240 }),
        ...[
          '☐  3 derniers bulletins de salaire (avant l\'accident)',
          '☐  Derniers avis d\'imposition',
          '☐  Attestation d\'arrêt de travail délivrée par l\'employeur',
          '☐  Justificatifs des revenus perdus (pour les travailleurs indépendants)',
          '☐  Toute correspondance avec l\'assureur adverse',
        ].map(t => para(t, { spacingAfter: 60 })),

        para('', { spacingAfter: 240 }),
        para('Ces pièces peuvent nous être adressées par email, courrier ou directement à notre cabinet. N\'hésitez pas à nous contacter pour toute question.', { spacingAfter: 240 }),

        para('Nous vous remercions de votre diligence et vous adressons nos cordiales salutations.', { spacingAfter: 400 }),

        para(`${cabinet?.nom_cabinet || 'Cabinet Chiche Cohen'}`, { bold: true }),
      ],
    }],
  })
}

// ─── EXPORT PRINCIPAL ────────────────────────────────────────────────────────

export async function genererDocument(data: DocData): Promise<Blob> {
  let doc: Document

  switch (data.type) {
    case 'lettre_mission':    doc = genLettreMission(data); break
    case 'mise_en_demeure':   doc = genMiseEnDemeure(data); break
    case 'courrier_synthese': doc = genCourrierSynthese(data); break
    case 'demande_pieces':    doc = genDemandePieces(data); break
    default: throw new Error('Type de document inconnu')
  }

  const buffer = await Packer.toBlob(doc)
  return buffer
}

export const TEMPLATES: { type: TypeDocument; label: string; description: string; icon: string }[] = [
  { type: 'lettre_mission',    label: 'Lettre de mission',    description: 'Convention d\'honoraires à signer par le client', icon: '✍️' },
  { type: 'mise_en_demeure',   label: 'Mise en demeure',      description: 'Courrier de mise en demeure à l\'assureur adverse', icon: '⚠️' },
  { type: 'courrier_synthese', label: 'Synthèse dossier',     description: 'Récapitulatif complet de l\'état du dossier', icon: '📋' },
  { type: 'demande_pieces',    label: 'Demande de pièces',    description: 'Liste des pièces à fournir par le client', icon: '📄' },
]
