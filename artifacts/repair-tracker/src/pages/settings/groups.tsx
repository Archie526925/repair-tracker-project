import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Building2, Pencil, Check, X, Trash2, Plus } from "lucide-react";
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

type GroupRow = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function GroupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null);

  const token = localStorage.getItem("auth_token");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json() as Promise<GroupRow[]>;
    },
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "新增成功", description: "群組已建立" });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setNewName("");
      setNewDescription("");
    },
    onError: (err: Error) => {
      toast({ title: "新增失敗", description: err.message, variant: "destructive" });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name?: string; description?: string }) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "更新成功", description: "群組已更新" });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setEditingId(null);
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      // 200 with body or 204 no content — both mean success
      return;
    },
    onSuccess: () => {
      toast({ title: "刪除成功", description: "群組已刪除" });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "刪除失敗", description: err.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const startEdit = (group: GroupRow) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: number) => {
    if (!editName.trim()) {
      toast({ title: "名稱不可為空", variant: "destructive" });
      return;
    }
    updateGroup.mutate({ id, name: editName.trim(), description: editDescription.trim() || undefined });
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast({ title: "名稱不可為空", variant: "destructive" });
      return;
    }
    createGroup.mutate({ name: newName.trim(), description: newDescription.trim() || undefined });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          群組管理
        </h1>
        <p className="text-sm text-muted-foreground">管理院區群組</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新增群組</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Input
              placeholder="群組名稱"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="sm:w-[200px]"
            />
            <Input
              placeholder="描述（選填）"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="sm:flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={createGroup.isPending || !newName.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              新增
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">群組列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !groups || groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">尚無群組</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-lg overflow-hidden">
                  {editingId === group.id ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="sm:w-[200px]"
                        placeholder="群組名稱"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="sm:flex-1"
                        placeholder="描述"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveEdit(group.id)}
                          disabled={updateGroup.isPending}
                          title="儲存"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEdit}
                          title="取消"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.description || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(group.createdAt)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(group)}
                          title="編輯"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(group)}
                          title="刪除群組"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此群組？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後，此群組的資料將被移除，此操作無法復原。
              {deleteTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  群組：{deleteTarget.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteGroup.mutate(deleteTarget.id)}
              disabled={deleteGroup.isPending}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
