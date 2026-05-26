import {
  db, interventionsTable, clientsTable, vehiculesTable, mediasTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getInterventionFull(id: number) {
  const rows = await db
    .select({
      intervention: interventionsTable,
      client: clientsTable,
      vehicule: vehiculesTable,
    })
    .from(interventionsTable)
    .leftJoin(clientsTable, eq(interventionsTable.clientId, clientsTable.id))
    .leftJoin(vehiculesTable, eq(interventionsTable.vehiculeId, vehiculesTable.id))
    .where(eq(interventionsTable.id, id));

  if (!rows[0]) return null;

  const medias = await db.select().from(mediasTable)
    .where(eq(mediasTable.interventionId, id))
    .orderBy(mediasTable.createdAt);

  const { intervention, client, vehicule } = rows[0];

  const poidEntree = intervention.poidsEntreeG ? parseFloat(String(intervention.poidsEntreeG)) : null;
  const poidsSortie = intervention.poidsSortieG ? parseFloat(String(intervention.poidsSortieG)) : null;
  const pressionEntree = intervention.pressionEntreeMbar ? parseFloat(String(intervention.pressionEntreeMbar)) : null;
  const pressionSortie = intervention.pressionSortieMbar ? parseFloat(String(intervention.pressionSortieMbar)) : null;

  let alerte: string | null = null;
  if (intervention.diagnosticCeramique === "FONDU") {
    alerte = "Nettoyage impossible : céramique fondue. Intervention à refuser ou à clôturer comme non nettoyable.";
  }

  return {
    ...intervention,
    dateCreation: intervention.dateCreation ?? intervention.createdAt,
    updatedAt: intervention.updatedAt ?? intervention.createdAt,
    poidsEntreeG: poidEntree,
    poidsSortieG: poidsSortie,
    pressionEntreeMbar: pressionEntree,
    pressionSortieMbar: pressionSortie,
    masseExtraiteg: intervention.masseExtraiteG ? parseFloat(String(intervention.masseExtraiteG)) : null,
    efficacitePrensionPourcent: intervention.efficacitePrensionPourcent
      ? parseFloat(String(intervention.efficacitePrensionPourcent))
      : null,
    alerte,
    client,
    vehicule,
    medias,
  };
}
