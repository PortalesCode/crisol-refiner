import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import { parsePlan, updateTaskStatus } from "./_plan-utils.js";

export default (async () => {
  return {
    tool: {
      econative_plan_sync: tool({
        description:
          "Sincroniza el plan activo entre todowrite y plan.md. "
          + "Dos direcciones:\n"
          + "  - 'to-todo': Lee plan.md y genera un task list listo para todowrite\n"
          + "  - 'to-plan': Aplica cambios de estado de tareas a plan.md\n"
          + "Resuelve la bisagra entre el tablero efímero (todowrite) y el plan persistente.",
        args: {
          direction: tool.schema.string().describe("Dirección del sync: 'to-todo' | 'to-plan'"),
          tasks: tool.schema.string().optional()
            .describe(
              "[to-plan] JSON array con tareas a actualizar. "
              + "Cada item: { name: string, status: 'completed' | 'pending' | 'cancelled' }. "
              + "Ej: [{\"name\":\"refinar-gitignore\",\"status\":\"completed\"}]"
            ),
        },
        async execute(args, context) {
          const planPath = join(context.directory, "workspec", "plans", "active", "plan.md");

          if (!existsSync(planPath)) {
            return JSON.stringify({
              ok: false,
              error: "No hay plan activo en workspec/plans/active/plan.md",
            });
          }

          const content = readFileSync(planPath, "utf-8");

          if (args.direction === "to-todo") {
            try {
              const planData = parsePlan(content);
              let todoMarkdown = "## Plan Activo — Cargado desde plan.md\n\n";

              for (const phase of planData.phases) {
                todoMarkdown += `### ${phase.name}\n`;
                for (const task of phase.tasks) {
                  todoMarkdown += `- [${task.completed ? "x" : " "}] ${task.text}\n`;
                }
              }

              todoMarkdown += `\n---\nTotal: ${planData.stats.totalTasks} tareas (${planData.stats.completedTasks} completadas)`;

              return JSON.stringify({
                ok: true,
                direction: "to-todo",
                tasks_count: planData.stats.totalTasks,
                completed_count: planData.stats.completedTasks,
                todo_format: todoMarkdown,
                message: "Copiá el contenido de 'todo_format' en todowrite para cargar el plan.",
              });
            } catch (err) {
              return JSON.stringify({
                ok: false,
                error: `Error al parsear plan.md: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }

          if (args.direction === "to-plan") {
            if (!args.tasks) {
              return JSON.stringify({ ok: false, error: "Se requiere 'tasks' para direction: 'to-plan'" });
            }

            let updates: { name: string; status: string }[];
            try {
              updates = JSON.parse(args.tasks);
            } catch {
              return JSON.stringify({ ok: false, error: "'tasks' no es un JSON válido" });
            }

            if (!Array.isArray(updates)) {
              return JSON.stringify({ ok: false, error: "'tasks' debe ser un array" });
            }

            let lines = content.split("\n");
            let changed = false;
            let found = 0;
            const notFound: string[] = [];

            for (const update of updates) {
              const validStatuses = ["completed", "pending", "cancelled"];
              const status = validStatuses.includes(update.status) ? update.status as "completed" | "pending" | "cancelled" : "completed";

              const result = updateTaskStatus(lines, update.name, status);
              if (result.found) {
                found++;
                lines = result.lines;
                changed = true;
              } else {
                notFound.push(update.name);
              }
            }

            if (changed) {
              writeFileSync(planPath, lines.join("\n"), "utf-8");
            }

            return JSON.stringify({
              ok: true,
              direction: "to-plan",
              tasks_processed: updates.length,
              tasks_found: found,
              plan_updated: changed,
              tasks_not_found: notFound.length > 0 ? notFound : undefined,
            });
          }

          return JSON.stringify({
            ok: false,
            error: `Dirección no válida: '${args.direction}'. Usá 'to-todo' o 'to-plan'.`,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
