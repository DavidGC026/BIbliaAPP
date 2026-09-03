# 41 — Audio, oración personal, amigos, QR de grupos y discipulado

Fecha: septiembre 2026.

Porta al móvil cinco capacidades que ya existían en la web. Los comentarios bíblicos clásicos se dejaron fuera a propósito.

## Audio en el lector

- Panel `BibleAudioPlayer`: reproduce versículo a versículo.
- Si Kokoro responde en `/api/tts?info=voices`, usa MP3 neuronal (`expo-audio`).
- Si no, cae a `expo-speech` (voz del dispositivo).
- El capítulo y la selección tienen un acceso «Escuchar». El versículo activo se marca en el texto.
- Respeta `canUseAudio` de la licencia de cada Biblia.

## Oración personal

Nueva pestaña **Oración** en Notas. Misma API que la web (`/api/prayers`): privada o compartida con un grupo, marcar respondida, archivar y borrar.

## Amigos y seguir

- `/friends`: lista, solicitudes pendientes y buscador (`/api/users/search`).
- `/user/[username]`: perfil público, seguir/dejar de seguir y solicitud de amistad.
- Desde una publicación del feed se abre el perfil del autor.

## QR e invitación de grupo

- En Grupos, botón **Escanear QR** (`expo-camera`).
- En el detalle del grupo, pestaña **Invitar**: QR, código copiable, enlace y regenerar (admin).
- Deep links `?joinGroup=` y `bibliaapp://` abren `/join-group`.
- Si un invitado abre la invitación, se guarda el código y, tras el login, vuelve a `/join-group`.

## Discipulado

Pantalla `/discipleship`: solicitar mentor por @usuario, aceptar/rechazar solicitudes y ver progreso del discípulo.

## Nativo

Hace falta un **prebuild** nuevo para cámara y audio (`expo-camera`, `expo-audio`, `expo-speech`). El JS corre en Expo Go con limitaciones; el APK release debe recompilarse.

## Pruebas

```bash
cd mobile
node scripts/test_tts_text.cjs
node scripts/test_group_invite.cjs
npx tsc --noEmit
```
