# Web móvil — shell global y paridad con la app

Documentación del shell móvil de la web (julio 2026): header, tabbar flotante, hoja **Más**, estilos base y envoltorio de secciones. Aplica a **todas** las pestañas, no solo Notas.

**Relacionado:** paridad de Notas en [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) · vista mobile en [`../docs-mobile/23-paridad-web-mobile-global.md`](../docs-mobile/23-paridad-web-mobile-global.md)

---

## Resumen

En viewports `< 768px` la SPA se comporta como app instalada:

| Pieza | Archivo | Comportamiento |
|-------|---------|----------------|
| Shell raíz | `app/page.tsx` | `min-h-[100dvh]`, header sticky, área de scroll, tabbar flotante |
| Estilos base | `app/globals.css` | Safe-area, scroll táctil, `mobile-section-shell`, inputs 16px (anti-zoom iOS) |
| Secciones | `lib/app-section-registry/outlet.tsx` | Cada pestaña activa se envuelve en `<section class="mobile-section-shell">` |
| Tabs internos | `components/ui/segment-tabs.tsx` | Pestañas segmentadas con margen y radio mobile |

El escritorio (`md:` y superior) conserva sidebar colapsable y layouts con borde/sombra; los cambios mobile no alteran desktop.

---

## Arquitectura del layout

```text
<main class="mobile-app-shell">
  ConnectionBanner / MobileAppBanner
  <aside> … sidebar desktop … </aside>

  <div class="mobile-app-header">   ← sticky, 64px, solo md:hidden
    logo · título sección · acciones
  </div>

  <div class="flex-1 pb-[calc(96px+safe-area)]">   ← reserva espacio tabbar flotante
    <div class="mobile-web-content overflow-y-auto">
      <AppSectionOutlet>
        <section class="mobile-section-shell">   ← por cada pestaña activa
          <div layout="fullscreen|card|notebook"> h-[calc(100dvh-160px)] …
            {SectionComponent}
          </div>
        </section>
      </AppSectionOutlet>
    </div>
  </div>

  <nav class="mobile-tabbar"> … tabs directos + Más … </nav>
  {showMobileMore && <bottom sheet>}
</main>
```

### Constantes de altura (mobile)

| Valor | Uso |
|-------|-----|
| `64px` | Header (`h-[64px]`) |
| `72px` | Altura fija de la tabbar flotante |
| `12px` | Margen inferior de la tabbar respecto al borde (`bottom-[calc(12px+safe-area)]`) |
| `96px` | Padding inferior del área de contenido (`pb-[calc(96px+safe-area)]`) — tabbar + margen |
| `160px` | Offset en layouts de sección (`h-[calc(100dvh-160px)]`) — header + chrome inferior |

Si cambias alturas del header o tabbar, actualiza **las tres** expresiones (`pb`, `100dvh-160px` y la constante `160`) para evitar solapes o huecos.

---

## `app/page.tsx` — shell y navegación

### Header móvil

- Clase `mobile-app-header`, visible solo con `md:hidden`.
- Altura `64px`, fondo `bg-background/98`, borde inferior suave.
- Título: etiqueta de la pestaña activa (`activeLabel`) + subtítulo con nombre de iglesia.
- Acciones en botones `size-9 rounded-xl` (buscar, usuarios, notificaciones, tema, login/logout).
- Racha en pill compacta cuando hay sesión.

### Área de contenido

- `min-h-[100dvh]` en el contenedor principal.
- Scroll en `.mobile-web-content` con `p-0` en móvil (el padding lo aporta `mobile-section-shell`).
- `pb-[calc(96px+env(safe-area-inset-bottom))]` deja hueco para la tabbar flotante.

### Tabbar flotante

- `fixed` con `left-3 right-3`, `rounded-[26px]`, sombra `shadow-[0_12px_34px_…]`.
- Posición: `bottom-[calc(12px+env(safe-area-inset-bottom))]`.
- Altura fija `72px` (sin sumar safe-area al `h-`; el `bottom` ya la compensa).
- Tabs directos: hasta 4 ítems visibles; el quinto slot es **Más** si hay más secciones permitidas.
- Estado activo: contenedor de icono `size-9 rounded-2xl bg-primary text-primary-foreground shadow-sm` (fondo primario sólido, no solo tinte).

