import { useParams } from "wouter";
import {
  useGetInterventionPartage,
  getGetInterventionPartageQueryKey,
  StatutIntervention,
  ResultatFinal,
} from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Loader2, Download, FileText, RefreshCw, ImageIcon } from "lucide-react";
import type { Media } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS } from "@/lib/constants";
import { WorkflowProgress } from "@/components/interventions/detail/WorkflowProgress";
import { isWizardComplete } from "@/lib/wizard-steps";

const RESULTAT_LABELS: Record<string, string> = {
  [ResultatFinal.NETTOYE]: "Nettoyé avec succès",
  [ResultatFinal.PARTIELLEMENT_NETTOYE]: "Partiellement nettoyé",
  [ResultatFinal.NON_NETTOYABLE]: "Non nettoyable",
};

const CLIENT_STATUT_HINTS: Partial<Record<StatutIntervention, string>> = {
  [StatutIntervention.CREATION]: "Votre dossier est en cours d'ouverture chez AlloFAP.",
  [StatutIntervention.CLIENT_VEHICULE]: "Vos coordonnées et votre véhicule sont enregistrés.",
  [StatutIntervention.VALIDATION_RECEPTION]: "Réception du FAP en cours de validation.",
  [StatutIntervention.CONTROLE_INITIAL]: "Contrôle initial du filtre en cours.",
  [StatutIntervention.NETTOYAGE]: "Nettoyage du FAP en cours.",
  [StatutIntervention.SECHAGE]: "Phase de séchage en cours.",
  [StatutIntervention.CONTROLE_FINAL]: "Contrôle final en cours.",
  [StatutIntervention.RESTITUTION]: "Préparation de la restitution.",
  [StatutIntervention.CLOTURE]: "Intervention terminée.",
};

