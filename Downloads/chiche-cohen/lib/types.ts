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

export type RoleUtilisateur = 'associe' | 'collaborateur' | 'juriste' | 'secretariat'

export interface Client {
  id: string
  nom: string
  prenom: string
  date_naissance?: string
  telephone?: string
  telephone_whatsapp?: string
  email?: string
  adresse?: string
  ville?: string
  profession?: string
  statut_professionnel?: string
  revenus_annuels_nets?: number
  created_at: string
}

export interface Utilisateur {
  id: string
  nom: string
  prenom: string
  email: string
  role: RoleUtilisateur
  actif: boolean
}

export interface Dossier {
  id: string
  reference: string
  client_id: string
  juriste_id?: string
  avocat_id?: string
  apporteur_id?: string
  type_accident: TypeAccident
  date_accident?: string
  lieu_accident?: string
  circonstances?: string
  assureur_nom?: string
  assureur_reference_sinistre?: string
  etape: Etape
  voie?: 'amiable' | 'judiciaire'
  consolidation_atteinte: boolean
  date_consolidation?: string
  refus_garantie: boolean
  procedure_fgao: boolean
  procedure_civi: boolean
  offre_assureur?: number
  date_offre_assureur?: string
  montant_reclame?: number
  montant_obtenu?: number
  honoraires_resultat?: number
  taux_honoraires_resultat: number
  score_potentiel?: number
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  source: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface DossierPipeline extends Dossier {
  client_nom: string
  client_prenom: string
  client_telephone?: string
  client_email?: string
  juriste_nom?: string
  avocat_nom?: string
  prochaine_audience?: string
  prochaine_expertise?: string
  jours_inactif: number
}

export interface Expertise {
  id: string
  dossier_id: string
  type: 'amiable' | 'judiciaire' | 'sapiteur'
  expert_nom?: string
  medecin_conseil_nom?: string
  medecin_conseil_telephone?: string
  date_expertise?: string
  heure_expertise?: string
  lieu_expertise?: string
  taux_dfp?: number
  duree_itt_jours?: number
  quantum_doloris?: number
  prejudice_esthetique?: number
  consolidation_date?: string
  observations?: string
  rappel_j7_envoye: boolean
  rappel_j2_envoye: boolean
}

export interface Audience {
  id: string
  dossier_id: string
  procedure_id?: string
  date_audience: string
  nature: string
  tribunal?: string
  salle?: string
  avocat_id?: string
  resultat?: string
  rappel_j15_envoye: boolean
  rappel_j2_envoye: boolean
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
  accident_route: '🚗 Accident de la route',
  erreur_medicale: '🏥 Erreur médicale',
  agression: '⚖️ Agression',
  accident_vie: '⚠️ Accident de la vie',
  autre: 'Autre',
}
