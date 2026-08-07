import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_remember_it: tool({
        description:
          "Guarda un descubrimiento en Memoria/discoveries/ con título, descripción, contenido, tags, importancia y estado.",
        args: {
          title: tool.schema.string().describe("Título corto del descubrimiento"),
          description: tool.schema.string().describe("Resumen de 1 línea (para listar rápido)"),
          content: tool.schema.string().describe("Contenido completo del descubrimiento"),
          tags: tool.schema.string().optional().describe("Tags separados por coma (opcional)"),
          importance: tool.schema.number().optional().describe("Importancia 1-5 (default: 3)"),
          state: tool.schema.string().optional().describe("Estado: active (default) | deprecated"),
        },
        async execute(args, context) {
          const discoveriesDir = join(context.directory, "workspec", "Memoria", "discoveries");
          if (!existsSync(discoveriesDir)) mkdirSync(discoveriesDir, { recursive: true });

          const now = new Date();
          const date = now.toISOString().slice(0, 10);
          const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
          const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").slice(0, 50);
          const filename = `${date}-${time}-${slug}.md`;
          const importance = args.importance ?? 3;
          const state = args.state ?? "active";

          const md = [
            `# ${args.title}`,
            "",
            `**Fecha:** ${date} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
            `**Importancia:** ${importance}/5`,
            `**Estado:** ${state}`,
            args.tags ? `**Tags:** ${args.tags}` : null,
            "",
            args.description,
            "",
            "---",
            "",
            args.content,
          ].filter(Boolean).join("\n");

          writeFileSync(join(discoveriesDir, filename), md, "utf-8");

          return JSON.stringify({ ok: true, file: filename, importance, state });
        },
      }),
    },
  };
}) satisfies Plugin;
