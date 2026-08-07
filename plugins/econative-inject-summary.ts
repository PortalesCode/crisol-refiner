/**
 * econative-inject-summary.ts
 *
 * Inyecta un resumen compacto de tools, skills y reglas del ecosistema
 * en el system prompt de CADA request. Así CADA agente del ecosistema
 * (Refinería, North, Executor, Auditor, Especialista) SIEMPRE ve qué tiene
 * disponible sin depender de AGENTS.md ni de "acordarse" de buscar.
 *
 * Inspirado en Engram (global) que usa el mismo hook para inyectar
 * MEMORY_INSTRUCTIONS en cada request.
 *
 * Hook: experimental.chat.system.transform
 */

import type { Plugin } from "@opencode-ai/plugin";

const ECO_SUMMARY = `## 🧭 Jerarquía (arquitectura actual)

El usuario habla con Refinería (primaria): entiende, refina y clarifica la
intención, y coordina el análisis previo. El usuario decide si pasar a acción o descartar.
Si hay acción, esa intención pulida va a North (el cerebro) que la comprende y delega
a sus manos: Executor (ejecuta) → Auditor (verifica) → Especialista (experto senior bajo demanda).
Los subagentes reportan de vuelta a North, y North devuelve el resultado a Refinería.

## 📋 Tools del Ecosistema

econative_start_session — Inicio obligatorio: contexto + plan + stack + prefs, auto-crea plan.md si no existe
econative_context_read — Leer contexto (PROJECT, CONVENTIONS, ARCHITECTURE, STATUS, SKILL-REGISTRY, etc)
econative_plan_read — Consultar plan activo (workspec/plans/active/plan.md)
econative_plan_sync — Sincronizar todowrite ↔ plan.md
econative_plan_archive — Archivar plan completado a old/
econative_status — Vista unificada: contexto + plan + stack + discoveries
econative_save_preferences — Guardar nombre e idioma del usuario
econative_stack_snapshot — Escanear stack del proyecto
econative_remember_it — Guardar descubrimiento en memoria compartida
econative_remember_list — Listar descubrimientos (metadata)
econative_remember_show — Leer descubrimiento completo
econative_task_init — Iniciar tarea: marca 🔵 en plan.md con timestamp de creación
econative_task_closeout — Cerrar tarea: marca [x] con timestamp de cierre en plan.md
econative_domain_list — Listar dominios de conocimiento
econative_domain_reader — Leer dominio completo
econative_domain_write — Crear o actualizar dominio

## 📋 Protocolos (se cargan bajo demanda — solo el registry en start_session)
econative_protocol_list — Listar protocolos disponibles (solo título + descripción)
econative_protocol_read — Leer protocolo COMPLETO por ID — cargar solo al activar
econative_protocol_write — Crear o actualizar protocolo en formato estandarizado

## ⚡ Skills Nativas (cargar con skill("..."))

econative-architecture-review — Evaluar arquitectura, impacto, riesgos
econative-parallel-dispatch — Detectar independencia y lanzar en paralelo
econative-implement-safe — Implementación segura (Executor)
econative-debug-systematic — Debugging metódico (Executor)
econative-test-and-validate — Testing y validación (Executor)
econative-audit-review — Revisión estructurada 6 dimensiones (Auditor)
econative-curacion-dominios — Curar dominios: detectar gap → investigar → escribir → verificar
econative-skill-installer — Instalar skill desde GitHub (requiere reinicio)

## ⚖️ ¿Auditor? Reglas rápidas

Cambio trivial (<10 líneas, 1 archivo) → NO
Feature nuevo o +3 archivos → criterio North
Lógica crítica (auth, datos, core) → SI
Múltiples Executors mismos archivos → SI
Legacy sin tests → criterio North
Usuario dice "no hace falta revisión" → NO
Antes de mergear a main o tag → SI
Refactor grande (>5 archivos, >200 líneas) → SI
Usuario pidió revisión → SI
North no está segura del resultado → SI (mejor prevenir)
`;

export default (async () => {
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      if (output.system.length > 0) {
        output.system[output.system.length - 1] += "\n\n" + ECO_SUMMARY;
      } else {
        output.system.push(ECO_SUMMARY);
      }
    },
  };
}) satisfies Plugin;