### Hoja **Más**

- Bottom sheet con handle, `rounded-t-[28px]`, `max-h-[84vh]`.
- Lista vertical (`grid-cols-1`): fila con icono en caja `size-10`, etiqueta y `ArrowRight`.
- Fila activa: `border-primary bg-primary text-primary-foreground`.
- Invitados: secciones bloqueadas van a **Más**; usuarios con >4 secciones permitidas también.

---

## `app/globals.css` — utilidades `@media (max-width: 767px)`

| Clase | Rol |
|-------|-----|
| `.mobile-app-shell` | `min-height: 100dvh`, fondo uniforme |
| `.mobile-app-header` | Sombra 1px inferior; safe-area lateral |
| `.mobile-tabbar` | Safe-area lateral |
| `.mobile-web-content` | Scroll táctil, `overscroll-behavior: contain` |
| `.mobile-section-shell` | `padding: 14px 14px 0`, `min-height: 100%` |
| inputs en `.mobile-web-content` | `font-size: 16px` — evita zoom automático en iOS al enfocar |

---

## `lib/app-section-registry/outlet.tsx` — envoltorio de secciones

Cada sección registrada pasa por `renderSection()`:

1. Comprueba permisos, invitado y `activeTab`.
2. Renderiza el componente de `sections.client.tsx`.
3. Envuelve en `<section className="mobile-section-shell">`.
4. Aplica `wrapLayout()` según `layout` en el registro UI.

### Layouts en móvil vs desktop

| `layout` | Mobile (`< md`) | Desktop (`md+`) |
|----------|-----------------|-----------------|
| `fullscreen` | `h-[calc(100dvh-160px)]`, sin borde/radio | `rounded-xl shadow-sm`, `h-[calc(100vh-3rem)]` |
| `card` | Igual altura, fondo plano | Borde, `bg-card/10`, sombra |
| `notebook` | Igual altura, fondo plano | Borde, sombra |
| `plain` (default) | Sin wrapper de altura | Sin wrapper |

**Añadir una sección nueva:** define `layout` en `registerAppSectionComplete`. Si necesita altura de viewport en móvil, usa `fullscreen`, `card` o `notebook`; el shell ya aplica padding y altura.

---

## Validación local

```bash
npx tsc --noEmit
npm run build
```

Prueba manual en DevTools (ancho &lt; 768px o dispositivo real):

1. Header muestra título de sección al cambiar de pestaña.
2. Tabbar flota con margen inferior; el contenido no queda tapado al hacer scroll hasta el final.
3. **Más** abre lista vertical; elegir ítem cierra la hoja y cambia sección.
4. Safe-area en iPhone con notch (barra no pegada al borde físico).
5. Inputs del editor y formularios no provocan zoom en iOS.

---

## Despliegue

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Recarga con **Ctrl+Shift+R** en https://biblia2.dvguzman.com.

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué revisar |
|---------|----------------|-------------|
| Botón inferior tapado por tabbar | `pb` del contenedor o padding interno de la sección | `app/page.tsx` `pb-[calc(96px+…)]`; evitar `position: fixed` al fondo sin margen |
| Sección más corta que la pantalla | Layout `plain` o altura interna fija en px | `layout` en registro UI; `h-[calc(100dvh-160px)]` en `outlet.tsx` |
| Doble padding en Notas | `mobile-section-shell` + padding del componente | Notas usa `embedded`; alinear con [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) |
| Zoom al enfocar input en iOS | `font-size` &lt; 16px | Regla en `globals.css` bajo `.mobile-web-content` |
| Tabbar pegada al borde en iPhone | Falta `env(safe-area-inset-bottom)` | `bottom-[calc(12px+env(safe-area-inset-bottom))]` en `page.tsx` |

---

*Última revisión: julio 2026 (commit `76e6add` — refuerzo tabbar flotante y `mobile-section-shell`).*
