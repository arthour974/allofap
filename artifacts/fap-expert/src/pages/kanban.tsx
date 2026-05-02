import { Layout } from "@/components/layout/Layout";
import { useGetKanbanData, getGetKanbanDataQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Clock, Car, User } from "lucide-react";
import { Link } from "wouter";

export default function Kanban() {
  const { data: kanbanData, isLoading } = useGetKanbanData({
    query: { queryKey: getGetKanbanDataQueryKey() }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const columns = kanbanData?.colonnes || [];

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vue Kanban</h1>
          <p className="text-slate-500 mt-1">Suivi de l'avancement des dossiers en temps réel</p>
        </div>

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-h-[600px]">
            {columns.map((colonne) => (
              <div key={colonne.statut} className="flex-shrink-0 w-80 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700">{STATUT_LABELS[colonne.statut]}</h3>
                  <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                    {colonne.interventions.length}
                  </Badge>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {colonne.interventions.map((intervention) => (
                    <Link key={intervention.id} href={`/interventions/${intervention.id}`}>
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-primary">{intervention.numeroDossier}</span>
                            {intervention.alerte && (
                              <AlertCircle className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 shrink-0 text-slate-400" />
                              <span className="truncate">{intervention.client.nomClient}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 shrink-0 text-slate-400" />
                              <span className="font-medium">{intervention.vehicule.immatriculation}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t flex justify-between items-center text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(intervention.updatedAt), "dd/MM à HH:mm", { locale: fr })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {colonne.interventions.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-sm text-slate-400 italic">
                      Aucun dossier
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
