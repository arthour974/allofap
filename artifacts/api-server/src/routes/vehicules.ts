import { Router, type IRouter } from "express";
import { db, vehiculesTable, clientsTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { CreateVehiculeBody, UpdateVehiculeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vehicules", async (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
  const search = req.query.search as string | undefined;

  let query = db.select().from(vehiculesTable);
  const conditions = [];

  if (clientId && !isNaN(clientId)) {
    conditions.push(eq(vehiculesTable.clientId, clientId));
  }

  if (search) {
    conditions.push(
      or(
        ilike(vehiculesTable.immatriculation, `%${search}%`),
        ilike(vehiculesTable.marque, `%${search}%`),
        ilike(vehiculesTable.modele, `%${search}%`),
        ilike(vehiculesTable.vin, `%${search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const [vehicules, countResult] = await Promise.all([
    query.orderBy(vehiculesTable.immatriculation),
    db.select({ count: sql<number>`count(*)` }).from(vehiculesTable),
  ]);

  res.json({ vehicules, total: Number(countResult[0]?.count ?? 0) });
});

router.post("/vehicules", async (req, res) => {
  const body = CreateVehiculeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const client = await db.select().from(clientsTable).where(eq(clientsTable.id, body.data.clientId)).limit(1);
  if (!client[0]) {
    res.status(404).json({ error: "NOT_FOUND", message: "Client introuvable" });
    return;
  }

  const [vehicule] = await db.insert(vehiculesTable).values({
    clientId: body.data.clientId,
    immatriculation: body.data.immatriculation,
    vin: body.data.vin ?? null,
    marque: body.data.marque,
    modele: body.data.modele,
    motorisation: body.data.motorisation ?? null,
    kilometrage: body.data.kilometrage ?? null,
  }).returning();

  res.status(201).json(vehicule);
});

router.get("/vehicules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const [vehicule] = await db.select().from(vehiculesTable).where(eq(vehiculesTable.id, id));
  if (!vehicule) {
    res.status(404).json({ error: "NOT_FOUND", message: "Véhicule introuvable" });
    return;
  }

  res.json(vehicule);
});

router.put("/vehicules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "ID invalide" });
    return;
  }

  const body = UpdateVehiculeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const [vehicule] = await db.update(vehiculesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(vehiculesTable.id, id))
    .returning();

  if (!vehicule) {
    res.status(404).json({ error: "NOT_FOUND", message: "Véhicule introuvable" });
    return;
  }

  res.json(vehicule);
});

export default router;
