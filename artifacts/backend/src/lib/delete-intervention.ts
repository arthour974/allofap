import * as fs from "node:fs";
import * as path from "node:path";
import { db, interventionsTable, mediasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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
    const filename = path.basename(media.url);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await db.delete(interventionsTable).where(eq(interventionsTable.id, id));
  return true;
}
