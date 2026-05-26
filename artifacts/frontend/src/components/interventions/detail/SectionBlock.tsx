import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionBlock({
  title,
  description,
  action,
  children,
  className,
  locked = false,
  lockedMessage,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  locked?: boolean;
  lockedMessage?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-white shadow-sm",
        locked ? "border-slate-200 bg-slate-50/50" : "border-slate-200",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-2 min-w-0">
          {locked && <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />}
          <div>
            <h2 className={cn("text-lg font-semibold", locked ? "text-slate-500" : "text-slate-900")}>{title}</h2>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {!locked && action}
      </div>
      <div className="p-5 relative">
        {locked && lockedMessage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {lockedMessage}
          </div>
        )}
        <div className={cn(locked && "pointer-events-none opacity-50")}>{children}</div>
      </div>
    </section>
  );
}
