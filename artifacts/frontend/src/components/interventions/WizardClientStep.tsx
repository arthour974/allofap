import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  useListClients,
  getListClientsQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Search, UserPlus, Users, Check, Phone, Mail, MapPin } from "lucide-react";

export type ClientFormValues = {
  nomClient: string;
  telephone: string;
  email?: string;
  adresse?: string;
};

type ClientMode = "manual" | "existing";

export function WizardClientStep({
  form,
  mode,
  onModeChange,
  selectedClientId,
  onSelectClient,
  onClearSelection,
}: {
  form: UseFormReturn<ClientFormValues>;
  mode: ClientMode;
  onModeChange: (mode: ClientMode) => void;
  selectedClientId: number | null;
  onSelectClient: (client: Client) => void;
  onClearSelection: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useListClients(
    { search: debouncedSearch || undefined, limit: 20 },
    { query: { queryKey: getListClientsQueryKey({ search: debouncedSearch || undefined, limit: 20 }) } },
  );

  const clients = data?.clients ?? [];

  const handleModeChange = (value: string) => {
    const next = value as ClientMode;
    onModeChange(next);
    if (next === "manual") {
      onClearSelection();
    }
  };

  return (
    <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="manual" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Saisir à la main
        </TabsTrigger>
        <TabsTrigger value="existing" className="gap-2">
          <Users className="w-4 h-4" />
          Client existant
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="mt-0">
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["nomClient", "telephone", "email", "adresse"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {name === "nomClient"
                        ? "Nom / Raison sociale *"
                        : name === "telephone"
                          ? "Téléphone *"
                          : name === "email"
                            ? "Email"
                            : "Adresse"}
                    </FormLabel>
                    <FormControl>
                      <Input className="h-12" type={name === "email" ? "email" : "text"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </Form>
      </TabsContent>

      <TabsContent value="existing" className="mt-0 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par nom, téléphone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-12"
          />
        </div>

        {selectedClientId && (
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Client sélectionné
              </p>
              <p className="font-medium">{form.getValues("nomClient") || "—"}</p>
              {form.getValues("telephone") && (
                <p className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {form.getValues("telephone")}
                </p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
              Changer
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            {debouncedSearch ? "Aucun client trouvé." : "Tapez un nom ou un téléphone pour rechercher."}
          </p>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto">
            {clients.map((client) => {
              const isSelected = selectedClientId === client.id;
              return (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => onSelectClient(client)}
                    className={cn(
                      "w-full text-left rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-slate-50",
                      isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{client.nomClient}</p>
                        <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {client.telephone}
                        </p>
                        {client.email && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            {client.email}
                          </p>
                        )}
                        {client.adresse && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="line-clamp-1">{client.adresse}</span>
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
