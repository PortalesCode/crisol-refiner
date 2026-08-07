import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_remember_show: tool({
        description:
          "Lee el contenido COMPLETO de un descubrimiento en Memoria/discoveries/ por nombre de archivo (slug).",
        args: {
          name: tool.schema.string().describe("Nombre del archivo (slug) — obtenelo de remember_list"),
        },
        async execute(args, context) {
          const discoveriesDir = join(context.directory, "workspec", "Memoria", "discoveries");

          if (!existsSync(discoveriesDir)) {
            return JSON.stringify({ ok: false, error: "No hay descubrimientos guardados" });
          }

          const name = args.name.endsWith(".md") ? args.name : `${args.name}.md`;
          const filepath = join(discoveriesDir, name);

          if (!existsSync(filepath)) {
            // Try to find by partial match
            const allFiles = readdirSync(discoveriesDir)
              .filter((f) => extname(f) === ".md");
            const match = allFiles.find((f) => f.toLowerCase().includes(args.name.toLowerCase()));
            if (match) {
              const content = readFileSync(join(discoveriesDir, match), "utf-8");
              return JSON.stringify({ ok: true, file: match, content });
            }
            return JSON.stringify({ ok: false, error: `No se encontró "${args.name}" en discoveries/` });
          }

          const content = readFileSync(filepath, "utf-8");
          return JSON.stringify({ ok: true, file: name, content });
        },
      }),
    },
  };
}) satisfies Plugin;
