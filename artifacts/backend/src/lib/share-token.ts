import crypto from "node:crypto";
import { db, interventionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function newShareToken(): string {
  return crypto.randomUUID();
}

/** Crée un token de partage s'il n'existe pas encore. */
export async function ensureInterventionShareToken(interventionId: number): Promise<string> {
  const [row] = await db
    .select({ shareToken: interventionsTable.shareToken })
    .from(interventionsTable)
    .where(eq(interventionsTable.id, interventionId))
    .limit(1);

  if (!row) {
    throw new Error("INTERVENTION_NOT_FOUND");
  }
  if (row.shareToken) {
    return row.shareToken;
  }

  const shareToken = newShareToken();
  await db
    .update(interventionsTable)
    .set({ shareToken, shareTokenCreatedAt: new Date(), updatedAt: new Date() })
    .where(eq(interventionsTable.id, interventionId));

  return shareToken;
}
