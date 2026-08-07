# Crisol Refiner — Ecosystem

> Ecosistema de desarrollo autónomo para OpenCode.
> **Refiner** entiende la intención del usuario, la clarifica y coordina el análisis.
> **North** es el cerebro: recibe la acción pulida y delega a sus manos.
> **Boehmio** abre la cabeza, **Realistic** baja a tierra, **Executor** ejecuta, **Auditor** verifica, **Especialista** aporta conocimiento experto.
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
| `Bibliotecario` | primary | Custodio del conocimiento. **Mock — por ahora no se usa.** |
| `North` | subagent | El cerebro. Recibe la acción pulida de Refiner, la comprende y delega. |
| `Boehmio` | subagent | Creativo. Analiza ideas, abre la cabeza. Lo consulta Refiner. |
| `Realistic` | subagent | Realista. Baja a tierra, valida, puntúa 1-10. Lo consulta Refiner. |
| `Executor` | subagent | La mano de North. Ejecuta. |
| `Auditor` | subagent | Verifica que lo ejecutado esté perfecto. |
| `Especialista` | subagent | Experto senior bajo demanda, consulta conocimiento. |

### Filosofía

```
Refiner = entender y clarificar la intención
North = el cerebro (recibe, comprende, delega)
Boehmio / Realistic = análisis previo del triángulo
Executor = operación
Auditor = control
Especialista = conocimiento experto bajo demand
Bibliotecario = custodia del conocimiento (pendiente)
Domains = qué saber (pasivo, consultable bajo demanda)
Context = estado del proyecto
Memoria = buffer entre efímero y permanente
```

## Flujo de trabajo (nueva arquitectura)

1. **Refiner** recibe la intención del usuario
2. Si la idea es grande/abierta → consulta el triángulo (**Boehmio** + **Realistic**)
3. Refiner presenta al usuario la opinión de ambos resumida; Realistic da el veredicto técnico (1-10); **Refiner da el veredicto final**
4. **El usuario decide** pasar a acción o descartar/ajustar
5. Solo si el usuario decide ejecutar → la acción pulida va a **North** (`task(North, ...)`)
6. **North** la comprende y delega: **Executor** → **Auditor** → **Especialista**
7. North devuelve el resultado a Refiner, Refiner lo sintetiza al usuario

## Plugins disponibles (tools)

econative_start_session — **Obligatorio** al inicio. Carga contexto, plan, stack, prefs; desembarca workspec si es primera vez.
econative_context_read — Leer los .md de `workspec/context/`.
econative_plan — Gestión del plan (design/start/close/status/archive).
econative_status — Vista unificada del proyecto.
econative_save_preferences — Guardar nombre e idioma.
econative_stack_snapshot — Escanear stack del proyecto.
econative_remember_* — Guardar/listar/leer descubrimientos en `workspec/Memoria/discoveries/`.
econative_domain_* — Listar/leer/escribir dominios en `workspec/domains/`.
econative_plan_sync / plan_archive — Helpers del plan.

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
- Los dominios se consultan bajo demand
- La memoria pesada queda fuera del ecosistema
