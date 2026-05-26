import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  useListInterventions,
  getListInterventionsQueryKey,
  useSupprimerInterventionsEnMasse,
  StatutIntervention,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ConfirmDeleteInterventionsDialog,
  type InterventionToDelete,
} from "@/components/interventions/ConfirmDeleteInterventionsDialog";

export default function Interventions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutIntervention | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const listParams = {
    search: debouncedSearch,
    statut: statutFilter !== "ALL" ? statutFilter : undefined,
  };

  const { data, isLoading } = useListInterventions(listParams, {
    query: { queryKey: getListInterventionsQueryKey(listParams) },
  });

  const interventions = data?.interventions ?? [];

  const deleteMutation = useSupprimerInterventionsEnMasse({
    mutation: {
      onSuccess: (result) => {
        setSelectedIds(new Set());
        setDeleteDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListInterventionsQueryKey() });
        toast({
          title: "Suppression effectuée",
          description: result.message,
        });
        if (result.idsIntrouvables.length > 0) {
          toast({
            title: "Attention",
            description: `${result.idsIntrouvables.length} dossier(s) déjà supprimé(s) ou introuvable(s).`,
            variant: "destructive",
          });
        }
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer les interventions sélectionnées.",
          variant: "destructive",
        });
      },
    },
  });

  const interventionsToDelete: InterventionToDelete[] = useMemo(
    () =>
      interventions
        .filter((i) => selectedIds.has(i.id))
        .map((i) => ({ id: i.id, numeroDossier: i.numeroDossier })),
    [interventions, selectedIds],
  );

  const allSelected =
    interventions.length > 0 && interventions.every((i) => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0;

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(interventions.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleConfirmDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    deleteMutation.mutate({ data: { ids } });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossiers en cours</h1>
            <p className="text-slate-500 mt-1">Liste des interventions et leur statut</p>
          </div>
          {someSelected && (
            <Button
              variant="destructive"
              className="shrink-0"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer ({selectedIds.size})
            </Button>
          )}
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
            <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as StatutIntervention | "ALL")}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : interventions.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Aucun dossier trouvé</h3>
            <p className="text-slate-500">Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-12 px-4 h-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(c) => toggleAll(c === true)}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">N° dossier</TableHead>
                  <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                  <TableHead className="font-semibold text-slate-700">Client</TableHead>
                  <TableHead className="font-semibold text-slate-700">Véhicule</TableHead>
                  <TableHead className="font-semibold text-slate-700">Créé le</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((intervention) => {
                  const isSelected = selectedIds.has(intervention.id);
                  return (
                    <TableRow
                      key={intervention.id}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-primary/5 hover:bg-primary/10",
                      )}
                      onClick={() => setLocation(`/interventions/${intervention.id}`)}
                    >
                      <TableCell className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => toggleOne(intervention.id, c === true)}
                          aria-label={`Sélectionner ${intervention.numeroDossier}`}
                        />
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-slate-900">
                        {intervention.numeroDossier}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={STATUT_COLORS[intervention.statut] || ""}>
                          {STATUT_LABELS[intervention.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-slate-700">
                        {intervention.client?.nomClient ?? "—"}
                      </TableCell>
                      <TableCell className="py-4 text-slate-600">
                        {intervention.vehicule ? (
                          <>
                            <span className="font-medium">{intervention.vehicule.immatriculation}</span>
                            {(intervention.vehicule.marque || intervention.vehicule.modele) && (
                              <span className="text-slate-400 ml-1">
                                ({intervention.vehicule.marque} {intervention.vehicule.modele})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-slate-600 whitespace-nowrap">
                        {formatDate(intervention.dateCreation, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="py-4">
                        {intervention.alerte && (
                          <AlertCircle className="w-5 h-5 text-destructive" aria-label="Alerte" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDeleteInterventionsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        interventions={interventionsToDelete}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </Layout>
  );
}
