import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, Users } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
};

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRoles, setEditingRoles] = useState<Record<string, string>>({});

  const token = localStorage.getItem("auth_token");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json() as Promise<UserRow[]>;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "更新成功", description: "使用者角色已更新" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    setEditingRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSave = (userId: string) => {
    const role = editingRoles[userId];
    if (role) {
      updateRole.mutate({ id: userId, role });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          帳號管理
        </h1>
        <p className="text-sm text-muted-foreground">管理使用者帳號與權限角色</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用者列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">尚無使用者</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const currentRole = editingRoles[user.id] ?? user.role;
                const hasChanged = currentRole !== user.role;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {user.role === "admin" ? (
                        <ShieldCheck className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentRole}
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">檢視者</SelectItem>
                          <SelectItem value="admin">管理員</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasChanged && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(user.id)}
                          disabled={updateRole.isPending}
                        >
                          儲存
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">角色說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">管理員</span>
            — 可查看所有頁面、新增/編輯報修、管理自訂欄位與類別、管理帳號
          </p>
          <p>
            <span className="font-medium text-foreground">檢視者</span>
            — 僅可查看報修列表與詳細資料，無法進行任何修改操作
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
