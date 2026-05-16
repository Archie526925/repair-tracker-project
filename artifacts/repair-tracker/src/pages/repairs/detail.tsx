import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import {
  useGetRepair,
  useUpdateRepair,
  useDeleteRepair,
  useSetRepairCustomValues,
  useListCustomFields,
  useListCategories,
  getGetRepairQueryKey,
  getListRepairsQueryKey,
  getListCustomFieldsQueryKey,
  getListCategoriesQueryKey,
  RepairUpdateStatus,
  RepairUpdatePriority,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Tag,
  Save,
  Trash2,
  Wrench,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryMap } from "@/hooks/use-category-map";

type CustomValueRow = { id: number; repairId: number; fieldId: number; value: string };

type FormData = {
  title: string;
  location: string;
  category: string;
  description: string;
  reportedBy: string;
  status: RepairUpdateStatus;
  priority: RepairUpdatePriority;
  assignedTo: string;
  notes: string;
};

export default function RepairDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categoryMap = useCategoryMap();

  const { data: repair, isLoading } = useGetRepair(id, {
    query: { enabled: !!id, queryKey: getGetRepairQueryKey(id) },
  });

  const { data: allCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const { data: customFields } = useListCustomFields({
    query: { queryKey: getListCustomFieldsQueryKey() },
  });

  const { data: customValues, refetch: refetchCustomValues } = useQuery({
    queryKey: ["repair-custom-values", id],
    queryFn: async () => {
      const res = await fetch(`/api/repairs/${id}/custom-values`);
      return res.json() as Promise<CustomValueRow[]>;
    },
    enabled: !!id,
  });

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    location: "",
    category: "",
    description: "",
    reportedBy: "",
    status: RepairUpdateStatus.pending,
    priority: RepairUpdatePriority.medium,
    assignedTo: "",
    notes: "",
  });
  const [editCustomValues, setEditCustomValues] = useState<Record<number, string>>({});
  const [customEditing, setCustomEditing] = useState(false);

  useEffect(() => {
    if (repair) {
      setFormData({
        title: repair.title,
        location: repair.location,
        category: repair.category,
        description: repair.description || "",
        reportedBy: repair.reportedBy,
        status: repair.status as RepairUpdateStatus,
        priority: repair.priority as RepairUpdatePriority,
        assignedTo: repair.assignedTo || "",
        notes: repair.notes || "",
      });
    }
  }, [repair, editMode]);

  useEffect(() => {
    if (customValues) {
      const map: Record<number, string> = {};
      for (const cv of customValues) map[cv.fieldId] = cv.value;
      setEditCustomValues(map);
    }
  }, [customValues]);

  const updateRepair = useUpdateRepair({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "更新成功", description: "報修紀錄已更新" });
        queryClient.setQueryData(getGetRepairQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: getListRepairsQueryKey() });
        setEditMode(false);
      },
      onError: () => toast({ title: "更新失敗", variant: "destructive" }),
    },
  });

  const setRepairCustomValues = useSetRepairCustomValues({
    mutation: {
      onSuccess: () => {
        toast({ title: "自訂欄位已儲存" });
        refetchCustomValues();
        setCustomEditing(false);
      },
      onError: () => toast({ title: "儲存失敗", variant: "destructive" }),
    },
  });

  const deleteRepair = useDeleteRepair({
    mutation: {
      onSuccess: () => {
        toast({ title: "刪除成功", description: "報修紀錄已刪除" });
        queryClient.invalidateQueries({ queryKey: getListRepairsQueryKey() });
        setLocation("/repairs");
      },
      onError: () => toast({ title: "刪除失敗", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="h-[400px] p-6">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repair) return <div>找不到紀錄</div>;

  const handleSave = () => {
    updateRepair.mutate({
      id,
      data: {
        title: formData.title || undefined,
        location: formData.location || undefined,
        category: formData.category || undefined,
        description: formData.description || undefined,
        reportedBy: formData.reportedBy || undefined,
        status: formData.status,
        priority: formData.priority,
        assignedTo: formData.assignedTo || undefined,
        notes: formData.notes || undefined,
      },
    });
  };

  const handleDelete = () => {
    if (window.confirm("確定要刪除這筆報修紀錄嗎？")) {
      deleteRepair.mutate({ id });
    }
  };

  const handleSaveCustomValues = () => {
    const entries = Object.entries(editCustomValues).filter(([, v]) => v.trim() !== "");
    setRepairCustomValues.mutate({
      id,
      data: {
        values: entries.map(([fieldId, value]) => ({ fieldId: Number(fieldId), value })),
      },
    });
  };

  const catInfo = categoryMap[repair.category];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 flex-shrink-0">
            <Link href="/repairs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono text-sm">#{repair.id}</span>
              {!editMode ? (
                <h1 className="text-2xl font-bold tracking-tight">{repair.title}</h1>
              ) : (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold h-auto py-1 px-2 w-72"
                  data-testid="input-title"
                />
              )}
              {!editMode && (
                <Badge variant="outline" className={STATUS_COLORS[repair.status]}>
                  {STATUS_LABELS[repair.status]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(repair.reportedAt), "yyyy年MM月dd日 HH:mm")} 報修
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)} data-testid="button-edit">
                <Pencil className="h-4 w-4 mr-2" />
                編輯
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} data-testid="button-delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setEditMode(false)}>
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={updateRepair.isPending} data-testid="button-save">
                <Save className="h-4 w-4 mr-2" />
                {updateRepair.isPending ? "儲存中..." : "儲存"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                報修資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> 地點
                  </h4>
                  {editMode ? (
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      data-testid="input-location"
                    />
                  ) : (
                    <p className="font-medium">{repair.location}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="h-4 w-4" /> 報修人
                  </h4>
                  {editMode ? (
                    <Input
                      value={formData.reportedBy}
                      onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                      data-testid="input-reported-by"
                    />
                  ) : (
                    <p className="font-medium">{repair.reportedBy}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">詳細描述</h4>
                {editMode ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="請描述損壞狀況..."
                    className="resize-none min-h-[100px]"
                    data-testid="textarea-description"
                  />
                ) : (
                  <p className="whitespace-pre-wrap bg-muted/30 p-4 rounded-md border min-h-[80px]">
                    {repair.description || (
                      <span className="text-muted-foreground italic">無提供描述</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                處理紀錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">處理備註</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="輸入處理進度或備註..."
                    className="min-h-[120px]"
                    data-testid="textarea-notes"
                  />
                </div>
              ) : repair.notes ? (
                <p className="whitespace-pre-wrap bg-muted/30 p-4 rounded-md border text-sm">
                  {repair.notes}
                </p>
              ) : (
                <p className="text-muted-foreground italic">目前無處理備註</p>
              )}
            </CardContent>
          </Card>

          {customFields && customFields.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">自訂欄位</CardTitle>
                {!customEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setCustomEditing(true)} data-testid="button-edit-custom">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    編輯
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomEditing(false);
                        if (customValues) {
                          const map: Record<number, string> = {};
                          for (const cv of customValues) map[cv.fieldId] = cv.value;
                          setEditCustomValues(map);
                        }
                      }}
                    >
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveCustomValues} disabled={setRepairCustomValues.isPending} data-testid="button-save-custom">
                      {setRepairCustomValues.isPending ? "儲存中..." : "儲存"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {customFields.map((cf) => {
                  const currentValue = customEditing
                    ? editCustomValues[cf.id] ?? ""
                    : customValues?.find((cv) => cv.fieldId === cf.id)?.value ?? "";
                  return (
                    <div key={cf.id}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {cf.name}
                        {cf.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      {customEditing ? (
                        cf.fieldType === "select" && cf.options ? (
                          <Select
                            value={editCustomValues[cf.id] ?? ""}
                            onValueChange={(v) =>
                              setEditCustomValues((prev) => ({ ...prev, [cf.id]: v }))
                            }
                          >
                            <SelectTrigger data-testid={`custom-select-${cf.id}`}>
                              <SelectValue placeholder={`選擇${cf.name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {cf.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={cf.fieldType === "number" ? "number" : cf.fieldType === "date" ? "date" : "text"}
                            value={editCustomValues[cf.id] ?? ""}
                            onChange={(e) =>
                              setEditCustomValues((prev) => ({ ...prev, [cf.id]: e.target.value }))
                            }
                            data-testid={`custom-input-${cf.id}`}
                          />
                        )
                      ) : (
                        <p className={currentValue ? "font-medium" : "text-muted-foreground italic"}>
                          {currentValue || "未填寫"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">處理狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">當前狀態</label>
                {editMode ? (
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as RepairUpdateStatus })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-sm px-3 py-1 ${STATUS_COLORS[repair.status]}`}
                    data-testid="status-badge"
                  >
                    {STATUS_LABELS[repair.status]}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">類別</label>
                {editMode ? (
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories?.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="font-medium flex items-center gap-2">
                    {catInfo && (
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catInfo.color }}
                      />
                    )}
                    {catInfo?.label ?? repair.category}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">優先級</label>
                {editMode ? (
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as RepairUpdatePriority })}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`font-medium ${PRIORITY_COLORS[repair.priority]}`}>
                    {PRIORITY_LABELS[repair.priority]}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">負責人</label>
                {editMode ? (
                  <Input
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="輸入負責人姓名"
                    data-testid="input-assigned-to"
                  />
                ) : (
                  <div className="font-medium">
                    {repair.assignedTo || (
                      <span className="text-muted-foreground italic">尚未指派</span>
                    )}
                  </div>
                )}
              </div>

              {repair.resolvedAt && (
                <div className="space-y-1.5 pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> 解決時間
                  </label>
                  <div className="font-medium text-sm">
                    {format(new Date(repair.resolvedAt), "yyyy-MM-dd HH:mm")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
