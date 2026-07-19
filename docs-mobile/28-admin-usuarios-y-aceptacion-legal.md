# 28 — Administración de usuarios y aceptación legal (móvil)

## Objetivo

Paridad con la web en dos áreas requeridas para tiendas: **panel de administración** (usuarios, roles, permisos por sección) y **aceptación obligatoria** de términos, privacidad y normas de la comunidad.

Backend compartido: [`docs/acceso-biblico-y-legal-web.md`](../docs/acceso-biblico-y-legal-web.md).

---

## Catálogo de secciones (`GET /api/admin/sections`)

Solo administradores. Respuesta:

```json
{
  "groups": [
    {
      "id": "PERSONAL",
      "label": "Personal",
      "sections": [{ "id": "notes", "label": "Notas" }]
    }
  ],
  "defaults": ["dashboard", "reading", "search", …]
}
```

- `groups`: secciones asignables a lectores, agrupadas; **sin** entradas `adminOnly` (p. ej. `"users"`).
- `defaults`: IDs habilitados por defecto al crear un lector.

El editor de permisos del panel admin móvil debe **consumir este endpoint** en lugar de mantener una lista duplicada. Al añadir secciones en el backend ([`docs/nuevas-secciones.md`](../docs/nuevas-secciones.md)), aparecen aquí automáticamente.

Endpoints relacionados (sin cambios de contrato):

| Método | Ruta | Uso |
|--------|------|-----|
| GET/POST | `/api/admin/users` | Listar / crear |
| PUT/DELETE | `/api/admin/users/:id` | Editar / eliminar |

---

## Documentos legales

Páginas públicas en el backend (WebView o navegador in-app):

| Ruta | Contenido |
|------|-----------|
| `/terminos` | Términos y condiciones |
| `/privacidad` | Aviso de privacidad |
| `/normas-comunidad` | Normas de la comunidad |

Implementación web: [`app/terminos/`](../app/terminos/), [`app/privacidad/`](../app/privacidad/), [`app/normas-comunidad/`](../app/normas-comunidad/).

---

## Aceptación legal

### Registro nuevo

`POST /api/auth/register` exige `acceptTerms: true`. El servidor sella `users.legal_accepted_at` al crear la cuenta.

### Cuentas existentes

Login y perfil devuelven `legalAcceptedAt`. Si es `null`, mostrar un **gate bloqueante** hasta que el usuario acepte:

```http
POST /api/legal/accept
Authorization: Bearer <token>
Content-Type: application/json

{ "accept": true }
```

Respuesta: `{ "success": true, "legalAcceptedAt": "2026-07-19T…" }`.

`{ "accept": false }` → **400** con mensaje de rechazo.

### UI esperada en móvil

1. Checkbox con enlaces a las tres URLs legales en registro (como [`components/auth-screen.tsx`](../components/auth-screen.tsx) en web).
2. Modal o pantalla full-screen para cuentas con `legalAcceptedAt === null` tras login.
3. Sección en Perfil → Legal con enlaces y, opcionalmente, fecha de aceptación.

Desktop equivalente: `LegalAcceptanceGate` en [`desktop/docs/06-funcionalidades.md`](../desktop/docs/06-funcionalidades.md).

---

## Checklist antes de release

- [ ] Panel admin carga grupos desde `/api/admin/sections`.
- [ ] Registro no envía `POST /api/auth/register` sin `acceptTerms: true`.
- [ ] Cuenta de prueba antigua (`legalAcceptedAt` null) muestra gate y completa con `/api/legal/accept`.
- [ ] Enlaces legales abren las rutas públicas del entorno configurado.

---

## Errores frecuentes

| Síntoma | Solución |
|---------|----------|
| Sección nueva no aparece en permisos | Verificar que no tenga `adminOnly: true` en el catálogo |
| Gate legal en bucle | Confirmar que `POST /api/legal/accept` devuelve 200 y refrescar perfil |
| 403 en `/api/admin/sections` | Sesión debe ser rol `admin` |
