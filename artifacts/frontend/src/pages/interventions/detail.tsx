import { useState, useEffect, useCallback, useRef } from "react";
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
  useUpdateClient,
  useUpdateVehicule,
  useDeleteIntervention,
  getListInterventionsQueryKey,
  StatutIntervention,
  AjouterMediaBodyTypeMedia,
  type RapportPdfResponse,
  type UpdateInterventionBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { AlertCircle, ChevronRight, FileText, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDeleteInterventionsDialog } from "@/components/interventions/ConfirmDeleteInterventionsDialog";
import { WorkflowProgress } from "@/components/interventions/detail/WorkflowProgress";
import { ClientVehiculeSection } from "@/components/interventions/detail/ClientVehiculeSection";
import { MediasSection } from "@/components/interventions/detail/MediasSection";
import { AtelierSection } from "@/components/interventions/detail/AtelierSection";
import { HistoriqueSection } from "@/components/interventions/detail/HistoriqueSection";
import { ShareWithClientCard } from "@/components/interventions/ShareWithClientCard";
import { isAcceptedImageFile, isVideoFile, resolveImageMimeType } from "@/lib/media-upload";
import {
  buildAtelierFormData,
  canEditDetailWizardStep,
  NOUVEAU_DOSSIER_STEPS,
  statutForWizardStep,
  wizardStepIndexForSavedFields,
} from "@/lib/wizard-steps";
import type { InterventionDetail } from "@workspace/api-client-react";

