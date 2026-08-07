import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_domain_reader: tool({
        description:
          "Lee el contenido completo de un dominio de workspec/domains/ por su nombre (filename sin .md).",
        args: {
          domain: tool.schema.string().describe("Nombre del dominio (filename sin .md), ej: metatrader5"),
        },
        async execute(args, context) {
          const domainPath = join(context.directory, "workspec", "domains", `${args.domain}.md`);

          if (!existsSync(domainPath)) {
            return JSON.stringify({
              ok: false,
              error: `Domain '${args.domain}' not found. Use econative_domain_list to list available domains.`,
            });
          }

          return readFileSync(domainPath, "utf-8");
        },
      }),
    },
  };
}) satisfies Plugin;
