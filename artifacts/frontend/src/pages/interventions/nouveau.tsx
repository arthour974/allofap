import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateIntervention,
  useCreateVehicule,
  useGetIntervention,
  getGetInterventionQueryKey,
  useUpdateIntervention,
  useUpdateClient,
  useUpdateVehicule,
  DiagnosticAccessoires,
  DiagnosticCeramique,
  ResultatFinal,
  type UpdateInterventionBody,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { DossierWizardStepper } from "@/components/interventions/DossierWizardStepper";
import { ShareWithClientCard } from "@/components/interventions/ShareWithClientCard";
import { WizardClientStep } from "@/components/interventions/WizardClientStep";
import type { Client } from "@workspace/api-client-react";
import {
  NOUVEAU_DOSSIER_STEPS,
  canNavigateToWizardStep,
  defaultActiveWizardStep,
  isWizardComplete,
  maxCompletedWizardStep,
  statutForWizardStep,
} from "@/lib/wizard-steps";

const clientSchema = z.object({
  nomClient: z.string().min(1, "Nom du client requis"),
  telephone: z.string().min(1, "Téléphone requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  adresse: z.string().optional().or(z.literal("")),
});

const vehiculeSchema = z.object({
  immatriculation: z.string().min(1, "Immatriculation requise"),
  marque: z.string().min(1, "Marque requise"),
  modele: z.string().min(1, "Modèle requis"),
  vin: z.string().optional().or(z.literal("")),
  motorisation: z.string().optional().or(z.literal("")),
  kilometrage: z.coerce.number().optional().or(z.literal("")),
});

type ClientValues = z.infer<typeof clientSchema>;
type VehiculeValues = z.infer<typeof vehiculeSchema>;

function useDossierIdParam(): number | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("dossier");
  if (!id) return null;
  const n = Number(id);
  return Number.isNaN(n) ? null : n;
}

