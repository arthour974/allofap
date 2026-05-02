import { Router, type IRouter } from "express";
import { db, interventionsTable, clientsTable, vehiculesTable } from "@workspace/db";
import { eq, count, avg, sql, and, isNotNull, ne } from "drizzle-orm";

const router: IRouter = Router();

const STATUTS_ORDRE = [
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
] as const;

const LABELS_STATUT: Record<string, string> = {
  CREATION: "Création",
  CLIENT_VEHICULE: "Client / Véhicule",
  CONTROLE_INITIAL: "Contrôle initial",
  VALIDATION_RECEPTION: "Validation réception",
  ATELIER_ENTREE: "Entrée atelier",
  NETTOYAGE: "Nettoyage",
  SECHAGE: "Séchage",
  CONTROLE_FINAL: "Contrôle final",
  RESTITUTION: "Restitution",
  CLOTURE: "Clôture",
};

router.get("/statistiques/dashboard", async (_req, res) => {
  const [
    totalResult,
    cloturesResult,
    fapResultats,
    moyenneResult,
    parStatutResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(interventionsTable),
    db.select({ count: count() }).from(interventionsTable).where(eq(interventionsTable.statut, "CLOTURE")),
    db.select({
      resultat: interventionsTable.resultatFinal,
      count: count(),
    }).from(interventionsTable)
      .where(isNotNull(interventionsTable.resultatFinal))
      .groupBy(interventionsTable.resultatFinal),
    db.select({
      avgMasse: avg(interventionsTable.masseExtraiteG),
      avgEfficacite: avg(interventionsTable.efficacitePrensionPourcent),
    }).from(interventionsTable).where(eq(interventionsTable.statut, "CLOTURE")),
    db.select({
      statut: interventionsTable.statut,
      count: count(),
    }).from(interventionsTable).groupBy(interventionsTable.statut),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const clotures = Number(cloturesResult[0]?.count ?? 0);
  const enCours = total - clotures;

  const fapNettoyes = Number(fapResultats.find(r => r.resultat === "NETTOYE")?.count ?? 0);
  const fapPartiellement = Number(fapResultats.find(r => r.resultat === "PARTIELLEMENT_NETTOYE")?.count ?? 0);
  const fapNonNettoyables = Number(fapResultats.find(r => r.resultat === "NON_NETTOYABLE")?.count ?? 0);

  const avgMasse = moyenneResult[0]?.avgMasse ? parseFloat(String(moyenneResult[0].avgMasse)) : null;
  const avgEfficacite = moyenneResult[0]?.avgEfficacite ? parseFloat(String(moyenneResult[0].avgEfficacite)) : null;

  const parStatut = STATUTS_ORDRE.map(statut => ({
    statut,
    count: Number(parStatutResult.find(r => r.statut === statut)?.count ?? 0),
  }));

  res.json({
    totalDossiers: total,
    dosssiersEnCours: enCours,
    dossiersClotures: clotures,
    fapNettoyes,
    fapPartiellementNettoyes: fapPartiellement,
    fapNonNettoyables,
    moyenneMasseExtraiteG: avgMasse,
    moyenneEfficacitePourcent: avgEfficacite,
    dossiersBlockes: 0,
    parStatut,
  });
});

router.get("/statistiques/kanban", async (_req, res) => {
  const interventions = await db
    .select({
      id: interventionsTable.id,
      numeroDossier: interventionsTable.numeroDossier,
      statut: interventionsTable.statut,
      dateCreation: interventionsTable.dateCreation,
      updatedAt: interventionsTable.updatedAt,
      diagnosticCeramique: interventionsTable.diagnosticCeramique,
      resultatFinal: interventionsTable.resultatFinal,
      clientId: clientsTable.id,
      nomClient: clientsTable.nomClient,
      telephone: clientsTable.telephone,
      email: clientsTable.email,
      adresse: clientsTable.adresse,
      clientCreatedAt: clientsTable.createdAt,
      clientUpdatedAt: clientsTable.updatedAt,
      vehiculeId: vehiculesTable.id,
      immatriculation: vehiculesTable.immatriculation,
      vin: vehiculesTable.vin,
      marque: vehiculesTable.marque,
      modele: vehiculesTable.modele,
      motorisation: vehiculesTable.motorisation,
      kilometrage: vehiculesTable.kilometrage,
      vehiculeCreatedAt: vehiculesTable.createdAt,
      vehiculeUpdatedAt: vehiculesTable.updatedAt,
      vehiculeClientId: vehiculesTable.clientId,
    })
    .from(interventionsTable)
    .leftJoin(clientsTable, eq(interventionsTable.clientId, clientsTable.id))
    .leftJoin(vehiculesTable, eq(interventionsTable.vehiculeId, vehiculesTable.id))
    .where(ne(interventionsTable.statut, "CLOTURE"))
    .orderBy(interventionsTable.updatedAt);

  const colonnes = STATUTS_ORDRE.map(statut => ({
    statut,
    label: LABELS_STATUT[statut],
    interventions: interventions
      .filter(i => i.statut === statut)
      .map(i => ({
        id: i.id,
        numeroDossier: i.numeroDossier,
        statut: i.statut,
        dateCreation: i.dateCreation,
        updatedAt: i.updatedAt,
        alerte: i.diagnosticCeramique === "FONDU" ? "Céramique fondue — nettoyage impossible" : null,
        resultatFinal: i.resultatFinal,
        client: {
          id: i.clientId,
          nomClient: i.nomClient ?? "",
          telephone: i.telephone ?? "",
          email: i.email,
          adresse: i.adresse,
          createdAt: i.clientCreatedAt ?? new Date(),
          updatedAt: i.clientUpdatedAt ?? new Date(),
        },
        vehicule: {
          id: i.vehiculeId,
          clientId: i.vehiculeClientId ?? 0,
          immatriculation: i.immatriculation ?? "",
          vin: i.vin,
          marque: i.marque ?? "",
          modele: i.modele ?? "",
          motorisation: i.motorisation,
          kilometrage: i.kilometrage,
          createdAt: i.vehiculeCreatedAt ?? new Date(),
          updatedAt: i.vehiculeUpdatedAt ?? new Date(),
        },
      })),
  }));

  res.json({ colonnes });
});

export default router;
