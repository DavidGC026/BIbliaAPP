# AGENT.md — Flujo de trabajo para IAs

Reglas obligatorias para cualquier agente o asistente que trabaje en **BibliaAPP**.  
El objetivo es mantener el proyecto ordenado, reutilizable y documentado.

---

## 1. Leer documentación antes de empezar

Antes de escribir o modificar código, **lee la documentación del área correspondiente**:

| Ámbito | Carpeta de docs | Código |
|--------|-----------------|--------|
| Web (Next.js) | [`docs/`](./docs/) | raíz: `app/`, `components/`, `lib/`, etc. |
| Móvil (Expo / React Native) | [`docs-mobile/`](./docs-mobile/) | [`mobile/`](./mobile/) |

### Cómo hacerlo

1. Identifica si el cambio es **web**, **mobile** o **ambos**.
2. Abre el índice:
   - Web (versionados en Git): [`docs/temas-visuales-web.md`](./docs/temas-visuales-web.md), [`docs/mejoras-uso-diario-web.md`](./docs/mejoras-uso-diario-web.md), [`docs/estilos-moviles-web.md`](./docs/estilos-moviles-web.md), [`docs/acceso-biblico-y-legal-web.md`](./docs/acceso-biblico-y-legal-web.md); más docs locales en `docs/` según `.gitignore`.
   - Desktop: [`desktop/docs/README.md`](./desktop/docs/README.md).
   - Mobile: [`docs-mobile/README.md`](./docs-mobile/README.md) y el doc numerado de la feature; iOS: [`docs-mobile-ios/README.md`](./docs-mobile-ios/README.md).
3. Lee al menos el documento de la feature afectada (arquitectura, pantallas, API, build, etc.) **antes** de implementar.
4. Si el cambio toca API o paridad web↔móvil, revisa también docs del otro lado (`docs/` ↔ `docs-mobile/`).

**No inventes flujos ni estructuras nuevas sin contrastarlas con la documentación existente.**

---

## 2. Reutilizar código antes de crear funciones nuevas

Antes de añadir una función, hook, utilidad, componente o endpoint:

1. **Busca** en el código algo que ya haga lo mismo o algo muy similar (`grep`, búsqueda por nombre, carpeta `lib/`, `components/`, hooks, etc.).
2. Si existe → **reutilízalo** o extráelo a un módulo compartido en lugar de duplicar.
3. Si es casi igual → **extiende** lo existente (props, parámetros, opciones), no copies el archivo.
4. Solo crea código nuevo cuando no haya equivalente razonable.

Así se evita el **código espagueti**, se mantiene la estructura del proyecto y se reduce el mantenimiento.

### Ejemplos de dónde mirar primero

- Web: `lib/`, `components/`, `app/api/`
- Mobile: `mobile/lib/`, `mobile/components/`, `mobile/hooks/`
- Formatos / imágenes de versículos, auth, sync offline, temas: suelen tener módulos ya compartidos.

---

## 3. Componentes pequeños y escalables (alineado con SOLID)

- Prefiere **componentes y módulos cortos y con una responsabilidad clara**.
- Si un archivo crece demasiado (UI + lógica + red + estilos mezclados), **sepáralo**:
  - UI → componente presentacional
  - Lógica → hook o función en `lib/`
  - Tipos / constantes → módulo dedicado
- Evita monolitos difíciles de leer, probar o reutilizar.
- Nombres claros; sigue las convenciones de carpetas ya documentadas (`docs/` / `docs-mobile/` → estructura).

**Regla práctica:** si cuesta explicar el archivo en una frase, probablemente hay que partirlo.

---

## 4. Respetar los principios SOLID (cuando aplique)

Aplicar SOLID de forma **práctica** en TypeScript / React / React Native. No forzar capas ni abstracciones innecesarias: si un módulo pequeño y directo cumple mejor, úsalo; si el diseño crece, aplica SOLID.

### S — Single Responsibility (Responsabilidad única)

