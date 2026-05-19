import { Router, type IRouter } from "express";
import {
  db, interventionsTable, clientsTable, vehiculesTable, mediasTable, historiqueTable,
} from "@workspace/db";
import { eq, ilike, or, sql, and, gte, lte, count } from "drizzle-orm";
import {
  CreateInterventionBody,
  UpdateInterventionBody,
} from "@workspace/api-zod";
import { verifyShopifyWebhook } from "../lib/shopify-webhook";

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

  const STATUT_LABELS: Record<string, string> = {
    CREATION: "Création", CLIENT_VEHICULE: "Client & Véhicule", CONTROLE_INITIAL: "Contrôle Initial",
    VALIDATION_RECEPTION: "Validation Réception", ATELIER_ENTREE: "Entrée Atelier", NETTOYAGE: "Nettoyage",
    SECHAGE: "Séchage", CONTROLE_FINAL: "Contrôle Final", RESTITUTION: "Restitution", CLOTURE: "Clôturé",
  };
  const RESULTAT_LABELS: Record<string, string> = {
    NETTOYE: "Nettoyé avec succès", PARTIELLEMENT_NETTOYE: "Partiellement nettoyé", NON_NETTOYABLE: "Non nettoyable",
  };
  const DIAG_LABELS: Record<string, string> = {
    OK: "OK", SONDE_CASSEE: "Sonde cassée", TUBES_HS: "Tubes HS", GRIPPE: "Grippé", AUTRE: "Autre",
    SAIN: "Sain", FISSURE: "Fissuré", FONDU: "Fondu", HUILE: "Plein d'huile", COLMATE: "Colmaté",
  };
  const d = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const masseExtraite = full.poidsEntreeG && full.poidsSortieG ? (Number(full.poidsEntreeG) - Number(full.poidsSortieG)).toFixed(0) + " g" : "-";
  const efficacite = full.pressionEntreeMbar && full.pressionSortieMbar
    ? (((Number(full.pressionEntreeMbar) - Number(full.pressionSortieMbar)) / Number(full.pressionEntreeMbar)) * 100).toFixed(1) + " %"
    : "-";

  const preconisations = [];
  if (full.preconisationCapteurPression) preconisations.push("Capteur de pression différentielle");
  if (full.preconisationEgr) preconisations.push("Vanne EGR");
  if (full.preconisationRegenerationAutoroute) preconisations.push("Régénération sur autoroute");
  if (full.preconisationControlInjecteurs) preconisations.push("Contrôle injecteurs");
  if (full.preconisationControlTurbo) preconisations.push("Contrôle turbo");
  if (full.preconisationControlConsommationHuile) preconisations.push("Contrôle consommation d'huile");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Rapport FAP — ${full.numeroDossier}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #1e3a5f; }
  .logo span { color: #3b82f6; }
  .ref { text-align: right; font-size: 13px; color: #64748b; }
  .ref strong { font-size: 18px; color: #1e293b; display: block; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 12px; }
  .field label { font-size: 11px; color: #64748b; text-transform: uppercase; }
  .field p { margin: 2px 0 0; font-size: 14px; font-weight: 600; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
  .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .metric .val { font-size: 22px; font-weight: 800; color: #1e3a5f; }
  .metric .lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-orange { background: #fed7aa; color: #9a3412; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .preco li { font-size: 13px; margin: 4px 0; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">FAP<span>Expert</span><div style="font-size:12px;font-weight:400;color:#64748b;margin-top:4px;">Rapport de nettoyage de filtre à particules</div></div>
  <div class="ref"><strong>${full.numeroDossier}</strong>Édité le ${d}</div>
</div>

<h2>Informations Client & Véhicule</h2>
<div class="grid">
  <div class="field"><label>Client</label><p>${full.client?.nomClient || "-"}</p></div>
  <div class="field"><label>Téléphone</label><p>${full.client?.telephone || "-"}</p></div>
  <div class="field"><label>Immatriculation</label><p>${full.vehicule?.immatriculation || "-"}</p></div>
  <div class="field"><label>Marque & Modèle</label><p>${full.vehicule?.marque || "-"} ${full.vehicule?.modele || ""}</p></div>
  <div class="field"><label>VIN</label><p>${full.vehicule?.vin || "-"}</p></div>
  <div class="field"><label>Motorisation</label><p>${full.vehicule?.motorisation || "-"}</p></div>
  <div class="field"><label>Kilométrage</label><p>${full.vehicule?.kilometrage ? full.vehicule.kilometrage + " km" : "-"}</p></div>
  <div class="field"><label>Statut final</label><p><span class="badge badge-${full.statut === "CLOTURE" ? "green" : "orange"}">${STATUT_LABELS[full.statut] || full.statut}</span></p></div>
</div>

<h2>Contrôle Initial</h2>
<div class="grid">
  <div class="field"><label>Poids à l'entrée</label><p>${full.poidsEntreeG ? full.poidsEntreeG + " g" : "-"}</p></div>
  <div class="field"><label>Pression à l'entrée</label><p>${full.pressionEntreeMbar ? full.pressionEntreeMbar + " mbar" : "-"}</p></div>
  <div class="field"><label>Diagnostic accessoires</label><p>${DIAG_LABELS[full.diagnosticAccessoires || ""] || full.diagnosticAccessoires || "-"}</p></div>
  <div class="field"><label>Diagnostic céramique</label><p>${DIAG_LABELS[full.diagnosticCeramique || ""] || full.diagnosticCeramique || "-"}</p></div>
</div>

<h2>Résultats de Nettoyage</h2>
<div class="metrics">
  <div class="metric"><div class="val">${full.poidsEntreeG ? full.poidsEntreeG + " g" : "-"}</div><div class="lbl">Poids entrée</div></div>
  <div class="metric"><div class="val">${full.poidsSortieG ? full.poidsSortieG + " g" : "-"}</div><div class="lbl">Poids sortie</div></div>
  <div class="metric"><div class="val">${masseExtraite}</div><div class="lbl">Masse extraite</div></div>
  <div class="metric"><div class="val">${efficacite}</div><div class="lbl">Efficacité</div></div>
</div>
<div class="grid" style="margin-top:16px;">
  <div class="field"><label>Pression à la sortie</label><p>${full.pressionSortieMbar ? full.pressionSortieMbar + " mbar" : "-"}</p></div>
  <div class="field"><label>Résultat final</label><p><span class="badge ${full.resultatFinal === "NETTOYE" ? "badge-green" : full.resultatFinal === "PARTIELLEMENT_NETTOYE" ? "badge-orange" : "badge-red"}">${RESULTAT_LABELS[full.resultatFinal || ""] || full.resultatFinal || "Non renseigné"}</span></p></div>
</div>
${full.observationAtelier ? `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;"><strong>Observations atelier :</strong> ${full.observationAtelier}</div>` : ""}

${preconisations.length > 0 ? `<h2>Préconisations</h2><ul class="preco">${preconisations.map(p => `<li>✓ ${p}</li>`).join("")}</ul>` : ""}

<div class="footer">FAP Expert — Rapport généré le ${d} — ${full.numeroDossier}<br/>Ce document est un rapport technique de nettoyage de filtre à particules.</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

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
