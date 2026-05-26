import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";
import { deleteClientById } from "../lib/delete-client.js";
import { isForeignKeyViolation } from "../lib/db-errors.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/clients", async (req, res) => {
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  let query = db.select().from(clientsTable);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(clientsTable);

  if (search) {
    const searchFilter = or(
      ilike(clientsTable.nomClient, `%${search}%`),
      ilike(clientsTable.telephone, `%${search}%`),
      ilike(clientsTable.email, `%${search}%`)
    );
    query = query.where(searchFilter) as typeof query;
    countQuery = countQuery.where(searchFilter) as typeof countQuery;
  }

  const [clients, countResult] = await Promise.all([
    query.limit(limit).offset(offset).orderBy(clientsTable.nomClient),
    countQuery,
  ]);

  res.json({ clients, total: Number(countResult[0]?.count ?? 0) });
});

router.post("/clients", async (req, res) => {
  const body = CreateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const [client] = await db.insert(clientsTable).values({
    nomClient: body.data.nomClient,
    telephone: body.data.telephone,
    email: body.data.email ?? null,
    adresse: body.data.adresse ?? null,
  }).returning();

  res.status(201).json(client);
});

router.get("/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "NOT_FOUND", message: "Client introuvable" });
    return;
  }

  res.json(client);
});

router.put("/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const body = UpdateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const [client] = await db.update(clientsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(clientsTable.id, id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "NOT_FOUND", message: "Client introuvable" });
    return;
  }

  res.json(client);
});

router.delete("/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  try {
    const deleted = await deleteClientById(id);
    if (!deleted) {
      res.status(404).json({ error: "NOT_FOUND", message: "Client introuvable" });
      return;
    }

    res.json({ message: "Client supprimé" });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({
        error: "CONFLICT",
        message: "Impossible de supprimer ce client : des données liées existent encore.",
      });
      return;
    }

    logger.error({ err, clientId: id }, "Erreur suppression client");
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Impossible de supprimer le client",
    });
  }
});

export default router;
