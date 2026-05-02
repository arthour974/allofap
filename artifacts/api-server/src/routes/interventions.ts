import { Router, type IRouter } from "express";
import {
  db, interventionsTable, clientsTable, vehiculesTable, mediasTable, historiqueTable,
} from "@workspace/db";
import { eq, ilike, or, sql, and, gte, lte, count } from "drizzle-orm";
import {
  CreateInterventionBody,
  UpdateInterventionBody,
} from "@workspace/api-zod";

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

type Statut = typeof STATUTS_ORDRE[number];

async function generateNumeroDossier(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAP-${year}-`;
  const result = await db.select({ count: count() })
    .from(interventionsTable)
    .where(sql`numero_dossier LIKE ${prefix + "%"}`);
  const num = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}${String(num).padStart(5, "0")}`;
}

async function getInterventionFull(id: number) {
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

router.get("/interventions", async (req, res) => {
  const statut = req.query.statut as Statut | undefined;
  const search = req.query.search as string | undefined;
  const dateDebut = req.query.dateDebut as string | undefined;
  const dateFin = req.query.dateFin as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (statut && STATUTS_ORDRE.includes(statut)) {
    conditions.push(eq(interventionsTable.statut, statut));
  }
  if (dateDebut) {
    conditions.push(gte(interventionsTable.dateCreation, new Date(dateDebut)));
  }
  if (dateFin) {
    conditions.push(lte(interventionsTable.dateCreation, new Date(dateFin)));
  }

  const baseQuery = db
    .select({
      intervention: interventionsTable,
      client: clientsTable,
      vehicule: vehiculesTable,
    })
    .from(interventionsTable)
    .leftJoin(clientsTable, eq(interventionsTable.clientId, clientsTable.id))
    .leftJoin(vehiculesTable, eq(interventionsTable.vehiculeId, vehiculesTable.id));

  let query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  const rows = await (query as typeof baseQuery)
    .limit(limit)
    .offset(offset)
    .orderBy(interventionsTable.updatedAt);

  let filtered = rows;
  if (search) {
    const s = search.toLowerCase();
    filtered = rows.filter(r =>
      r.intervention.numeroDossier.toLowerCase().includes(s) ||
      r.client?.nomClient?.toLowerCase().includes(s) ||
      r.client?.telephone?.includes(s) ||
      r.vehicule?.immatriculation?.toLowerCase().includes(s) ||
      r.vehicule?.vin?.toLowerCase().includes(s)
    );
  }

  const interventions = filtered.map(r => ({
    id: r.intervention.id,
    numeroDossier: r.intervention.numeroDossier,
    statut: r.intervention.statut,
    dateCreation: r.intervention.dateCreation,
    updatedAt: r.intervention.updatedAt,
    alerte: r.intervention.diagnosticCeramique === "FONDU"
      ? "Céramique fondue — nettoyage impossible"
      : null,
    resultatFinal: r.intervention.resultatFinal,
    client: r.client,
    vehicule: r.vehicule,
  }));

  res.json({ interventions, total: interventions.length });
});

router.post("/interventions", async (req, res) => {
  const body = CreateInterventionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  let clientId = body.data.clientId ?? null;
  let vehiculeId = body.data.vehiculeId ?? null;

  if (!clientId && body.data.client) {
    const [c] = await db.insert(clientsTable).values({
      nomClient: body.data.client.nomClient,
      telephone: body.data.client.telephone,
      email: body.data.client.email ?? null,
      adresse: body.data.client.adresse ?? null,
    }).returning();
    clientId = c.id;
  }

  if (!vehiculeId && body.data.vehicule && clientId) {
    const v = body.data.vehicule as NonNullable<typeof body.data.vehicule>;
    const [vehicle] = await db.insert(vehiculesTable).values({
      clientId,
      immatriculation: v.immatriculation,
      vin: v.vin ?? null,
      marque: v.marque,
      modele: v.modele,
      motorisation: v.motorisation ?? null,
      kilometrage: v.kilometrage ?? null,
    }).returning();
    vehiculeId = vehicle.id;
  }

  if (!clientId || !vehiculeId) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Client et véhicule obligatoires" });
    return;
  }

  const numeroDossier = await generateNumeroDossier();

  const [intervention] = await db.insert(interventionsTable).values({
    numeroDossier,
    clientId,
    vehiculeId,
    statut: "CREATION",
  }).returning();

  await db.insert(historiqueTable).values({
    interventionId: intervention.id,
    ancienStatut: null,
    nouveauStatut: "CREATION",
    utilisateur: "système",
  });

  const full = await getInterventionFull(intervention.id);
  res.status(201).json(full);
});

