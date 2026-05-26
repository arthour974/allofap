import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function DossierWizardStepper({
  steps,
  activeStep,
  maxCompletedStep,
  onStepClick,
}: {
  steps: readonly { label: string }[];
  activeStep: number;
  maxCompletedStep: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <nav className="mb-8 overflow-x-auto pb-2">
      <ol className="flex min-w-max gap-1">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isDone = index <= maxCompletedStep;
          const isClickable = index <= maxCompletedStep + 1;

          return (
            <li key={step.label} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isActive && "bg-primary text-primary-foreground shadow-sm",
                  !isActive && isClickable && "hover:bg-muted",
                  !isClickable && "opacity-40 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border",
                    isActive && "border-primary-foreground/30 bg-primary-foreground/20",
                    !isActive && isDone && "bg-primary text-primary-foreground border-primary",
                    !isActive && !isDone && "border-slate-300 bg-white text-slate-600",
                  )}
                >
                  {isDone && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="hidden font-medium sm:inline max-w-[120px] truncate">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn("mx-1 h-px w-4 sm:w-8", isDone ? "bg-primary" : "bg-slate-200")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
