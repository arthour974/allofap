import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { interventionsTable } from "./interventions";
import { z } from "zod/v4";

export const typeMediaEnum = pgEnum("type_media", [
  "PHOTO_VEHICULE",
  "PHOTO_FAP_ENTREE",
  "PHOTO_ACCESSOIRES",
  "VIDEO_ENDOSCOPE_ENTREE",
  "PHOTO_NETTOYAGE",
  "VIDEO_ENDOSCOPE_SORTIE",
  "PHOTO_FAP_SORTIE",
  "SIGNATURE_CLIENT",
]);

export const mediasTable = pgTable("medias_intervention", {
  id: serial("id").primaryKey(),
  interventionId: integer("intervention_id").notNull().references(() => interventionsTable.id, { onDelete: "cascade" }),
  typeMedia: typeMediaEnum("type_media").notNull(),
  url: text("url").notNull(),
  nomFichier: text("nom_fichier").notNull(),
  mimeType: text("mime_type").notNull(),
  tailleFichier: integer("taille_fichier").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediasRelations = relations(mediasTable, ({ one }) => ({
  intervention: one(interventionsTable, {
    fields: [mediasTable.interventionId],
    references: [interventionsTable.id],
  }),
}));

export const insertMediaSchema = createInsertSchema(mediasTable).omit({ id: true, createdAt: true });
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof mediasTable.$inferSelect;
