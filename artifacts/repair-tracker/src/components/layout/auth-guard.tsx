import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLocation("/login");
    } else {
      setReady(true);
    }
  }, [setLocation]);

  if (!ready) return null;
  return <>{children}</>;
}
