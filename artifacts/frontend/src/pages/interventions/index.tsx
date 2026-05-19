import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListInterventions, getListInterventionsQueryKey, StatutIntervention } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Car, User, Calendar } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

export default function Interventions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutIntervention | "ALL">("ALL");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useListInterventions(
    { 
      search: debouncedSearch,
      statut: statutFilter !== "ALL" ? statutFilter : undefined
    }, 
    {
      query: { queryKey: getListInterventionsQueryKey({ 
        search: debouncedSearch,
        statut: statutFilter !== "ALL" ? statutFilter : undefined
      }) }
    }
  );

  const interventions = data?.interventions ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossiers en cours</h1>
          <p className="text-slate-500 mt-1">Liste des interventions et leur statut</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Rechercher (N° dossier, immatriculation, client)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as any)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interventions.map((intervention) => (
              <Link key={intervention.id} href={`/interventions/${intervention.id}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-sm group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
                          {intervention.numeroDossier}
                        </h3>
                        <Badge variant="outline" className={STATUT_COLORS[intervention.statut] || ""}>
                          {STATUT_LABELS[intervention.statut]}
                        </Badge>
                      </div>
                      {intervention.alerte && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    
                    <div className="space-y-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">{intervention.client?.nomClient ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Car className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {intervention.vehicule?.immatriculation ?? "—"}
                          {intervention.vehicule?.marque && (
                            <span className="text-slate-400 ml-1">
                              ({intervention.vehicule.marque} {intervention.vehicule.modele})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Créé le {formatDate(intervention.dateCreation, "dd/MM/yyyy")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {interventions.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Aucun dossier trouvé</h3>
                <p className="text-slate-500">Essayez de modifier vos filtres de recherche.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
