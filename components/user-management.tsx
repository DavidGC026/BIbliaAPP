"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { DEFAULT_READER_SECTIONS, getSectionLabel, parseAllowedSections } from "@/lib/app-sections"
import { SectionPermissionsEditor } from "@/components/section-permissions-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Loader2, 
  ArrowLeft,
  Calendar,
  AlertCircle,
  Search
} from "lucide-react"

interface ManagedUser {
  id: number
  name: string
  email: string
  role: string
  allowedSections: string | string[] | null // Raw JSON string or parsed array
  createdAt: string
}

interface UserManagementProps {
  currentUserId: number
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const { data: usersData, mutate: mutateUsers, isLoading } = useSWR<{ users: ManagedUser[] }>(
    "/api/admin/users",
    fetcher
  )
  const users = usersData?.users ?? []

  const [isCreating, setIsCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("")

  // Form States
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("user")
  const [allowedSections, setAllowedSections] = useState<string[]>([])
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Global Permissions bulk action states
  const [globalAllowedSections, setGlobalAllowedSections] = useState<string[]>([...DEFAULT_READER_SECTIONS])
  const [applyingGlobal, setApplyingGlobal] = useState(false)

  function openCreateForm() {
    setName("")
    setEmail("")
    setPassword("")
    setRole("user")
    setAllowedSections([...DEFAULT_READER_SECTIONS])
    setError(null)
    setEditingUser(null)
    setIsCreating(true)
  }

  function openEditForm(user: ManagedUser) {
    setName(user.name)
    setEmail(user.email)
    setPassword("") // Empty means keep current password
    setRole(user.role)
    
    const parsedSections = parseAllowedSections(user.allowedSections)
    setAllowedSections(
      user.role === "admin"
        ? [...DEFAULT_READER_SECTIONS]
        : parsedSections ?? [...DEFAULT_READER_SECTIONS],
    )
    setError(null)
    setEditingUser(user)
    setIsCreating(false)
  }

  async function handleApplyGlobalPermissions() {
    if (globalAllowedSections.length === 0) {
      alert("Debes seleccionar al menos una sección permitida para aplicar globalmente.")
      return
    }

    if (!confirm("¿Estás seguro de sobrescribir y aplicar estos permisos a TODOS los usuarios lectores de la plataforma? Esta acción actualizará a todos los lectores de forma global en la base de datos.")) {
      return
    }

    setApplyingGlobal(true)
    try {
      const res = await fetch("/api/admin/users/bulk-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedSections: globalAllowedSections })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al aplicar permisos globales.")
      }

      alert(`Se actualizaron con éxito los permisos de los lectores en la base de datos (${data.affectedRows} usuarios modificados).`)
      await mutateUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Algo salió mal al aplicar permisos globales")
    } finally {
      setApplyingGlobal(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son requeridos.")
      return
    }

    setSaving(true)
    setError(null)

    const isEdit = !!editingUser
    const url = isEdit ? `/api/admin/users/${editingUser.id}` : "/api/admin/users"
    const method = isEdit ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.length > 0 ? password : undefined,
          role,
          allowedSections: role === "admin" ? null : allowedSections // Admins default to all sections
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el usuario")
      }

      await mutateUsers()
      setIsCreating(false)
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, email: string) {
    if (id === currentUserId) {
      alert("No puedes eliminar tu propia cuenta de administrador.")
      return
    }

    if (!confirm(`¿Estás seguro de eliminar al usuario "${email}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      await mutateUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar el usuario")
    }
  }

  // Filter list by searchQuery
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  // Create or Edit Form View
  if (isCreating || editingUser) {
    const isEdit = !!editingUser
    return (
      <div className="space-y-6 animate-fade-in p-1 md:p-4">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="size-6 text-primary" />
            <span>{isEdit ? `Editar Usuario: ${editingUser.name}` : "Crear Nuevo Usuario"}</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreating(false)
              setEditingUser(null)
            }}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            <span>Cancelar</span>
          </Button>
        </header>

        <form onSubmit={handleSave} className="space-y-5 max-w-lg">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="size-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@correo.com"
                required
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {isEdit ? "Nueva Contraseña (dejar en blanco para conservar)" : "Contraseña"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
                required={!isEdit}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Rol de Acceso
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all cursor-pointer ${
                  role === "user"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-border bg-card/45 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <User className="size-4" />
                <span>Lector ordinario</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all cursor-pointer ${
                  role === "admin"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-border bg-card/45 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Shield className="size-4" />
                <span>Administrador</span>
              </button>
            </div>
          </div>

          {/* Permissions (allowed sections) checklist - only for user role */}
          {role === "user" && (
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Permisos: Secciones Permitidas
              </label>
              <SectionPermissionsEditor
                selected={allowedSections}
                onChange={setAllowedSections}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-10 gap-2 font-semibold"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span>{isEdit ? "Guardar Cambios" : "Crear Usuario"}</span>
            )}
          </Button>
        </form>
      </div>
    )
  }

  // Users List view
  return (
    <div className="space-y-6 p-1 md:p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Gestión de Usuarios <Users className="size-7 text-primary" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas, cambia contraseñas, busca usuarios y configura permisos.
          </p>
        </div>
        <Button onClick={openCreateForm} className="gap-1.5 font-semibold">
          <UserPlus className="size-4" />
          <span>Crear Usuario</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin text-primary" />
          Cargando listado de usuarios...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl items-start">
          
          {/* Main User List Section */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuarios por nombre o correo..."
                className="pl-9 h-9"
              />
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-border bg-card/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Secciones Habilitadas</th>
                      <th className="p-4">Creado el</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                          Ningún usuario coincide con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isAdmin = u.role === "admin"
                        const isSelf = u.id === currentUserId
                        
                        // Allowed sections display
                        let sectionsText = "Todas"
                        if (!isAdmin) {
                          const parsed = parseAllowedSections(u.allowedSections)
                          if (parsed && parsed.length > 0) {
                            sectionsText = parsed.map((s) => getSectionLabel(s)).join(", ")
                          } else {
                            sectionsText = DEFAULT_READER_SECTIONS.map((s) => getSectionLabel(s)).join(", ") + " (Predeterminado)"
                          }
                        }

                        return (
                          <tr 
                            key={u.id}
                            className="hover:bg-accent/20 transition-colors text-sm text-foreground/90"
                          >
                            <td className="p-4 font-semibold">{u.name}</td>
                            <td className="p-4 text-muted-foreground">{u.email}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                                isAdmin 
                                  ? "bg-primary/10 text-primary border border-primary/20" 
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}>
                                {isAdmin ? <Shield className="size-3" /> : <User className="size-3" />}
                                <span>{isAdmin ? "Admin" : "Lector"}</span>
                              </span>
                              {isSelf && (
                                <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.25 text-[10px] font-bold">
                                  Tú
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs text-muted-foreground max-w-[150px] truncate" title={sectionsText}>
                              {sectionsText}
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5" />
                                {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditForm(u)}
                                className="size-8 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                title="Editar contraseña y permisos"
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isSelf}
                                onClick={() => handleDelete(u.id, u.email)}
                                className={`size-8 text-muted-foreground hover:text-destructive transition-colors cursor-pointer ${
                                  isSelf ? "opacity-30 cursor-not-allowed" : ""
                                }`}
                                title={isSelf ? "No puedes eliminarte a ti mismo" : "Eliminar Usuario"}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Global Permissions Card */}
          <div className="rounded-xl border border-border bg-card/45 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Shield className="size-4.5 text-primary" />
                <span>Permisos Globales</span>
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                Aplica la configuración de secciones seleccionada a **TODOS** los usuarios con rol Lector. Útil al agregar nuevas funciones globales.
              </p>
            </div>

            <SectionPermissionsEditor
              selected={globalAllowedSections}
              onChange={setGlobalAllowedSections}
              compact
            />

            <Button
              onClick={handleApplyGlobalPermissions}
              disabled={applyingGlobal}
              className="w-full h-9 gap-1.5 font-semibold text-xs mt-2 cursor-pointer"
              variant="outline"
            >
              {applyingGlobal ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Shield className="size-3.5" />
                  <span>Aplicar a Todos los Lectores</span>
                </>
              )}
            </Button>
          </div>

        </div>
      )}
    </div>
  )
}
