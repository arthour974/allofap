import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, useLocation } from "wouter";
import { 
  useGetIntervention, 
  getGetInterventionQueryKey,
  useUpdateIntervention,
  useAvancerIntervention,
  useGenererRapportPdf,
  useGetHistoriqueIntervention,
  getGetHistoriqueInterventionQueryKey,
  useAjouterMedia,
  useSupprimerMedia,
  StatutIntervention,
  DiagnosticAccessoires,
  DiagnosticCeramique,
  ResultatFinal,
  AjouterMediaBodyTypeMedia,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUT_LABELS, STATUT_COLORS, WORKFLOW_ORDER } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, CheckCircle, ChevronRight, FileText, Download, Save, AlertTriangle, Upload, Trash2, Image, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DetailIntervention() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [validationError, setValidationError] = useState<{ error: string, champsManquants: string[] } | null>(null);

  // Queries
  const { data: intervention, isLoading } = useGetIntervention(id, {
    query: { queryKey: getGetInterventionQueryKey(id), enabled: !!id }
  });

  const { data: historique } = useGetHistoriqueIntervention(id, {
    query: { queryKey: getGetHistoriqueInterventionQueryKey(id), enabled: !!id }
  });

  // Mutations
  const updateMutation = useUpdateIntervention({
    mutation: {
      onSuccess: () => {
        toast({ title: "Enregistré", description: "Les modifications ont été sauvegardées." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible d'enregistrer les modifications.", variant: "destructive" });
      }
    }
  });

  const avancerMutation = useAvancerIntervention({
    mutation: {
      onSuccess: () => {
        setValidationError(null);
        toast({ title: "Succès", description: "Le dossier a avancé à l'étape suivante." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetHistoriqueInterventionQueryKey(id) });
      },
      onError: (error: any) => {
        if (error.champsManquants) {
          setValidationError(error);
          toast({ title: "Éléments manquants", description: "Veuillez remplir tous les champs requis.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: error.message || "Impossible d'avancer le dossier.", variant: "destructive" });
        }
      }
    }
  });

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ajouterMediaMutation = useAjouterMedia({
    mutation: {
      onSuccess: () => {
        toast({ title: "Média ajouté", description: "Le fichier a été ajouté avec succès." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible d'ajouter le média.", variant: "destructive" });
      }
    }
  });

  const supprimerMediaMutation = useSupprimerMedia({
    mutation: {
      onSuccess: () => {
        toast({ title: "Supprimé", description: "Le média a été supprimé." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible de supprimer le média.", variant: "destructive" });
      }
    }
  });

  const handleFileUpload = useCallback(async (file: File, typeMedia: string) => {
    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataBase64 = e.target?.result as string;
        await ajouterMediaMutation.mutateAsync({
          id,
          data: {
            typeMedia: typeMedia as typeof AjouterMediaBodyTypeMedia[keyof typeof AjouterMediaBodyTypeMedia],
            nomFichier: file.name,
            mimeType: file.type,
            dataBase64,
          }
        });
        setUploadingMedia(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingMedia(false);
    }
  }, [id, ajouterMediaMutation]);

  const genererPdfMutation = useGenererRapportPdf({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Succès", description: "Rapport PDF généré avec succès." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
        window.open(data.url, "_blank");
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible de générer le rapport PDF.", variant: "destructive" });
      }
    }
  });

  // State for forms
  const [formData, setFormData] = useState<any>({});
  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (intervention && initializedForId.current !== id) {
      initializedForId.current = id;
      setFormData({
        poidsEntreeG: intervention.poidsEntreeG || "",
        pressionEntreeMbar: intervention.pressionEntreeMbar || "",
        diagnosticAccessoires: intervention.diagnosticAccessoires || "",
        diagnosticCeramique: intervention.diagnosticCeramique || "",
        validationClientReception: intervention.validationClientReception || false,
        nettoyageCommence: intervention.nettoyageCommence || false,
        nettoyageTermine: intervention.nettoyageTermine || false,
        observationAtelier: intervention.observationAtelier || "",
        validationEntreeAtelier: intervention.validationEntreeAtelier || false,
        sechageCommence: intervention.sechageCommence || false,
        sechageTermine: intervention.sechageTermine || false,
        poidsSortieG: intervention.poidsSortieG || "",
        pressionSortieMbar: intervention.pressionSortieMbar || "",
        resultatFinal: intervention.resultatFinal || "",
        validationTechnicien: intervention.validationTechnicien || false,
        preconisationCapteurPression: intervention.preconisationCapteurPression || false,
        preconisationEgr: intervention.preconisationEgr || false,
        preconisationRegenerationAutoroute: intervention.preconisationRegenerationAutoroute || false,
        preconisationControlInjecteurs: intervention.preconisationControlInjecteurs || false,
        preconisationControlTurbo: intervention.preconisationControlTurbo || false,
        preconisationControlConsommationHuile: intervention.preconisationControlConsommationHuile || false,
        rapportPdfGenere: intervention.rapportPdfGenere || false,
        clientInforme: intervention.clientInforme || false,
        fapRestitue: intervention.fapRestitue || false,
      });
    }
  }, [intervention, id]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  const handleSave = (fields: string[]) => {
    const dataToSave: any = {};
    fields.forEach(f => {
      if (formData[f] !== "") dataToSave[f] = formData[f];
    });
    updateMutation.mutate({ id, data: dataToSave });
  };

  const currentStatutIndex = intervention ? WORKFLOW_ORDER.indexOf(intervention.statut) : -1;
  const isTermine = intervention?.statut === StatutIntervention.CLOTURE;

  if (isLoading || !intervention) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Calcul efficacité
  let efficacite = 0;
  if (formData.pressionEntreeMbar && formData.pressionSortieMbar) {
    efficacite = ((Number(formData.pressionEntreeMbar) - Number(formData.pressionSortieMbar)) / Number(formData.pressionEntreeMbar)) * 100;
  }
  
  const efficaciteColor = 
    efficacite >= 50 ? "bg-green-100 text-green-800" :
    efficacite >= 20 ? "bg-orange-100 text-orange-800" :
    efficacite >= 10 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Dossier {intervention.numeroDossier}
              </h1>
              <Badge className={`text-sm px-3 py-1 ${STATUT_COLORS[intervention.statut] || ""}`}>
                {STATUT_LABELS[intervention.statut]}
              </Badge>
            </div>
            <p className="text-slate-500">
              Créé le {format(new Date(intervention.dateCreation), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </p>
          </div>

          {!isTermine && (
            <Button 
              size="lg" 
              className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
              onClick={() => avancerMutation.mutate({ id })}
              disabled={avancerMutation.isPending}
            >
              Étape suivante
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>

        {validationError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg mb-2">Impossible d'avancer le dossier</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Des informations sont manquantes pour valider cette étape :</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {validationError.champsManquants.map((champ, idx) => (
                  <li key={idx} className="font-medium">{champ}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {intervention.alerte && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Alerte sur ce dossier</AlertTitle>
            <AlertDescription>{intervention.alerte}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="bg-slate-100 p-1 mb-6 flex-wrap h-auto justify-start">
            <TabsTrigger value="workflow" className="data-[state=active]:bg-white">Workflow Atelier</TabsTrigger>
            <TabsTrigger value="client" className="data-[state=active]:bg-white">Client & Véhicule</TabsTrigger>
            <TabsTrigger value="medias" className="data-[state=active]:bg-white">Médias</TabsTrigger>
            <TabsTrigger value="historique" className="data-[state=active]:bg-white">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-6">
            {/* Contrôle Initial */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.CONTROLE_INITIAL) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">1</div>
                    Contrôle Initial
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleSave(["poidsEntreeG", "pressionEntreeMbar", "diagnosticAccessoires", "diagnosticCeramique"])}>
                    <Save className="w-4 h-4 mr-2" /> Enregistrer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Poids à l'entrée (g)</Label>
                  <Input type="number" value={formData.poidsEntreeG} onChange={e => handleChange("poidsEntreeG", e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="space-y-2">
                  <Label>Pression à l'entrée (mbar)</Label>
                  <Input type="number" value={formData.pressionEntreeMbar} onChange={e => handleChange("pressionEntreeMbar", e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="space-y-2">
                  <Label>Diagnostic Accessoires</Label>
                  <Select value={formData.diagnosticAccessoires} onValueChange={v => handleChange("diagnosticAccessoires", v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DiagnosticAccessoires.OK}>OK</SelectItem>
                      <SelectItem value={DiagnosticAccessoires.SONDE_CASSEE}>Sonde cassée</SelectItem>
                      <SelectItem value={DiagnosticAccessoires.TUBES_HS}>Tubes HS</SelectItem>
                      <SelectItem value={DiagnosticAccessoires.GRIPPE}>Grippé</SelectItem>
                      <SelectItem value={DiagnosticAccessoires.AUTRE}>Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diagnostic Céramique</Label>
                  <Select value={formData.diagnosticCeramique} onValueChange={v => handleChange("diagnosticCeramique", v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DiagnosticCeramique.SAIN}>Sain</SelectItem>
                      <SelectItem value={DiagnosticCeramique.FISSURE}>Fissuré</SelectItem>
                      <SelectItem value={DiagnosticCeramique.FONDU}>Fondu</SelectItem>
                      <SelectItem value={DiagnosticCeramique.HUILE}>Plein d'huile</SelectItem>
                      <SelectItem value={DiagnosticCeramique.COLMATE}>Colmaté</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.diagnosticCeramique === DiagnosticCeramique.FONDU && (
                    <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" /> Attention: FAP Fondu (Nettoyage impossible)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Validation Réception */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.VALIDATION_RECEPTION) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">2</div>
                  Validation Réception
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="validationClient" 
                    checked={formData.validationClientReception} 
                    onCheckedChange={(c) => {
                      handleChange("validationClientReception", !!c);
                      handleSave(["validationClientReception"]);
                    }}
                  />
                  <Label htmlFor="validationClient" className="text-base font-medium cursor-pointer">
                    Le client valide la réception et autorise le contrôle/nettoyage du FAP.
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Atelier Entrée & Nettoyage */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.ATELIER_ENTREE) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">3</div>
                  Nettoyage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Checkbox 
                    id="validationEntreeAtelier" 
                    checked={formData.validationEntreeAtelier} 
                    onCheckedChange={(c) => {
                      handleChange("validationEntreeAtelier", !!c);
                      handleSave(["validationEntreeAtelier"]);
                    }}
                  />
                  <Label htmlFor="validationEntreeAtelier" className="text-base font-medium cursor-pointer">
                    Entrée atelier confirmée — le FAP est bien en atelier
                  </Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="nettoyageCommence" 
                      checked={formData.nettoyageCommence} 
                      onCheckedChange={(c) => {
                        handleChange("nettoyageCommence", !!c);
                        handleSave(["nettoyageCommence"]);
                      }}
                    />
                    <Label htmlFor="nettoyageCommence" className="text-base font-medium">Nettoyage commencé</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="nettoyageTermine" 
                      checked={formData.nettoyageTermine} 
                      onCheckedChange={(c) => {
                        handleChange("nettoyageTermine", !!c);
                        handleSave(["nettoyageTermine"]);
                      }}
                    />
                    <Label htmlFor="nettoyageTermine" className="text-base font-medium">Nettoyage terminé</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Observations Atelier</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-primary" onClick={() => handleSave(["observationAtelier"])}>Enregistrer</Button>
                  </div>
                  <Textarea 
                    placeholder="Remarques éventuelles lors du nettoyage..." 
                    className="min-h-[100px]"
                    value={formData.observationAtelier}
                    onChange={(e) => handleChange("observationAtelier", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Séchage */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.SECHAGE) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">4</div>
                  Séchage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="sechageCommence" 
                      checked={formData.sechageCommence} 
                      onCheckedChange={(c) => {
                        handleChange("sechageCommence", !!c);
                        handleSave(["sechageCommence"]);
                      }}
                    />
                    <Label htmlFor="sechageCommence" className="text-base font-medium">Séchage commencé</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="sechageTermine" 
                      checked={formData.sechageTermine} 
                      onCheckedChange={(c) => {
                        handleChange("sechageTermine", !!c);
                        handleSave(["sechageTermine"]);
                      }}
                    />
                    <Label htmlFor="sechageTermine" className="text-base font-medium">Séchage terminé</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrôle Final */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.CONTROLE_FINAL) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">5</div>
                    Contrôle Final
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleSave(["poidsSortieG", "pressionSortieMbar", "resultatFinal"])}>
                    <Save className="w-4 h-4 mr-2" /> Enregistrer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Poids à la sortie (g)</Label>
                    <Input type="number" value={formData.poidsSortieG} onChange={e => handleChange("poidsSortieG", e.target.value ? Number(e.target.value) : "")} />
                    {formData.poidsSortieG > formData.poidsEntreeG && formData.poidsSortieG !== "" && (
                      <p className="text-red-500 text-xs">Erreur: Le poids de sortie ne peut pas être supérieur au poids d'entrée.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Pression à la sortie (mbar)</Label>
                    <Input type="number" value={formData.pressionSortieMbar} onChange={e => handleChange("pressionSortieMbar", e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="block text-sm text-slate-500 mb-1">Masse extraite</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {formData.poidsEntreeG && formData.poidsSortieG ? (Number(formData.poidsEntreeG) - Number(formData.poidsSortieG)).toFixed(0) : "-"} g
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-slate-500 mb-1">Efficacité</span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-900">
                        {formData.pressionEntreeMbar && formData.pressionSortieMbar ? efficacite.toFixed(1) : "-"} %
                      </span>
                      {formData.pressionEntreeMbar && formData.pressionSortieMbar && (
                        <Badge className={efficaciteColor}>
                          {efficacite >= 50 ? "Bon" : efficacite >= 20 ? "Moyen" : efficacite >= 10 ? "Faible" : "Insuffisant"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Résultat Final</Label>
                  <Select value={formData.resultatFinal} onValueChange={v => handleChange("resultatFinal", v)}>
                    <SelectTrigger className="max-w-md"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ResultatFinal.NETTOYE}>Nettoyé avec succès</SelectItem>
                      <SelectItem value={ResultatFinal.PARTIELLEMENT_NETTOYE}>Partiellement nettoyé</SelectItem>
                      <SelectItem value={ResultatFinal.NON_NETTOYABLE}>Non nettoyable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Checkbox 
                    id="validationTechnicien" 
                    checked={formData.validationTechnicien} 
                    onCheckedChange={(c) => {
                      handleChange("validationTechnicien", !!c);
                      handleSave(["validationTechnicien"]);
                    }}
                  />
                  <Label htmlFor="validationTechnicien" className="text-base font-medium cursor-pointer">
                    Contrôle final validé par le technicien
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Préconisations & Restitution */}
            <Card className={currentStatutIndex >= WORKFLOW_ORDER.indexOf(StatutIntervention.RESTITUTION) ? "border-primary/20 shadow-sm" : "opacity-50 pointer-events-none"}>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">6</div>
                  Préconisations & Restitution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div>
                  <h4 className="font-semibold mb-4 text-slate-800">Préconisations client</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: "preconisationCapteurPression", label: "Capteur de pression différentielle" },
                      { id: "preconisationEgr", label: "Vanne EGR" },
                      { id: "preconisationRegenerationAutoroute", label: "Régénération sur autoroute" },
                      { id: "preconisationControlInjecteurs", label: "Contrôle injecteurs" },
                      { id: "preconisationControlTurbo", label: "Contrôle turbo" },
                      { id: "preconisationControlConsommationHuile", label: "Contrôle consommation d'huile" },
                    ].map(item => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={item.id} 
                          checked={formData[item.id]} 
                          onCheckedChange={(c) => {
                            handleChange(item.id, !!c);
                            handleSave([item.id]);
                          }}
                        />
                        <Label htmlFor={item.id} className="cursor-pointer">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4 text-slate-800">Restitution</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="clientInforme" 
                        checked={formData.clientInforme} 
                        onCheckedChange={(c) => {
                          handleChange("clientInforme", !!c);
                          handleSave(["clientInforme"]);
                        }}
                      />
                      <Label htmlFor="clientInforme" className="cursor-pointer">Client informé</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="fapRestitue" 
                        checked={formData.fapRestitue} 
                        onCheckedChange={(c) => {
                          handleChange("fapRestitue", !!c);
                          handleSave(["fapRestitue"]);
                        }}
                      />
                      <Label htmlFor="fapRestitue" className="cursor-pointer">FAP restitué au client</Label>
                    </div>
                    
                    <div className="pt-4 flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                        onClick={() => genererPdfMutation.mutate({ id })}
                        disabled={genererPdfMutation.isPending}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {genererPdfMutation.isPending ? "Génération..." : "Générer le rapport PDF"}
                      </Button>
                      
                      {intervention.rapportPdfUrl && (
                        <a href={intervention.rapportPdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center">
                          <Download className="w-4 h-4 mr-1" /> Télécharger le rapport généré
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client" className="space-y-6">
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle>Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-500">Nom / Raison sociale</Label>
                    <p className="text-lg font-medium">{intervention.client.nomClient}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Téléphone</Label>
                    <p className="text-lg font-medium">{intervention.client.telephone}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Email</Label>
                    <p className="text-lg font-medium">{intervention.client.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Adresse</Label>
                    <p className="text-lg font-medium">{intervention.client.adresse || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle>Informations Véhicule</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-500">Immatriculation</Label>
                    <p className="text-xl font-bold uppercase">{intervention.vehicule.immatriculation}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Marque & Modèle</Label>
                    <p className="text-lg font-medium">{intervention.vehicule.marque} {intervention.vehicule.modele}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">VIN (Numéro de châssis)</Label>
                    <p className="text-lg font-medium uppercase">{intervention.vehicule.vin || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Motorisation</Label>
                    <p className="text-lg font-medium">{intervention.vehicule.motorisation || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Kilométrage</Label>
                    <p className="text-lg font-medium">{intervention.vehicule.kilometrage ? `${intervention.vehicule.kilometrage} km` : "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="medias" className="space-y-4">
            {/* Upload zone */}
            <Card>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Médias & Photos</CardTitle>
                    <CardDescription className="mt-1">Photos FAP entrée/sortie, vidéos endoscope, photos véhicule</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia || isTermine}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingMedia ? "Envoi..." : "Ajouter un fichier"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const isVideo = file.type.startsWith("video/");
                      const typeMedia = isVideo ? AjouterMediaBodyTypeMedia.VIDEO_ENDOSCOPE_ENTREE : AjouterMediaBodyTypeMedia.PHOTO_FAP_ENTREE;
                      handleFileUpload(file, typeMedia);
                      e.target.value = "";
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {intervention.medias && intervention.medias.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {intervention.medias.map((media) => {
                      const isVideo = media.mimeType?.startsWith("video/");
                      const typeLabel: Record<string, string> = {
                        PHOTO_FAP_ENTREE: "FAP Entrée",
                        PHOTO_FAP_SORTIE: "FAP Sortie",
                        PHOTO_VEHICULE: "Véhicule",
                        PHOTO_ACCESSOIRES: "Accessoires",
                        PHOTO_NETTOYAGE: "Nettoyage",
                        VIDEO_ENDOSCOPE_ENTREE: "Endoscope Entrée",
                        VIDEO_ENDOSCOPE_SORTIE: "Endoscope Sortie",
                        SIGNATURE_CLIENT: "Signature",
                      };
                      return (
                        <div key={media.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex flex-col items-center justify-center">
                          {isVideo ? (
                            <video src={media.url} className="w-full h-full object-cover" controls />
                          ) : (
                            <img src={media.url} alt={media.nomFichier || "photo"} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <span className="text-white text-xs font-medium text-center">{typeLabel[media.typeMedia] || media.typeMedia}</span>
                            {!isTermine && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                onClick={() => supprimerMediaMutation.mutate({ mediaId: media.id })}
                                disabled={supprimerMediaMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" /> Supprimer
                              </Button>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 flex items-center gap-1">
                            {isVideo ? <Video className="w-3 h-3 shrink-0" /> : <Image className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{typeLabel[media.typeMedia] || media.typeMedia}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">Aucun média ajouté</p>
                    <p className="text-sm text-center max-w-xs">Ajoutez des photos ou vidéos (FAP avant/après nettoyage, véhicule, endoscope…)</p>
                    {!isTermine && (
                      <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Ajouter un fichier
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload rapide par catégorie */}
            {!isTermine && (
              <Card>
                <CardHeader className="bg-slate-50 border-b pb-3">
                  <CardTitle className="text-base">Ajout rapide par catégorie</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Photo FAP Entrée", type: AjouterMediaBodyTypeMedia.PHOTO_FAP_ENTREE, accept: "image/*" },
                      { label: "Photo FAP Sortie", type: AjouterMediaBodyTypeMedia.PHOTO_FAP_SORTIE, accept: "image/*" },
                      { label: "Vidéo Endoscope Entrée", type: AjouterMediaBodyTypeMedia.VIDEO_ENDOSCOPE_ENTREE, accept: "video/*" },
                      { label: "Vidéo Endoscope Sortie", type: AjouterMediaBodyTypeMedia.VIDEO_ENDOSCOPE_SORTIE, accept: "video/*" },
                      { label: "Photo Véhicule", type: AjouterMediaBodyTypeMedia.PHOTO_VEHICULE, accept: "image/*" },
                      { label: "Photo Accessoires", type: AjouterMediaBodyTypeMedia.PHOTO_ACCESSOIRES, accept: "image/*" },
                      { label: "Photo Nettoyage", type: AjouterMediaBodyTypeMedia.PHOTO_NETTOYAGE, accept: "image/*" },
                    ].map((item) => (
                      <label
                        key={item.type}
                        className="flex flex-col items-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
                      >
                        <input
                          type="file"
                          accept={item.accept}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleFileUpload(file, item.type);
                            e.target.value = "";
                          }}
                        />
                        {item.accept === "video/*" ? (
                          <Video className="w-6 h-6 text-slate-400" />
                        ) : (
                          <Image className="w-6 h-6 text-slate-400" />
                        )}
                        <span className="text-xs font-medium text-slate-600 leading-tight">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historique">
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle>Historique des actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {historique?.map((entry) => (
                    <div key={entry.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {entry.nouveauStatut ? <CheckCircle className="w-5 h-5 text-primary" /> : <Save className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {entry.nouveauStatut 
                            ? `Passage à l'étape : ${STATUT_LABELS[entry.nouveauStatut as StatutIntervention] || entry.nouveauStatut}`
                            : `Modification : ${entry.champModifie}`
                          }
                        </p>
                        {entry.ancienneValeur && entry.nouvelleValeur && (
                          <p className="text-sm text-slate-500 mt-1">
                            {entry.ancienneValeur} → {entry.nouvelleValeur}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <span>{format(new Date(entry.dateModification), "dd MMM yyyy à HH:mm:ss", { locale: fr })}</span>
                          <span>•</span>
                          <span>Par {entry.utilisateur || "Système"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!historique || historique.length === 0) && (
                    <div className="p-8 text-center text-slate-500">Aucun historique disponible.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
