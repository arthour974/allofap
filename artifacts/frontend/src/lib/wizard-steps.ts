import { StatutIntervention, type InterventionDetail } from "@workspace/api-client-react";

/** Stepper « Nouveau dossier » — ordre métier AlloFAP */
export const NOUVEAU_DOSSIER_STEPS = [
  { index: 0, label: "Client", statut: StatutIntervention.CREATION },
  { index: 1, label: "Voiture", statut: StatutIntervention.CLIENT_VEHICULE },
  { index: 2, label: "Validation Réception", statut: StatutIntervention.VALIDATION_RECEPTION },
  { index: 3, label: "Contrôle Initial", statut: StatutIntervention.CONTROLE_INITIAL },
  { index: 4, label: "Nettoyage", statut: StatutIntervention.NETTOYAGE },
  { index: 5, label: "Séchage", statut: StatutIntervention.SECHAGE },
  { index: 6, label: "Contrôle final", statut: StatutIntervention.CONTROLE_FINAL },
  { index: 7, label: "Remarques et préconisations", statut: StatutIntervention.RESTITUTION },
  { index: 8, label: "Confirmation terminé", statut: StatutIntervention.CLOTURE },
] as const;

export function isWizardComplete(intervention: Pick<InterventionDetail, "statut">): boolean {
  return intervention.statut === StatutIntervention.CLOTURE;
}

/** Source minimale pour afficher la progression (page détail ou partage client). */
export type WorkflowProgressSource = Pick<InterventionDetail, "statut" | "client" | "vehicule">;

/** Dernière étape du stepper complétée (0–8). */
export function maxCompletedWizardStep(intervention: WorkflowProgressSource | undefined): number {
  if (!intervention?.client) return -1;
  if (!intervention.vehicule) return 0;
  const idx = NOUVEAU_DOSSIER_STEPS.findIndex((s) => s.statut === intervention.statut);
  if (idx >= 0) return idx;
  if (isWizardComplete(intervention)) return NOUVEAU_DOSSIER_STEPS.length - 1;
  return 0;
}

/** Étape affichée par défaut à la reprise. */
export function defaultActiveWizardStep(intervention: WorkflowProgressSource | undefined): number {
  if (!intervention) return 0;
  if (isWizardComplete(intervention)) return NOUVEAU_DOSSIER_STEPS.length - 1;
  if (!intervention.vehicule) return intervention.client ? 1 : 0;
  const completed = maxCompletedWizardStep(intervention);
  return Math.min(completed + 1, NOUVEAU_DOSSIER_STEPS.length - 1);
}

export function canNavigateToWizardStep(targetStep: number, intervention: WorkflowProgressSource | undefined): boolean {
  if (targetStep < 0 || targetStep >= NOUVEAU_DOSSIER_STEPS.length) return false;
  if (!intervention) return targetStep === 0;
  const max = maxCompletedWizardStep(intervention);
  return targetStep <= max + 1;
}

export function statutForWizardStep(stepIndex: number): StatutIntervention {
  return NOUVEAU_DOSSIER_STEPS[stepIndex]?.statut ?? StatutIntervention.CREATION;
}

/** Édition autorisée sur la page détail (alignée sur le stepper). */
export function canEditDetailWizardStep(
  stepIndex: number,
  intervention: InterventionDetail | undefined,
): boolean {
  if (!intervention) return false;
  // Dossier clôturé : toutes les sections restent modifiables
  if (isWizardComplete(intervention)) return true;
  return canNavigateToWizardStep(stepIndex, intervention);
}

/** Index stepper associé aux champs atelier (pour avancer le statut à l'enregistrement). */
const FIELD_WIZARD_STEP: Record<string, number> = {
  validationClientReception: 2,
  poidsEntreeG: 3,
  pressionEntreeMbar: 3,
  diagnosticAccessoires: 3,
  diagnosticCeramique: 3,
  validationEntreeAtelier: 4,
  nettoyageCommence: 4,
  nettoyageTermine: 4,
  observationAtelier: 4,
  sechageCommence: 5,
  sechageTermine: 5,
  poidsSortieG: 6,
  pressionSortieMbar: 6,
  resultatFinal: 6,
  validationTechnicien: 6,
  preconisationCapteurPression: 7,
  preconisationEgr: 7,
  preconisationRegenerationAutoroute: 7,
  preconisationControlInjecteurs: 7,
  preconisationControlTurbo: 7,
  preconisationControlConsommationHuile: 7,
  clientInforme: 7,
  fapRestitue: 7,
};

export function wizardStepIndexForSavedFields(fields: string[]): number {
  let max = 0;
  for (const f of fields) {
    const step = FIELD_WIZARD_STEP[f];
    if (step !== undefined && step > max) max = step;
  }
  return max;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAtelierFormData(intervention: InterventionDetail): Record<string, any> {
  return {
    poidsEntreeG: intervention.poidsEntreeG || "",
    pressionEntreeMbar: intervention.pressionEntreeMbar || "",
    diagnosticAccessoires: intervention.diagnosticAccessoires || "",
    diagnosticCeramique: intervention.diagnosticCeramique || "",
    validationClientReception: intervention.validationClientReception || false,
    nettoyageCommence: intervention.nettoyageCommence || false,
    nettoyageTermine: intervention.nettoyageTermine || false,
    observationAtelier: intervention.observationAtelier || "",
    validationEntreeAtelier: intervention.validationEntreeAtelier || false,
    sechageCommence: intervention.sechageCommence || false,
    sechageTermine: intervention.sechageTermine || false,
    poidsSortieG: intervention.poidsSortieG || "",
    pressionSortieMbar: intervention.pressionSortieMbar || "",
    resultatFinal: intervention.resultatFinal || "",
    validationTechnicien: intervention.validationTechnicien || false,
    preconisationCapteurPression: intervention.preconisationCapteurPression || false,
    preconisationEgr: intervention.preconisationEgr || false,
    preconisationRegenerationAutoroute: intervention.preconisationRegenerationAutoroute || false,
    preconisationControlInjecteurs: intervention.preconisationControlInjecteurs || false,
    preconisationControlTurbo: intervention.preconisationControlTurbo || false,
    preconisationControlConsommationHuile: intervention.preconisationControlConsommationHuile || false,
    rapportPdfGenere: intervention.rapportPdfGenere || false,
    clientInforme: intervention.clientInforme || false,
    fapRestitue: intervention.fapRestitue || false,
  };
}

export function detailStepLockedMessage(stepIndex: number): string {
  const prev = NOUVEAU_DOSSIER_STEPS[stepIndex - 1];
  const current = NOUVEAU_DOSSIER_STEPS[stepIndex];
  if (prev && current) {
    return `Terminez d'abord « ${prev.label} » pour débloquer « ${current.label} ».`;
  }
  return "Complétez les étapes précédentes du dossier.";
}
