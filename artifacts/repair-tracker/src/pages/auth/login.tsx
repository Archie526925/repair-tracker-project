import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (!isRegistering) {
        localStorage.setItem("auth_token", data.token);
        toast({
          title: "登入成功",
          description: "歡迎回來！",
        });
        setLocation("/");
      } else {
        toast({
          title: "註冊成功",
          description: "請使用您的帳號登入",
        });
        setIsRegistering(false);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {isRegistering ? "創建帳號" : "登入維修追蹤系統"}
          </CardTitle>
          <CardDescription>
            {isRegistering ? "請填寫以下資訊以註冊新帳號" : "請輸入您的帳號密碼以進入系統"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input 
                id="username" 
                placeholder="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "處理中..." : (isRegistering ? "註冊" : "登入")}
            </Button>
            <div className="text-sm text-center text-slate-500">
              {isRegistering 
                ? "已有帳號？" 
                : "沒有帳號？"
              } 
              <button 
                type="button" 
                className="ml-1 text-blue-600 hover:underline font-medium"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering ? "立即登入" : "立即註冊"}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
