import { Layout } from "@/components/layout/Layout";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Filter, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
            <p className="text-slate-500 mt-1">Vue d'ensemble de l'activité de l'atelier</p>
          </div>
          <Link href="/interventions/nouveau" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-md font-medium flex items-center gap-2 shadow-sm transition-colors">
            <FileText className="w-4 h-4" />
            Nouveau dossier
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Dossiers en cours</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats?.dosssiersEnCours || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">FAP Nettoyés (Total)</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats?.fapNettoyes || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Dossiers bloqués</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.dossiersBlockes || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-slate-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total dossiers</CardTitle>
              <Activity className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats?.totalDossiers || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Performances moyennes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-600">Masse extraite moyenne</span>
                  <span className="text-2xl font-bold text-slate-900">{stats?.moyenneMasseExtraiteG?.toFixed(1) || 0} g</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-3/4 rounded-full" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-600">Efficacité moyenne</span>
                  <span className="text-2xl font-bold text-slate-900">{stats?.moyenneEfficacitePourcent?.toFixed(1) || 0} %</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[85%] rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 flex flex-col justify-center items-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-primary">
                <KanbanSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Vue de l'atelier</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Accédez à la vue Kanban pour gérer l'avancement de toutes les interventions en temps réel.
              </p>
              <Link href="/kanban" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline mt-2">
                Accéder au Kanban <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Temporary icon component definition since it was missing
function KanbanSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 7v7" />
      <path d="M12 7v4" />
      <path d="M16 7v9" />
    </svg>
  );
}
