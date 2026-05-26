import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { AjouterMediaBodyTypeMedia, type Media } from "@workspace/api-client-react";
import { Image, Link2, Trash2, Upload, Video } from "lucide-react";
import { SectionBlock } from "./SectionBlock";
import type { InterventionDetail } from "@workspace/api-client-react";
import {
  IMAGE_FILE_ACCEPT,
  IMAGE_VIDEO_FILE_ACCEPT,
  isAcceptedImageFile,
  isVideoFile,
} from "@/lib/media-upload";
import { detailStepLockedMessage } from "@/lib/wizard-steps";
const MEDIAS_WIZARD_STEP = 3;

const UPLOAD_CATEGORIES = [
  { label: "FAP entrée", type: AjouterMediaBodyTypeMedia.PHOTO_FAP_ENTREE, accept: IMAGE_FILE_ACCEPT, video: false },
  { label: "FAP sortie", type: AjouterMediaBodyTypeMedia.PHOTO_FAP_SORTIE, accept: IMAGE_FILE_ACCEPT, video: false },
  { label: "Endoscope (vidéo)", type: AjouterMediaBodyTypeMedia.VIDEO_ENDOSCOPE_ENTREE, accept: "video/*,.mp4,.webm", video: true },
  { label: "Véhicule", type: AjouterMediaBodyTypeMedia.PHOTO_VEHICULE, accept: IMAGE_FILE_ACCEPT, video: false },
  { label: "Accessoires", type: AjouterMediaBodyTypeMedia.PHOTO_ACCESSOIRES, accept: IMAGE_FILE_ACCEPT, video: false },
  { label: "Nettoyage", type: AjouterMediaBodyTypeMedia.PHOTO_NETTOYAGE, accept: IMAGE_FILE_ACCEPT, video: false },
] as const;

export function MediasSection({
  intervention,
  locked,
  uploading,
  onUpload,
  onDelete,
  onCopyUrl,
  onInvalidFile,
  deletePending,
}: {
  intervention: InterventionDetail;
  locked: boolean;
  uploading: boolean;
  onUpload: (file: File, typeMedia: string) => void;
  onDelete: (mediaId: number) => void;
  onCopyUrl: (url: string) => void;
  onInvalidFile?: (message: string) => void;
  deletePending: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const medias = intervention.medias ?? [];

  const handleFile = (file: File, expectedVideo: boolean, typeMedia: string) => {
    if (expectedVideo) {
      if (!isVideoFile(file)) {
        onInvalidFile?.("Choisissez une vidéo (MP4, WebM…).");
        return;
      }
    } else if (!isAcceptedImageFile(file)) {
      onInvalidFile?.("Format accepté : PNG, JPG ou JPEG.");
      return;
    }
    onUpload(file, typeMedia);
  };

  return (
    <SectionBlock
      title="Photos & FAP"
      description="PNG, JPG — photos du filtre et de l'intervention"
      action={
        !locked ? (
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Envoi..." : "Ajouter"}
          </Button>
        ) : undefined
      }
      locked={locked}
      lockedMessage={detailStepLockedMessage(MEDIAS_WIZARD_STEP)}
      className="xl:sticky xl:top-6"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_VIDEO_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (isVideoFile(file)) {
            handleFile(file, true, AjouterMediaBodyTypeMedia.VIDEO_ENDOSCOPE_ENTREE);
          } else {
            handleFile(file, false, AjouterMediaBodyTypeMedia.PHOTO_FAP_ENTREE);
          }
          e.target.value = "";
        }}
      />

      {medias.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {medias.map((media: Media) => {
            const isVideo = media.mimeType?.startsWith("video/");
            return (
              <div
                key={media.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
              >
                {isVideo ? (
                  <video src={media.url} className="h-full w-full object-cover" controls />
                ) : (
                  <img src={media.url} alt={media.nomFichier || "photo"} className="h-full w-full object-cover" />
                )}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {media.url.startsWith("http") && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => onCopyUrl(media.url)}
                    >
                      <Link2 className="w-3 h-3" />
                    </Button>
                  )}
                  {!locked && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      disabled={deletePending}
                      onClick={() => onDelete(media.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          disabled={locked || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-12 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          <Image className="w-10 h-10 text-slate-300" />
          <span className="text-sm font-medium text-slate-600">PNG ou JPG — cliquez pour ajouter</span>
        </button>
      )}

      {!locked && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Ajout par type</p>
          <div className="grid grid-cols-2 gap-2">
            {UPLOAD_CATEGORIES.map((item) => (
              <label
                key={item.type}
                className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-200 px-2 py-2.5 text-xs font-medium text-slate-600 cursor-pointer hover:border-primary/50 hover:bg-primary/5"
              >
                <input
                  type="file"
                  accept={item.accept}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file, item.video, item.type);
                    e.target.value = "";
                  }}
                />
                {item.video ? <Video className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
                {item.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
