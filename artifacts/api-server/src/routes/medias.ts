import { Router, type IRouter } from "express";
import { db, mediasTable, interventionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AjouterMediaBody } from "@workspace/api-zod";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

router.get("/interventions/:id/medias", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const medias = await db.select().from(mediasTable)
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

  const intervention = await db.select().from(interventionsTable).where(eq(interventionsTable.id, id)).limit(1);
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

  const ext = path.extname(nomFichier) || ".bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  const url = `/api/uploads/${filename}`;

  const [media] = await db.insert(mediasTable).values({
    interventionId: id,
    typeMedia,
    url,
    nomFichier,
    mimeType,
    tailleFichier: buffer.length,
  }).returning();

  res.status(201).json(media);
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

  const filename = path.basename(media.url);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(mediasTable).where(eq(mediasTable.id, mediaId));
  res.json({ message: "Média supprimé" });
});

export default router;
