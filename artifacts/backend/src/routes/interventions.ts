import { Router, type IRouter } from "express";
import {
  db, interventionsTable, clientsTable, vehiculesTable, mediasTable, historiqueTable,
} from "@workspace/db";
import { eq, ilike, or, sql, and, gte, lte, count } from "drizzle-orm";
import {
  CreateInterventionBody,
  UpdateInterventionBody,
  SupprimerInterventionsEnMasseBody as   SupprimerInterventionsEnMasseBody,
} from "@workspace/api-zod";
import { verifyShopifyWebhook } from "../lib/shopify-webhook";
import { deleteInterventionById } from "../lib/delete-intervention.js";
import { isNotNullViolation } from "../lib/db-errors.js";
import { getInterventionFull } from "../lib/get-intervention-full.js";
import { buildRapportHtml } from "../lib/rapport-html.js";
import { isDossierTermine, isWizardStatut, wizardDateFieldForStatut } from "../lib/wizard.js";
import { ensureInterventionShareToken, newShareToken } from "../lib/share-token.js";

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
    dateCreation: r.intervention.dateCreation ?? r.intervention.createdAt,
    updatedAt: r.intervention.updatedAt ?? r.intervention.createdAt,
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

  if (!clientId) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Client obligatoire" });
    return;
  }

  const numeroDossier = await generateNumeroDossier();
  const statut = vehiculeId ? "CLIENT_VEHICULE" : "CREATION";
  const shareToken = newShareToken();

  try {
    const [intervention] = await db.insert(interventionsTable).values({
      numeroDossier,
      clientId,
      vehiculeId: vehiculeId ?? null,
      statut,
      shareToken,
      shareTokenCreatedAt: new Date(),
      ...(vehiculeId ? { dateClientVehicule: new Date() } : {}),
    }).returning();

    await db.insert(historiqueTable).values({
      interventionId: intervention.id,
      ancienStatut: null,
      nouveauStatut: "CREATION",
      utilisateur: "système",
    });

    const full = await getInterventionFull(intervention.id);
    res.status(201).json(full);
  } catch (err) {
    if (isNotNullViolation(err) && !vehiculeId) {
      res.status(503).json({
        error: "SCHEMA_OUTDATED",
        message:
          "La base de données n'autorise pas encore un dossier sans véhicule. Exécutez : pnpm --filter @workspace/db migrate:wizard",
      });
      return;
    }
    throw err;
  }
});

router.post("/interventions/supprimer-en-masse", async (req, res) => {
  const body = SupprimerInterventionsEnMasseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Liste d'identifiants invalide" });
    return;
  }

  const idsSupprimees: number[] = [];
  const idsIntrouvables: number[] = [];

  for (const id of body.data.ids) {
    const ok = await deleteInterventionById(id);
    if (ok) idsSupprimees.push(id);
    else idsIntrouvables.push(id);
  }

  res.json({
    message:
      idsSupprimees.length === 1
        ? "1 intervention supprimée"
        : `${idsSupprimees.length} interventions supprimées`,
    supprimees: idsSupprimees.length,
    idsSupprimees,
    idsIntrouvables,
  });
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

  const { statut: newStatut, vehiculeId: newVehiculeId, clientId: newClientId, ...fieldUpdates } = body.data;
  const updateData: Record<string, unknown> = { ...fieldUpdates, updatedAt: new Date() };

  if (newClientId !== undefined && newClientId !== null && newClientId !== existing[0].clientId) {
    const [clientRow] = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.id, newClientId)).limit(1);
    if (!clientRow) {
      res.status(404).json({ error: "NOT_FOUND", message: "Client introuvable" });
      return;
    }
    updateData.clientId = newClientId;
    if (existing[0].vehiculeId) {
      const [vehiculeRow] = await db
        .select({ clientId: vehiculesTable.clientId })
        .from(vehiculesTable)
        .where(eq(vehiculesTable.id, existing[0].vehiculeId))
        .limit(1);
      if (vehiculeRow && vehiculeRow.clientId !== newClientId) {
        updateData.vehiculeId = null;
      }
    }
  }

  if (newVehiculeId !== undefined && newVehiculeId !== null) {
    updateData.vehiculeId = newVehiculeId;
  }

  if (newStatut !== undefined && newStatut !== null && newStatut !== existing[0].statut) {
    if (!isWizardStatut(newStatut)) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Statut invalide pour le stepper" });
      return;
    }
    updateData.statut = newStatut;
    const dateField = wizardDateFieldForStatut(newStatut);
    if (dateField) {
      updateData[dateField] = new Date();
    }
    await db.insert(historiqueTable).values({
      interventionId: id,
      ancienStatut: existing[0].statut,
      nouveauStatut: newStatut,
      utilisateur: "utilisateur",
    });
  }

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

