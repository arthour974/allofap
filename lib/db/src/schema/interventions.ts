import {
  pgTable, serial, text, timestamp, integer, numeric, boolean, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { clientsTable } from "./clients";
import { vehiculesTable } from "./vehicules";
import { z } from "zod/v4";

export const statutInterventionEnum = pgEnum("statut_intervention", [
  "CREATION",
  "CLIENT_VEHICULE",
  "CONTROLE_INITIAL",
  "VALIDATION_RECEPTION",
  "ATELIER_ENTREE",
  "NETTOYAGE",
  "SECHAGE",
  "CONTROLE_FINAL",
  "RESTITUTION",
  "CLOTURE",
]);

export const diagnosticAccessoiresEnum = pgEnum("diagnostic_accessoires", [
  "OK", "SONDE_CASSEE", "TUBES_HS", "GRIPPE", "AUTRE",
]);

export const diagnosticCeramiqueEnum = pgEnum("diagnostic_ceramique", [
  "SAIN", "FISSURE", "FONDU", "HUILE", "COLMATE",
]);

export const resultatFinalEnum = pgEnum("resultat_final", [
  "NETTOYE", "PARTIELLEMENT_NETTOYE", "NON_NETTOYABLE", "REFUSE_ENTREE",
]);

export const interventionsTable = pgTable("interventions", {
  id: serial("id").primaryKey(),
  numeroDossier: text("numero_dossier").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  vehiculeId: integer("vehicule_id").notNull().references(() => vehiculesTable.id),
  statut: statutInterventionEnum("statut").notNull().default("CREATION"),

  dateCreation: timestamp("date_creation").defaultNow().notNull(),
  dateClientVehicule: timestamp("date_client_vehicule"),
  dateControleInitial: timestamp("date_controle_initial"),
  dateValidationReception: timestamp("date_validation_reception"),
  dateAtelierEntree: timestamp("date_atelier_entree"),
  dateNettoyage: timestamp("date_nettoyage"),
  dateSechage: timestamp("date_sechage"),
  dateControleFinal: timestamp("date_controle_final"),
  dateRestitution: timestamp("date_restitution"),
  dateCloture: timestamp("date_cloture"),

  poidsEntreeG: numeric("poids_entree_g"),
  poidsSortieG: numeric("poids_sortie_g"),
  pressionEntreeMbar: numeric("pression_entree_mbar"),
  pressionSortieMbar: numeric("pression_sortie_mbar"),
  masseExtraiteG: numeric("masse_extraite_g"),
  efficacitePrensionPourcent: numeric("efficacite_pression_pourcent"),

  diagnosticAccessoires: diagnosticAccessoiresEnum("diagnostic_accessoires"),
  diagnosticCeramique: diagnosticCeramiqueEnum("diagnostic_ceramique"),
  resultatFinal: resultatFinalEnum("resultat_final"),

  preconisationCapteurPression: boolean("preconisation_capteur_pression").default(false),
  preconisationEgr: boolean("preconisation_egr").default(false),
  preconisationRegenerationAutoroute: boolean("preconisation_regeneration_autoroute").default(false),
  preconisationControlInjecteurs: boolean("preconisation_control_injecteurs").default(false),
  preconisationControlTurbo: boolean("preconisation_control_turbo").default(false),
  preconisationControlConsommationHuile: boolean("preconisation_control_consommation_huile").default(false),

  validationClientReception: boolean("validation_client_reception").default(false),
  validationEntreeAtelier: boolean("validation_entree_atelier").default(false),
  nettoyageCommence: boolean("nettoyage_commence").default(false),
  nettoyageTermine: boolean("nettoyage_termine").default(false),
  observationAtelier: text("observation_atelier"),
  sechageCommence: boolean("sechage_commence").default(false),
  sechageTermine: boolean("sechage_termine").default(false),
  validationTechnicien: boolean("validation_technicien").default(false),
  rapportPdfGenere: boolean("rapport_pdf_genere").default(false),
  clientInforme: boolean("client_informe").default(false),
  fapRestitue: boolean("fap_restitue").default(false),
  validationFinale: boolean("validation_finale").default(false),

  commentaireInterne: text("commentaire_interne"),
  rapportPdfUrl: text("rapport_pdf_url"),
  signatureClientUrl: text("signature_client_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interventionsRelations = relations(interventionsTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [interventionsTable.clientId],
    references: [clientsTable.id],
  }),
  vehicule: one(vehiculesTable, {
    fields: [interventionsTable.vehiculeId],
    references: [vehiculesTable.id],
  }),
}));

export const insertInterventionSchema = createInsertSchema(interventionsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertIntervention = z.infer<typeof insertInterventionSchema>;
export type Intervention = typeof interventionsTable.$inferSelect;