router.get("/interventions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const full = await getInterventionFull(id);
  if (!full) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  res.json(full);
});

router.put("/interventions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const body = UpdateInterventionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const existing = await db.select().from(interventionsTable).where(eq(interventionsTable.id, id)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  if (existing[0].statut === "CLOTURE") {
    res.status(403).json({ error: "FORBIDDEN", message: "Le dossier est clôturé et ne peut plus être modifié" });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data, updatedAt: new Date() };

  if (body.data.poidsEntreeG !== undefined || body.data.poidsSortieG !== undefined) {
    const poidsEntree = body.data.poidsEntreeG ?? (existing[0].poidsEntreeG ? parseFloat(String(existing[0].poidsEntreeG)) : null);
    const poidsSortie = body.data.poidsSortieG ?? (existing[0].poidsSortieG ? parseFloat(String(existing[0].poidsSortieG)) : null);

    if (poidsEntree !== null && poidsSortie !== null) {
      updateData.masseExtraiteG = String(poidsEntree - poidsSortie);
    }
  }

  if (body.data.pressionEntreeMbar !== undefined || body.data.pressionSortieMbar !== undefined) {
    const pressionEntree = body.data.pressionEntreeMbar ?? (existing[0].pressionEntreeMbar ? parseFloat(String(existing[0].pressionEntreeMbar)) : null);
    const pressionSortie = body.data.pressionSortieMbar ?? (existing[0].pressionSortieMbar ? parseFloat(String(existing[0].pressionSortieMbar)) : null);

    if (pressionEntree !== null && pressionEntree > 0 && pressionSortie !== null) {
      const efficacite = ((pressionEntree - pressionSortie) / pressionEntree) * 100;
      updateData.efficacitePrensionPourcent = String(efficacite.toFixed(2));
    }
  }

  const [updated] = await db.update(interventionsTable)
    .set(updateData as Parameters<typeof db.update>[0] extends infer T ? T extends { set: infer S } ? S : never : never)
    .where(eq(interventionsTable.id, id))
    .returning();

  const full = await getInterventionFull(updated.id);
  res.json(full);
});

function verifierConditions(
  intervention: typeof interventionsTable.$inferSelect,
  medias: typeof mediasTable.$inferSelect[],
  statutActuel: Statut
): string[] {
  const manquants: string[] = [];

  switch (statutActuel) {
    case "CREATION":
      if (!intervention.clientId) manquants.push("Client");
      if (!intervention.vehiculeId) manquants.push("Véhicule");
      break;

    case "CLIENT_VEHICULE":
      break;

    case "CONTROLE_INITIAL": {
      if (!intervention.poidsEntreeG) manquants.push("Poids d'entrée");
      if (!intervention.pressionEntreeMbar) manquants.push("Pression d'entrée");
      if (!intervention.diagnosticAccessoires) manquants.push("Diagnostic accessoires");
      if (!intervention.diagnosticCeramique) manquants.push("Diagnostic céramique");
      const hasMediaEntree = medias.some(m =>
        m.typeMedia === "PHOTO_FAP_ENTREE" || m.typeMedia === "VIDEO_ENDOSCOPE_ENTREE" || m.typeMedia === "PHOTO_VEHICULE"
      );
      if (!hasMediaEntree) manquants.push("Photo ou vidéo d'entrée");
      if (!intervention.validationClientReception) manquants.push("Signature client / validation réception");
      if (intervention.diagnosticCeramique === "FONDU") {
        manquants.push("Céramique fondue : nettoyage impossible — clôturer le dossier comme non nettoyable");
      }
      break;
    }

    case "VALIDATION_RECEPTION":
      if (!intervention.validationClientReception) {
        manquants.push("Validation client (le client doit valider la réception)");
      }
      break;

    case "ATELIER_ENTREE":
      if (!intervention.validationEntreeAtelier) {
        manquants.push("Confirmation entrée atelier");
      }
      break;

    case "NETTOYAGE":
      if (!intervention.nettoyageTermine) {
        manquants.push("Nettoyage terminé");
      }
      break;

    case "SECHAGE":
      if (!intervention.sechageTermine) {
        manquants.push("Séchage terminé");
      }
      break;

    case "CONTROLE_FINAL": {
      if (!intervention.poidsSortieG) manquants.push("Poids de sortie");
      if (!intervention.pressionSortieMbar) manquants.push("Pression de sortie");
      if (!intervention.resultatFinal) manquants.push("Résultat final");
      const hasMediaSortie = medias.some(m =>
        m.typeMedia === "PHOTO_FAP_SORTIE" || m.typeMedia === "VIDEO_ENDOSCOPE_SORTIE"
      );
      if (!hasMediaSortie) manquants.push("Photo ou vidéo de sortie");
      if (!intervention.validationTechnicien) manquants.push("Validation technicien");

      if (intervention.poidsSortieG && intervention.poidsEntreeG) {
        const sortie = parseFloat(String(intervention.poidsSortieG));
        const entree = parseFloat(String(intervention.poidsEntreeG));
        if (sortie > entree) {
          manquants.push("Le poids de sortie ne peut pas être supérieur au poids d'entrée");
        }
      }
      break;
    }

    case "RESTITUTION":
      if (!intervention.rapportPdfGenere) manquants.push("Rapport PDF généré");
      if (!intervention.fapRestitue) manquants.push("FAP restitué au client");
      if (!intervention.validationFinale) manquants.push("Validation finale");
      break;

    case "CLOTURE":
      manquants.push("Le dossier est déjà clôturé");
      break;
  }

  return manquants;
}

