export type Etape =
  | 'qualification'
  | 'mandat'
  | 'constitution_dossier'
  | 'expertise_amiable'
  | 'offre_assureur'
  | 'negociation'
  | 'procedure_judiciaire'
  | 'transaction'
  | 'encaissement'
  | 'archive'

export type TypeAccident =
  | 'accident_route'
  | 'erreur_medicale'
  | 'agression'
  | 'accident_vie'
  | 'autre'

export interface Client {
  id: string
  nom: string
  prenom: string
  date_naissance?: string
  telephone?: string
  telephone_whatsapp?: string
  email?: string
  adresse?: string
  code_postal?: string
  ville?: string
  profession?: string
  statut_professionnel?: string
  revenus_annuels_nets?: number
  portail_actif?: boolean
  created_at?: string
  updated_at?: string
}

export interface Utilisateur {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  actif: boolean
}

export interface Dossier {
  id: string
  reference: string
  client_id: string
  juriste_id?: string
  avocat_id?: string
  type_accident: TypeAccident
  date_accident?: string
  lieu_accident?: string
  circonstances?: string
  assureur_nom?: string
  assureur_reference_sinistre?: string
  etape: Etape
  voie?: string
  consolidation_atteinte: boolean
  date_consolidation?: string
  refus_garantie: boolean
  procedure_fgao: boolean
  procedure_civi: boolean
  offre_assureur?: number
  montant_reclame?: number
  montant_obtenu?: number
  taux_honoraires_resultat: number
  honoraires_fixes?: number
  honoraires_resultat?: number
  score_potentiel?: number
  priorite: string
  source: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface DossierPipeline {
  id: string
  reference: string
  client_nom: string
  client_prenom: string
  client_telephone?: string
  type_accident: TypeAccident
  etape: Etape
  juriste_nom?: string
  avocat_nom?: string
  score_potentiel?: number
  jours_inactif: number
  prochaine_audience?: string
  prochaine_expertise?: string
  voie?: string
}

export interface Expertise {
  id: string
  dossier_id: string
  type: string
  expert_nom?: string
  expert_specialite?: string
  medecin_conseil_nom?: string
  medecin_conseil_email?: string
  medecin_conseil_telephone?: string
  date_expertise?: string
  heure_expertise?: string
  lieu_expertise?: string
  date_rapport?: string
  taux_dfp?: number
  duree_itt_jours?: number
  quantum_doloris?: number
  prejudice_esthetique?: number
  prejudice_sexuel?: boolean
  prejudice_agrement?: boolean
  consolidation_date?: string
  observations?: string
  rappel_j7_envoye?: boolean
  rappel_j2_envoye?: boolean
  created_at?: string
}

export interface Audience {
  id: string
  dossier_id?: string
  procedure_id?: string
  date_audience: string
  nature: string
  tribunal?: string
  salle?: string
  avocat_id?: string
  resultat?: string
  prochaine_echeance?: string
  rappel_j15_envoye?: boolean
  rappel_j2_envoye?: boolean
  created_at?: string
}

export interface AudienceVue {
  id: string
  date_audience: string
  nature: string
  tribunal?: string
  dossier_reference: string
  client_nom: string
  avocat_nom?: string
  jours_avant_audience: number
  rappel_j15_envoye: boolean
  rappel_j2_envoye: boolean
}

export const ETAPES_LABELS: Record<Etape, string> = {
  qualification: 'Qualification',
  mandat: 'Mandat',
  constitution_dossier: 'Constitution dossier',
  expertise_amiable: 'Expertise amiable',
  offre_assureur: 'Offre assureur',
  negociation: 'Négociation',
  procedure_judiciaire: 'Procédure judiciaire',
  transaction: 'Transaction',
  encaissement: 'Encaissement',
  archive: 'Archivé',
}

export const ETAPES_COULEURS: Record<Etape, string> = {
  qualification: 'bg-gray-100 text-gray-700',
  mandat: 'bg-blue-100 text-blue-700',
  constitution_dossier: 'bg-indigo-100 text-indigo-700',
  expertise_amiable: 'bg-purple-100 text-purple-700',
  offre_assureur: 'bg-yellow-100 text-yellow-700',
  negociation: 'bg-orange-100 text-orange-700',
  procedure_judiciaire: 'bg-red-100 text-red-700',
  transaction: 'bg-teal-100 text-teal-700',
  encaissement: 'bg-green-100 text-green-700',
  archive: 'bg-gray-100 text-gray-400',
}

export const TYPE_ACCIDENT_LABELS: Record<TypeAccident, string> = {
  accident_route: '🚗 Accident route',
  erreur_medicale: '🏥 Erreur médicale',
  agression: '⚖️ Agression',
  accident_vie: '⚠️ Accident vie',
  autre: 'Autre',
}
