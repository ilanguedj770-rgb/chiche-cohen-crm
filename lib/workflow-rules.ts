import type { Etape } from './types'

export type ActionType = 'creer_tache' | 'creer_relance' | 'ajouter_note'
export type AssigneCible = 'juriste' | 'avocat' | 'aucun'
export type RelanceType = 'email' | 'telephone' | 'courrier' | 'whatsapp'

export interface ActionCreerTache {
  type: 'creer_tache'
  titre: string
  description?: string
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  delai_jours: number
  assigner_a: AssigneCible
}

export interface ActionCreerRelance {
  type: 'creer_relance'
  type_relance: RelanceType
  motif: string
}

export interface ActionAjouterNote {
  type: 'ajouter_note'
  contenu: string
}

export type WorkflowAction = ActionCreerTache | ActionCreerRelance | ActionAjouterNote

export interface WorkflowRule {
  id: string
  nom: string
  description: string
  etape_source: Etape
  etape_cible: Etape
  condition?: 'voie_judiciaire' | 'voie_amiable'
  actif: boolean
  actions: WorkflowAction[]
}

export const WORKFLOW_RULES: WorkflowRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Qualification → Mandat
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'qualification_mandat',
    nom: 'Signature du mandat',
    description: 'Préparer le mandat et collecter les premières pièces',
    etape_source: 'qualification',
    etape_cible: 'mandat',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: 'Faire signer le mandat au client',
        description: 'Envoyer le mandat par email et relancer si non signé sous 48h',
        priorite: 'haute',
        delai_jours: 3,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Préparer la liste des pièces à collecter',
        description: "Établir la liste exhaustive des pièces nécessaires (PV, certificats médicaux, bulletins de salaire...)",
        priorite: 'normale',
        delai_jours: 5,
        assigner_a: 'juriste',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Mandat → Constitution dossier
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'mandat_constitution',
    nom: 'Constitution du dossier',
    description: "Envoyer la liste des pièces au client et déclarer le sinistre à l'assureur",
    etape_source: 'mandat',
    etape_cible: 'constitution_dossier',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: 'Envoyer la liste des pièces au client',
        description: 'Utiliser le modèle "Demande de pièces" depuis les modèles Word',
        priorite: 'haute',
        delai_jours: 2,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: "Déclarer le sinistre à l'assureur adverse",
        description: "Adresser le courrier de mise en cause à l'assureur de l'adversaire",
        priorite: 'haute',
        delai_jours: 5,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_relance',
        type_relance: 'email',
        motif: "Attente des pièces du client — relance à effectuer si non reçues sous 15 jours",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Constitution dossier → Expertise amiable
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'constitution_expertise',
    nom: 'Préparation de l'expertise médicale',
    description: "Planifier l'expertise amiable et désigner le médecin conseil",
    etape_source: 'constitution_dossier',
    etape_cible: 'expertise_amiable',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Planifier l'expertise médicale amiable",
        description: "Contacter l'assureur pour fixer la date d'expertise",
        priorite: 'haute',
        delai_jours: 7,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Désigner et briefer le médecin conseil',
        description: "Transmettre le dossier médical complet au médecin conseil avant l'expertise",
        priorite: 'haute',
        delai_jours: 5,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: "Préparer le client à l'expertise",
        description: "Appeler le client pour expliquer le déroulé de l'expertise et les points à mentionner",
        priorite: 'normale',
        delai_jours: 3,
        assigner_a: 'juriste',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Expertise amiable → Offre assureur
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'expertise_offre',
    nom: 'Analyse et chiffrage de l'offre',
    description: 'Analyser le rapport d'expertise et préparer le chiffrage Dintilhac',
    etape_source: 'expertise_amiable',
    etape_cible: 'offre_assureur',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Analyser le rapport d'expertise médicale",
        description: "Vérifier les postes de préjudice retenus (DFP, ITT, quantum doloris...) et identifier les manques",
        priorite: 'haute',
        delai_jours: 3,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Réaliser le chiffrage Dintilhac complet',
        description: "Calculer tous les postes d'indemnisation avec le calculateur Dintilhac",
        priorite: 'haute',
        delai_jours: 5,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Informer le client des résultats de l'expertise',
        description: "Expliquer au client le contenu du rapport et la stratégie d'indemnisation",
        priorite: 'normale',
        delai_jours: 7,
        assigner_a: 'juriste',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Offre assureur → Négociation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'offre_negociation',
    nom: 'Contestation de l'offre et contre-proposition',
    description: "Préparer et envoyer la contestation de l'offre insuffisante",
    etape_source: 'offre_assureur',
    etape_cible: 'negociation',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Rédiger la contestation de l'offre",
        description: "Rédiger un courrier détaillé contestant poste par poste l'offre insuffisante",
        priorite: 'urgente',
        delai_jours: 7,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Envoyer la contre-proposition chiffrée',
        description: "Adresser le chiffrage complet à l'assureur avec les justificatifs",
        priorite: 'haute',
        delai_jours: 10,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_relance',
        type_relance: 'courrier',
        motif: "Contestation offre assureur — suivre la réponse sous 30 jours",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Négociation → Procédure judiciaire (voie judiciaire)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'negociation_judiciaire',
    nom: 'Lancement de la procédure judiciaire',
    description: "Rédiger et signifier l'assignation au greffe",
    etape_source: 'negociation',
    etape_cible: 'procedure_judiciaire',
    condition: 'voie_judiciaire',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Rédiger l'assignation",
        description: "Rédiger l'acte d'assignation avec tous les chefs de demande chiffrés",
        priorite: 'urgente',
        delai_jours: 14,
        assigner_a: 'avocat',
      },
      {
        type: 'creer_tache',
        titre: "Signifier l'assignation à l'adversaire",
        description: "Faire signifier l'assignation par huissier",
        priorite: 'haute',
        delai_jours: 21,
        assigner_a: 'avocat',
      },
      {
        type: 'creer_tache',
        titre: 'Déposer la requête au greffe',
        description: "Enrôler l'affaire et obtenir une date d'audience",
        priorite: 'haute',
        delai_jours: 21,
        assigner_a: 'avocat',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Négociation → Transaction (voie amiable)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'negociation_transaction_amiable',
    nom: 'Finalisation du protocole transactionnel',
    description: 'Rédiger et faire signer le protocole de transaction amiable',
    etape_source: 'negociation',
    etape_cible: 'transaction',
    condition: 'voie_amiable',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: 'Rédiger le protocole transactionnel',
        description: "Rédiger le protocole avec toutes les quittances et la clause de renonciation",
        priorite: 'haute',
        delai_jours: 10,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Faire signer le protocole par le client',
        description: "Expliquer le protocole au client et recueillir sa signature",
        priorite: 'haute',
        delai_jours: 14,
        assigner_a: 'juriste',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Procédure judiciaire → Transaction
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'judiciaire_transaction',
    nom: 'Négociation en cours de procédure',
    description: "Évaluer et préparer un accord transactionnel en cours de procédure",
    etape_source: 'procedure_judiciaire',
    etape_cible: 'transaction',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Préparer les conclusions de synthèse",
        description: "Rédiger les conclusions récapitulatives avant audience",
        priorite: 'haute',
        delai_jours: 14,
        assigner_a: 'avocat',
      },
      {
        type: 'creer_tache',
        titre: 'Rédiger le protocole transactionnel',
        description: "Finaliser les termes de l'accord et rédiger le protocole",
        priorite: 'haute',
        delai_jours: 10,
        assigner_a: 'juriste',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Transaction → Encaissement
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'transaction_encaissement',
    nom: 'Suivi du règlement',
    description: "Relancer l'assureur et vérifier le montant reçu",
    etape_source: 'transaction',
    etape_cible: 'encaissement',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: "Relancer l'assureur pour le règlement",
        description: "Vérifier que le virement a bien été initié dans les délais légaux (30 jours)",
        priorite: 'haute',
        delai_jours: 14,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Établir le décompte final et préparer le versement client',
        description: "Calculer le net revenant au client après honoraires et débours",
        priorite: 'haute',
        delai_jours: 7,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_relance',
        type_relance: 'telephone',
        motif: "Suivi règlement assureur — attente virement sous 30 jours",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Encaissement → Archive
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'encaissement_archive',
    nom: 'Clôture et archivage du dossier',
    description: "Finaliser le dossier, envoyer le récapitulatif au client et archiver",
    etape_source: 'encaissement',
    etape_cible: 'archive',
    actif: true,
    actions: [
      {
        type: 'creer_tache',
        titre: 'Envoyer le décompte final et la quittance au client',
        description: "Transmettre le récapitulatif complet : montant obtenu, honoraires, net versé",
        priorite: 'haute',
        delai_jours: 5,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Classer et vérifier toutes les pièces du dossier',
        description: "S'assurer que l'intégralité des documents est présente et classée",
        priorite: 'normale',
        delai_jours: 7,
        assigner_a: 'juriste',
      },
      {
        type: 'creer_tache',
        titre: 'Archiver le dossier physique',
        description: "Ranger le dossier papier et mettre à jour le registre d'archives",
        priorite: 'normale',
        delai_jours: 14,
        assigner_a: 'juriste',
      },
    ],
  },
]

/**
 * Retourne les règles applicables pour une transition donnée
 */
export function getRulesForTransition(
  etape_source: Etape,
  etape_cible: Etape,
  voie?: string
): WorkflowRule[] {
  return WORKFLOW_RULES.filter((rule) => {
    if (!rule.actif) return false
    if (rule.etape_source !== etape_source) return false
    if (rule.etape_cible !== etape_cible) return false
    if (rule.condition === 'voie_judiciaire' && voie !== 'judiciaire') return false
    if (rule.condition === 'voie_amiable' && voie === 'judiciaire') return false
    return true
  })
}
