import { Copy, ExternalLink, Link2, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useCreerLienPartageIntervention,
  getGetInterventionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type ShareWithClientCardProps = {
  interventionId: number;
  shareToken?: string | null;
  onTokenChange?: () => void;
};

export function ShareWithClientCard({
  interventionId,
  shareToken,
  onTokenChange,
}: ShareWithClientCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const partageMutation = useCreerLienPartageIntervention({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(interventionId) });
        onTokenChange?.();
        copyShareUrl(data.shareUrl, "Lien de suivi client copié dans le presse-papiers.");
      },
      onError: (error: { data?: { message?: string }; message?: string }) => {
        toast({
          title: "Erreur",
          description: error.data?.message || error.message || "Impossible d'obtenir le lien de partage.",
          variant: "destructive",
        });
      },
    },
  });

  const shareUrl = shareToken ? `${window.location.origin}/partage/${shareToken}` : null;

  const copyShareUrl = (pathOrUrl: string, description?: string) => {
    const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${window.location.origin}${pathOrUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast({
        title: "Lien copié",
        description: description ?? fullUrl,
      });
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Lien de suivi client
        </CardTitle>
        <CardDescription>
          Partagez ce lien dès la création du dossier : le client suit l&apos;avancement en temps réel, sans compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {shareUrl && (
          <p className="text-sm text-slate-600 break-all rounded-md bg-white/80 border px-3 py-2 font-mono">
            {shareUrl}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {shareUrl ? (
            <>
              <Button variant="default" onClick={() => copyShareUrl(shareUrl)}>
                <Copy className="w-4 h-4 mr-2" />
                Copier le lien
              </Button>
              <Button variant="outline" asChild>
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Aperçu client
                </a>
              </Button>
              <Button
                variant="outline"
                disabled={partageMutation.isPending}
                onClick={() =>
                  partageMutation.mutate({
                    id: interventionId,
                    params: { regenerate: true },
                  })
                }
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Régénérer le lien
              </Button>
            </>
          ) : (
            <Button
              onClick={() => partageMutation.mutate({ id: interventionId })}
              disabled={partageMutation.isPending}
            >
              <Link2 className="w-4 h-4 mr-2" />
              {partageMutation.isPending ? "Génération..." : "Activer le lien client"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
