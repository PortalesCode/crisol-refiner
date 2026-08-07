import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { parsePlan, formatPlanSummary } from "./_plan-utils.js";
import { scanStack, resolvePlatforms } from "./_stack-utils.js";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_start_session: tool({
        description:
          "INICIO OBLIGATORIO DE SESIÓN. North DEBE llamar esta tool al comenzar cada conversación. "
          + "Lee contexto, plan activo, stack, memorias y preferencias del ecosistema. "
          + "Si no hay preferencias de usuario, devuelve onboarding_required: true. "
          + "Crea workspec/plans/active/plan.md si no existe. "
          + "Desembarca contextos y AGENTS.md desde .opencode/desembarco/ si es primera vez.",
        args: {},
        async execute(_args, context) {
          const root = context.directory;
          const eco = join(root, "workspec");
          const ctxDir = join(root, "workspec/context");
          const memDir = join(eco, "Memoria");
          const domainsDir = join(root, "workspec", "domains");
          const protocolsDir = join(root, "workspec", "protocols");

          const prefsFile = join(memDir, "preferences-user", "config.json");
          const discoveriesDir = join(memDir, "discoveries");

          // ═══════════════════════════════════════════════════════
          //  DESEMBARCO — primer inicio en un proyecto
          // ═══════════════════════════════════════════════════════
          const desembarcoDir = join(root, ".opencode", "desembarco");

          // 1. Desembarcar workspec/context/ si no existe
          const ctxTemplateDir = join(desembarcoDir, "context");
          if (!existsSync(ctxDir) && existsSync(ctxTemplateDir)) {
            try {
              mkdirSync(ctxDir, { recursive: true });
              const files = readdirSync(ctxTemplateDir)
                .filter((f) => extname(f).toLowerCase() === ".md");
              for (const file of files) {
                const content = readFileSync(join(ctxTemplateDir, file), "utf-8");
                writeFileSync(join(ctxDir, file), content, "utf-8");
              }
            } catch { /* si falla, se ignora — se usará lo que haya */ }
          }

          // 2. Desembarcar AGENTS.md en raíz si no existe, o mergear si ya existe
          const agentsPath = join(root, "AGENTS.md");
          const agentsTemplate = join(desembarcoDir, "AGENTS.md");
          if (existsSync(agentsTemplate)) {
            if (!existsSync(agentsPath)) {
              // No existe → copiar completo
              try {
                const content = readFileSync(agentsTemplate, "utf-8");
                writeFileSync(agentsPath, content, "utf-8");
              } catch { /* ignore */ }
            } else {
              // Existe → mergear solo si no tiene el marker de Crisol-Refiner
              try {
                const existing = readFileSync(agentsPath, "utf-8");
                if (!existing.includes("CRISOL-REFINER")) {
                  const template = readFileSync(agentsTemplate, "utf-8");
                  const merged = existing.trimEnd()
                    + "\n\n---\n"
                    + "<!-- CRISOL-REFINER — deployed by econative_start_session. Do not edit below this line. -->\n\n"
                    + template;
                  writeFileSync(agentsPath, merged, "utf-8");
                }
              } catch { /* ignore */ }
            }
          }


          // 3. Desembarcar .gitignore si no existe, o mergear si ya existe
          const gitignorePath = join(root, ".gitignore");
          const gitignoreTemplate = join(desembarcoDir, "gitignore");
          if (existsSync(gitignoreTemplate)) {
            if (!existsSync(gitignorePath)) {
              try {
                const content = readFileSync(gitignoreTemplate, "utf-8");
                writeFileSync(gitignorePath, content, "utf-8");
              } catch { /* ignore */ }
            } else {
              try {
                const existing = readFileSync(gitignorePath, "utf-8");
                if (!existing.includes("CRISOL-REFINER")) {
                  const template = readFileSync(gitignoreTemplate, "utf-8");
                  const merged = existing.trimEnd()
                    + "\n\n# --- CRISOL-REFINER — deployed by econative_start_session ---\n"
                    + template;
                  writeFileSync(gitignorePath, merged, "utf-8");
                }
              } catch { /* ignore */ }
            }
          }

          // 4. Desembarcar opencode.json en raíz si no existe, o mergear si ya existe
          function deepMerge(target, source) {
            for (const key of Object.keys(source)) {
              if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
                  target[key] = {};
                }
                deepMerge(target[key], source[key]);
              } else if (!(key in target)) {
                target[key] = source[key];
              }
            }
            return target;
          }
          const opencodePath = join(root, "opencode.json");
          const opencodeTemplate = join(desembarcoDir, "opencode.json");
          if (existsSync(opencodeTemplate)) {
            if (!existsSync(opencodePath)) {
              try {
                const content = readFileSync(opencodeTemplate, "utf-8");
                writeFileSync(opencodePath, content, "utf-8");
              } catch { /* ignore */ }
            } else {
              try {
                const targetJson = JSON.parse(readFileSync(opencodePath, "utf-8"));
                const sourceJson = JSON.parse(readFileSync(opencodeTemplate, "utf-8"));
                const merged = deepMerge(targetJson, sourceJson);
                writeFileSync(opencodePath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
              } catch { /* si falla parseo, no se toca */ }
            }
          }

          // 5. Desembarcar template de dominios si no existe
          const domainTemplateDir = join(desembarcoDir, "domains");
          if (!existsSync(join(domainsDir, "_template.md")) && existsSync(join(domainTemplateDir, "_template.md"))) {
            try {
              mkdirSync(domainsDir, { recursive: true });
              const tmpl = readFileSync(join(domainTemplateDir, "_template.md"), "utf-8");
              writeFileSync(join(domainsDir, "_template.md"), tmpl, "utf-8");
            } catch { /* ignore */ }
          }

          // 6. Desembarcar protocols/ si no existe
          const protocolsDesembarcoDir = join(desembarcoDir, "protocols");
          if (!existsSync(protocolsDir) && existsSync(protocolsDesembarcoDir)) {
            try {
              mkdirSync(protocolsDir, { recursive: true });
              const files = readdirSync(protocolsDesembarcoDir)
                .filter((f) => extname(f).toLowerCase() === ".md");
              for (const file of files) {
                const content = readFileSync(join(protocolsDesembarcoDir, file), "utf-8");
                writeFileSync(join(protocolsDir, file), content, "utf-8");
              }
            } catch { /* si falla, se ignora */ }
          }

          // 7. Desembarcar CONTANTS.md si no existe
          const contantsPath = join(root, "workspec", "CONTANTS.md");
          const contantsDesembarco = join(desembarcoDir, "CONTANTS.md");
          if (!existsSync(contantsPath) && existsSync(contantsDesembarco)) {
            try {
              const content = readFileSync(contantsDesembarco, "utf-8");
              writeFileSync(contantsPath, content, "utf-8");
            } catch { /* si falla, se ignora */ }
          }
          // ═══════════════════════════════════════════════════════

          const result: Record<string, unknown> = {
            session_started: new Date().toISOString(),
            onboarding_required: false,
            preferences: null,
            context: {} as Record<string, string>,
            stack: null,
            domains: [] as { name: string; title: string; description: string }[],
            shared_memories_count: 0,
            recent_discoveries: [] as string[],
            plan_created: false,
            plan: null as Record<string, unknown> | null,
            contants: null as string | null,
          };

          // ---- Check preferences ----
          if (!existsSync(prefsFile)) {
            result.onboarding_required = true;
          } else {
            try {
              result.preferences = JSON.parse(readFileSync(prefsFile, "utf-8"));
            } catch {
              result.onboarding_required = true;
            }
          }

          // ---- Auto-create plan.md if it doesn't exist ----
          const planPath = join(root, "workspec", "plans", "active", "plan.md");
          if (!existsSync(planPath)) {
            const planDir = dirname(planPath);
            if (!existsSync(planDir)) mkdirSync(planDir, { recursive: true });

            const template = [
              "# Plan Activo",
              "",
              "## Intención",
              "_pendiente — definir en la próxima sesión_",
              "",
              "---",
              "",
              "## Fases",
              "",
              "### Fase 1: Por definir",
              "- [ ] _primera tarea_",
              "",
              "---",
              "",
              "## Dependencias",
              "",
              "-",
              "",
              "---",
              "",
              "## Notas",
              "",
              "-",
              "",
            ].join("\n");

            writeFileSync(planPath, template, "utf-8");
            result.plan_created = true;
          }

          // ---- Read plan content if exists ----
          if (existsSync(planPath)) {
            try {
              const planContent = readFileSync(planPath, "utf-8");
              const planData = parsePlan(planContent);
              result.plan = {
                intention: planData.intention,
                phases_count: planData.phases.length,
                total_tasks: planData.stats.totalTasks,
                completed_tasks: planData.stats.completedTasks,
                in_progress_tasks: planData.stats.inProgressTasks,
                progress: `${planData.stats.progressPercent}%`,
                summary: formatPlanSummary(planData),
              };
            } catch { /* si falla parseo, plan queda null */ }
          }

          // ---- Load context/*.md ----
          if (existsSync(ctxDir)) {
            try {
              const ctxFiles: Record<string, string> = {};
              const files = readdirSync(ctxDir).filter((f) => extname(f) === ".md");
              for (const file of files) {
                const content = readFileSync(join(ctxDir, file), "utf-8");
                ctxFiles[basename(file, ".md")] = content.slice(0, 3000);
              }
              result.context = ctxFiles;
            } catch { /* ignore */ }
          }

          // ---- Index domains (titles + descriptions) ----
          if (existsSync(domainsDir)) {
            const files = readdirSync(domainsDir).filter((f) => extname(f).toLowerCase() === ".md");
            result.domains = files.map((file) => {
              const content = readFileSync(join(domainsDir, file), "utf-8");
              let title = basename(file, ".md");
              const titleMatch = content.match(/\$\$(.*?)\$\$/);
              if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();
              let description = "";
              const descMatch = content.match(/&&\s*([\s\S]*?)&&/);
              if (descMatch && descMatch[1]) description = descMatch[1].trim().slice(0, 500);
              return { name: basename(file, ".md"), title, description };
            });
          }

          // ---- Scan stack ----
          try {
            const entries = scanStack(root);
            const snapshot = {
              schema: "econative-stack-v2",
              timestamp: new Date().toISOString(),
              scanned_path: ".",
              file_count: entries.length,
              platforms: resolvePlatforms(entries),
              technologies: entries.map(e => ({
                file: e.file,
                type: e.manifest_type,
                technology: e.technology,
                size_bytes: e.size_bytes,
                ...e.parsed,
              })),
            };
            result.stack = snapshot;

            // Persistir a workspec/Memoria/stack/current.json
            try {
              const stackDir = join(memDir, "stack");
              if (!existsSync(stackDir)) mkdirSync(stackDir, { recursive: true });
              writeFileSync(join(stackDir, "current.json"), JSON.stringify(snapshot, null, 2), "utf-8");
            } catch { /* ignore */ }
          } catch { /* stack queda null si falla */ }

          // ---- Count discoveries ----
          if (existsSync(discoveriesDir)) {
            const files = readdirSync(discoveriesDir).filter((f) => extname(f) === ".md");
            result.shared_memories_count = files.length;
          }

          // ---- Recent discoveries (last 5) ----
          if (existsSync(discoveriesDir)) {
            const files = readdirSync(discoveriesDir)
              .filter((f) => extname(f) === ".md")
              .sort().reverse().slice(0, 5);
            result.recent_discoveries = files.map((f) => {
              const content = readFileSync(join(discoveriesDir, f), "utf-8");
              return `## ${basename(f, ".md")}\n${content.slice(0, 500)}`;
            });
          }

          // ---- CONTANTS.md — contenido completo como texto plano ----
          if (existsSync(contantsPath)) {
            try {
              const raw = readFileSync(contantsPath, "utf-8");
              result.contants = raw; // contenido completo, sin formato
            } catch { /* ignore */ }
          }

          return JSON.stringify(result, null, 2);
        },
      }),
    },
  };
}) satisfies Plugin;