export default function NouveauDossier() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const initialDossierId = useDossierIdParam();

  const [interventionId, setInterventionId] = useState<number | null>(initialDossierId);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clientMode, setClientMode] = useState<"manual" | "existing">("manual");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const { data: intervention, isLoading } = useGetIntervention(interventionId ?? 0, {
    query: { queryKey: getGetInterventionQueryKey(interventionId ?? 0), enabled: !!interventionId },
  });

  const maxCompleted = useMemo(() => maxCompletedWizardStep(intervention), [intervention]);

  useEffect(() => {
    if (intervention) {
      if (isWizardComplete(intervention)) {
        setLocation(`/interventions/${intervention.id}`);
        return;
      }
      setActiveStep(defaultActiveWizardStep(intervention));
    }
  }, [intervention, setLocation]);

  const clientForm = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { nomClient: "", telephone: "", email: "", adresse: "" },
  });

  const vehiculeForm = useForm<VehiculeValues>({
    resolver: zodResolver(vehiculeSchema),
    defaultValues: {
      immatriculation: "", marque: "", modele: "", vin: "", motorisation: "", kilometrage: undefined,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workflow, setWorkflow] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!intervention) return;
    if (intervention.client?.id) {
      setSelectedClientId(intervention.client.id);
      setClientMode("existing");
    }
    clientForm.reset({
      nomClient: intervention.client?.nomClient ?? "",
      telephone: intervention.client?.telephone ?? "",
      email: intervention.client?.email ?? "",
      adresse: intervention.client?.adresse ?? "",
    });
    if (intervention.vehicule) {
      vehiculeForm.reset({
        immatriculation: intervention.vehicule.immatriculation,
        marque: intervention.vehicule.marque,
        modele: intervention.vehicule.modele,
        vin: intervention.vehicule.vin ?? "",
        motorisation: intervention.vehicule.motorisation ?? "",
        kilometrage: intervention.vehicule.kilometrage ?? undefined,
      });
    } else {
      vehiculeForm.reset({
        immatriculation: "", marque: "", modele: "", vin: "", motorisation: "", kilometrage: undefined,
      });
    }
    setWorkflow({
      validationClientReception: intervention.validationClientReception ?? false,
      poidsEntreeG: intervention.poidsEntreeG ?? "",
      pressionEntreeMbar: intervention.pressionEntreeMbar ?? "",
      diagnosticAccessoires: intervention.diagnosticAccessoires ?? "",
      diagnosticCeramique: intervention.diagnosticCeramique ?? "",
      validationEntreeAtelier: intervention.validationEntreeAtelier ?? false,
      nettoyageCommence: intervention.nettoyageCommence ?? false,
      nettoyageTermine: intervention.nettoyageTermine ?? false,
      observationAtelier: intervention.observationAtelier ?? "",
      sechageCommence: intervention.sechageCommence ?? false,
      sechageTermine: intervention.sechageTermine ?? false,
      poidsSortieG: intervention.poidsSortieG ?? "",
      pressionSortieMbar: intervention.pressionSortieMbar ?? "",
      resultatFinal: intervention.resultatFinal ?? "",
      validationTechnicien: intervention.validationTechnicien ?? false,
      preconisationCapteurPression: intervention.preconisationCapteurPression ?? false,
      preconisationEgr: intervention.preconisationEgr ?? false,
      preconisationRegenerationAutoroute: intervention.preconisationRegenerationAutoroute ?? false,
      preconisationControlInjecteurs: intervention.preconisationControlInjecteurs ?? false,
      preconisationControlTurbo: intervention.preconisationControlTurbo ?? false,
      preconisationControlConsommationHuile: intervention.preconisationControlConsommationHuile ?? false,
      clientInforme: intervention.clientInforme ?? false,
      fapRestitue: intervention.fapRestitue ?? false,
      commentaireInterne: intervention.commentaireInterne ?? "",
    });
  }, [intervention, clientForm, vehiculeForm]);

  const invalidate = useCallback(
    (id: number) => queryClient.invalidateQueries({ queryKey: getGetInterventionQueryKey(id) }),
    [queryClient],
  );

  const createMutation = useCreateIntervention();
  const updateMutation = useUpdateIntervention();
  const updateClientMutation = useUpdateClient();
  const updateVehiculeMutation = useUpdateVehicule();
  const createVehiculeMutation = useCreateVehicule();

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    clientForm.reset({
      nomClient: client.nomClient,
      telephone: client.telephone,
      email: client.email ?? "",
      adresse: client.adresse ?? "",
    });
  };

  const handleClearClientSelection = () => {
    setSelectedClientId(null);
    clientForm.reset({ nomClient: "", telephone: "", email: "", adresse: "" });
  };

  const persistIntervention = async (id: number, data: UpdateInterventionBody, stepIndex: number) => {
    await updateMutation.mutateAsync({
      id,
      data: { ...data, statut: statutForWizardStep(stepIndex) },
    });
    await invalidate(id);
  };

  const saveCurrentStep = async (): Promise<number> => {
    setSaving(true);
    try {
      if (activeStep === 0) {
        if (clientMode === "existing") {
          if (!selectedClientId) {
            toast({
              title: "Client requis",
              description: "Recherchez et sélectionnez un client dans la liste.",
              variant: "destructive",
            });
            throw new Error("validation");
          }

          if (!interventionId) {
            const created = await createMutation.mutateAsync({
              data: { clientId: selectedClientId },
            });
            setInterventionId(created.id);
            window.history.replaceState({}, "", `/interventions/nouveau?dossier=${created.id}`);
            await invalidate(created.id);
            return created.id;
          }

          if (intervention?.client?.id !== selectedClientId) {
            await persistIntervention(interventionId, { clientId: selectedClientId }, 0);
          } else {
            await persistIntervention(interventionId, {}, 0);
          }
          return interventionId;
        }

        const clientData = clientForm.getValues();
        const valid = await clientForm.trigger();
        if (!valid) throw new Error("validation");

        if (!interventionId) {
          const created = await createMutation.mutateAsync({
            data: {
              client: {
                nomClient: clientData.nomClient,
                telephone: clientData.telephone,
                email: clientData.email || null,
                adresse: clientData.adresse || null,
              },
            },
          });
          setInterventionId(created.id);
          window.history.replaceState({}, "", `/interventions/nouveau?dossier=${created.id}`);
          await invalidate(created.id);
          return created.id;
        }

        if (intervention?.client?.id) {
          await updateClientMutation.mutateAsync({
            id: intervention.client.id,
            data: {
              nomClient: clientData.nomClient,
              telephone: clientData.telephone,
              email: clientData.email || null,
              adresse: clientData.adresse || null,
            },
          });
          await persistIntervention(interventionId, {}, 0);
        }
        return interventionId;
      }

      if (!interventionId) throw new Error("no-id");

      if (activeStep === 1) {
        const v = vehiculeForm.getValues();
        const valid = await vehiculeForm.trigger();
        if (!valid) throw new Error("validation");

        if (intervention?.vehicule?.id) {
          await updateVehiculeMutation.mutateAsync({
            id: intervention.vehicule.id,
            data: {
              immatriculation: v.immatriculation,
              marque: v.marque,
              modele: v.modele,
              vin: v.vin || null,
              motorisation: v.motorisation || null,
              kilometrage: typeof v.kilometrage === "number" ? v.kilometrage : null,
            },
          });
          await persistIntervention(interventionId, {}, 1);
        } else if (intervention?.client?.id) {
          const vehicle = await createVehiculeMutation.mutateAsync({
            data: {
              clientId: intervention.client.id,
              immatriculation: v.immatriculation,
              marque: v.marque,
              modele: v.modele,
              vin: v.vin || null,
              motorisation: v.motorisation || null,
              kilometrage: typeof v.kilometrage === "number" ? v.kilometrage : null,
            },
          });
          await persistIntervention(interventionId, { vehiculeId: vehicle.id }, 1);
        }
        return interventionId;
      }

      if (activeStep === 2) {
        await persistIntervention(interventionId, {
          validationClientReception: !!workflow.validationClientReception,
        }, 2);
      } else if (activeStep === 3) {
        await persistIntervention(interventionId, {
          poidsEntreeG: workflow.poidsEntreeG === "" ? null : Number(workflow.poidsEntreeG),
          pressionEntreeMbar: workflow.pressionEntreeMbar === "" ? null : Number(workflow.pressionEntreeMbar),
          diagnosticAccessoires: workflow.diagnosticAccessoires || null,
          diagnosticCeramique: workflow.diagnosticCeramique || null,
        }, 3);
      } else if (activeStep === 4) {
        await persistIntervention(interventionId, {
          validationEntreeAtelier: !!workflow.validationEntreeAtelier,
          nettoyageCommence: !!workflow.nettoyageCommence,
          nettoyageTermine: !!workflow.nettoyageTermine,
          observationAtelier: workflow.observationAtelier || "",
        }, 4);
      } else if (activeStep === 5) {
        await persistIntervention(interventionId, {
          sechageCommence: !!workflow.sechageCommence,
          sechageTermine: !!workflow.sechageTermine,
        }, 5);
      } else if (activeStep === 6) {
        await persistIntervention(interventionId, {
          poidsSortieG: workflow.poidsSortieG === "" ? null : Number(workflow.poidsSortieG),
          pressionSortieMbar: workflow.pressionSortieMbar === "" ? null : Number(workflow.pressionSortieMbar),
          resultatFinal: workflow.resultatFinal || null,
          validationTechnicien: !!workflow.validationTechnicien,
        }, 6);
      } else if (activeStep === 7) {
        await persistIntervention(interventionId, {
          preconisationCapteurPression: !!workflow.preconisationCapteurPression,
          preconisationEgr: !!workflow.preconisationEgr,
          preconisationRegenerationAutoroute: !!workflow.preconisationRegenerationAutoroute,
          preconisationControlInjecteurs: !!workflow.preconisationControlInjecteurs,
          preconisationControlTurbo: !!workflow.preconisationControlTurbo,
          preconisationControlConsommationHuile: !!workflow.preconisationControlConsommationHuile,
          commentaireInterne: workflow.commentaireInterne || null,
        }, 7);
      } else if (activeStep === 8) {
        await persistIntervention(interventionId, {
          clientInforme: !!workflow.clientInforme,
          fapRestitue: !!workflow.fapRestitue,
          validationFinale: true,
        }, 8);
        toast({ title: "Dossier terminé", description: "Le dossier est clôturé. Vous pouvez le partager avec le client." });
        setLocation(`/interventions/${interventionId}`);
      }

      return interventionId;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      await saveCurrentStep();
      if (activeStep < NOUVEAU_DOSSIER_STEPS.length - 1) {
        setActiveStep((s) => s + 1);
      }
    } catch (e) {
      if ((e as Error).message !== "validation") {
        toast({ title: "Erreur", description: "Impossible d'enregistrer cette étape.", variant: "destructive" });
      }
    }
  };

  const handleStepClick = async (index: number) => {
    if (!canNavigateToWizardStep(index, intervention)) return;
    if (index === activeStep) return;
    try {
      await saveCurrentStep();
      setActiveStep(index);
    } catch {
      toast({ title: "Erreur", description: "Enregistrez les champs requis avant de changer d'étape.", variant: "destructive" });
    }
  };

  const wf = (field: string, value: unknown) => setWorkflow((p) => ({ ...p, [field]: value }));

  if (interventionId && isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nouveau dossier</h1>
          <p className="text-slate-500 mt-1">
            {intervention?.numeroDossier
              ? `Dossier ${intervention.numeroDossier} — progression enregistrée automatiquement`
              : "Création pas à pas — chaque étape est sauvegardée"}
          </p>
        </div>

        <DossierWizardStepper
          steps={NOUVEAU_DOSSIER_STEPS}
          activeStep={activeStep}
          maxCompletedStep={maxCompleted}
          onStepClick={handleStepClick}
        />

        {interventionId && (
          <ShareWithClientCard
            interventionId={interventionId}
            shareToken={intervention?.shareToken}
          />
        )}

        {activeStep === 0 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">1 — Client</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <WizardClientStep
                form={clientForm}
                mode={clientMode}
                onModeChange={setClientMode}
                selectedClientId={selectedClientId}
                onSelectClient={handleSelectClient}
                onClearSelection={handleClearClientSelection}
              />
            </CardContent>
          </Card>
        )}

        {activeStep === 1 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">2 — Voiture</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...vehiculeForm}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={vehiculeForm.control} name="immatriculation" render={({ field }) => (
                    <FormItem><FormLabel>Immatriculation *</FormLabel><FormControl><Input className="h-12 uppercase font-bold" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={vehiculeForm.control} name="vin" render={({ field }) => (
                    <FormItem><FormLabel>VIN</FormLabel><FormControl><Input className="h-12 uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={vehiculeForm.control} name="marque" render={({ field }) => (
                    <FormItem><FormLabel>Marque *</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={vehiculeForm.control} name="modele" render={({ field }) => (
                    <FormItem><FormLabel>Modèle *</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={vehiculeForm.control} name="motorisation" render={({ field }) => (
                    <FormItem><FormLabel>Motorisation</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={vehiculeForm.control} name="kilometrage" render={({ field }) => (
                    <FormItem><FormLabel>Kilométrage</FormLabel><FormControl><Input className="h-12" type="number" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {activeStep === 2 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">3 — Validation Réception</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="validationClientReception"
                  checked={!!workflow.validationClientReception}
                  onCheckedChange={(c: CheckedState) => wf("validationClientReception", c === true)}
                />
                <Label htmlFor="validationClientReception" className="text-base font-medium cursor-pointer">
                  Confirmer la réception et le client autorise le contrôle/nettoyage du FAP.
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 3 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">4 — Contrôle Initial</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Poids à l&apos;entrée (g)</Label>
                <Input type="number" value={workflow.poidsEntreeG} onChange={(e) => wf("poidsEntreeG", e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div className="space-y-2">
                <Label>Pression à l&apos;entrée (mbar)</Label>
                <Input type="number" value={workflow.pressionEntreeMbar} onChange={(e) => wf("pressionEntreeMbar", e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div className="space-y-2">
                <Label>Diagnostic Accessoires</Label>
                <Select value={workflow.diagnosticAccessoires} onValueChange={(v) => wf("diagnosticAccessoires", v)}>
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
                <Select value={workflow.diagnosticCeramique} onValueChange={(v) => wf("diagnosticCeramique", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DiagnosticCeramique.SAIN}>Sain</SelectItem>
                    <SelectItem value={DiagnosticCeramique.FISSURE}>Fissuré</SelectItem>
                    <SelectItem value={DiagnosticCeramique.FONDU}>Fondu</SelectItem>
                    <SelectItem value={DiagnosticCeramique.HUILE}>Plein d&apos;huile</SelectItem>
                    <SelectItem value={DiagnosticCeramique.COLMATE}>Colmaté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 4 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">5 — Nettoyage</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[
                { id: "validationEntreeAtelier", label: "Entrée atelier confirmée — le FAP est bien en atelier" },
                { id: "nettoyageCommence", label: "Nettoyage commencé" },
                { id: "nettoyageTermine", label: "Nettoyage terminé" },
              ].map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <Checkbox id={item.id} checked={!!workflow[item.id]} onCheckedChange={(c: CheckedState) => wf(item.id, c === true)} />
                  <Label htmlFor={item.id}>{item.label}</Label>
                </div>
              ))}
              <div className="space-y-2 pt-2">
                <Label>Observations Atelier</Label>
                <Textarea value={workflow.observationAtelier} onChange={(e) => wf("observationAtelier", e.target.value)} className="min-h-[100px]" />
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 5 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">6 — Séchage</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[
                { id: "sechageCommence", label: "Séchage commencé" },
                { id: "sechageTermine", label: "Séchage terminé" },
              ].map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <Checkbox id={item.id} checked={!!workflow[item.id]} onCheckedChange={(c: CheckedState) => wf(item.id, c === true)} />
                  <Label htmlFor={item.id}>{item.label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeStep === 6 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">7 — Contrôle final</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Poids à la sortie (g)</Label>
                  <Input type="number" value={workflow.poidsSortieG} onChange={(e) => wf("poidsSortieG", e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="space-y-2">
                  <Label>Pression à la sortie (mbar)</Label>
                  <Input type="number" value={workflow.pressionSortieMbar} onChange={(e) => wf("pressionSortieMbar", e.target.value ? Number(e.target.value) : "")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Résultat Final</Label>
                <Select value={workflow.resultatFinal} onValueChange={(v) => wf("resultatFinal", v)}>
                  <SelectTrigger className="max-w-md"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ResultatFinal.NETTOYE}>Nettoyé avec succès</SelectItem>
                    <SelectItem value={ResultatFinal.PARTIELLEMENT_NETTOYE}>Partiellement nettoyé</SelectItem>
                    <SelectItem value={ResultatFinal.NON_NETTOYABLE}>Non nettoyable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="validationTechnicien" checked={!!workflow.validationTechnicien} onCheckedChange={(c: CheckedState) => wf("validationTechnicien", c === true)} />
                <Label htmlFor="validationTechnicien">Contrôle final validé par le technicien</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 7 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">8 — Remarques et préconisations</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "preconisationCapteurPression", label: "Capteur de pression différentielle" },
                  { id: "preconisationEgr", label: "Vanne EGR" },
                  { id: "preconisationRegenerationAutoroute", label: "Régénération sur autoroute" },
                  { id: "preconisationControlInjecteurs", label: "Contrôle injecteurs" },
                  { id: "preconisationControlTurbo", label: "Contrôle turbo" },
                  { id: "preconisationControlConsommationHuile", label: "Contrôle consommation d'huile" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <Checkbox id={item.id} checked={!!workflow[item.id]} onCheckedChange={(c: CheckedState) => wf(item.id, c === true)} />
                    <Label htmlFor={item.id}>{item.label}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Commentaire interne / remarques</Label>
                <Textarea value={workflow.commentaireInterne} onChange={(e) => wf("commentaireInterne", e.target.value)} className="min-h-[80px]" />
              </div>
            </CardContent>
          </Card>
        )}

        {activeStep === 8 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg text-primary">9 — Confirmation terminé</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-slate-600">Confirmez la clôture du dossier. Le client pourra ensuite recevoir un lien de consultation et le rapport PDF.</p>
              <div className="flex items-center space-x-3">
                <Checkbox id="clientInforme" checked={!!workflow.clientInforme} onCheckedChange={(c: CheckedState) => wf("clientInforme", c === true)} />
                <Label htmlFor="clientInforme">Client informé</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="fapRestitue" checked={!!workflow.fapRestitue} onCheckedChange={(c: CheckedState) => wf("fapRestitue", c === true)} />
                <Label htmlFor="fapRestitue">FAP restitué au client</Label>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={activeStep === 0 || saving}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          <Button type="button" size="lg" className="font-semibold" disabled={saving} onClick={handleNext}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {activeStep === NOUVEAU_DOSSIER_STEPS.length - 1 ? "Terminer le dossier" : "Enregistrer et continuer"}
            {activeStep < NOUVEAU_DOSSIER_STEPS.length - 1 && !saving && <ChevronRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
