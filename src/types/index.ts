// ============================================================
// MODÈLE DE DONNÉES - CRM DOMMAGE CORPOREL
// Nomenclature Dintilhac complète
// ============================================================

// --- Enums ---

export type StatutDossier =
  | 'nouveau'
  | 'en_cours'
  | 'expertise_medicale'
  | 'negociation'
  | 'contentieux'
  | 'cloture_favorable'
  | 'cloture_defavorable'
  | 'archive';

export type TypeProcedure =
  | 'amiable'
  | 'judiciaire'
  | 'civi'
  | 'sarvi'
  | 'oniam'
  | 'fiva'
  | 'fgao'
  | 'fgti';

export type TypeAccident =
  | 'circulation'
  | 'travail'
  | 'medical'
  | 'vie_courante'
  | 'agression'
  | 'attentat'
  | 'sport'
  | 'scolaire'
  | 'produit_defectueux'
  | 'autre';

export type Civilite = 'M.' | 'Mme' | 'Mx';

export type TypeContact =
  | 'assureur'
  | 'expert_medical'
  | 'avocat_adverse'
  | 'medecin_traitant'
  | 'juridiction'
  | 'notaire'
  | 'huissier'
  | 'expert_judiciaire';

export type PrioriteEvenement = 'basse' | 'normale' | 'haute' | 'urgente';

export type StatutTache = 'a_faire' | 'en_cours' | 'terminee' | 'annulee';

export type TypeEvenement =
  | 'audience'
  | 'expertise'
  | 'rdv_client'
  | 'rdv_adverse'
  | 'echeance'
  | 'relance'
  | 'conference'
  | 'autre';

export type TypeHonoraire =
  | 'forfait'
  | 'honoraire_resultat'
  | 'consultation'
  | 'diligence'
  | 'provision';

export type StatutPaiement = 'en_attente' | 'partiel' | 'paye' | 'annule';

// --- Nomenclature Dintilhac ---

export type CategoriePrejudiceTemporaire =
  | 'DFT'   // Déficit Fonctionnel Temporaire
  | 'SE_T'  // Souffrances Endurées (temporaires)
  | 'PET'   // Préjudice Esthétique Temporaire
  | 'PA_T'; // Préjudice d'Agrément Temporaire

export type CategoriePrejudicePermanent =
  | 'DFP'   // Déficit Fonctionnel Permanent
  | 'SE_P'  // Souffrances Endurées (permanent - consolidation)
  | 'PEP'   // Préjudice Esthétique Permanent
  | 'PA_P'  // Préjudice d'Agrément Permanent
  | 'PS'    // Préjudice Sexuel
  | 'PE'    // Préjudice d'Établissement
  | 'PRE';  // Préjudices Permanents Exceptionnels

export type CategoriePrejudicePatrimonial =
  | 'DSA'   // Dépenses de Santé Actuelles
  | 'FD'    // Frais Divers
  | 'PGPA'  // Perte de Gains Professionnels Actuels
  | 'DSF'   // Dépenses de Santé Futures
  | 'FLA'   // Frais de Logement Adapté
  | 'FVA'   // Frais de Véhicule Adapté
  | 'ATP'   // Assistance Tierce Personne
  | 'PGPF'  // Perte de Gains Professionnels Futurs
  | 'IP'    // Incidence Professionnelle
  | 'PSU';  // Préjudice Scolaire / Universitaire

export type CategoriePrejudiceVictimeIndirecte =
  | 'PA_I'  // Préjudice d'Accompagnement
  | 'PAF'   // Préjudice d'Affection
  | 'FO'    // Frais d'Obsèques
  | 'PEE';  // Perte de Revenus des Proches

export type CategoriePrejudice =
  | CategoriePrejudiceTemporaire
  | CategoriePrejudicePermanent
  | CategoriePrejudicePatrimonial
  | CategoriePrejudiceVictimeIndirecte;

// --- Interfaces ---

export interface Client {
  id: string;
  civilite: Civilite;
  nom: string;
  prenom: string;
  dateNaissance: string;
  email: string;
  telephone: string;
  telephoneSecondaire?: string;
  adresse: string;
  codePostal: string;
  ville: string;
  profession?: string;
  numeroSecuriteSociale?: string;
  notes?: string;
  dateCreation: string;
  photo?: string;
}

export interface Contact {
  id: string;
  type: TypeContact;
  nom: string;
  prenom?: string;
  organisme: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  specialite?: string;
  notes?: string;
}

export interface Prejudice {
  id: string;
  dossierId: string;
  categorie: CategoriePrejudice;
  libelle: string;
  montantDemande: number;
  montantOffert?: number;
  montantRetenu?: number;
  commentaire?: string;
  dateEvaluation: string;
}

export interface ExpertiseMedicale {
  id: string;
  dossierId: string;
  type: 'amiable' | 'judiciaire';
  dateExpertise: string;
  expertId: string;
  lieu?: string;
  conclusionDFT?: string;
  conclusionDFP?: number;
  consolidation?: string;
  dateConsolidation?: string;
  souffrancesEndures?: string;
  prejudiceEsthetique?: string;
  rapportRecu: boolean;
  dateRapport?: string;
  notes?: string;
}

