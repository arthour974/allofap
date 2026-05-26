import {
  NOUVEAU_DOSSIER_STEPS,
  isWizardComplete,
  maxCompletedWizardStep,
  type WorkflowProgressSource,
} from "@/lib/wizard-steps";
import { cn } from "@/lib/utils";

export function WorkflowProgress({
  intervention,
  variant = "atelier",
}: {
  intervention: WorkflowProgressSource;
  variant?: "atelier" | "client";
}) {
  const maxCompleted = maxCompletedWizardStep(intervention);
  const termine = isWizardComplete(intervention);
  const activeIndex = NOUVEAU_DOSSIER_STEPS.findIndex((s) => s.statut === intervention.statut);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
      <p className="text-xs font-medium text-slate-500 mb-3">
        {variant === "client" ? "Avancement de votre dossier" : "Progression du dossier (stepper)"}
      </p>
      <div className="flex min-w-max items-center gap-1">
        {NOUVEAU_DOSSIER_STEPS.map((step, index) => {
          const done = index <= maxCompleted && (termine || index < maxCompleted || index === maxCompleted);
          const active =
            !termine &&
            (index === activeIndex || (activeIndex < 0 && index === maxCompleted + 1) || index === maxCompleted + 1);
          const locked = !termine && index > maxCompleted + 1;

          return (
            <div key={step.statut} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  done && !active && "bg-primary/15 text-primary",
                  active && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  locked && "bg-slate-100 text-slate-400",
                  !done && !active && !locked && "bg-slate-100 text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active && "bg-primary-foreground/20",
                    done && !active && "bg-primary/20",
                    locked && "bg-slate-200 text-slate-500",
                  )}
                >
                  {done && !active ? "✓" : index + 1}
                </span>
                {step.label}
              </div>
              {index < NOUVEAU_DOSSIER_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-4 shrink-0",
                    index < maxCompleted ? "bg-primary" : "bg-slate-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
