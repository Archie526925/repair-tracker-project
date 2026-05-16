import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import RepairsList from "@/pages/repairs/index";
import NewRepair from "@/pages/repairs/new";
import RepairDetail from "@/pages/repairs/detail";
import CustomFields from "@/pages/settings/custom-fields";
import Categories from "@/pages/settings/categories";
import { AppLayout } from "@/components/layout/app-layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/repairs" component={RepairsList} />
        <Route path="/repairs/new" component={NewRepair} />
        <Route path="/repairs/:id" component={RepairDetail} />
        <Route path="/settings/custom-fields" component={CustomFields} />
        <Route path="/settings/categories" component={Categories} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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
