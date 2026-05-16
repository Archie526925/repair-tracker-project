import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

type Category = { id: number; slug: string; label: string; color: string; sortOrder: number };

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#0ea5e9", "#84cc16", "#f43f5e",
];

const createSchema = z.object({
  slug: z
    .string()
    .min(1, "請輸入代碼")
    .regex(/^[a-z0-9_-]+$/, "只允許小寫英文、數字、底線、連字號"),
  label: z.string().min(1, "請輸入顯示名稱"),
  color: z.string().default("#6b7280"),
});

const editSchema = z.object({
  label: z.string().min(1, "請輸入顯示名稱"),
  color: z.string().default("#6b7280"),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function CategoriesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { slug: "", label: "", color: "#6b7280" },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { label: "", color: "#6b7280" },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  const createMutation = useCreateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "新增成功" });
        invalidate();
        setCreateOpen(false);
        createForm.reset({ slug: "", label: "", color: "#6b7280" });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "新增失敗";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "更新成功" });
        invalidate();
        setEditingCategory(null);
      },
      onError: () => toast({ title: "更新失敗", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "刪除成功" });
        invalidate();
        setDeleteTargetId(null);
      },
      onError: () => toast({ title: "刪除失敗", variant: "destructive" }),
    },
  });

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    editForm.reset({ label: cat.label, color: cat.color });
  };

  const ColorPicker = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: value === c ? "#000" : "transparent",
              transform: value === c ? "scale(1.15)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border p-0.5"
        />
        <span className="text-sm text-muted-foreground font-mono">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">類別管理</h1>
          <p className="text-muted-foreground mt-1">新增、編輯或刪除報修類別</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          新增類別
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>類別列表</CardTitle>
          <CardDescription>以下類別會顯示在新增報修的類別選單中</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>尚未設定任何類別</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(Array.isArray(categories) ? categories : []).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 py-3"
                  data-testid={`category-row-${cat.id}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  <div
                    className="h-5 w-5 rounded-full flex-shrink-0 border border-black/10"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cat.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{cat.slug}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(cat as Category)}
                      data-testid={`button-edit-category-${cat.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTargetId(cat.id)}
                      data-testid={`button-delete-category-${cat.id}`}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增類別</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((v) =>
                createMutation.mutate({ data: v }),
              )}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>代碼</FormLabel>
                    <FormControl>
                      <Input placeholder="例：cleaning" {...field} data-testid="input-slug" />
                    </FormControl>
                    <FormDescription>用於系統識別，建立後無法修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>顯示名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="例：清潔" {...field} data-testid="input-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>顏色</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-category">
                  新增
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(o) => !o && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯類別：{editingCategory?.label}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) => {
                if (editingCategory)
                  updateMutation.mutate({ id: editingCategory.id, data: v });
              })}
              className="space-y-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">代碼</p>
                <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md">
                  {editingCategory?.slug}
                </p>
              </div>
              <FormField
                control={editForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>顯示名稱</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>顏色</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-category">
                  儲存
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此類別？</AlertDialogTitle>
            <AlertDialogDescription>
              已使用此類別的報修紀錄不會受影響，但類別名稱將顯示為代碼。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTargetId !== null && deleteMutation.mutate({ id: deleteTargetId })
              }
              data-testid="button-confirm-delete-category"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