export default function DetailIntervention() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [validationError, setValidationError] = useState<{ error: string, champsManquants: string[] } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState(false);
  const [clientForm, setClientForm] = useState({
    nomClient: "",
    telephone: "",
    email: "",
    adresse: "",
  });
  const [vehiculeForm, setVehiculeForm] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    vin: "",
    motorisation: "",
    kilometrage: "" as string | number,
  });

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
      onError: (error: { data?: { champsManquants?: string[]; message?: string }; message?: string }) => {
        const champsManquants = error.data?.champsManquants;
        if (champsManquants?.length) {
          setValidationError({ error: "VALIDATION_ERROR", champsManquants });
          toast({ title: "Éléments manquants", description: "Veuillez remplir tous les champs requis.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: error.data?.message || error.message || "Impossible d'avancer le dossier.", variant: "destructive" });
        }
      }
    }
  });

  const [uploadingMedia, setUploadingMedia] = useState(false);

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

  const updateClientMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        setEditingClient(false);
        toast({ title: "Client mis à jour", description: "Les informations client ont été enregistrées." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
      },
      onError: (error: { data?: { message?: string }; message?: string }) => {
        toast({
          title: "Erreur",
          description: error.data?.message || error.message || "Impossible d'enregistrer le client.",
          variant: "destructive",
        });
      },
    },
  });

  const updateVehiculeMutation = useUpdateVehicule({
    mutation: {
      onSuccess: () => {
        setEditingVehicule(false);
        toast({ title: "Véhicule mis à jour", description: "Les informations véhicule ont été enregistrées." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
      },
      onError: (error: { data?: { message?: string }; message?: string }) => {
        toast({
          title: "Erreur",
          description: error.data?.message || error.message || "Impossible d'enregistrer le véhicule.",
          variant: "destructive",
        });
      },
    },
  });

  const deleteInterventionMutation = useDeleteIntervention({
    mutation: {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        toast({
          title: "Intervention supprimée",
          description: "Le dossier a été supprimé. Le client et le véhicule sont conservés.",
        });
        queryClient.invalidateQueries({ queryKey: getListInterventionsQueryKey() });
        setLocation("/interventions");
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer cette intervention.",
          variant: "destructive",
        });
      },
    },
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
    const isVideo = typeMedia.startsWith("VIDEO_") || isVideoFile(file);
    if (!isVideo && !isAcceptedImageFile(file)) {
      toast({
        title: "Format non supporté",
        description: "Utilisez une image PNG, JPG ou JPEG.",
        variant: "destructive",
      });
      return;
    }

    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataBase64 = e.target?.result as string;
          await ajouterMediaMutation.mutateAsync({
            id,
            data: {
              typeMedia: typeMedia as typeof AjouterMediaBodyTypeMedia[keyof typeof AjouterMediaBodyTypeMedia],
              nomFichier: file.name,
              mimeType: isVideo ? (file.type || "video/mp4") : resolveImageMimeType(file),
              dataBase64,
            },
          });
        } finally {
          setUploadingMedia(false);
        }
      };
      reader.onerror = () => {
        setUploadingMedia(false);
        toast({ title: "Erreur", description: "Impossible de lire le fichier.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingMedia(false);
    }
  }, [id, ajouterMediaMutation, toast]);

  const genererPdfMutation = useGenererRapportPdf({
    mutation: {
      onSuccess: (data: RapportPdfResponse) => {
        toast({ title: "Succès", description: "Rapport PDF généré avec succès." });
        queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) });
        window.open(data.url, "_blank");
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible de générer le rapport PDF.", variant: "destructive" });
      }
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- formulaire workflow hétérogène (inputs vides "")
  const [formData, setFormData] = useState<any>({});
  const formDataRef = useRef(formData);
  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const applyInterventionToForm = useCallback((data: InterventionDetail) => {
    const next = buildAtelierFormData(data);
    setFormData(next);
    formDataRef.current = next;
  }, []);

  useEffect(() => {
    if (intervention && initializedForId.current !== id) {
      initializedForId.current = id;
      applyInterventionToForm(intervention);
    }
  }, [intervention, id, applyInterventionToForm]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev: typeof formData) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(
    (fields: string[]) => {
      const data = formDataRef.current;
      const updates: UpdateInterventionBody = {};
      fields.forEach((f) => {
        const v = data[f];
        if (typeof v === "boolean") {
          (updates as Record<string, unknown>)[f] = v;
        } else if (f === "observationAtelier") {
          (updates as Record<string, unknown>)[f] = v ?? "";
        } else if (v !== "" && v !== undefined && v !== null) {
          (updates as Record<string, unknown>)[f] = v;
        }
      });
      if (Object.keys(updates).length === 0) return;

      const wizardStep = wizardStepIndexForSavedFields(fields);
      const currentStepIdx = intervention
        ? NOUVEAU_DOSSIER_STEPS.findIndex((s) => s.statut === intervention.statut)
        : -1;
      if (
        wizardStep > 0 &&
        intervention?.statut !== StatutIntervention.CLOTURE &&
        (currentStepIdx < 0 || wizardStep >= currentStepIdx)
      ) {
        updates.statut = statutForWizardStep(wizardStep);
      }

      updateMutation.mutate(
        { id, data: updates },
        {
          onSuccess: (updated) => {
            queryClient.setQueryData(getGetInterventionQueryKey(id), updated);
            applyInterventionToForm(updated);
            queryClient.invalidateQueries({ queryKey: getGetHistoriqueInterventionQueryKey(id) });
            toast({ title: "Enregistré", description: "Les modifications de cette section ont été sauvegardées." });
          },
        },
      );
    },
    [id, intervention?.statut, updateMutation, toast, queryClient, applyInterventionToForm],
  );

  const startEditClient = () => {
    if (!intervention?.client) return;
    setClientForm({
      nomClient: intervention.client.nomClient,
      telephone: intervention.client.telephone,
      email: intervention.client.email ?? "",
      adresse: intervention.client.adresse ?? "",
    });
    setEditingClient(true);
  };

  const cancelEditClient = () => setEditingClient(false);

  const saveClient = () => {
    if (!intervention?.client?.id) return;
    if (!clientForm.nomClient.trim() || !clientForm.telephone.trim()) {
      toast({
        title: "Champs requis",
        description: "Le nom et le téléphone sont obligatoires.",
        variant: "destructive",
      });
      return;
    }
    updateClientMutation.mutate({
      id: intervention.client.id,
      data: {
        nomClient: clientForm.nomClient.trim(),
        telephone: clientForm.telephone.trim(),
        email: clientForm.email.trim() || null,
        adresse: clientForm.adresse.trim() || null,
      },
    });
  };

  const startEditVehicule = () => {
    if (!intervention?.vehicule) return;
    setVehiculeForm({
      immatriculation: intervention.vehicule.immatriculation,
      marque: intervention.vehicule.marque,
      modele: intervention.vehicule.modele,
      vin: intervention.vehicule.vin ?? "",
      motorisation: intervention.vehicule.motorisation ?? "",
      kilometrage: intervention.vehicule.kilometrage ?? "",
    });
    setEditingVehicule(true);
  };

  const cancelEditVehicule = () => setEditingVehicule(false);

  const saveVehicule = () => {
    if (!intervention?.vehicule?.id) return;
    if (!vehiculeForm.immatriculation.trim() || !vehiculeForm.marque.trim() || !vehiculeForm.modele.trim()) {
      toast({
        title: "Champs requis",
        description: "L'immatriculation, la marque et le modèle sont obligatoires.",
        variant: "destructive",
      });
      return;
    }
    const km = vehiculeForm.kilometrage === "" || vehiculeForm.kilometrage === null
      ? null
      : Number(vehiculeForm.kilometrage);
    updateVehiculeMutation.mutate({
      id: intervention.vehicule.id,
      data: {
        immatriculation: vehiculeForm.immatriculation.trim(),
        marque: vehiculeForm.marque.trim(),
        modele: vehiculeForm.modele.trim(),
        vin: vehiculeForm.vin.trim() || null,
        motorisation: vehiculeForm.motorisation.trim() || null,
        kilometrage: km != null && !Number.isNaN(km) ? km : null,
      },
    });
  };

  const isTermine = intervention?.statut === StatutIntervention.CLOTURE;

  const canEditStep = useCallback(
    (stepIndex: number) => canEditDetailWizardStep(stepIndex, intervention),
    [intervention],
  );

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
              Créé le {formatDate(intervention.dateCreation, "dd MMMM yyyy à HH:mm")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-12 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteInterventionMutation.isPending}
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Supprimer
            </Button>
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
        </div>

        <ConfirmDeleteInterventionsDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          interventions={[{ id, numeroDossier: intervention.numeroDossier }]}
          onConfirm={() => deleteInterventionMutation.mutate({ id })}
          isPending={deleteInterventionMutation.isPending}
        />

        {validationError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg mb-2">Impossible d'avancer le dossier</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Des informations sont manquantes pour valider cette étape :</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {(validationError.champsManquants ?? []).map((champ, idx) => (
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

        {!isTermine && (
          <Alert className="bg-blue-50 border-blue-200 flex flex-row items-center">
            <AlertCircle className="h-5 w-5 text-blue-700" />
            <AlertTitle className="text-blue-900">Dossier en cours de création</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLocation(`/interventions/nouveau?dossier=${id}`)}>
                Continuer le dossier
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <ShareWithClientCard
          interventionId={id}
          shareToken={intervention.shareToken}
        />

        {isTermine && (
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <a href={`/api/interventions/${id}/rapport-pdf/download`} target="_blank" rel="noreferrer">
                <FileText className="w-4 h-4 mr-2" />
                Rapport PDF (atelier)
              </a>
            </Button>
          </div>
        )}

        <WorkflowProgress intervention={intervention} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <ClientVehiculeSection
              intervention={intervention}
              editingClient={editingClient}
              editingVehicule={editingVehicule}
              clientForm={clientForm}
              vehiculeForm={vehiculeForm}
              onStartEditClient={startEditClient}
              onCancelEditClient={cancelEditClient}
              onSaveClient={saveClient}
              onStartEditVehicule={startEditVehicule}
              onCancelEditVehicule={cancelEditVehicule}
              onSaveVehicule={saveVehicule}
              onClientFormChange={setClientForm}
              onVehiculeFormChange={setVehiculeForm}
              clientSaving={updateClientMutation.isPending}
              vehiculeSaving={updateVehiculeMutation.isPending}
              canEditClient={canEditStep(0)}
              canEditVehicule={canEditStep(1)}
            />

            <AtelierSection
              formData={formData}
              efficacite={efficacite}
              efficaciteColor={efficaciteColor}
              rapportPdfUrl={intervention.rapportPdfUrl}
              onChange={handleChange}
              onSaveFields={handleSave}
              onGeneratePdf={() => genererPdfMutation.mutate({ id })}
              pdfPending={genererPdfMutation.isPending}
              saving={updateMutation.isPending}
              canEditStep={canEditStep}
            />

            <HistoriqueSection historique={historique} />
          </div>

          <div className="xl:col-span-1">
            <MediasSection
              intervention={intervention}
              locked={!canEditStep(3)}
              uploading={uploadingMedia}
              onUpload={handleFileUpload}
              onDelete={(mediaId) => supprimerMediaMutation.mutate({ mediaId })}
              onCopyUrl={(url) => {
                navigator.clipboard.writeText(url);
                toast({ title: "Lien copié", description: "URL copiée dans le presse-papiers." });
              }}
              onInvalidFile={(message) =>
                toast({ title: "Fichier refusé", description: message, variant: "destructive" })
              }
              deletePending={supprimerMediaMutation.isPending}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
