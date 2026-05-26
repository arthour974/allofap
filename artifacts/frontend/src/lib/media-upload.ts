/** Types MIME images acceptés pour l'upload atelier */
export const ACCEPTED_IMAGE_MIME = ["image/png", "image/jpeg", "image/jpg"] as const;

export const IMAGE_FILE_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg";

export const IMAGE_VIDEO_FILE_ACCEPT = `${IMAGE_FILE_ACCEPT},video/*,.mp4,.webm`;

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export function resolveImageMimeTypeOrNull(file: File): string | null {
  const t = file.type?.toLowerCase();
  if (t === "image/jpg" || t === "image/jpeg" || t === "image/png") {
    return t === "image/jpg" ? "image/jpeg" : t;
  }

  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return EXT_TO_MIME[ext] ?? null;
}

export function isAcceptedImageFile(file: File): boolean {
  return resolveImageMimeTypeOrNull(file) !== null;
}

/** Déduit le MIME pour l'API (après validation). */
export function resolveImageMimeType(file: File): string {
  return resolveImageMimeTypeOrNull(file) ?? "image/jpeg";
}

export function isVideoFile(file: File): boolean {
  if (file.type?.startsWith("video/")) return true;
  const name = file.name.toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v"].some((ext) => name.endsWith(ext));
}
