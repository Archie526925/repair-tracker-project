import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  getListCustomFieldsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";

type FieldType = "text" | "number" | "select" | "date";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "文字",
  number: "數字",
  select: "下拉選單",
  date: "日期",
};

const formSchema = z.object({
  name: z.string().min(1, "請輸入欄位名稱"),
  fieldType: z.enum(["text", "number", "select", "date"] as const),
  required: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomField {
  id: number;
  name: string;
  fieldType: FieldType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

export default function CustomFieldsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: fields, isLoading } = useListCustomFields({
    query: { queryKey: getListCustomFieldsQueryKey() },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", fieldType: "text", required: false },
  });

  const watchedType = form.watch("fieldType");

  const createField = useCreateCustomField({
    mutation: {
      onSuccess: () => {
        toast({ title: "建立成功", description: "已新增自訂欄位" });
        queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() });
        handleClose();
      },
      onError: () => toast({ title: "建立失敗", variant: "destructive" }),
    },
  });

  const updateField = useUpdateCustomField({
    mutation: {
      onSuccess: () => {
        toast({ title: "更新成功", description: "自訂欄位已更新" });
        queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() });
        handleClose();
      },
      onError: () => toast({ title: "更新失敗", variant: "destructive" }),
    },
  });

  const deleteField = useDeleteCustomField({
    mutation: {
      onSuccess: () => {
        toast({ title: "刪除成功", description: "自訂欄位已刪除" });
        queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() });
        setDeleteTargetId(null);
      },
      onError: () => toast({ title: "刪除失敗", variant: "destructive" }),
    },
  });

  const handleOpen = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      form.reset({ name: field.name, fieldType: field.fieldType, required: field.required });
      setOptions(field.options ?? []);
    } else {
      setEditingField(null);
      form.reset({ name: "", fieldType: "text", required: false });
      setOptions([]);
    }
    setOptionInput("");
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingField(null);
    setOptions([]);
    setOptionInput("");
    form.reset();
  };

  const addOption = () => {
    const val = optionInput.trim();
    if (val && !options.includes(val)) {
      setOptions([...options, val]);
      setOptionInput("");
    }
  };

  const removeOption = (opt: string) => {
    setOptions(options.filter((o) => o !== opt));
  };

  const onSubmit = (values: FormValues) => {
    const finalOptions = values.fieldType === "select" ? options : undefined;
    if (editingField) {
      updateField.mutate({
        id: editingField.id,
        data: { name: values.name, options: finalOptions, required: values.required },
      });
    } else {
      createField.mutate({
        data: {
          name: values.name,
          fieldType: values.fieldType,
          options: finalOptions,
          required: values.required,
        },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">自訂欄位</h1>
          <p className="text-muted-foreground mt-1">新增額外欄位以記錄特定報修資訊</p>
        </div>
        <Button onClick={() => handleOpen()} data-testid="button-add-field">
          <Plus className="h-4 w-4 mr-2" />
          新增欄位
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>欄位列表</CardTitle>
          <CardDescription>
            以下欄位將顯示在每筆報修紀錄的填寫表單中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !fields || fields.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>尚未設定任何自訂欄位</p>
              <p className="text-sm mt-1">點擊右上角「新增欄位」開始設定</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(Array.isArray(fields) ? fields : []).map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 py-3"
                  data-testid={`field-row-${field.id}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{field.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {FIELD_TYPE_LABELS[field.fieldType as FieldType]}
                      </Badge>
                      {field.required && (
                        <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                          必填
                        </Badge>
                      )}
                    </div>
                    {field.options && field.options.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        選項：{field.options.join("、")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpen(field as CustomField)}
                      data-testid={`button-edit-field-${field.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTargetId(field.id)}
                      data-testid={`button-delete-field-${field.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "編輯欄位" : "新增欄位"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>欄位名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="例：合約編號" {...field} data-testid="input-field-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!editingField && (
                <FormField
                  control={form.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>欄位類型</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-field-type">
                            <SelectValue placeholder="選擇類型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">文字</SelectItem>
                          <SelectItem value="number">數字</SelectItem>
                          <SelectItem value="select">下拉選單</SelectItem>
                          <SelectItem value="date">日期</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(watchedType === "select" || (editingField && editingField.fieldType === "select")) && (
                <div className="space-y-2">
                  <FormLabel>選項</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      placeholder="輸入選項後按 Enter"
                      data-testid="input-option"
                    />
                    <Button type="button" variant="outline" onClick={addOption}>
                      加入
                    </Button>
                  </div>
                  {options.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {options.map((opt) => (
                        <Badge key={opt} variant="secondary" className="gap-1 pr-1">
                          {opt}
                          <button
                            type="button"
                            onClick={() => removeOption(opt)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-required"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">是否必填</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={createField.isPending || updateField.isPending}
                  data-testid="button-submit-field"
                >
                  {editingField ? "更新" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此欄位？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後，所有報修紀錄中對應的自訂值也會一併刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTargetId !== null && deleteField.mutate({ id: deleteTargetId })}
              data-testid="button-confirm-delete"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
