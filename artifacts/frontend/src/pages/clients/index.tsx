import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListClients, getListClientsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Phone, Mail, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useListClients({ search: debouncedSearch }, {
    query: { queryKey: getListClientsQueryKey({ search: debouncedSearch }) }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clients</h1>
            <p className="text-slate-500 mt-1">Gérez votre base de clients</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Rechercher par nom, téléphone, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-12 bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.clients ?? []).map((client) => (
              <Card key={client.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-900">{client.nomClient}</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{client.telephone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.adresse && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{client.adresse}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t text-xs text-slate-400">
                    Client depuis le {formatDate(client.createdAt, "dd MMM yyyy")}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(data?.clients ?? []).length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                Aucun client trouvé.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
