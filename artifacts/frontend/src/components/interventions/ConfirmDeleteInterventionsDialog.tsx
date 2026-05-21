import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

export type InterventionToDelete = {
  id: number;
  numeroDossier: string;
};

type ConfirmDeleteInterventionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interventions: InterventionToDelete[];
  onConfirm: () => void;
  isPending?: boolean;
};

export function ConfirmDeleteInterventionsDialog({
  open,
  onOpenChange,
  interventions,
  onConfirm,
  isPending = false,
}: ConfirmDeleteInterventionsDialogProps) {
  const count = interventions.length;
  const plural = count > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>
                {plural
                  ? `Supprimer ${count} interventions ?`
                  : "Supprimer cette intervention ?"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-left text-sm text-slate-600">
                  <p>
                    Cette action est <strong className="text-slate-900">définitive</strong>.
                    Les dossiers, médias et historique associés seront supprimés.
                  </p>
                  <p className="text-slate-500">
                    Les fiches <strong>client</strong> et <strong>véhicule</strong> ne seront pas
                    supprimées.
                  </p>
                  {count > 0 && (
                    <ul className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-800">
                      {interventions.map((i) => (
                        <li key={i.id} className="py-0.5 font-medium">
                          {i.numeroDossier}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending || count === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isPending ? "Suppression..." : plural ? `Supprimer (${count})` : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
