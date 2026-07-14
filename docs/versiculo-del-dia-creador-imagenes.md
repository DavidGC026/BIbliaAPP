# Versículo del día — continuidad del preview al creador

Documentación de la paridad web/mobile del flujo **Versículo del día → Crear imagen** (julio 2026).

## Comportamiento esperado

Cuando la tarjeta del versículo del día tiene una fotografía, el creador debe abrir usando esa misma fotografía y no reemplazarla por el gradiente predeterminado. Así, el primer lienzo editable coincide con el preview que motivó la acción.

El usuario conserva todas las opciones del creador: cambiar diseño, formato, posición, zoom, oscurecimiento, gradiente u otra fotografía.

Si la API no entrega fotografía, el creador abre normalmente con su gradiente de respaldo.

## Implementación web

| Archivo | Responsabilidad |
|---------|-----------------|
| `components/verse-of-the-day.tsx` | Entrega `data.backgroundImage` al creador mediante `initialPhotoUrl`. |
| `components/verse-image-creator.tsx` | Al abrir, inicializa el modo `photo` y `backgroundImageUrl` cuando recibe la URL; sin URL usa `gradient`. |
| `app/api/image-proxy/route.ts` | Permite convertir la imagen remota a data URL antes de exportar, evitando restricciones CORS. |

La plantilla guardada sigue restaurando formato, diseño y gradiente, pero no sustituye la fotografía de origen. La foto solo se cambia cuando el usuario elige explícitamente otro fondo.

## Paridad móvil

El contrato equivale a `initialPhotoUri` en `mobile/components/VerseImageCreator.tsx`, enviado desde `mobile/components/VerseOfDayCard.tsx`. Ambas plataformas abren el creador con el fondo visible en la tarjeta.

Referencia móvil: [`docs-mobile/18-lector-biblia-e-imagenes.md`](../docs-mobile/18-lector-biblia-e-imagenes.md).

## Prueba manual

1. Abre Inicio con un versículo del día que tenga fotografía.
2. Pulsa **Crear imagen**.
3. Comprueba que el lienzo inicial usa exactamente la fotografía del preview.
4. Descarga o comparte la imagen; verifica que la foto se incluye en el PNG.
5. Cambia a un gradiente y confirma que la selección manual sigue funcionando.
6. Simula un día sin `backgroundImage` y confirma el fallback a gradiente.
