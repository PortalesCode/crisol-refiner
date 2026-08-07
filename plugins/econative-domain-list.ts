import { readdirSync, readFileSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_domain_list: tool({
        description:
          "Escanea workspec/domains/ y devuelve la lista de dominios disponibles con su título ($$) y descripción (&&). "
          + "Especialista-Bibliotecario usa esta lista para decidir qué dominio leer completo con econative_domain_reader.",
        args: {},
        async execute(_args, context) {
          const domainsPath = join(context.directory, "workspec", "domains");

          if (!existsSync(domainsPath)) {
            return JSON.stringify({ ok: true, count: 0, domains: [] });
          }

          const files = readdirSync(domainsPath).filter(
            (f) => extname(f).toLowerCase() === ".md"
          );

          const domains = files.map((file) => {
            const content = readFileSync(join(domainsPath, file), "utf-8");
            let title = basename(file, ".md");
            const titleMatch = content.match(/\$\$(.*?)\$\$/);
            if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();
            let description = "";
            const descMatch = content.match(/&&\s*([\s\S]*?)&&/);
            if (descMatch && descMatch[1]) description = descMatch[1].trim().slice(0, 500);
            return { name: basename(file, ".md"), title, description };
          });

          return JSON.stringify({ ok: true, count: domains.length, domains });
        },
      }),
    },
  };
}) satisfies Plugin;