router.post("/interventions/:id/partage", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const existing = await db.select().from(interventionsTable).where(eq(interventionsTable.id, id)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  const regenerate = req.query.regenerate === "true";
  let shareToken: string;

  if (regenerate) {
    shareToken = newShareToken();
    await db
      .update(interventionsTable)
      .set({ shareToken, shareTokenCreatedAt: new Date(), updatedAt: new Date() })
      .where(eq(interventionsTable.id, id));
  } else {
    shareToken = await ensureInterventionShareToken(id);
  }

  res.json({
    shareToken,
    shareUrl: `/partage/${shareToken}`,
    message: regenerate
      ? "Nouveau lien de suivi client créé. L'ancien lien ne fonctionne plus."
      : "Lien de suivi client prêt. Transmettez-le au client pour suivre l'avancement du dossier.",
  });
});

router.delete("/interventions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const deleted = await deleteInterventionById(id);
  if (!deleted) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  res.json({ message: "Intervention supprimée" });
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
      if (!intervention.poidsEntreeG) manquants.push("Poids d'entrée (g)");
      if (!intervention.pressionEntreeMbar) manquants.push("Pression d'entrée (mbar)");
      if (!intervention.diagnosticAccessoires) manquants.push("Diagnostic accessoires");
      if (!intervention.diagnosticCeramique) manquants.push("Diagnostic céramique");
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
        manquants.push("Confirmation d'entrée atelier requise");
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
      if (!intervention.poidsSortieG) manquants.push("Poids de sortie (g)");
      if (!intervention.pressionSortieMbar) manquants.push("Pression de sortie (mbar)");
      if (!intervention.resultatFinal) manquants.push("Résultat final");
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
      if (!intervention.clientInforme) manquants.push("Client informé");
      if (!intervention.fapRestitue) manquants.push("FAP restitué au client");
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

router.get("/interventions/:id/rapport-pdf/download", async (req, res) => {
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

  const html = buildRapportHtml(full);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="rapport-${full.numeroDossier}.html"`);
  res.send(html);
});

router.post("/interventions/webhook", verifyShopifyWebhook, async (req, res) => {
  const customer = req.body.customer;
  try {

  if (!customer) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Customer not found" });
    return;
  }

  let client = await db.select().from(clientsTable).where(eq(clientsTable.email, customer.email)).limit(1);
  // If client does not exist, create it
  if (client.length === 0) {
    client = await db.insert(clientsTable).values({
      email: customer.email,
      nomClient: customer.first_name + " " + customer.last_name,
      telephone: customer.phone ?? "",
    }).returning();
  }

  // Create vehicule
  const [vehicule] = await db.insert(vehiculesTable).values({
    clientId: client[0].id,
    immatriculation: 'INCONNU', // DEFAULT
    marque: 'INCONNUE', // DEFAULT
    modele: 'INCONNUE', // DEFAULT
  }).returning();

  // Create intervention
  const [intervention] = await db.insert(interventionsTable).values({
    numeroDossier: await generateNumeroDossier(),
    clientId: client[0].id,
    vehiculeId: vehicule.id,
    statut: "CREATION",
  }).returning();

    res.status(200).json({ message: "Intervention created", intervention });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to create intervention" });
  }
});

export default router;
