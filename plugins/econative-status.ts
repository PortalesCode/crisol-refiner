import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore - ruta local del ecosistema
import { parsePlan, formatPlanSummary } from "./_plan-utils.js";

export default (async () => {
  return {
    tool: {
      econative_status: tool({
        description:
          "Vista unificada del estado del proyecto. Consolida en un solo reporte:\n"
          + "  - Contexto del proyecto (PROJECT.md, STATUS.md)\n"
          + "  - Plan activo (intención, fases, progreso)\n"
          + "  - Stack técnico\n"
          + "  - Descubrimientos recientes\n"
          + "Útil para tener una foto rápida de 'qué está pasando'.",
        args: {},
        async execute(_args, context) {
          const root = context.directory;
          const report: Record<string, unknown> = {
            ok: true,
            timestamp: new Date().toISOString(),
            project: {},
            plan: null,
            stack: null,
            discoveries: [],
          };

          // ---- Contexto: PROJECT.md + STATUS.md ----
          const ctxDir = join(root, "workspec", "context");
          if (existsSync(ctxDir)) {
            const projectPath = join(ctxDir, "PROJECT.md");
            const statusPath = join(ctxDir, "STATUS.md");

            if (existsSync(projectPath)) {
              const content = readFileSync(projectPath, "utf-8");
              // Extraer nombre y propósito
              const nameMatch = content.match(/\*\*Nombre\*\*\s*\|\s*(.+)/);
              const purposeMatch = content.match(/\*\*Propósito\*\*\s*\|\s*(.+)/);
              const stackMatch = content.match(/Stack principal.*\|\s*(.+)/);
              report.project = {
                name: nameMatch ? nameMatch[1].trim() : "(sin definir)",
                purpose: purposeMatch ? purposeMatch[1].trim() : "(sin definir)",
                stack: stackMatch ? stackMatch[1].trim() : "(sin definir)",
              };
            }

            if (existsSync(statusPath)) {
              const content = readFileSync(statusPath, "utf-8");
              const stateMatch = content.match(/\*\*Estado actual:\*\*\s*(.+)/);
              const lastSessionMatch = content.match(/\*\*Qué pasó\*\*\s*\|\s*(.+)/);
              report.status = {
                state: stateMatch ? stateMatch[1].trim() : "(sin definir)",
                lastSession: lastSessionMatch ? lastSessionMatch[1].trim() : null,
              };
            }
          }

          // ---- Plan activo ----
          const planPath = join(root, "workspec", "plans", "active", "plan.md");
          if (existsSync(planPath)) {
            const content = readFileSync(planPath, "utf-8");
            try {
              const planData = parsePlan(content);
              report.plan = {
                intention: planData.intention,
                phases_count: planData.phases.length,
                stats: planData.stats,
                summary: formatPlanSummary(planData),
              };
            } catch {
              report.plan = { error: "Error al parsear plan.md" };
            }
          }

          // ---- Stack ----
          const stackPath = join(root, "workspec", "Memoria", "stack", "current.json");
          if (existsSync(stackPath)) {
            try {
              const stack = JSON.parse(readFileSync(stackPath, "utf-8"));
              report.stack = {
                technologies: Object.keys(stack.technologies || {}).slice(0, 10),
                manifests: Object.keys(stack.manifests || {}).length,
              };
            } catch {
              report.stack = { note: "Stack snapshot no disponible. Ejecutá scan-stack." };
            }
          } else {
            report.stack = { note: "Stack snapshot no disponible. Ejecutá scan-stack." };
          }

          // ---- Descubrimientos recientes (últimos 3) ----
          const discDir = join(root, "workspec", "Memoria", "discoveries");
          if (existsSync(discDir)) {
            const files = readdirSync(discDir)
              .filter((f) => f.endsWith(".md"))
              .sort()
              .reverse()
              .slice(0, 3);

            report.discoveries = files.map((f) => {
              const content = readFileSync(join(discDir, f), "utf-8");
              const lines = content.split("\n").slice(0, 3).join(" ").slice(0, 120);
              return { file: f, preview: lines };
            });
          }

          // ---- Resumen ejecutivo ----
          const planInfo = report.plan && "stats" in (report.plan as object)
            ? (report.plan as Record<string, unknown>).stats as Record<string, unknown>
            : null;
          const projectInfo = report.project as Record<string, string>;

          const execSummary = [
            `📊  ${projectInfo.name || "Proyecto"}  |  Estado: ${(report.status as Record<string, string>)?.state || "—"}`,
            planInfo
              ? `📋  ${report.plan && typeof report.plan === "object" ? (report.plan as Record<string, unknown>).intention || "Sin intención" : "—"}  |  ${planInfo.completedTasks}/${planInfo.totalTasks} (${planInfo.progressPercent}%)`
              : "📋  Sin plan activo",
            report.stack && (report.stack as Record<string, unknown>).technologies
              ? `🔧  ${((report.stack as Record<string, unknown>).technologies as string[]).join(", ").slice(0, 60)}`
              : "🔧  Stack no escaneado",
            report.discoveries && (report.discoveries as unknown[]).length > 0
              ? `💡  ${(report.discoveries as unknown[]).length} descubrimientos recientes`
              : "💡  Sin descubrimientos",
          ].join("\n");

          report.executive_summary = execSummary;

          return JSON.stringify(report, null, 2);
        },
      }),
    },
  };
}) satisfies Plugin;
