import { db, clientsTable, interventionsTable, vehiculesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { deleteInterventionById } from "./delete-intervention.js";

/** Supprime le client, ses dossiers (médias inclus) et ses véhicules. */
export async function deleteClientById(id: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.id, id))
    .limit(1);

  if (!existing) return false;

  const interventions = await db
    .select({ id: interventionsTable.id })
    .from(interventionsTable)
    .where(eq(interventionsTable.clientId, id));

  for (const { id: interventionId } of interventions) {
    await deleteInterventionById(interventionId);
  }

  await db.delete(vehiculesTable).where(eq(vehiculesTable.clientId, id));
  await db.delete(clientsTable).where(eq(clientsTable.id, id));

  return true;
}
