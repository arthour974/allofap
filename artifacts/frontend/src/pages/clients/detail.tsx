import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AlertCircle, CheckCircle, ChevronRight, FileText, Download, Save, AlertTriangle, Upload, Trash2, Image, Video, MapPin, Pencil, X, Link2 } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetClientQueryKey, getListClientsQueryKey, updateClient, useDeleteClient, useGetClient } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useUpdateClient } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


// Schema ZOD
const createSchema = z.object({
    nomClient: z.string().min(1, "Nom du client requis"),
    telephone: z.string().min(1, "Téléphone requis"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    adresse: z.string().optional().or(z.literal("")),
  });
  
type UpdateValuesClient = z.infer<typeof createSchema>;



export default function DetailClient () {
    /** Params in URL and parse in INTEGER */
    const params = useParams();
    const id = Number(params.id);

    /** Redirection */
    const [, setLocation] = useLocation();


    /** Notification */
    const { toast } = useToast();
    
    /** Api Cache */
    const queryClient =  useQueryClient();
      

    // Queries
    const { data: client, isLoading } = useGetClient(id, {
        query: { queryKey: getGetClientQueryKey(id), enabled: !!id }
    });

    // Schema 
    const form = useForm<UpdateValuesClient>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            nomClient: "",
            telephone: "",
            email: "",
            adresse: "",
          }
    });

    useEffect(() => {
        if(client) {
            form.reset({
                nomClient : client.nomClient,
                telephone: client.telephone,
                email: client.email!,
                adresse: client.adresse!
            })
        }
    }, [client, form])

    // Mutations update Client
    const updateMutation = useUpdateClient({
        mutation: {
            onSuccess: () => {
                toast({ title: "Enregistré", description: "Les modifications ont été sauvegardées." });
                queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
            },
            onError: () => {
                toast({ title: "Erreur", description: "Impossible d'enregistrer les modifications.", variant: "destructive" });
            }
        }
    });
    
    // Mutation delete client
    const deleteMutation = useDeleteClient({
        mutation: {
            onSuccess: () => {
                toast({ title: "Enregistré", description: "Les modifications ont été sauvegardées." });
                queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
                setLocation("/clients");
            },
            onError: () => {
                toast({ title: "Erreur", description: "Impossible d'enregistrer les modifications.", variant: "destructive" });
            }
        }
    })

    /**
     * Delete client 
     */
    function handleDeleteClient(id: number) {
        console.log(id)
        deleteMutation.mutate({ id })
    }

    /**
     * Submit update for client
     */
    function onSubmit(data: UpdateValuesClient) {
        updateMutation.mutate({
            id: id,
            data: {
                nomClient: data.nomClient,
                telephone: data.telephone,
                adresse: data.adresse,
                email: data.email,
            }
        })
    }

    return <Layout>
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Client {client?.id}
                    </h1>
                    
                    </div>
                    <p className="text-slate-500">
                    Créé le {formatDate(client?.createdAt, "dd MMMM yyyy à HH:mm")}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-12 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => handleDeleteClient(client?.id!)}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Supprimer
                    </Button>
                </div>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card className={`shadow-sm border-primary overflow-auto`}>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                            Client
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                                <div className="flex flex-row gap-3 mb-5">
                                    <FormField
                                        control={form.control}
                                        name="nomClient"
                                        render={({ field }) => (
                                            <FormItem className="w-1/2">
                                            <FormLabel>Nom</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem className="w-1/2">
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                   
                                </div>
                                <div className="flex flex-row gap-3">
                                    <FormField
                                        control={form.control}
                                        name="telephone"
                                        render={({ field }) => (
                                            <FormItem className="w-1/2">
                                            <FormLabel>Téléphone</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="adresse"
                                        render={({ field }) => (
                                            <FormItem className="w-1/2">
                                            <FormLabel>Adresse</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                        <Button 
                            type="submit" 
                            size="lg" 
                            className="h-14 px-8 text-base shadow-md font-semibold"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Sauvagarde..." : "Sauvegarder"}
                        </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    </Layout>
}