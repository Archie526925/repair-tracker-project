import { Router as WouterRouter, useLocation } from "wouter";
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
import AccountsPage from "@/pages/settings/accounts";
import LoginPage from "@/pages/auth/login";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/components/layout/auth-guard";

const queryClient = new QueryClient();

function AppRouter() {
  const [location] = useLocation();
  const userRole = (() => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  })();

  if (location === "/login") return <LoginPage />;

  const isAdmin = userRole === "admin";

  return (
    <AuthGuard>
      <AppLayout>
        {(location === "/" || location === "") && <Dashboard />}
        {location === "/repairs" && <RepairsList />}
        {location === "/repairs/new" && isAdmin && <NewRepair />}
        {location === "/repairs/new" && !isAdmin && <NotFound />}
        {location.match(/^\/repairs\/\d+$/) && <RepairDetail />}
        {location === "/settings/custom-fields" && isAdmin && <CustomFields />}
        {location === "/settings/categories" && isAdmin && <Categories />}
        {location === "/settings/accounts" && isAdmin && <AccountsPage />}
        {location === "/settings/custom-fields" && !isAdmin && <NotFound />}
        {location === "/settings/categories" && !isAdmin && <NotFound />}
        {location === "/settings/accounts" && !isAdmin && <NotFound />}
        {!["", "/", "/login", "/repairs", "/repairs/new", "/settings/custom-fields", "/settings/categories", "/settings/accounts"].includes(location) && !location.match(/^\/repairs\/\d+$/) && <NotFound />}
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