router.post("/interventions/:id/avancer", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const [intervention] = await db.select().from(interventionsTable).where(eq(interventionsTable.id, id));
  if (!intervention) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  if (intervention.statut === "CLOTURE") {
    res.status(422).json({ error: "WORKFLOW_ERROR", champsManquants: ["Le dossier est déjà clôturé"] });
    return;
  }

  const medias = await db.select().from(mediasTable).where(eq(mediasTable.interventionId, id));
  const manquants = verifierConditions(intervention, medias, intervention.statut as Statut);

  if (manquants.length > 0) {
    res.status(422).json({
      error: `Impossible de passer à l'étape suivante. Éléments manquants : ${manquants.join(", ")}`,
      champsManquants: manquants,
    });
    return;
  }

  const indexActuel = STATUTS_ORDRE.indexOf(intervention.statut as Statut);
  const prochainStatut = STATUTS_ORDRE[indexActuel + 1] as Statut;

  const dateFields: Record<Statut, string | null> = {
    CREATION: null,
    CLIENT_VEHICULE: "dateClientVehicule",
    CONTROLE_INITIAL: "dateControleInitial",
    VALIDATION_RECEPTION: "dateValidationReception",
    ATELIER_ENTREE: "dateAtelierEntree",
    NETTOYAGE: "dateNettoyage",
    SECHAGE: "dateSechage",
    CONTROLE_FINAL: "dateControleFinal",
    RESTITUTION: "dateRestitution",
    CLOTURE: "dateCloture",
  };

  const dateField = dateFields[prochainStatut];
  const updatePayload: Record<string, unknown> = {
    statut: prochainStatut,
    updatedAt: new Date(),
  };
  if (dateField) {
    updatePayload[dateField as keyof typeof updatePayload] = new Date();
  }

  await db.update(interventionsTable)
    .set(updatePayload as Parameters<ReturnType<typeof db.update>["set"]>[0])
    .where(eq(interventionsTable.id, id));

  await db.insert(historiqueTable).values({
    interventionId: id,
    ancienStatut: intervention.statut,
    nouveauStatut: prochainStatut,
    utilisateur: "utilisateur",
  });

  const full = await getInterventionFull(id);
  res.json(full);
});

router.get("/interventions/:id/historique", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const historique = await db.select().from(historiqueTable)
    .where(eq(historiqueTable.interventionId, id))
    .orderBy(historiqueTable.dateModification);

  res.json(historique);
});

router.post("/interventions/:id/rapport-pdf", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const full = await getInterventionFull(id);
  if (!full) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  const pdfUrl = `/api/interventions/${id}/rapport-pdf/download`;

  await db.update(interventionsTable)
    .set({ rapportPdfGenere: true, rapportPdfUrl: pdfUrl, updatedAt: new Date() })
    .where(eq(interventionsTable.id, id));

  res.json({ url: pdfUrl, message: "Rapport PDF généré avec succès" });
});

export default router;
