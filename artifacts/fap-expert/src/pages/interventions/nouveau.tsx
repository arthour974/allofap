import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateIntervention } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";

const createSchema = z.object({
  client: z.object({
    nomClient: z.string().min(1, "Nom du client requis"),
    telephone: z.string().min(1, "Téléphone requis"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    adresse: z.string().optional().or(z.literal("")),
  }),
  vehicule: z.object({
    immatriculation: z.string().min(1, "Immatriculation requise"),
    marque: z.string().min(1, "Marque requise"),
    modele: z.string().min(1, "Modèle requis"),
    vin: z.string().optional().or(z.literal("")),
    motorisation: z.string().optional().or(z.literal("")),
    kilometrage: z.coerce.number().optional().or(z.literal("")),
  }),
});

type CreateValues = z.infer<typeof createSchema>;

export default function NouveauDossier() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      client: {
        nomClient: "",
        telephone: "",
        email: "",
        adresse: "",
      },
      vehicule: {
        immatriculation: "",
        marque: "",
        modele: "",
        vin: "",
        motorisation: "",
        kilometrage: undefined,
      },
    },
  });

  const createMutation = useCreateIntervention({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Dossier créé",
          description: `Le dossier ${data.numeroDossier} a été créé avec succès.`,
        });
        setLocation(`/interventions/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: "Impossible de créer le dossier.",
          variant: "destructive",
        });
      },
    }
  });

  function onSubmit(data: CreateValues) {
    createMutation.mutate({
      data: {
        client: {
          nomClient: data.client.nomClient,
          telephone: data.client.telephone,
          email: data.client.email || null,
          adresse: data.client.adresse || null,
        },
        vehicule: {
          clientId: 0,
          immatriculation: data.vehicule.immatriculation,
          marque: data.vehicule.marque,
          modele: data.vehicule.modele,
          vin: data.vehicule.vin || null,
          motorisation: data.vehicule.motorisation || null,
          kilometrage: typeof data.vehicule.kilometrage === "number" ? data.vehicule.kilometrage : null,
        },
      },
    });
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nouveau dossier</h1>
          <p className="text-slate-500 mt-1">Créer une nouvelle intervention de nettoyage de FAP</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-primary">Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="client.nomClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom / Raison sociale *</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="Ex: Garage Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client.telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone *</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="06 12 34 56 78" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input className="h-12" type="email" placeholder="contact@garage.fr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client.adresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="123 rue de la Paix..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-primary">Informations Véhicule</CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="vehicule.immatriculation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Immatriculation *</FormLabel>
                      <FormControl>
                        <Input className="h-12 uppercase font-bold" placeholder="AB-123-CD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicule.vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN (Numéro de châssis)</FormLabel>
                      <FormControl>
                        <Input className="h-12 uppercase" placeholder="VF1..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicule.marque"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque *</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="Peugeot" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicule.modele"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modèle *</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="308" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicule.motorisation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motorisation</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="1.6 BlueHDi 120" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicule.kilometrage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilométrage</FormLabel>
                      <FormControl>
                        <Input className="h-12" type="number" placeholder="150000" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8 text-base shadow-md font-semibold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Création..." : "Créer le dossier et continuer"}
                {!createMutation.isPending && <ChevronRight className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
