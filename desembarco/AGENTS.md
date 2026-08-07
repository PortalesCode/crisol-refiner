# Crisol Refiner — Ecosystem

> Ecosistema de desarrollo autónomo para OpenCode.
> **Refiner** entiende la intención del usuario, la clarifica y coordina el análisis.
> **North** es el cerebro: recibe la acción pulida y delega a sus manos.
> **Boehmio** abre la cabeza, **Realistic** baja a tierra, **Executor** ejecuta, **Auditor** verifica, **Especialista-Bibliotecario** aporta conocimiento experto y custodia la biblioteca.
> Publicable, clonable, mantenible.

<!-- CRISOL-REFINER — ARCHIVO DEL ECOSISTEMA. NO MODIFICAR AUTOMÁTICAMENTE. -->

## ⚙️ Manifiesto del proyecto

Refiner actualiza esta sección automáticamente. Consultala para saber qué skills, dominios y MCPs están disponibles.

### Stack

| Tecnología | Propósito |
|---|---|
| OpenCode | Runtime de agentes |
| TypeScript | Plugins (tools) |
| Markdown | Skills, dominios, contexto |

### Skills externas

Skills de terceros o custom del proyecto. Viven en `.opencode/skills/extern/<nombre-de-la-skill>/Skill.md`.

- _(sin skills externas instaladas)_

### Skills nativas

| Skill | Dueño | Propósito |
|---|---|---|
| `econative-architecture-review` | Especialista-Bibliotecario | Evaluar arquitectura, componentes, límites, impacto, escalabilidad |
| `econative-curacion-dominios` | Especialista-Bibliotecario | Curar dominios: investigar, escribir y verificar |
| `econative-skill-installer` | Refiner | Instalar skills externas bajo demanda |
| `econative-parallel-dispatch` | North | Detectar tareas independientes y lanzar Executors en paralelo |
| `econative-implement-safe` | Executor | Implementación segura (reglas, rollback) |
| `econative-debug-systematic` | Executor | Debugging metódico |
| `econative-test-and-validate` | Executor | Testing y validación |
| `econative-audit-review` | Auditor | Revisión estructurada |

### Dominios del proyecto

Dominios curados en `workspec/domains/`. Se consultan con `econative_domain_list` / `econative_domain_reader`.

- _(sin dominios curados aún)_

### MCPs del proyecto

MCPs configurados en `opencode.json` además del `seq-thinking` nativo.

- `seq-thinking` (ecosistema) — razonamiento estructurado multi-paso solo para tareas complejas

### Links

- **Contexto del proyecto**: `workspec/context/`

---

## Agentes disponibles

| Agente | Modo | Rol |
|---|---|---|
| `Refiner` | primary | Puerta de entrada. Entiende, refina, clarifica la intención del user, coordina análisis, es la voz de North. |
| `North` | subagent | El cerebro. Recibe la acción pulida de Refiner, la comprende y delega. |
| `Boehmio` | subagent | Creativo. Analiza ideas, abre la cabeza. Lo consulta Refiner. |
| `Realistic` | subagent | Realista. Baja a tierra, valida, puntúa 1-10. Lo consulta Refiner. |
| `Executor` | subagent | La mano de North. Ejecuta. |
| `Auditor` | subagent | Verifica que lo ejecutado esté perfecto. |
| `Especialista-Bibliotecario` | subagent | Experto senior bajo demanda + custodio del conocimiento. North lo consulta; si falta saber, investiga y cura el dominio. |

### Filosofía

```
Refiner = entender y clarificar la intención
North = el cerebro (recibe, comprende, delega)
Boehmio / Realistic = análisis previo del triángulo
Executor = operación
Auditor = control
Especialista-Bibliotecario = conocimiento experto + custodia del conocimiento (consulta, investiga y cura)
Domains = qué saber (pasivo, consultable bajo demanda)
Context = estado del proyecto
Memoria = buffer entre efímero y permanente
```

## Skills disponibles

### Nativas (`skills/native/`)

Son **patrones operativos** del ecosistema — definen *cómo trabajan los agentes*, no importa el rubro del proyecto. Cada skill tiene un dueño que la carga antes de actuar.

| Skill | Dueño | Propósito |
|---|---|---|
| `econative-architecture-review` | Especialista-Bibliotecario | Revisar arquitectura y detectar riesgos |
| `econative-curacion-dominios` | Especialista-Bibliotecario | Curar dominios: detectar gap, investigar, escribir, verificar |
| `econative-skill-installer` | Refiner | Instalar skills bajo demanda desde el repositorio remoto |
| `econative-parallel-dispatch` | North | Detectar independencia y lanzar ejecutores paralelos |
| `econative-implement-safe` | Executor | Implementación segura (reglas de edición, rollback) |
| `econative-debug-systematic` | Executor | Debugging metódico (6 pasos + antipatrones) |
| `econative-test-and-validate` | Executor | Testing y validación con comandos por lenguaje |
| `econative-audit-review` | Auditor | Revisión estructurada (6 dimensiones + informe) |

