# 06 — Autenticación

## Modelo

La app móvil usa **token Bearer** en lugar de cookies:

1. El usuario envía email y contraseña a `POST /api/auth/login`, o inicia sesión con Google.
2. El servidor devuelve un token AES-256-GCM autenticado (`v2:iv:cifrado:tag`; `lib/auth.ts`).
3. El móvil lo guarda en el almacén seguro del SO.
4. Cada petición a la API incluye `Authorization: Bearer <token>`.
5. Al cerrar sesión se borra el token local y se llama a `POST /api/auth/logout`.

El backend acepta cookie `session` o cabecera Bearer. El transporte móvil usa `credentials: 'omit'`.

## Almacenamiento local

| Clave | Valor | Ubicación |
| --- | --- | --- |
| `bibliaapp_session` | Token completo | `expo-secure-store` |
| `bibliaapp_user` | `{ sessionToken, user }`, perfil ligado a la credencial que lo obtuvo | `expo-secure-store` |

[`mobile/context/AuthContext.tsx`](../mobile/context/AuthContext.tsx) integra React y el ciclo de vida. [`mobile/lib/sessionController.ts`](../mobile/lib/sessionController.ts) controla restauración, persistencia, renovación y concurrencia. Las escrituras se serializan para que un login o logout posterior prevalezca sobre peticiones anteriores. Una caché perteneciente a otra credencial no se restaura.

## API del contexto (`useAuth`)

```typescript
const {
  user,            // User | null
  token,           // string | null
  isLoading,       // bootstrap inicial
  isGuest,         // !isLoading && !user
  login,           // (email, password) => Promise<void>
  loginWithGoogle, // () => Promise<void>
  logout,          // () => Promise<void>
  refreshUser,     // () => Promise<void>
} = useAuth();
```

## Ciclo de vida

### Arranque

```text
isLoading = true
    → leer token de SecureStore
    → restaurar perfil cacheado de esa credencial
    → GET /api/auth/me (máximo 15 segundos)
    → guardar perfil y token renovado, si lo devuelve el servidor
    → isLoading = false
```

Solo un **401** de `/api/auth/me` o una respuesta válida `{ user: null }` confirma que hay que borrar la sesión. Los **403** expresan falta de permiso y no cierran sesión. Se conserva la credencial ante desconexión, timeout, 429, 5xx, HTML de un proxy, JSON incompleto o indisponibilidad temporal de SecureStore. Un fallo al leer la caché del perfil no impide recuperar el token.

Al regresar a primer plano y cada cinco minutos mientras está activa, la app revalida. Las validaciones simultáneas comparten una petición. Una respuesta de otra sesión o de un proveedor desmontado no puede cambiar la sesión actual. Si no se pudo leer SecureStore, se reintenta al volver a primer plano.

### Login (`app/login.tsx`)

1. Validar campos y normalizar email a minúsculas sin espacios exteriores.
2. Autenticar, guardar token y actualizar usuario.
3. Obtener perfil completo antes de finalizar.
4. Google usa el mismo controlador. Si falla la carga inicial del perfil, se conserva el token para reintentar y se informa del error.

### Logout (`app/(tabs)/profile.tsx`)

1. Capturar la credencial saliente para POST logout y desvincular push.
2. Poner usuario y token a `null` inmediatamente y cancelar validaciones anteriores.
3. Borrar SecureStore. Los fallos de red no impiden el cierre local.

Las peticiones de limpieza fijan la credencial saliente para evitar usar la de un login nuevo. El endpoint actual elimina la cookie, pero **no revoca en el servidor una copia del Bearer token**; falta un registro persistente de sesiones revocables.

## Expiración y renovación

Cada token vence siete días después de su emisión. `/api/auth/me` puede renovarlo si sigue válido y tiene al menos un día de antigüedad; devuelve `{ user, token? }` con `Cache-Control: private, no-store`. El móvil guarda el reemplazo antes de usarlo. La renovación conserva la fecha del login original y no permite superar **30 días desde ese login**.

Tras siete días sin una renovación válida o al llegar al límite de 30 días, hay que volver a iniciar sesión. No existe un refresh token independiente ni se recuperan tokens vencidos. La política anterior obligaba a salir cada siete días incluso usando la app diariamente. La renovación evita ese vencimiento para usuarios activos, manteniendo un límite absoluto.

Está pendiente la revocación por logout, cambio de contraseña y eliminación de cuenta en todos los endpoints; la renovación no sustituye ese control. Véase la [revisión de seguridad](../docs/moderacion-ugc-y-seguridad.md).

**Activación de v2:** el servidor rechaza los tokens CBC anteriores porque carecen de autenticidad. No se migran automáticamente: aceptar uno permitiría mantener la suplantación corregida. Al desplegar, los usuarios tendrán que iniciar sesión una vez. Los clientes anteriores pueden usar v2 como cadena opaca, pero necesitan actualizarse para consumir la renovación.

## Verificación de email

Usuarios con `emailVerified = false` y rol distinto de admin reciben **403** en login:

```json
{
  "error": "Debes verificar tu correo antes de iniciar sesión.",
  "code": "EMAIL_NOT_VERIFIED",
  "email": "..."
}
```

La verificación se realiza desde `/verify-email` en la web. El registro está disponible en `POST /api/auth/register`.

## Seguridad

- No registrar tokens en consola en producción.
- Usar HTTPS en `API_BASE_URL` en builds de release.
- No incluir secretos del servidor en el móvil ni en Git.
- En imágenes y descargas, enviar el Bearer únicamente a rutas protegidas del **origen exacto** de `API_BASE_URL`. Un enlace externo no recibe credenciales aunque contenga `/api/media/`. La regla compartida está en `mobile/lib/media.ts`.
- Provisionar un `JWT_SECRET` estable e independiente de MySQL y del dominio. El fallback actual sigue existiendo por compatibilidad operativa; cambiar esas variables cambia la clave e invalida sesiones.

## Integración con `lib/api.ts`

```typescript
api.setApiTokenGetter(() => controller.getSnapshot().token);
```

El getter consulta la credencial actual inmediatamente, sin esperar un render de React. Las funciones de API heredan esa cabecera. `getMe()` valida la estructura de la respuesta antes de entregarla al controlador, para distinguir una sesión inválida de una respuesta incompleta.

## Verificación (2026-09-23)

- Raíz: `npm run check:auth` prueba criptografía y `/api/auth/me` con base de datos simulada.
- `mobile/`: `npm run check:auth` prueba persistencia, offline, timeout, 403, respuestas inválidas, renovación, concurrencia, logout y envío de credenciales en archivos.
- TypeScript: `tsc --noEmit --incremental false` en raíz y `tsc --noEmit` en móvil.
- Antes de publicar: probar contraseña, Google, modo avión, regreso a primer plano y logout en Android e iOS reales. Las pruebas automatizadas no acceden al Keychain real ni al servidor de producción.
