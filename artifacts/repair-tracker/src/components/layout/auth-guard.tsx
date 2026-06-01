import { useEffect } from "react";
import { useLocation } from "wouter";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLocation("/login");
    }
  }, [setLocation]);

  const token = localStorage.getItem("auth_token");
  if (!token) return null;

  return <>{children}</>;
}
