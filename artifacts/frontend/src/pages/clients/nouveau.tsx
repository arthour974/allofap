import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateClient } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";


// Schema ZOD
const createSchema = z.object({
    nomClient: z.string().min(1, "Nom du client requis"),
    telephone: z.string().min(1, "Téléphone requis"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    adresse: z.string().optional().or(z.literal("")),
  });
  
type CreateValuesClient = z.infer<typeof createSchema>;

export default function NouveauClient () {
    const { toast } = useToast();
    const [, setLocation] = useLocation();


    const form = useForm<CreateValuesClient>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            nomClient: "",
            telephone: "",
            email: "",
            adresse: "",
          }
    });

    const createMutation = useCreateClient({
        mutation: {
            onSuccess: (data) => {
              toast({
                title: "Dossier créé",
                description: `Le client ${data.id} a été créé avec succès.`,
              });
              setLocation(`/clients`);
            },
            onError: (error) => {
              toast({
                title: "Erreur",
                description: "Impossible de créer le client.",
                variant: "destructive",
              });
            },
          }
    })

    function onSubmit (data: CreateValuesClient) {
        createMutation.mutate({
           data:{
            nomClient: data.nomClient,
            telephone: data.telephone,
            email: data.email,
            adresse: data.adresse
           }
        })
    }

    return <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nouveau Client</h1>
                <p className="text-slate-500 mt-1">Créer un nouveau client</p>
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
                  name="nomClient"
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
                  name="telephone"
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
                  name="email"
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
                  name="adresse"
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

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8 text-base shadow-md font-semibold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Création..." : "Créer le client et continuer"}
                {!createMutation.isPending && <ChevronRight className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          </form>
        </Form>

        </div>
    </Layout>
}