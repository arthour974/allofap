import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { clientsTable } from "./clients";
import { z } from "zod/v4";

export const vehiculesTable = pgTable("vehicules", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  immatriculation: text("immatriculation").notNull(),
  vin: text("vin"),
  marque: text("marque").notNull(),
  modele: text("modele").notNull(),
  motorisation: text("motorisation"),
  kilometrage: integer("kilometrage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vehiculesRelations = relations(vehiculesTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [vehiculesTable.clientId],
    references: [clientsTable.id],
  }),
}));

export const insertVehiculeSchema = createInsertSchema(vehiculesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicule = z.infer<typeof insertVehiculeSchema>;
export type Vehicule = typeof vehiculesTable.$inferSelect;
