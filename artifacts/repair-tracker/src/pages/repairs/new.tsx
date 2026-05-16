import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateRepair,
  useSetRepairCustomValues,
  useListCustomFields,
  useListCategories,
  getListRepairsQueryKey,
  getListCustomFieldsQueryKey,
  getListCategoriesQueryKey,
  RepairInputPriority,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PRIORITY_LABELS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  title: z.string().min(1, "請輸入報修標題"),
  location: z.string().min(1, "請輸入地點"),
  category: z.string().min(1, "請選擇類別"),
  priority: z.nativeEnum(RepairInputPriority, { required_error: "請選擇優先級" }),
  reportedBy: z.string().min(1, "請輸入報修人姓名"),
  description: z.string().optional(),
});

export default function NewRepair() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customValues, setCustomValues] = useState<Record<number, string>>({});

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const { data: customFields } = useListCustomFields({
    query: { queryKey: getListCustomFieldsQueryKey() },
  });

  const setRepairCustomValues = useSetRepairCustomValues();

  const createRepair = useCreateRepair({
    mutation: {
      onSuccess: async (repair) => {
        const entries = Object.entries(customValues).filter(([, v]) => v.trim() !== "");
        if (entries.length > 0) {
          await setRepairCustomValues.mutateAsync({
            id: repair.id,
            data: {
              values: entries.map(([fieldId, value]) => ({ fieldId: Number(fieldId), value })),
            },
          });
        }
        toast({ title: "建立成功", description: "已新增報修紀錄" });
        queryClient.invalidateQueries({ queryKey: getListRepairsQueryKey() });
        setLocation("/repairs");
      },
      onError: () =>
        toast({ title: "建立失敗", description: "請稍後再試", variant: "destructive" }),
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      location: "",
      category: "",
      reportedBy: "",
      description: "",
      priority: RepairInputPriority.medium,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (customFields) {
      const missing = customFields.filter(
        (f) => f.required && (!customValues[f.id] || customValues[f.id].trim() === ""),
      );
      if (missing.length > 0) {
        toast({
          title: "必填欄位未填",
          description: `請填寫：${missing.map((f) => f.name).join("、")}`,
          variant: "destructive",
        });
        return;
      }
    }
    createRepair.mutate({ data: values });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/repairs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">新增報修</h1>
          <p className="text-sm text-muted-foreground">填寫表單以建立新的設施報修紀錄</p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>標題</FormLabel>
                    <FormControl>
                      <Input placeholder="例：3樓男廁洗手台漏水" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>類別</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="選擇類別" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Array.isArray(categories) ? categories : []).map((cat) => (
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>優先級</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="選擇優先級" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>地點</FormLabel>
                      <FormControl>
                        <Input placeholder="例：A棟 301室" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reportedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>報修人</FormLabel>
                      <FormControl>
                        <Input placeholder="例：王小明" {...field} data-testid="input-reported-by" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>詳細描述 (選填)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="請描述損壞狀況..."
                        className="resize-none min-h-[100px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {customFields && customFields.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      自訂欄位
                    </h3>
                    {(Array.isArray(customFields) ? customFields : []).map((cf) => (
                      <div key={cf.id} className="space-y-1.5">
                        <label className="text-sm font-medium">
                          {cf.name}
                          {cf.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {cf.fieldType === "select" && cf.options ? (
                          <Select
                            value={customValues[cf.id] ?? ""}
                            onValueChange={(v) =>
                              setCustomValues((prev) => ({ ...prev, [cf.id]: v }))
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
                            value={customValues[cf.id] ?? ""}
                            onChange={(e) =>
                              setCustomValues((prev) => ({ ...prev, [cf.id]: e.target.value }))
                            }
                            data-testid={`custom-input-${cf.id}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/repairs">取消</Link>
              </Button>
              <Button
                type="submit"
                disabled={createRepair.isPending || setRepairCustomValues.isPending}
                data-testid="button-submit"
              >
                {createRepair.isPending ? "建立中..." : "送出報修"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
