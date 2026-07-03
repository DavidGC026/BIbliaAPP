import { useAuth } from "@/context/AuthContext";

export function OfflineBanner() {
  const { isOffline } = useAuth();
  if (!isOffline) return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary">
      Sin conexión — usando contenido descargado
    </div>
  );
}
