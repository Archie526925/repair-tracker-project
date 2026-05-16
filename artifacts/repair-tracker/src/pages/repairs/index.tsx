import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format, subMonths, addMonths } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  useListRepairs,
  useListCategories,
  getListRepairsQueryKey,
  getListCategoriesQueryKey,
  RepairStatus,
  RepairPriority,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import { Plus, Search, Filter, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCategoryMap } from "@/hooks/use-category-map";

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const nowMonth = toMonthStr(new Date());

export default function RepairsList() {
  const [selectedMonth, setSelectedMonth] = useState<string>(nowMonth);
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<RepairPriority | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categoryMap = useCategoryMap();
  const { data: allCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const monthDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [selectedMonth]);

  const isCurrentMonth = selectedMonth === nowMonth;

  const params = {
    ...(!showAll && { month: selectedMonth }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(categoryFilter !== "all" && { category: categoryFilter }),
    ...(priorityFilter !== "all" && { priority: priorityFilter }),
  };

  const { data: repairs, isLoading } = useListRepairs(params, {
    query: { queryKey: getListRepairsQueryKey(params) },
  });

const filteredRepairs = useMemo(
  () =>
    (Array.isArray(repairs) ? repairs : []).filter(
        (repair) =>
          !searchQuery ||
          repair.title.includes(searchQuery) ||
          repair.location.includes(searchQuery) ||
          repair.reportedBy.includes(searchQuery),
      ),
    [repairs, searchQuery],
  );

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">報修紀錄</h1>
          <p className="text-muted-foreground mt-1">管理與追蹤所有設施報修</p>
        </div>
        <Link
          href="/repairs/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          data-testid="btn-new-repair"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增報修
        </Link>
      </div>

      {/* Month navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {!showAll ? (
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedMonth(toMonthStr(subMonths(monthDate, 1)))}
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
              onClick={() =>
                !isCurrentMonth && setSelectedMonth(toMonthStr(addMonths(monthDate, 1)))
              }
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 ml-1"
                onClick={() => setSelectedMonth(nowMonth)}
              >
                回到本月
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700 font-medium">
            <History className="h-4 w-4" />
            顯示所有歷史紀錄
          </div>
        )}
        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          className={cn("h-9", showAll && "bg-amber-600 hover:bg-amber-700")}
          onClick={() => setShowAll((v) => !v)}
        >
          <History className="h-4 w-4 mr-2" />
          {showAll ? "回到月份檢視" : "查詢全部歷史"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋標題、地點或報修人..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground self-center hidden sm:block" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有類別</SelectItem>
              {(Array.isArray(allCategories) ? allCategories : []).map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="優先級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有優先級</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead className="w-[72px]">編號</TableHead>
              <TableHead>標題</TableHead>
              <TableHead>類別</TableHead>
              <TableHead>地點</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>優先級</TableHead>
              <TableHead>報修時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRepairs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {showAll
                    ? "找不到符合條件的紀錄"
                    : `${format(monthDate, "yyyy年 M月", { locale: zhTW })} 無報修紀錄`}
                </TableCell>
              </TableRow>
            ) : (
              filteredRepairs?.map((repair) => (
                <TableRow
                  key={repair.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => (window.location.href = `/repairs/${repair.id}`)}
                >
                  <TableCell className="font-mono text-muted-foreground text-sm">#{repair.id}</TableCell>
                  <TableCell className="font-medium">{repair.title}</TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5">
                      {categoryMap[repair.category] && (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: categoryMap[repair.category].color }}
                        />
                      )}
                      {categoryMap[repair.category]?.label ?? repair.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{repair.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[repair.status]}>
                      {STATUS_LABELS[repair.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("font-medium text-sm", PRIORITY_COLORS[repair.priority])}>
                    {PRIORITY_LABELS[repair.priority]}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(repair.reportedAt), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
