import { StatutIntervention, type HistoriqueEntry } from "@workspace/api-client-react";
import { CheckCircle, ChevronDown, Save } from "lucide-react";
import { STATUT_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export function HistoriqueSection({ historique }: { historique?: HistoriqueEntry[] }) {
  const [open, setOpen] = useState(false);
  const entries = historique ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historique</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {entries.length} événement{entries.length !== 1 ? "s" : ""}
            {!open && entries.length > 0 && (
              <> · dernier le {formatDate(entries[0].dateModification, "dd MMM yyyy HH:mm")}</>
            )}
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {open ? "Réduire" : "Afficher"}
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="divide-y divide-slate-100">
          {entries.length === 0 ? (
            <p className="p-5 text-sm text-slate-500 text-center">Aucun historique.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 px-5 py-3 hover:bg-slate-50/80">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {entry.nouveauStatut ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <Save className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-900">
                    {entry.nouveauStatut
                      ? `→ ${STATUT_LABELS[entry.nouveauStatut as StatutIntervention] || entry.nouveauStatut}`
                      : `Modification : ${entry.champModifie}`}
                  </p>
                  {entry.ancienneValeur && entry.nouvelleValeur && (
                    <p className="text-slate-500 truncate">
                      {entry.ancienneValeur} → {entry.nouvelleValeur}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(entry.dateModification, "dd MMM yyyy HH:mm")} · {entry.utilisateur || "Système"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
