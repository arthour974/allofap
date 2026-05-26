import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  KanbanSquare,
  List,
  PlusCircle,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/kanban", label: "Vue Kanban", icon: KanbanSquare },
  { href: "/interventions", label: "Dossiers en cours", icon: List },
  { href: "/interventions/nouveau", label: "Nouveau dossier", icon: PlusCircle },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/clients", label: "Clients", icon: Users },
];

export function Sidebar({
  className,
  embedded = false,
}: {
  className?: string;
  embedded?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });

  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      },
    },
  });

  return (
    <aside
      className={cn(
        "flex w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg",
        embedded
          ? "relative h-full"
          : "fixed inset-y-0 left-0 z-30 h-svh",
        className,
      )}
    >
      <div className="p-6">
        <Link href="/" className="block" title="AlloFAP">
          <img
            src="/logo-allofap.png"
            alt="AlloFAP"
            className="h-18 w-auto max-w-[300px] object-contain object-left"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-sidebar-accent border border-sidebar-border">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.nom?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">{user?.nom || "Utilisateur"}</span>
              <span className="text-xs text-sidebar-foreground/60">{user?.role || "Rôle"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="p-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/80 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