export default function PartageClient() {
  const params = useParams();
  const token = params.token ?? "";

  const termineQuery = (data: { statut: StatutIntervention } | undefined) =>
    data ? isWizardComplete({ statut: data.statut }) : false;

  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useGetInterventionPartage(token, {
    query: {
      queryKey: getGetInterventionPartageQueryKey(token),
      enabled: !!token,
      refetchInterval: (query) => (termineQuery(query.state.data) ? false : 30_000),
    },
  });

  const pdfUrl = token ? `/api/public/interventions/${token}/rapport-pdf` : "";
  const termine = data ? isWizardComplete({ statut: data.statut }) : false;
  const hasMesures =
    data?.poidsEntreeG != null ||
    data?.poidsSortieG != null ||
    data?.pressionEntreeMbar != null ||
    data?.pressionSortieMbar != null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-slate-600">
            Ce lien n&apos;est pas valide ou le dossier n&apos;est plus disponible.
          </CardContent>
        </Card>
      </div>
    );
  }

  const masse =
    data.poidsEntreeG != null && data.poidsSortieG != null
      ? `${(data.poidsEntreeG - data.poidsSortieG).toFixed(0)} g`
      : "—";
  const efficacitePression =
    data.efficacitePrensionPourcent != null
      ? `${Number(data.efficacitePrensionPourcent).toFixed(1)} %`
      : data.pressionEntreeMbar != null &&
          data.pressionSortieMbar != null &&
          data.pressionEntreeMbar > 0
        ? `${(((data.pressionEntreeMbar - data.pressionSortieMbar) / data.pressionEntreeMbar) * 100).toFixed(1)} %`
        : "—";

  const progressSource = {
    statut: data.statut,
    client: data.client,
    vehicule: data.vehicule ?? null,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <img src="/logo-allofap.png" alt="AlloFAP" className="h-10 w-auto" />
          <Badge variant="outline">{STATUT_LABELS[data.statut] ?? data.statut}</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suivi de votre dossier FAP</h1>
            <p className="text-slate-500 mt-1">
              Référence <strong>{data.numeroDossier}</strong>
              {data.dateCloture && ` — terminé le ${formatDate(data.dateCloture, "dd MMMM yyyy")}`}
            </p>
            {CLIENT_STATUT_HINTS[data.statut] && (
              <p className="text-sm text-primary mt-2">{CLIENT_STATUT_HINTS[data.statut]}</p>
            )}
          </div>
          {!termine && (
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          )}
        </div>

        <WorkflowProgress intervention={progressSource} variant="client" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Véhicule & client</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block">Client</span>
              <span className="font-medium">{data.client.nomClient}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Téléphone</span>
              <span className="font-medium">{data.client.telephone}</span>
            </div>
            {data.vehicule && (
              <>
                <div>
                  <span className="text-slate-500 block">Immatriculation</span>
                  <span className="font-medium">{data.vehicule.immatriculation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Véhicule</span>
                  <span className="font-medium">
                    {data.vehicule.marque} {data.vehicule.modele}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Photos & FAP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.medias?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.medias.map((media: Media) => {
                  const isVideo = media.mimeType?.startsWith("video/");
                  return (
                    <div
                      key={media.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      {isVideo ? (
                        <video src={media.url} className="h-full w-full object-cover" controls />
                      ) : (
                        <a href={media.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                          <img
                            src={media.url}
                            alt={media.nomFichier || "Photo intervention"}
                            className="h-full w-full object-cover hover:opacity-95 transition-opacity"
                          />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                Les photos du FAP seront affichées ici au fur et à mesure de l&apos;intervention.
              </p>
            )}
          </CardContent>
        </Card>

        {hasMesures && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résultats du nettoyage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(data.poidsEntreeG != null || data.poidsSortieG != null) && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Poids</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-muted p-4">
                      <div className="text-2xl font-bold text-primary">{data.poidsEntreeG ?? "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">Poids entrée (g)</div>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="text-2xl font-bold text-primary">{data.poidsSortieG ?? "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">Poids sortie (g)</div>
                    </div>
                    <div className="rounded-lg bg-muted p-4 col-span-2 sm:col-span-1">
                      <div className="text-2xl font-bold text-primary">{masse}</div>
                      <div className="text-xs text-slate-500 mt-1">Masse extraite</div>
                    </div>
                  </div>
                </div>
              )}
              {(data.pressionEntreeMbar != null || data.pressionSortieMbar != null) && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Pression</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-muted p-4">
                      <div className="text-2xl font-bold text-primary">{data.pressionEntreeMbar ?? "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">Pression entrée (mbar)</div>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="text-2xl font-bold text-primary">{data.pressionSortieMbar ?? "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">Pression sortie (mbar)</div>
                    </div>
                    <div className="rounded-lg bg-muted p-4 col-span-2 sm:col-span-1">
                      <div className="text-2xl font-bold text-primary">{efficacitePression}</div>
                      <div className="text-xs text-slate-500 mt-1">Efficacité pression</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            {data.resultatFinal && (
              <CardContent className="pt-0">
                <p className="text-sm">
                  <span className="text-slate-500">Résultat : </span>
                  <strong>{RESULTAT_LABELS[data.resultatFinal] ?? data.resultatFinal}</strong>
                </p>
              </CardContent>
            )}
            {data.observationAtelier && (
              <CardContent className="pt-0 border-t mt-4">
                <p className="text-sm text-slate-600">
                  <strong>Observations atelier :</strong> {data.observationAtelier}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {!termine && (
          <p className="text-sm text-slate-500 text-center">
            Cette page se met à jour automatiquement. Dernière actualisation :{" "}
            {formatDate(new Date(dataUpdatedAt).toISOString(), "HH:mm")}
          </p>
        )}

        {termine && (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Télécharger le rapport PDF
              </a>
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
          <FileText className="w-3 h-3" />
          Document fourni par AlloFAP — nettoyage de filtre à particules
        </p>
      </main>
    </div>
  );
}
