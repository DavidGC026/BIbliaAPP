import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";

function AppShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  if (user) {
    return <DashboardPage onLogout={() => {}} />;
  }

  return <LoginPage onSuccess={() => {}} />;
}

export default function App() {
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", prefersDark.matches);
    };
    apply();
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, []);

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
