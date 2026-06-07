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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  Users,
  KeyRound,
  Trash2,
  Building2,
} from "lucide-react";
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

type UserRow = {
  id: string;
  username: string;
  role: string;
  groupId: number | null;
  groupName: string | null;
  createdAt: string;
};

type GroupOption = {
  id: number;
  name: string;
};

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRoles, setEditingRoles] = useState<Record<string, string>>({});
  const [editingPasswords, setEditingPasswords] = useState<Record<string, string>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const token = localStorage.getItem("auth_token");

  const currentUserId = (() => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId || null;
    } catch {
      return null;
    }
  })();

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

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json() as Promise<GroupOption[]>;
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

  const updatePassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/users/${id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "更新成功", description: "密碼已更新" });
      setEditingPasswords((prev) => {
        const next = { ...prev };
        if (expandedUser) delete next[expandedUser];
        return next;
      });
      if (expandedUser) setEditingPasswords((prev) => ({ ...prev, [expandedUser]: "" }));
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: number | null }) => {
      const res = await fetch(`/api/admin/users/${id}/group`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "更新成功", description: "使用者群組已更新" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "刪除成功", description: "使用者已刪除" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "刪除失敗", description: err.message, variant: "destructive" });
      setDeleteTarget(null);
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

  const handleSavePassword = (userId: string) => {
    const password = editingPasswords[userId];
    if (password && password.length >= 4) {
      updatePassword.mutate({ id: userId, password });
    } else {
      toast({ title: "密碼太短", description: "密碼至少需要 4 個字元", variant: "destructive" });
    }
  };

  const handleGroupChange = (userId: string, value: string) => {
    const groupId = value === "__none__" ? null : Number(value);
    updateGroup.mutate({ id: userId, groupId });
  };

  function UserCard({ user }: { user: UserRow }) {
    const currentRole = editingRoles[user.id] ?? user.role;
    const hasRoleChanged = currentRole !== user.role;
    const isExpanded = expandedUser === user.id;
    const passwordValue = editingPasswords[user.id] ?? "";
    const isSelf = currentUserId === user.id;

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            {user.role === "admin" ? (
              <ShieldCheck className="h-5 w-5 text-amber-500" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {user.username}
                {isSelf && (
                  <span className="ml-2 text-xs text-muted-foreground">(你)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(user.createdAt)}
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
            {hasRoleChanged && (
              <Button
                size="sm"
                onClick={() => handleSave(user.id)}
                disabled={updateRole.isPending}
              >
                儲存
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpandedUser(isExpanded ? null : user.id)}
              title="修改密碼"
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            {!isSelf && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(user)}
                title="刪除使用者"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {/* Group row */}
        <div className="border-t bg-muted/20 px-3 py-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium w-12">群組</span>
          <Select
            value={user.groupId != null ? String(user.groupId) : "__none__"}
            onValueChange={(v) => handleGroupChange(user.id, v)}
          >
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="未設定" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">未設定</SelectItem>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isExpanded && (
          <div className="border-t bg-muted/30 p-3 flex items-center gap-2">
            <Input
              type="password"
              placeholder="輸入新密碼（至少 4 字元）"
              value={passwordValue}
              onChange={(e) =>
                setEditingPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))
              }
              className="max-w-xs"
            />
            <Button
              size="sm"
              onClick={() => handleSavePassword(user.id)}
              disabled={updatePassword.isPending || passwordValue.length < 4}
            >
              更新密碼
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          帳號管理
        </h1>
        <p className="text-sm text-muted-foreground">管理使用者帳號、密碼與權限角色</p>
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
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此使用者？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後，此使用者的所有資料將被移除，此操作無法復原。
              {deleteTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  使用者：{deleteTarget.username}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
              disabled={deleteUser.isPending}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