Una clase, módulo, componente o función debe tener **una sola razón para cambiar**.

- Un componente: preferible solo UI o solo orquestación ligera, no UI + API + sync + estilos complejos mezclados.
- Una función en `lib/`: un propósito claro (auth, formatos de imagen, sync, etc.).
- Si hay varias razones de cambio → separar.

### O — Open/Closed (Abierto/Cerrado)

Abierto a **extensión**, cerrado a **modificación** innecesaria.

- Preferir añadir props, variantes, plugins o nuevos módulos en lugar de reescribir lo que ya funciona.
- Extender comportamientos existentes (p. ej. reutilizar `VerseImageCreator` con nuevas opciones) sin romper callers.
- Evitar tocar código estable solo para “encajar” un caso especial; extiende o parametriza.

### L — Liskov Substitution (Sustitución de Liskov)

Un subtipo / implementación alternativa debe poder **reemplazar** al original sin romper el contrato.

- Si un componente/hijo o wrapper promete la misma API (props, retorno), debe comportarse de forma coherente.
- No sobreescribir métodos/comportamientos de forma que invalide lo que el padre o la interfaz asume.
- En React: variantes y wrappers deben respetar el contrato de props documentado.

### I — Interface Segregation (Segregación de interfaces)

Mejor **varias interfaces/props específicas** que una enorme de propósito general.

- No obligar a un consumidor a pasar o implementar props/métodos que no usa.
- Props de componentes y tipos de API: enfocados al caso de uso.
- Evitar “god props” / objetos basura con campos opcionales sin relación.

### D — Dependency Inversion (Inversión de dependencias)

Los módulos de alto nivel no deben acoplarse a detalles de bajo nivel; ambos dependen de **abstracciones**.

- UI / pantallas dependen de hooks, `lib/api`, repos o contratos, no de detalles de red/SQLite/filesystem embebidos.
- Preferir inyectar o llamar a capas (`api`, `repo`, stores) en lugar de copiar fetch/SQL dentro del componente.
- Las abstracciones (tipos, interfaces, módulos de dominio) no deben depender de detalles concretos de UI o plataforma.

**Equilibrio:** SOLID no justifica sobreingeniería. Primero reutilizar y separar responsabilidades; abstraer solo cuando hay (o habrá) más de una implementación o un acoplamiento real.

---

## 5. Documentar siempre lo que se hace

Todo cambio de comportamiento, arquitectura o flujo debe quedar reflejado en docs:

1. **Trabajo nuevo** (feature, pantalla, flujo, endpoint) → crear un documento en la carpeta correcta (`docs/` o `docs-mobile/`) o una sección clara en un doc existente.
2. **Cambio sobre algo ya documentado** → **actualizar** el archivo anterior (no dejar docs obsoletas).
3. En `docs-mobile/`, si añades un doc nuevo numerado, actualiza también el índice en [`docs-mobile/README.md`](./docs-mobile/README.md).
4. La documentación debe explicar: qué se hizo, dónde vive el código, y cómo usarlo / probarlo de forma breve.

**Código sin documentación actualizada = trabajo incompleto.**

---

## Checklist rápido (antes de dar por terminada una tarea)

- [ ] Leí docs de `docs/` o `docs-mobile/` según el ámbito
- [ ] Busqué reutilizar código existente
- [ ] Separé en componentes/módulos manejables (S)
- [ ] Extensión sin romper lo existente cuando aplica (O / L)
- [ ] Props/contratos específicos, sin acoplar UI a detalles de bajo nivel (I / D)
- [ ] Creé o actualicé la documentación correspondiente

---

## Notas del repo

- La app móvil vive en `mobile/` y tiene su propia guía Expo en `mobile/AGENTS.md` (versión de Expo).
- Este `AGENT.md` en la raíz manda el **flujo de trabajo del proyecto** para web y mobile.
- Preferir soluciones simples y alineadas con lo ya existente (menos abstracciones nuevas, más reutilización), **respetando SOLID cuando el diseño lo permita**.
