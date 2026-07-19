# 25 — Temas visuales y edición DVG

## Objetivo

La sección **Perfil → Apariencia** permite adaptar toda la interfaz móvil al ambiente de lectura. El selector presenta una vista previa real de cada paleta, una descripción breve y un indicador visible del tema activo.

## Temas disponibles

| Tema | Tipo | Intención visual |
|------|------|------------------|
| Sistema | Dinámico | Sigue automáticamente el modo claro u oscuro del dispositivo |
| Claro | Claro | Superficie neutra, limpia y luminosa |
| Oscuro | Oscuro | Lectura nocturna con acentos dorados |
| Sepia | Claro | Papel cálido para sesiones largas de lectura |
| Sepia oscuro | Oscuro | Marrones profundos, texto crema y acentos ámbar |
| Medianoche | Oscuro | Azul profundo con acentos azul lavanda |
| Bosque | Oscuro | Verde sereno con acentos esmeralda |
| Lavanda | Claro | Fondo suave, elegante y de bajo contraste visual |
| DVG | Oscuro, solo administradores | Base borgoña, rojo principal y texto claro de alto contraste |

Las paletas viven en [`mobile/constants/Colors.ts`](../mobile/constants/Colors.ts). Todas exponen los mismos tokens semánticos (`background`, `card`, `text`, `textMuted`, `primary`, `primaryForeground`, `danger`, etc.), por lo que las pantallas no dependen de colores fijos.

## Selector de apariencia

[`mobile/components/ThemeSwitch.tsx`](../mobile/components/ThemeSwitch.tsx) usa una cuadrícula adaptable de tarjetas. Cada opción incluye:

- miniatura con fondo, tarjeta, texto y color principal;
- nombre y descripción del ambiente;
- indicador de selección;
- estado accesible de tipo `radio`;
- distintivo `ADMIN` en la edición DVG.

La selección se guarda mediante `expo-secure-store` con la clave `bibliaapp_theme_mode`, por lo que se conserva entre reinicios.

## Restricción administrativa de DVG

DVG no solo se oculta en la interfaz para invitados y usuarios normales. [`mobile/app/_layout.tsx`](../mobile/app/_layout.tsx) monta una protección global que revisa la sesión después de cargarla:

```text
tema DVG + rol admin       → conservar DVG
tema DVG + cualquier otro → volver a Sistema
```

Esto también cubre una selección persistida por una sesión administrativa anterior. La condición usa el mismo rol `admin` empleado por el resto de las funciones administrativas móviles.

## Integración con temas oscuros

[`mobile/context/ThemeContext.tsx`](../mobile/context/ThemeContext.tsx) centraliza qué paletas son oscuras mediante `isDarkTheme`. Este dato se reutiliza para:

- elegir la base clara u oscura de Expo Router;
- ajustar el contenido de la barra de estado;
- conservar el comportamiento de `darkColor` en componentes heredados;
- seleccionar variantes oscuras en componentes que consumen `useAppTheme().isDark`.

## Verificación

Desde `mobile/`:

```bash
npx tsc --noEmit
```

Pruebas manuales recomendadas:

1. Cambiar entre todos los temas desde **Perfil → Apariencia**.
2. Reiniciar la app y confirmar que la selección persiste.
3. Cambiar el tema del dispositivo con **Sistema** activo.
4. Verificar que DVG aparece para `role === "admin"` y no aparece para otros roles.
5. Cerrar una sesión administradora con DVG activo y confirmar el regreso automático a **Sistema**.

---

## Paridad web

La web expone el mismo catálogo de paletas (más **UBG**, exclusiva de web) mediante [`components/theme-toggle.tsx`](../components/theme-toggle.tsx) y clases CSS en [`app/globals.css`](../app/globals.css). Documentación completa: [`docs/temas-visuales-web.md`](../docs/temas-visuales-web.md).

| Aspecto | Móvil | Web |
|---------|-------|-----|
| Selector | `ThemeSwitch.tsx` (Perfil → Apariencia) | `ThemeToggle` (header / menú móvil) |
| Persistencia | SecureStore `bibliaapp_theme_mode` | `next-themes` → `localStorage` |
| Guard admin | `AdminThemeGuard` en `_layout.tsx` | `useEffect` + `/api/auth/me` en `ThemeToggle` |
| Temas oscuros | `isDarkTheme` en `ThemeContext.tsx` | `isDarkThemeName()` en `lib/theme.ts` |
| Paleta extra | — | **UBG** (`adminOnly`, no portada a mobile) |

### Pitfall compartido (web)

El menú web usa Base UI (`DropdownMenuLabel` = `Menu.GroupLabel`). La etiqueta **Apariencia** debe ir dentro de `DropdownMenuGroup`; si no, Base UI lanza error `#31` y el selector no abre. Detalle y checklist en [`docs/temas-visuales-web.md`](../docs/temas-visuales-web.md) § Solución de problemas.
