# Auditoría de paridad mobile → web

Fecha: 26 de julio de 2026

## Objetivo y alcance

Se compararon las rutas, componentes y servicios de `mobile/` con el catálogo
de secciones y los componentes de la web. La intención no es copiar APIs
nativas al navegador, sino portar las capacidades que tienen un equivalente
web útil y mantener explícitas las diferencias de plataforma.

Se revisó `mobile/AGENTS.md`. Su instrucción exige consultar la documentación
exacta de Expo SDK 56 antes de escribir código mobile. Esta iteración no modifica
`mobile/`; todos los cambios están limitados a web y documentación.

## Resultado resumido

| Área mobile | Estado web después de esta iteración | Decisión |
| --- | --- | --- |
| Continuar lectura | Equivalente | Ya persistía el último pasaje. |
| Recientes en Inicio | Equivalente | Favoritos y subrayados recientes ya estaban portados. |
| Historial de búsqueda | Equivalente | Ya existe almacenamiento local en el buscador web. |
| Acciones rápidas configurables | **Portado** | Catálogo web, selección local y mínimo de una acción. |
| Tamaño, densidad y alineación del lector | **Portado** | Preferencia local única y validada. |
| Temas propios del lector | **Portado** | Auto, claro, sepia, noche y contraste. |
| Iconos compartidos | Equivalente | Web consume `assets/icons` mediante `AppIcon`. |
| Mapa y explorador de referencias | Equivalente | Ilustración y navegación ya están integradas. |
| Notas, libretas, devocionales y biblioteca | Equivalente funcional | Las superficies difieren por plataforma, pero usan las mismas APIs. |
| Feed, grupos, calendario y perfil | Equivalente funcional | Disponibles en el registro web de secciones. |
| Favoritos, subrayados, actividad y estadísticas | Equivalente | Disponibles desde Perfil y navegación autorizada. |
| Búsqueda universal multifuente | Pendiente | La web tiene búsqueda bíblica avanzada, pero no un agregador equivalente al de mobile. |
| Onboarding ligero descartable | Pendiente recomendado | Puede portarse sin API nativa en una iteración corta. |
| Compartir unificado | Pendiente | Existen flujos separados; falta un servicio web común de formato y créditos. |
| Exportar nota a PDF | Pendiente | Puede usar impresión del navegador con una hoja específica. |
| Fuente global por nota | Pendiente | Mobile la guarda por dispositivo; falta definir comportamiento y disponibilidad web. |
| Estado/reintento de sincronización | Parcial | La web informa conexión, pero no replica la cola offline nativa. |
| Descargas bíblicas offline | No aplica directamente | Requiere una estrategia PWA/IndexedDB distinta, no un port literal. |
| Widget y notificaciones locales | No aplica directamente | Son integraciones nativas; en web exigirían PWA, permisos y service worker. |

## Integración 1: accesos rápidos configurables

### Diseño

- `lib/home-actions.ts` contiene el modelo, catálogo, valores por defecto,
  validación y persistencia. No renderiza React ni conoce el Dashboard.
- `components/home-quick-actions.tsx` contiene únicamente interacción y
  presentación. Recibe una función de navegación, por lo que no depende del
  registro global ni de la implementación de autenticación.
- `components/dashboard.tsx` orquesta el acceso: decide si una acción protegida
  navega o abre el inicio de sesión.

La selección se guarda en `localStorage` con la clave
`biblia_web_home_actions`. Los valores desconocidos se descartan, se conserva
el orden canónico del catálogo y nunca se permite dejar cero acciones.

No se incluyeron como acciones web:

- **Descargas offline**, porque el navegador no comparte el administrador de
  descargas nativo.
- **Imagen de versículo**, porque en web parte de una selección dentro del
  lector y no es un destino independiente.
- **Búsqueda universal**, hasta que exista el agregador multifuente web; no se
  etiqueta la búsqueda bíblica actual como una capacidad distinta.

## Integración 2: preferencias completas del lector

### Diseño

- `lib/reader-preferences.ts` define los tipos, límites, paletas, saneamiento,
  lectura y escritura de preferencias.
- `components/bible-reader/reader-settings.tsx` es un control presentacional
  reutilizable que solo emite parches de preferencias.
- `components/bible-reader/index.tsx` mantiene el estado y aplica la paleta a
  la superficie de lectura.
- `components/bible-reader/verse-text.tsx` recibe tipografía y colores como
  propiedades; no consulta almacenamiento ni conoce temas por nombre.

Se persiste en `localStorage` con la clave `biblia_reader_preferences`:

```ts
{
  fontSize: number // 14–28
  density: "relaxed" | "compact"
  align: "left" | "justify"
  theme: "auto" | "light" | "sepia" | "night" | "contrast"
}
```

La carga migra `bible_font_size`, la clave anterior, y la elimina al guardar la
nueva estructura. Los datos inválidos vuelven a valores seguros.

## Aplicación de SOLID

- **Responsabilidad única:** catálogo/persistencia, UI y orquestación viven en
  módulos distintos.
- **Abierto/cerrado:** una acción nueva se incorpora al catálogo; los controles
  no requieren nuevos condicionales de renderizado.
- **Sustitución e interfaces pequeñas:** los componentes reciben callbacks y
  propiedades concretas, sin objetos de contexto global innecesarios.
- **Inversión de dependencias:** las vistas no deciden cómo navega la app ni
  acceden directamente al mecanismo de autenticación.

## Verificación

Comprobaciones ejecutadas:

```bash
npx tsc --noEmit
npm run build
```

`npm run lint` no puede ejecutarse todavía porque el script encuentra ESLint
6.4.0 y el repositorio no contiene una configuración compatible. No se creó
una configuración incidental dentro de esta mejora; debe resolverse como tarea
de tooling independiente.

Pruebas manuales recomendadas:

1. En Inicio, abrir **Personalizar**, desactivar acciones, recargar y comprobar
   que la selección persiste.
2. Confirmar que la última acción activa no se puede desmarcar.
3. Como invitado, abrir una acción protegida y confirmar que solicita sesión.
4. En el lector, probar los cinco temas, ambas densidades y alineaciones.
5. Recargar la página y comprobar que los cuatro ajustes persisten.
6. Con una instalación que tenga `bible_font_size`, verificar que conserva el
   tamaño al migrar.

## Próximos pasos recomendados

1. Crear búsqueda universal web con adaptadores por fuente y resultados
   agrupados; es la mayor brecha funcional portable.
2. Portar el onboarding ligero con almacenamiento local y pasos enlazables.
3. Unificar el formato de compartir versículos, devocionales y notas.
4. Definir una hoja de impresión para exportar notas a PDF.
