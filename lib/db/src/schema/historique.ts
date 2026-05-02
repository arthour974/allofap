import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { interventionsTable } from "./interventions";
import { z } from "zod/v4";

export const historiqueTable = pgTable("historique_intervention", {
  id: serial("id").primaryKey(),
  interventionId: integer("intervention_id").notNull().references(() => interventionsTable.id, { onDelete: "cascade" }),
  ancienStatut: text("ancien_statut"),
  nouveauStatut: text("nouveau_statut"),
  champModifie: text("champ_modifie"),
  ancienneValeur: text("ancienne_valeur"),
  nouvelleValeur: text("nouvelle_valeur"),
  utilisateur: text("utilisateur"),
  dateModification: timestamp("date_modification").defaultNow().notNull(),
});

export const historiqueRelations = relations(historiqueTable, ({ one }) => ({
  intervention: one(interventionsTable, {
    fields: [historiqueTable.interventionId],
    references: [interventionsTable.id],
  }),
}));

export const insertHistoriqueSchema = createInsertSchema(historiqueTable).omit({ id: true, dateModification: true });
export type InsertHistorique = z.infer<typeof insertHistoriqueSchema>;
export type Historique = typeof historiqueTable.$inferSelect;
