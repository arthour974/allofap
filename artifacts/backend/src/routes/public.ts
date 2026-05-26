import { Router, type IRouter } from "express";
import { db, interventionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getInterventionFull } from "../lib/get-intervention-full.js";
import { buildRapportHtml } from "../lib/rapport-html.js";
import { isDossierTermine } from "../lib/wizard.js";

const router: IRouter = Router();

async function getInterventionByShareToken(token: string) {
  const [row] = await db
    .select({ id: interventionsTable.id })
    .from(interventionsTable)
    .where(eq(interventionsTable.shareToken, token))
    .limit(1);

  if (!row) return null;
  return getInterventionFull(row.id);
}

router.get("/public/interventions/:token", async (req, res) => {
  const full = await getInterventionByShareToken(req.params.token);
  if (!full) {
    res.status(404).json({ error: "NOT_FOUND", message: "Lien invalide ou dossier non disponible" });
    return;
  }

  res.json({
    numeroDossier: full.numeroDossier,
    statut: full.statut,
    dateCreation: full.dateCreation,
    updatedAt: full.updatedAt,
    dateCloture: full.dateCloture,
    client: full.client,
    vehicule: full.vehicule,
    poidsEntreeG: full.poidsEntreeG,
    poidsSortieG: full.poidsSortieG,
    pressionEntreeMbar: full.pressionEntreeMbar,
    pressionSortieMbar: full.pressionSortieMbar,
    masseExtraiteg: full.masseExtraiteg,
    efficacitePrensionPourcent: full.efficacitePrensionPourcent,
    diagnosticAccessoires: full.diagnosticAccessoires,
    diagnosticCeramique: full.diagnosticCeramique,
    resultatFinal: full.resultatFinal,
    observationAtelier: full.observationAtelier,
    preconisationCapteurPression: full.preconisationCapteurPression,
    preconisationEgr: full.preconisationEgr,
    preconisationRegenerationAutoroute: full.preconisationRegenerationAutoroute,
    preconisationControlInjecteurs: full.preconisationControlInjecteurs,
    preconisationControlTurbo: full.preconisationControlTurbo,
    preconisationControlConsommationHuile: full.preconisationControlConsommationHuile,
    rapportPdfUrl: full.rapportPdfUrl,
    medias: (full.medias ?? []).map((m) => ({
      id: m.id,
      interventionId: m.interventionId,
      typeMedia: m.typeMedia,
      url: m.url,
      nomFichier: m.nomFichier,
      mimeType: m.mimeType,
      tailleFichier: m.tailleFichier,
      createdAt: m.createdAt,
    })),
  });
});

router.get("/public/interventions/:token/rapport-pdf", async (req, res) => {
  const full = await getInterventionByShareToken(req.params.token);
  if (!full) {
    res.status(404).json({ error: "NOT_FOUND", message: "Lien invalide ou dossier non disponible" });
    return;
  }

  if (!isDossierTermine(full.statut)) {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Le rapport sera disponible une fois le dossier terminé.",
    });
    return;
  }

  const html = buildRapportHtml(full);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="rapport-${full.numeroDossier}.html"`);
  res.send(html);
});

export default router;
