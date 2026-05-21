import { db, interventionsTable, mediasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { deleteStoredMedia } from "./media-storage.js";

/** Supprime le dossier intervention, ses médias (fichiers + lignes) et l'historique. Ne touche pas client ni véhicule. */
export async function deleteInterventionById(id: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: interventionsTable.id })
    .from(interventionsTable)
    .where(eq(interventionsTable.id, id))
    .limit(1);

  if (!existing) return false;

  const medias = await db
    .select({ url: mediasTable.url })
    .from(mediasTable)
    .where(eq(mediasTable.interventionId, id));

  for (const media of medias) {
    try {
      await deleteStoredMedia(media.url);
    } catch (err) {
      console.error("Erreur suppression média intervention:", err);
    }
  }

  await db.delete(interventionsTable).where(eq(interventionsTable.id, id));
  return true;
}
