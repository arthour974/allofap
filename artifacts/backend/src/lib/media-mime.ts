const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export function normalizeMediaMimeType(mimeType: string, nomFichier: string): string | null {
  let mime = mimeType?.toLowerCase().trim() ?? "";
  if (mime === "image/jpg") mime = "image/jpeg";

  if (!mime || mime === "application/octet-stream") {
    const name = nomFichier.toLowerCase();
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    mime = EXT_TO_MIME[ext] ?? "";
  }

  if (IMAGE_MIMES.has(mime)) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  if (VIDEO_MIMES.has(mime)) {
    return mime;
  }
  return null;
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime) || mime === "image/jpeg";
}
