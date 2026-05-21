import { Router, type IRouter } from "express";
import { db, mediasTable, interventionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AjouterMediaBody } from "@workspace/api-zod";
import { deleteStoredMedia, uploadInterventionMedia } from "../lib/media-storage.js";

const router: IRouter = Router();

router.get("/interventions/:id/medias", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const medias = await db
    .select()
    .from(mediasTable)
    .where(eq(mediasTable.interventionId, id))
    .orderBy(mediasTable.createdAt);

  res.json(medias);
});

router.post("/interventions/:id/medias", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const body = AjouterMediaBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const intervention = await db
    .select()
    .from(interventionsTable)
    .where(eq(interventionsTable.id, id))
    .limit(1);

  if (!intervention[0]) {
    res.status(404).json({ error: "NOT_FOUND", message: "Intervention introuvable" });
    return;
  }

  const { typeMedia, nomFichier, mimeType, dataBase64 } = body.data;

  let buffer: Buffer;
  try {
    const base64Data = dataBase64.replace(/^data:[^;]+;base64,/, "");
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    res.status(400).json({ error: "INVALID_DATA", message: "Données base64 invalides" });
    return;
  }

  if (buffer.length === 0) {
    res.status(400).json({ error: "INVALID_DATA", message: "Fichier vide" });
    return;
  }

  try {
    const { url } = await uploadInterventionMedia(id, buffer, nomFichier, mimeType);

    const [media] = await db
      .insert(mediasTable)
      .values({
        interventionId: id,
        typeMedia,
        url,
        nomFichier,
        mimeType,
        tailleFichier: buffer.length,
      })
      .returning();

    res.status(201).json(media);
  } catch (err) {
    console.error("Erreur upload média:", err);
    res.status(500).json({
      error: "UPLOAD_FAILED",
      message: "Impossible d'enregistrer le fichier",
    });
  }
});

router.delete("/medias/:mediaId", async (req, res) => {
  const mediaId = parseInt(req.params.mediaId);
  if (isNaN(mediaId)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const [media] = await db.select().from(mediasTable).where(eq(mediasTable.id, mediaId));
  if (!media) {
    res.status(404).json({ error: "NOT_FOUND", message: "Média introuvable" });
    return;
  }

  try {
    await deleteStoredMedia(media.url);
  } catch (err) {
    console.error("Erreur suppression fichier média:", err);
  }

  await db.delete(mediasTable).where(eq(mediasTable.id, mediaId));
  res.json({ message: "Média supprimé" });
});

export default router;
