import * as fs from "node:fs";
import * as path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

type S3Config = {
  bucket: string;
  region: string;
  client: S3Client;
};

function getS3Config(): S3Config | null {
  const bucket = process.env.MEDIA_S3_BUCKET?.trim();
  if (!bucket) return null;

  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "eu-west-3";

  return {
    bucket,
    region,
    client: new S3Client({ region }),
  };
}

function buildPublicS3Url(bucket: string, region: string, key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function extractS3KeyFromUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const expectedHost = `${bucket}.s3.${process.env.AWS_REGION ?? "eu-west-3"}.amazonaws.com`;
    const altHost = `${bucket}.s3.amazonaws.com`;

    if (host !== expectedHost && !host.startsWith(`${bucket}.s3.`) && host !== altHost) {
      return null;
    }

    const key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    return key || null;
  } catch {
    return null;
  }
}

/** Enregistre un fichier (photo/vidéo) et retourne l'URL publique ou locale. */
export async function uploadInterventionMedia(
  interventionId: number,
  buffer: Buffer,
  nomFichier: string,
  mimeType: string,
): Promise<{ url: string }> {
  const ext = path.extname(nomFichier) || ".bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const s3 = getS3Config();
  if (s3) {
    const key = `interventions/${interventionId}/${filename}`;
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { url: buildPublicS3Url(s3.bucket, s3.region, key) };
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return { url: `/api/uploads/${filename}` };
}

/** Supprime le fichier stocké (S3 ou disque local) à partir de l'URL en base. */
export async function deleteStoredMedia(url: string): Promise<void> {
  const s3 = getS3Config();

  if (s3 && (url.startsWith("https://") || url.startsWith("http://"))) {
    const key = extractS3KeyFromUrl(url, s3.bucket);
    if (key?.startsWith("interventions/")) {
      await s3.client.send(
        new DeleteObjectCommand({
          Bucket: s3.bucket,
          Key: key,
        }),
      );
    }
    return;
  }

  const filename = path.basename(url);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function isMediaStorageS3Enabled(): boolean {
  return Boolean(process.env.MEDIA_S3_BUCKET?.trim());
}