export interface Dossier {
  id: string;
  reference: string;
  clientId: string;
  statut: StatutDossier;
  typeProcedure: TypeProcedure;
  typeAccident: TypeAccident;
  dateAccident: string;
  dateSaisine: string;
  description: string;
  juridictionId?: string;
  numeroRG?: string;
  avocatAdverseId?: string;
  assureurId?: string;
  expertMedicalId?: string;
  prejudices: Prejudice[];
  expertises: ExpertiseMedicale[];
  montantProvisionnel?: number;
  montantIndemnisation?: number;
  dateConsolidation?: string;
  tauxIPP?: number;
  responsabilitePartage?: number;
  notes?: string;
  dateCreation: string;
  dateMiseAJour: string;
}

export interface Evenement {
  id: string;
  dossierId?: string;
  type: TypeEvenement;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin?: string;
  lieu?: string;
  priorite: PrioriteEvenement;
  rappel?: string;
  termine: boolean;
}

export interface Tache {
  id: string;
  dossierId?: string;
  titre: string;
  description?: string;
  statut: StatutTache;
  priorite: PrioriteEvenement;
  dateEcheance?: string;
  assigneA?: string;
  dateCreation: string;
}

export interface Honoraire {
  id: string;
  dossierId: string;
  type: TypeHonoraire;
  description: string;
  montantHT: number;
  tva: number;
  montantTTC: number;
  dateFacture?: string;
  dateEcheance?: string;
  statutPaiement: StatutPaiement;
  datePaiement?: string;
}

export interface Document {
  id: string;
  dossierId: string;
  nom: string;
  type: string;
  taille?: number;
  dateAjout: string;
  categorie: 'expertise' | 'judiciaire' | 'administratif' | 'correspondance' | 'facture' | 'autre';
}

// --- Labels et mappings ---

export const STATUT_DOSSIER_LABELS: Record<StatutDossier, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  expertise_medicale: 'Expertise médicale',
  negociation: 'Négociation',
  contentieux: 'Contentieux',
  cloture_favorable: 'Clôturé (favorable)',
  cloture_defavorable: 'Clôturé (défavorable)',
  archive: 'Archivé',
};

export const STATUT_DOSSIER_COLORS: Record<StatutDossier, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-yellow-100 text-yellow-800',
  expertise_medicale: 'bg-purple-100 text-purple-800',
  negociation: 'bg-orange-100 text-orange-800',
  contentieux: 'bg-red-100 text-red-800',
  cloture_favorable: 'bg-green-100 text-green-800',
  cloture_defavorable: 'bg-gray-100 text-gray-600',
  archive: 'bg-gray-100 text-gray-500',
};

export const TYPE_PROCEDURE_LABELS: Record<TypeProcedure, string> = {
  amiable: 'Amiable',
  judiciaire: 'Judiciaire',
  civi: 'CIVI',
  sarvi: 'SARVI',
  oniam: 'ONIAM',
  fiva: 'FIVA',
  fgao: 'FGAO',
  fgti: 'FGTI',
};

export const TYPE_ACCIDENT_LABELS: Record<TypeAccident, string> = {
  circulation: 'Accident de la circulation',
  travail: 'Accident du travail',
  medical: 'Accident médical',
  vie_courante: 'Accident de la vie courante',
  agression: 'Agression',
  attentat: 'Attentat',
  sport: 'Accident sportif',
  scolaire: 'Accident scolaire',
  produit_defectueux: 'Produit défectueux',
  autre: 'Autre',
};

export const PREJUDICE_LABELS: Record<CategoriePrejudice, string> = {
  // Temporaires
  DFT: 'Déficit Fonctionnel Temporaire',
  SE_T: 'Souffrances Endurées',
  PET: 'Préjudice Esthétique Temporaire',
  PA_T: 'Préjudice d\'Agrément Temporaire',
  // Permanents
  DFP: 'Déficit Fonctionnel Permanent',
  SE_P: 'Souffrances Endurées (définitives)',
  PEP: 'Préjudice Esthétique Permanent',
  PA_P: 'Préjudice d\'Agrément Permanent',
  PS: 'Préjudice Sexuel',
  PE: 'Préjudice d\'Établissement',
  PRE: 'Préjudices Permanents Exceptionnels',
  // Patrimoniaux
  DSA: 'Dépenses de Santé Actuelles',
  FD: 'Frais Divers',
  PGPA: 'Perte de Gains Professionnels Actuels',
  DSF: 'Dépenses de Santé Futures',
  FLA: 'Frais de Logement Adapté',
  FVA: 'Frais de Véhicule Adapté',
  ATP: 'Assistance Tierce Personne',
  PGPF: 'Perte de Gains Professionnels Futurs',
  IP: 'Incidence Professionnelle',
  PSU: 'Préjudice Scolaire / Universitaire',
  // Victimes indirectes
  PA_I: 'Préjudice d\'Accompagnement',
  PAF: 'Préjudice d\'Affection',
  FO: 'Frais d\'Obsèques',
  PEE: 'Perte de Revenus des Proches',
};

export const TYPE_CONTACT_LABELS: Record<TypeContact, string> = {
  assureur: 'Assureur',
  expert_medical: 'Expert médical',
  avocat_adverse: 'Avocat adverse',
  medecin_traitant: 'Médecin traitant',
  juridiction: 'Juridiction',
  notaire: 'Notaire',
  huissier: 'Huissier',
  expert_judiciaire: 'Expert judiciaire',
};

export const PRIORITE_LABELS: Record<PrioriteEvenement, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
};

export const PRIORITE_COLORS: Record<PrioriteEvenement, string> = {
  basse: 'bg-gray-100 text-gray-600',
  normale: 'bg-blue-100 text-blue-700',
  haute: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};
