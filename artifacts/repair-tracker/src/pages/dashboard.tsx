import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  useGetTrend,
  useGetMonthlyStats,
  getGetTrendQueryKey,
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
  LineChart,
  Line,
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
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCategoryMap } from "@/hooks/use-category-map";

const SERIES = [
  { key: "total", name: "總計", color: "hsl(var(--muted-foreground))" },
  { key: "completed", name: "完成", color: "hsl(142 71% 45%)" },
  { key: "pending", name: "待處理", color: "hsl(38 92% 50%)" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const nowMonth = toMonthStr(new Date());

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(nowMonth);
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    total: true,
    completed: true,
    pending: true,
  });
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

  const { data: trend, isLoading: isLoadingTrend } = useGetTrend({
    query: { queryKey: getGetTrendQueryKey() },
  });

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
      { name: STATUS_LABELS.pending, value: stats.byStatus.pending, fill: "hsl(38 92% 50%)" },
      { name: STATUS_LABELS.in_progress, value: stats.byStatus.in_progress, fill: "hsl(var(--primary))" },
      { name: STATUS_LABELS.completed, value: stats.byStatus.completed, fill: "hsl(142 71% 45%)" },
    ];
  }, [stats]);

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (Object.values(next).every((v) => !v)) return prev;
      return next;
    });
  };

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>近六個月趨勢</CardTitle>
              <CardDescription>報修單總數與處理狀況</CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {SERIES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    visibleSeries[s.key]
                      ? "border-transparent text-white shadow-sm"
                      : "border-border bg-transparent text-muted-foreground opacity-60",
                  )}
                  style={visibleSeries[s.key] ? { backgroundColor: s.color } : {}}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pl-2 h-[280px]">
          {isLoadingTrend ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.isArray(trend) ? trend : []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                {SERIES.map((s) =>
                  visibleSeries[s.key] ? (
                    <Line key={s.key} type="monotone" name={s.name} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  ) : null,
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Category chart */}
        <Card className="col-span-4">
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
          <CardContent className="h-[280px]">
            {isLoadingStats ? (
              <Skeleton className="h-full w-full" />
            ) : categoryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">本月無報修資料</div>
            ) : categoryChartType === "pie" ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
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
                <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="件數" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>狀態分佈</CardTitle>
            <CardDescription>{format(monthDate, "yyyy年 M月", { locale: zhTW })} 各狀態件數</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isLoadingStats ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.total === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">本月無報修資料</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
