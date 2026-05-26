-- Wizard (client sans véhicule) + lien de partage client
ALTER TABLE "interventions" ALTER COLUMN "vehicule_id" DROP NOT NULL;
ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "share_token" text;
ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "share_token_created_at" timestamp;
CREATE UNIQUE INDEX IF NOT EXISTS "interventions_share_token_unique" ON "interventions" ("share_token");
