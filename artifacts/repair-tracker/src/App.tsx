import { Route, Router as WouterRouter, useLocation } from "wouter";
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
import LoginPage from "@/pages/auth/login";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/components/layout/auth-guard";

const queryClient = new QueryClient();

function AppRouter() {
  const [location] = useLocation();

  if (location === "/login") return <LoginPage />;

  return (
    <AuthGuard>
      <AppLayout>
        {(location === "/" || location === "") && <Dashboard />}
        {location === "/repairs" && <RepairsList />}
        {location === "/repairs/new" && <NewRepair />}
        {location.match(/^\/repairs\/\d+$/) && <RepairDetail />}
        {location === "/settings/custom-fields" && <CustomFields />}
        {location === "/settings/categories" && <Categories />}
        {!["/", "", "/login", "/repairs", "/repairs/new", "/settings/custom-fields", "/settings/categories"].includes(location) && !location.match(/^\/repairs\/\d+$/) && <NotFound />}
      </AppLayout>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
