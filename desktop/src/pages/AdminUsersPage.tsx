import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import type { AdminSectionGroup, ManagedUser } from "@/lib/types";

function parseSections(raw: string | string[] | null): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<AdminSectionGroup[]>([]);
  const [defaults, setDefaults] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | "new" | null>(null);
  async function load() {
    const [userResult, sectionResult] = await Promise.all([
      api.adminListUsers(),
      api.adminListSections(),
    ]);
    setUsers(userResult.users);
    setGroups(sectionResult.groups);
    setDefaults(sectionResult.defaults);
  }
  useEffect(() => {
    if (user?.role === "admin")
      load()
        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
        .finally(() => setLoading(false));
  }, [user?.role]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? users.filter((item) =>
          `${item.name} ${item.email}`.toLowerCase().includes(q),
        )
      : users;
  }, [query, users]);
  if (user?.role !== "admin")
    return (
      <div className="p-6">
        <EmptyState
          title="Acceso restringido"
          description="Se requieren permisos de administrador."
        />
      </div>
    );
  if (editing)
    return (
      <AdminForm
        target={editing}
        groups={groups}
        defaults={defaults}
        onBack={() => setEditing(null)}
        onSaved={async () => {
          await load();
          setEditing(null);
        }}
      />
    );
  return (
    <div className="desktop-page space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Gestión de usuarios
        </h1>
        <p className="text-sm text-muted-foreground">
          Administra cuentas, roles y permisos de secciones.
        </p>
      </header>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-foreground"
        />
        <Button onClick={() => setEditing("new")}>Crear usuario</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <EmptyState
          icon="alert"
          title="No se pudieron cargar los usuarios"
          description={error}
        />
      ) : filtered.length ? (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className="flex items-center gap-3">
              <button
                onClick={() => setEditing(item)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block font-bold text-foreground">
                  {item.name}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {item.email}
                </span>
              </button>
              <span className="rounded-full border border-border px-2 py-1 text-xs font-bold text-primary">
                {item.role === "admin" ? "Admin" : "Lector"}
                {item.id === user.id ? " · Tú" : ""}
              </span>
              <Button variant="ghost" onClick={() => setEditing(item)}>
                Editar
              </Button>
              <Button
                variant="ghost"
                disabled={item.id === user.id}
                onClick={async () => {
                  if (
                    !confirm(
                      `¿Eliminar a «${item.email}»? Esta acción no se puede deshacer.`,
                    )
                  )
                    return;
                  await api.adminDeleteUser(item.id);
                  setUsers((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  );
                }}
              >
                Eliminar
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Ningún usuario coincide" />
      )}
    </div>
  );
}

function AdminForm({
  target,
  groups,
  defaults,
  onBack,
  onSaved,
}: {
  target: ManagedUser | "new";
  groups: AdminSectionGroup[];
  defaults: string[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = target === "new";
  const data = isNew ? null : target;
  const [name, setName] = useState(data?.name ?? "");
  const [email, setEmail] = useState(data?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">(
    data?.role === "admin" ? "admin" : "user",
  );
  const [sections, setSections] = useState(
    parseSections(data?.allowedSections ?? null) ?? defaults,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (isNew && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (role === "user" && !sections.length) {
      setError("Selecciona al menos una sección.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
        role,
        allowedSections: role === "admin" ? null : sections,
      };
      if (isNew) await api.adminCreateUser(payload);
      else if (data) await api.adminUpdateUser(data.id, payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Button variant="ghost" onClick={onBack}>
        ← Volver
      </Button>
      <h1 className="text-2xl font-bold text-foreground">
        {isNew ? "Crear usuario" : "Editar usuario"}
      </h1>
      <Card className="space-y-4">
        <Field label="Nombre" value={name} onChange={setName} />
        <Field
          label="Correo electrónico"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <Field
          label={isNew ? "Contraseña" : "Nueva contraseña (vacío = conservar)"}
          value={password}
          onChange={setPassword}
          type="password"
        />
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
            Rol
          </p>
          <div className="flex gap-2">
            <Button
              variant={role === "user" ? "primary" : "outline"}
              onClick={() => setRole("user")}
            >
              Lector
            </Button>
            <Button
              variant={role === "admin" ? "primary" : "outline"}
              onClick={() => setRole("admin")}
            >
              Administrador
            </Button>
          </div>
        </div>
        {role === "user" ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Secciones permitidas
              </p>
              <button
                className="text-xs font-semibold text-primary"
                onClick={() => setSections(defaults)}
              >
                Restaurar predeterminadas
              </button>
            </div>
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 font-bold text-foreground">{group.label}</p>
                {group.sections.map((section) => (
                  <label
                    key={section.id}
                    className="flex items-center gap-2 py-1.5 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={sections.includes(section.id)}
                      onChange={() =>
                        setSections((current) =>
                          current.includes(section.id)
                            ? current.filter((id) => id !== section.id)
                            : [...current, section.id],
                        )
                      }
                    />
                    {section.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Los administradores tienen acceso a todas las secciones.
          </p>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button fullWidth loading={saving} onClick={save}>
          {isNew ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </Card>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
      />
    </label>
  );
}