## Flujo de trabajo (nueva arquitectura)

1. **Refiner** recibe la intención del usuario
2. Si la idea es grande/abierta → consulta el triángulo (**Boehmio** + **Realistic**)
3. Refiner presenta al usuario la opinión de ambos resumida; Realistic da el veredicto técnico (1-10); **Refiner da el veredicto final**
4. **El usuario decide** pasar a acción o descartar/ajustar
5. Solo si el usuario decide ejecutar → la acción pulida va a **North** (`task(North, ...)`)
6. **North** la comprende y delega: **Executor** → **Auditor** → **Especialista-Bibliotecario** (cuando necesita conocimiento)
7. North devuelve el resultado a Refiner, Refiner lo sintetiza al usuario

## ⚖️ ¿Cuándo llamar al Auditor?

North decide según estas reglas:

| Situación | ¿Auditor? |
|---|---|
| Cambio trivial (typo, rename, 1 archivo, < 10 líneas) | ❌ No — directo |
| Feature nuevo o cambio en +3 archivos | ⚠️ A criterio de North |
| Cambia lógica crítica (auth, datos sensibles, core del negocio) | ✅ Sí, siempre |
| Múltiples Executors tocaron los mismos archivos | ✅ Sí — detectar conflictos |
| Código legacy sin tests | ⚠️ A criterio (North decide según impacto) |
| Usuario dice explícitamente "no hace falta revisión" | ❌ No |
| Antes de mergear a main o tag | ✅ Sí |
| Refactor grande (> 5 archivos o > 200 líneas tocadas) | ✅ Sí |
| El usuario pidió expresamente una revisión | ✅ Sí |
| North no está segura del resultado | ✅ Sí — mejor prevenir |

**Regla práctica:** Ante la duda, llamalo. Es más barato detectar un problema en revisión que arreglarlo en producción.

## Plugins disponibles (tools)

| Tool | Qué hace |
|---|---|
| `econative_start_session` | **Obligatorio** al inicio. Carga contexto, plan, stack, prefs; desembarca workspec si es primera vez. |
| `econative_context_read` | Lee todos los .md de `workspec/context/` (PROJECT, CONVENTIONS, ARCHITECTURE, STATUS, SKILL-REGISTRY, etc). |
| `econative_plan` | **Tool única** para gestionar el plan. Acciones: `design`, `start`, `close`, `status`, `archive`. |
| `econative_plan_read` | Consulta el plan activo (`workspec/plans/active/plan.md`). |
| `econative_plan_sync` | Helper: sincroniza todowrite ↔ plan.md (`to-todo` / `to-plan`). |
| `econative_plan_archive` | Helper: archiva plan completado a `workspec/plans/old/` con timestamp. |
| `econative_status` | Vista unificada del proyecto: contexto + plan + stack + descubrimientos. |
| `econative_save_preferences` | Guarda nombre e idioma del usuario en `workspec/Memoria/preferences-user/`. |
| `econative_stack_snapshot` | Escanea stack, escribe `current.json` y archiva snapshots viejos. |
| `econative_remember_it` | Guarda descubrimiento en `workspec/Memoria/discoveries/` con título, descripción, contenido, tags, importancia y estado. |
| `econative_remember_list` | Lista descubrimientos — solo metadata (título, descripción, tags, importancia, fecha, estado). |
| `econative_remember_show` | Lee el contenido COMPLETO de un descubrimiento por nombre de archivo. |
| `econative_domain_list` | Escanea `workspec/domains/` y devuelve lista de dominios con título y descripción. |
| `econative_domain_reader` | Lee contenido completo de un dominio. |
| `econative_domain_write` | Crea o actualiza dominio. |
| `econative_protocol_list` | Lista protocolos disponibles (solo título + descripción). |
| `econative_protocol_read` | Lee protocolo COMPLETO por ID — cargar solo al activar. |
| `econative_protocol_write` | Crea o actualiza protocolo en formato estandarizado. |

## Tools nativas de OpenCode

| Tool | Para qué |
|---|---|
| `question()` | Preguntar al user con opciones o texto libre |
| `sequential_thinking` | Razonamiento estructurado multi-paso, solo tareas complejas |

## Contexto

- `workspec/context/PROJECT.md` — qué es el proyecto
- `workspec/context/ARCHITECTURE.md` — arquitectura
- `workspec/context/CONVENTIONS.md` — reglas
- `workspec/context/STATUS.md` — estado/issue

## Notas

- Los agentes se cargan desde `agents/`
- Las skills en `skills/native/`
- Los plugins en `plugins/`
- Los dominios se consultan bajo demanda
- La memoria pesada queda fuera del ecosistema
