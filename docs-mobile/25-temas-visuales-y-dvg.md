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

La sección vive en **Perfil** ([`mobile/app/(tabs)/profile.tsx`](../mobile/app/(tabs)/profile.tsx)):

- **Invitado:** `<ThemeSwitch />` sin prop `isAdmin` → DVG no aparece.
- **Sesión iniciada:** `<ThemeSwitch isAdmin={user?.role === 'admin'} />` → DVG solo para administradores.

[`mobile/components/ThemeSwitch.tsx`](../mobile/components/ThemeSwitch.tsx) usa una cuadrícula adaptable de tarjetas. Cada opción incluye:

- miniatura con fondo, tarjeta, texto y color principal;
- nombre y descripción del ambiente;
- indicador de selección;
- estado accesible de tipo `radio`;
- distintivo `ADMIN` en la edición DVG.

La selección se guarda mediante `expo-secure-store` con la clave `bibliaapp_theme_mode`, por lo que se conserva entre reinicios.

## Restricción administrativa de DVG

DVG no solo se oculta en la interfaz para invitados y usuarios normales. [`mobile/app/_layout.tsx`](../mobile/app/_layout.tsx) envuelve la app con `AdminThemeGuard`, que revisa la sesión después de cargarla:

```text
tema DVG + rol admin       → conservar DVG
tema DVG + cualquier otro → volver a Sistema
```

Esto también cubre una selección persistida por una sesión administrativa anterior. La condición usa el mismo rol `admin` empleado por el resto de las funciones administrativas móviles.

## Consumo de tokens en componentes

La mayoría de pantallas no leen `Colors` directamente. El puente habitual es:

| Módulo | Rol |
|--------|-----|
| [`mobile/context/ThemeContext.tsx`](../mobile/context/ThemeContext.tsx) | Modo persistido (`mode`), esquema resuelto (`scheme`) y `setMode` |
| [`mobile/components/useColorScheme.ts`](../mobile/components/useColorScheme.ts) | Expone `scheme` para código heredado que esperaba `useColorScheme` de React Native |
| [`mobile/hooks/useAppTheme.ts`](../mobile/hooks/useAppTheme.ts) | Devuelve `colors`, `isDark`, `radius`, `shadow`, `spacing` y `typography` |

`RootLayoutNav` en `_layout.tsx` también mapea la paleta activa a los temas de Expo Router (`DefaultTheme` / `DarkTheme`) para barras de navegación nativas.

## Integración con temas oscuros

[`mobile/context/ThemeContext.tsx`](../mobile/context/ThemeContext.tsx) centraliza qué paletas son oscuras mediante `isDarkTheme`. Los esquemas oscuros son `dark`, `sepiaDark`, `midnight`, `forest` y `dvg`. Este dato se reutiliza para:

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

## Alcance y paridad web

El selector de apariencia es **exclusivo del cliente móvil**. La web usa variables CSS globales (claro/oscuro del navegador o tema del sitio), no las paletas Sepia, Bosque, Lavanda ni DVG. El color **Auto** del editor de notas sí depende del tema vigente en cada plataforma; ver [16-editor-webview-teclado-seleccion.md](./16-editor-webview-teclado-seleccion.md) y [../docs/notas-web-paridad-movil.md](../docs/notas-web-paridad-movil.md).

## Documentos relacionados

| Documento | Relación |
|-----------|----------|
| [16-editor-webview-teclado-seleccion.md](./16-editor-webview-teclado-seleccion.md) | Swatch **A** y marcador `note-color-auto` resuelto con `colors.text` del tema activo |
| [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) | Bitácora de mejoras generales; temas visuales marcados como hecho |
| [23-paridad-web-mobile-global.md](./23-paridad-web-mobile-global.md) | Paridad visual web; `Colors.ts` como referencia de tokens móviles |
| [../docs/notas-web-paridad-movil.md](../docs/notas-web-paridad-movil.md) | Color automático en el editor web según el tema del sitio |
