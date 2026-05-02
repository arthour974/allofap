import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import * as crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fap-expert-salt").digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Données invalides" });
    return;
  }

  const { identifiant, motDePasse } = body.data;
  const user = await db.select().from(usersTable).where(eq(usersTable.identifiant, identifiant)).limit(1);

  if (!user[0] || !verifyPassword(motDePasse, user[0].motDePasseHash)) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect" });
    return;
  }

  (req.session as Record<string, unknown>).userId = user[0].id;
  (req.session as Record<string, unknown>).userRole = user[0].role;

  res.json({
    user: { id: user[0].id, identifiant: user[0].identifiant, nom: user[0].nom, role: user[0].role },
    message: "Connexion réussie",
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Déconnexion réussie" });
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = (req.session as Record<string, unknown>).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Non authentifié" });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Utilisateur introuvable" });
    return;
  }

  res.json({ id: user[0].id, identifiant: user[0].identifiant, nom: user[0].nom, role: user[0].role });
});

export { hashPassword };
export default router;
