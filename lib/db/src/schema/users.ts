import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["ADMIN", "ATELIER", "RECEPTION", "LECTURE_SEULE"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  identifiant: text("identifiant").notNull().unique(),
  nom: text("nom").notNull(),
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  role: roleEnum("role").notNull().default("ATELIER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
