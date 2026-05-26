/** Étapes du stepper « nouveau dossier » — ordre métier AlloFAP */
export const WIZARD_STATUTS = [
  "CREATION",
  "CLIENT_VEHICULE",
  "VALIDATION_RECEPTION",
  "CONTROLE_INITIAL",
  "NETTOYAGE",
  "SECHAGE",
  "CONTROLE_FINAL",
  "RESTITUTION",
  "CLOTURE",
] as const;

export type WizardStatut = (typeof WIZARD_STATUTS)[number];

const DATE_BY_STATUT: Partial<Record<WizardStatut, string>> = {
  CLIENT_VEHICULE: "dateClientVehicule",
  VALIDATION_RECEPTION: "dateValidationReception",
  CONTROLE_INITIAL: "dateControleInitial",
  NETTOYAGE: "dateNettoyage",
  SECHAGE: "dateSechage",
  CONTROLE_FINAL: "dateControleFinal",
  RESTITUTION: "dateRestitution",
  CLOTURE: "dateCloture",
};

export function wizardDateFieldForStatut(statut: WizardStatut): string | null {
  return DATE_BY_STATUT[statut] ?? null;
}

export function isWizardStatut(statut: string): statut is WizardStatut {
  return (WIZARD_STATUTS as readonly string[]).includes(statut);
}

export function isDossierTermine(statut: string): boolean {
  return statut === "CLOTURE";
}
