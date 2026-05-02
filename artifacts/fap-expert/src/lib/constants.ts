import { StatutIntervention } from "@workspace/api-client-react";

export const STATUT_LABELS: Record<StatutIntervention, string> = {
  [StatutIntervention.CREATION]: "Création",
  [StatutIntervention.CLIENT_VEHICULE]: "Client / Véhicule",
  [StatutIntervention.CONTROLE_INITIAL]: "Contrôle initial",
  [StatutIntervention.VALIDATION_RECEPTION]: "Validation réception",
  [StatutIntervention.ATELIER_ENTREE]: "Entrée atelier",
  [StatutIntervention.NETTOYAGE]: "Nettoyage",
  [StatutIntervention.SECHAGE]: "Séchage",
  [StatutIntervention.CONTROLE_FINAL]: "Contrôle final",
  [StatutIntervention.RESTITUTION]: "Restitution",
  [StatutIntervention.CLOTURE]: "Clôture",
};

export const STATUT_COLORS: Record<StatutIntervention, string> = {
  [StatutIntervention.CREATION]: "bg-blue-100 text-blue-800 border-blue-200",
  [StatutIntervention.CLIENT_VEHICULE]: "bg-blue-100 text-blue-800 border-blue-200",
  [StatutIntervention.CONTROLE_INITIAL]: "bg-orange-100 text-orange-800 border-orange-200",
  [StatutIntervention.VALIDATION_RECEPTION]: "bg-orange-100 text-orange-800 border-orange-200",
  [StatutIntervention.ATELIER_ENTREE]: "bg-blue-100 text-blue-800 border-blue-200",
  [StatutIntervention.NETTOYAGE]: "bg-blue-100 text-blue-800 border-blue-200",
  [StatutIntervention.SECHAGE]: "bg-blue-100 text-blue-800 border-blue-200",
  [StatutIntervention.CONTROLE_FINAL]: "bg-purple-100 text-purple-800 border-purple-200",
  [StatutIntervention.RESTITUTION]: "bg-green-100 text-green-800 border-green-200",
  [StatutIntervention.CLOTURE]: "bg-gray-100 text-gray-800 border-gray-200",
};

export const WORKFLOW_ORDER = [
  StatutIntervention.CREATION,
  StatutIntervention.CLIENT_VEHICULE,
  StatutIntervention.CONTROLE_INITIAL,
  StatutIntervention.VALIDATION_RECEPTION,
  StatutIntervention.ATELIER_ENTREE,
  StatutIntervention.NETTOYAGE,
  StatutIntervention.SECHAGE,
  StatutIntervention.CONTROLE_FINAL,
  StatutIntervention.RESTITUTION,
  StatutIntervention.CLOTURE,
];
