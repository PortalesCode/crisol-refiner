import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_remember_list: tool({
        description:
          "Lista descubrimientos guardados en Memoria/discoveries/ — devuelve solo metadata (título, descripción, tags, importancia, fecha, estado). Sin contenido. Filtrable por tag, importancia mínima y estado.",
        args: {
          tag: tool.schema.string().optional().describe("Filtrar por tag"),
          min_importance: tool.schema.number().optional().describe("Importancia mínima (1-5)"),
          state: tool.schema.string().optional().describe("Filtrar por estado: active (default) | deprecated | all"),
          limit: tool.schema.number().optional().describe("Máx resultados (default: 20)"),
        },
        async execute(args, context) {
          const discoveriesDir = join(context.directory, "workspec", "Memoria", "discoveries");

          if (!existsSync(discoveriesDir)) {
            return JSON.stringify({ ok: true, count: 0, discoveries: [] });
          }

          const limit = args.limit ?? 20;
          const filterState = args.state ?? "active";

          let files = readdirSync(discoveriesDir)
            .filter((f) => extname(f) === ".md")
            .sort().reverse()
            .slice(0, limit);

          const discoveries = files.map((f) => {
            const content = readFileSync(join(discoveriesDir, f), "utf-8");
            const lines = content.split("\n");
            const title = lines[0]?.replace(/^#\s*/, "") || f;
            const dateMatch = lines[2]?.match(/Fecha:\s*([\d-]+ [\d:]+)/)?.[1] || "";
            const importance = parseInt(lines[3]?.match(/Importancia:\s*(\d)/)?.[1] ?? "0");
            const state = lines[4]?.match(/Estado:\s*(\w+)/)?.[1] || "active";
            const tags = lines[5]?.match(/Tags:\s*(.+)/)?.[1]?.split(",").map((t) => t.trim()) || [];
            const description = (lines.find((l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith("**")) || "").trim();
            return { file: f, title, description, tags, importance, datetime: dateMatch, state };
          });

          // Filter by state
          let filtered = filterState === "all"
            ? discoveries
            : discoveries.filter((d) => d.state === filterState);

          // Filter by tag if provided
          if (args.tag) {
            filtered = filtered.filter((d) =>
              d.tags.some((t) => t.toLowerCase().includes(args.tag!.toLowerCase()))
            );
          }

          // Filter by min importance if provided
          if (args.min_importance) {
            filtered = filtered.filter((d) => d.importance >= args.min_importance!);
          }

          return JSON.stringify({ ok: true, count: filtered.length, discoveries: filtered });
        },
      }),
    },
  };
}) satisfies Plugin;
