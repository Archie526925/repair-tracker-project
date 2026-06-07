import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  useGetMonthlyStats,
  getGetMonthlyStatsQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Activity,
  CheckCircle,
  Clock,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  PieChart as PieChartIcon,
  Timer,
  MapPin,
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCategoryMap } from "@/hooks/use-category-map";

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const nowMonth = toMonthStr(new Date());

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(nowMonth);
  const [categoryChartType, setCategoryChartType] = useState<"pie" | "bar">("pie");

  const isCurrentMonth = currentMonth === nowMonth;

  const monthDate = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [currentMonth]);

  const categoryMap = useCategoryMap();

  const { data: stats, isLoading: isLoadingStats } = useGetMonthlyStats(
    { month: currentMonth },
    { query: { queryKey: getGetMonthlyStatsQueryKey({ month: currentMonth }) } },
  );

  const locationData = useMemo(() => {
    if (!stats || !stats.byLocation) return [];
    return Object.entries(stats.byLocation as Record<string, number>)
      .map(([location, value]) => ({ location, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const categoryData = useMemo(() => {
    if (!stats || !stats.byCategory) return [];
    return Object.entries(stats.byCategory as Record<string, number>)
      .map(([slug, value]) => ({
        name: categoryMap[slug]?.label ?? slug,
        value,
        color: categoryMap[slug]?.color ?? "#6b7280",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats, categoryMap]);

  const statusData = useMemo(() => {
    if (!stats || !stats.byStatus) return [];
    return [
      { name: STATUS_LABELS.pending, value: stats.byStatus.pending, fill: "#f59e0b" },
      { name: STATUS_LABELS.in_progress, value: stats.byStatus.in_progress, fill: "#6366f1" },
      { name: STATUS_LABELS.completed, value: stats.byStatus.completed, fill: "#22c55e" },
    ];
  }, [stats]);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    borderRadius: "var(--radius)",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
          儀表板
        </h1>
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm w-fit">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(toMonthStr(subMonths(monthDate, 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-28 text-center">
            {format(monthDate, "yyyy年 M月", { locale: zhTW })}
            {isCurrentMonth && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(本月)</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => !isCurrentMonth && setCurrentMonth(toMonthStr(addMonths(monthDate, 1)))}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 ml-1"
              onClick={() => setCurrentMonth(nowMonth)}
            >
              回到本月
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="本月新增" value={stats?.total} icon={<ListTodo className="h-4 w-4 text-muted-foreground" />} loading={isLoadingStats} />
        <StatCard title="待處理" value={stats?.byStatus?.pending} icon={<Clock className="h-4 w-4 text-yellow-500" />} loading={isLoadingStats} highlight={(stats?.byStatus?.pending ?? 0) > 0} highlightColor="text-yellow-600" />
        <StatCard title="處理中" value={stats?.byStatus?.in_progress} icon={<Activity className="h-4 w-4 text-blue-500" />} loading={isLoadingStats} />
        <StatCard title="已完成" value={stats?.byStatus?.completed} icon={<CheckCircle className="h-4 w-4 text-green-500" />} loading={isLoadingStats} highlight={(stats?.byStatus?.completed ?? 0) > 0} highlightColor="text-green-600" />
      </div>

      {stats?.avgResolutionDays != null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border rounded-lg px-4 py-2.5 w-fit shadow-sm">
          <Timer className="h-4 w-4" />
          本月平均解決天數：
          <span className="font-semibold text-foreground">{stats.avgResolutionDays} 天</span>
        </div>
      )}

      {/* Location chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle>地點分佈</CardTitle>
              <CardDescription>{format(monthDate, "yyyy年 M月", { locale: zhTW })} 依地點統計件數</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4 pr-4">
          <div className="h-[220px] sm:h-[260px]">
            {isLoadingStats ? (
              <Skeleton className="h-full w-full" />
            ) : locationData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">本月無報修資料</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="location" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="件數" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Category chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>類別分佈</CardTitle>
                <CardDescription>{format(monthDate, "yyyy年 M月", { locale: zhTW })} 依類別統計</CardDescription>
              </div>
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button variant={categoryChartType === "pie" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setCategoryChartType("pie")} title="圓餅圖">
                  <PieChartIcon className="h-3.5 w-3.5" />
                </Button>
                <Button variant={categoryChartType === "bar" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setCategoryChartType("bar")} title="長條圖">
                  <BarChart2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px] sm:h-[260px]">
              {isLoadingStats ? (
                <Skeleton className="h-full w-full" />
              ) : categoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">本月無報修資料</div>
              ) : categoryChartType === "pie" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="件數" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status chart */}
        <Card>
          <CardHeader>
            <CardTitle>狀態分佈</CardTitle>
            <CardDescription>{format(monthDate, "yyyy年 M月", { locale: zhTW })} 各狀態件數</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px] sm:h-[260px]">
              {isLoadingStats ? (
                <Skeleton className="h-full w-full" />
              ) : stats?.total === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">本月無報修資料</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={56} />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="件數" radius={[0, 4, 4, 0]} maxBarSize={36}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, highlight, highlightColor }: { title: string; value?: number; icon: React.ReactNode; loading: boolean; highlight?: boolean; highlightColor?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={cn("text-2xl font-bold", highlight && highlightColor)} data-testid={`stat-${title}`}>
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
