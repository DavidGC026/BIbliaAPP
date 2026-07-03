import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiToken } from "@/lib/api";
import { needsAuthHeaders, resolveMediaUrl } from "@/lib/media";

type Props = {
  uri: string | null | undefined;
  alt?: string;
  className?: string;
};

export function AuthedImage({ uri, alt = "", className }: Props) {
  const { token } = useAuth();
  const resolved = resolveMediaUrl(uri);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!resolved) {
      setSrc(null);
      return;
    }

    if (resolved.startsWith("data:") || !needsAuthHeaders(resolved)) {
      setSrc(resolved);
      setFailed(false);
      return;
    }

    const authToken = token ?? getApiToken();
    if (!authToken) {
      setSrc(null);
      setFailed(true);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(resolved, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolved, token]);

  if (!resolved || failed || !src) {
    return (
      <div
        className={className}
        aria-hidden
        style={{ backgroundColor: "var(--border)" }}
      />
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
