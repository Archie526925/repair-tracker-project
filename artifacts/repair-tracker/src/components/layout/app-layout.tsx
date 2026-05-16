import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wrench, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function AppSidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "儀表板", href: "/", icon: LayoutDashboard },
    { name: "報修紀錄", href: "/repairs", icon: Wrench },
  ];

  const settingsNavigation = [
    { name: "類別管理", href: "/settings/categories", icon: Settings },
    { name: "自訂欄位", href: "/settings/custom-fields", icon: Settings },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="text-lg">報修管理系統</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="px-2 py-4">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                  >
                    <Link href={item.href} data-testid={`nav-${item.href.replace("/", "") || "home"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>設定</SidebarGroupLabel>
          <SidebarMenu className="px-2">
            {settingsNavigation.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                  >
                    <Link href={item.href} data-testid={`nav-${item.href.replace(/\//g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background flex-col lg:flex-row">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger />
            <div className="ml-4 font-semibold">報修管理系統</div>
          </header>
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
