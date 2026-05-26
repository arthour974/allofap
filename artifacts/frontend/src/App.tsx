import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useEffect } from "react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Kanban from "@/pages/kanban";
import Statistiques from "@/pages/statistiques";
import Clients from "@/pages/clients/index";
import Interventions from "@/pages/interventions/index";
import NouveauDossier from "@/pages/interventions/nouveau";
import DetailIntervention from "@/pages/interventions/detail";
import NouveauClient from "@/pages/clients/nouveau";
import DetailClient from "./pages/clients/detail";
import PartageClient from "./pages/partage";


const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { data: user, isError, isLoading } = useGetCurrentUser({ 
    query: { 
      queryKey: getGetCurrentUserQueryKey(),
      retry: false
    } 
  });

  useEffect(() => {
    if (isError) {
      setLocation("/login");
    }
  }, [isError, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  if (!user) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/partage/:token" component={PartageClient} />
      <Route path="/kanban">
        {() => <ProtectedRoute component={Kanban} />}
      </Route>
      <Route path="/interventions">
        {() => <ProtectedRoute component={Interventions} />}
      </Route>
      <Route path="/interventions/nouveau">
        {() => <ProtectedRoute component={NouveauDossier} />}
      </Route>
      <Route path="/interventions/:id">
        {() => <ProtectedRoute component={DetailIntervention} />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} />}
      </Route>
      <Route path="/clients/nouveau">
        {() => <ProtectedRoute component={NouveauClient} />}
      </Route>
      <Route path="/clients/:id">
        {() => <ProtectedRoute component={DetailClient} />}
      </Route>
      <Route path="/statistiques">
        {() => <ProtectedRoute component={Statistiques} />}
      </Route>
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
