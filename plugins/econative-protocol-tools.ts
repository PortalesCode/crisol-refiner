/**
 * econative-protocol-tools.ts
 *
 * Suite de 3 tools para gestionar protocolos de comportamiento en workspec/protocols/:
 *
 *   econative_protocol_write — Crea o actualiza un protocolo
 *   econative_protocol_read  — Lee un protocolo completo
 *   econative_protocol_list  — Lista todos (título + descripción, sin contenido)
 *
 * Formato de cada protocolo:
 *
 *   $$Título del Protocolo$$
 *   &&Descripción breve de 1 línea&&
 *
 *   ## Activación
 *   Triggers: "trigger A" / "trigger B"
 *
 *   ## Comportamiento
 *   - Autonomía: alta | media | baja
 *   - Output: detallado | conciso | solo-código
 *   - Nivel de pregunta: nunca | solo-riesgos | siempre
 *
 *   ## Reglas
 *   - Regla 1
 *   - Regla 2
 *
 *   ## Alertas
 *   - Alerta 1
 *
 *   ## Duración
 *   sesión | tarea | hasta-que-se-active-otro
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, extname, basename } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      // ─────────────────────────────────────────────────────────
      //  WRITE — Crear o actualizar un protocolo
      // ─────────────────────────────────────────────────────────
      econative_protocol_write: tool({
        description:
          "Crea o actualiza un protocolo de comportamiento en workspec/protocols/. Formato:\n"
          + "  $$Título$$ (primera línea)\n"
          + "  &&Descripción&& (segunda línea)\n"
          + "  ## Activación / ## Comportamiento / ## Reglas / ## Alertas / ## Duración\n"
          + "Complementa a protocol_list (listar) y protocol_read (leer completo).",
        args: {
          id: tool.schema.string().describe(
            "Nombre del archivo sin .md. Ej: 'protocolo-17-arquitecto' → workspec/protocols/protocolo-17-arquitecto.md"
          ),
          title: tool.schema.string().describe("Título del protocolo (va en $$ ... $$)"),
          description: tool.schema.string().describe("Descripción de 1 línea (va en && ... &&)"),
          triggers: tool.schema.string().describe(
            'Triggers de activación separados por "/". Ej: "protocolo 17 / modo arquitecto"'
          ),
          autonomy: tool.schema
            .string()
            .describe("Autonomía: alta, media o baja"),
          output: tool.schema
            .string()
            .describe("Output esperado: detallado, conciso o solo-código"),
          question_level: tool.schema
            .string()
            .describe("Nivel de pregunta: nunca, solo-riesgos o siempre"),
          rules: tool.schema.string().describe(
            "Reglas del protocolo, una por línea. Ej: '- No preguntar antes de ejecutar\\n- Reportar solo al final'"
          ),
          alerts: tool.schema
            .string()
            .describe(
              "Alertas a monitorear, una por línea. Opcional."
            ),
          duration: tool.schema
            .string()
            .describe(
              "Duración del protocolo: sesión, tarea, o hasta-que-se-active-otro"
            ),
        },
        async execute(args, context) {
          const protocolsDir = join(context.directory, "workspec", "protocols");

          if (!existsSync(protocolsDir)) {
            mkdirSync(protocolsDir, { recursive: true });
          }

          const filePath = join(protocolsDir, `${args.id}.md`);
          const exists = existsSync(filePath);
          const action = exists ? "actualizado" : "creado";

          const rulesSection = args.rules
            ? `\n## Reglas\n${args.rules}`
            : "";

          const alertsSection = args.alerts
            ? `\n## Alertas\n${args.alerts}`
            : "";

          const content =
            `$$${args.title}$$\n`
            + `&&${args.description}&&\n`
            + `\n`
            + `## Activación\n`
            + `Triggers: "${args.triggers}"\n`
            + `\n`
            + `## Comportamiento\n`
            + `- Autonomía: ${args.autonomy}\n`
            + `- Output: ${args.output}\n`
            + `- Nivel de pregunta: ${args.question_level}\n`
            + `${rulesSection}`
            + `${alertsSection}`
            + `\n## Duración\n${args.duration}\n`;

          writeFileSync(filePath, content, "utf-8");

          return JSON.stringify({
            ok: true,
            action,
            file: `${args.id}.md`,
            path: `workspec/protocols/${args.id}.md`,
            title: args.title,
          });
        },
      }),

      // ─────────────────────────────────────────────────────────
      //  READ — Leer protocolo completo por ID
      // ─────────────────────────────────────────────────────────
      econative_protocol_read: tool({
        description:
          "Lee el contenido COMPLETO de un protocolo de workspec/protocols/ por su ID (filename sin .md). "
          + "Usar cuando North necesita aplicar un protocolo y quiere ver todas sus reglas.",
        args: {
          id: tool.schema
            .string()
            .describe(
              "ID del protocolo (filename sin .md). Ej: 'protocolo-17-arquitecto'"
            ),
        },
        async execute(args, context) {
          const protoPath = join(
            context.directory,
            "workspec",
            "protocols",
            `${args.id}.md`
          );

          if (!existsSync(protoPath)) {
            return JSON.stringify({
              ok: false,
              error: `Protocolo '${args.id}' no encontrado. Usá econative_protocol_list para ver los disponibles.`,
            });
          }

          return readFileSync(protoPath, "utf-8");
        },
      }),

      // ─────────────────────────────────────────────────────────
      //  LIST — Listar todos los protocolos (solo título + descripción)
      // ─────────────────────────────────────────────────────────
      econative_protocol_list: tool({
        description:
          "Escanea workspec/protocols/ y devuelve la lista de protocolos disponibles "
          + "con su título ($$) y descripción (&&). NO carga el contenido completo. "
          + "Usar para decidir qué protocolo activar o leer completo con protocol_read.",
        args: {},
        async execute(_args, context) {
          const protocolsPath = join(context.directory, "workspec", "protocols");

          if (!existsSync(protocolsPath)) {
            return JSON.stringify({ ok: true, count: 0, protocols: [] });
          }

          const files = readdirSync(protocolsPath).filter(
            (f) =>
              extname(f).toLowerCase() === ".md" &&
              f !== "_registry.md" // no incluír el registry en la lista
          );

          const protocols = files.map((file) => {
            const content = readFileSync(join(protocolsPath, file), "utf-8");
            let title = basename(file, ".md");
            const titleMatch = content.match(/\$\$(.*?)\$\$/);
            if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();
            let description = "";
            const descMatch = content.match(/&&\s*([\s\S]*?)&&/);
            if (descMatch && descMatch[1])
              description = descMatch[1].trim().slice(0, 500);
            return { id: basename(file, ".md"), title, description };
          });

          return JSON.stringify({
            ok: true,
            count: protocols.length,
            protocols,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
