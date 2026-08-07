/**
 * econative-domain-writer.ts
 *
 * Crea o actualiza dominios en workspec/domains/ con el formato simple de Crisol-Eco:
 *
 *   $$Título del Dominio$$
 *   &&Descripción breve&&
 *   [markdown libre]
 *
 * Complementa a econative_domain_list (leer lista) y econative_domain_reader (leer contenido).
 * Sin esta tool, North no podría escribir dominios.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

export default (async () => {
  return {
    tool: {
      econative_domain_write: tool({
        description:
          "Crea o actualiza un dominio en workspec/domains/. Usa el formato simple de Crisol-Eco:\n"
          + "  $$Título$$ (primera línea)\n"
          + "  &&Descripción&& (segunda línea)\n"
          + "  [markdown libre] (resto)\n"
          + "Complementa a domain_list (leer lista) y domain_reader (leer contenido).",
        args: {
          name: tool.schema.string().describe(
            "Nombre del archivo sin .md. Ej: 'api-github-rest' → workspec/domains/api-github-rest.md"
          ),
          title: tool.schema.string().describe("Título del dominio (va en $$ ... $$)"),
          description: tool.schema.string().describe("Descripción de 1 línea (va en && ... &&)"),
          content: tool.schema.string().describe("Contenido markdown libre del dominio"),
        },
        async execute(args, context) {
          const domainsDir = join(context.directory, "workspec", "domains");

          // Asegurar que existe el directorio
          if (!existsSync(domainsDir)) {
            mkdirSync(domainsDir, { recursive: true });
          }

          const filePath = join(domainsDir, `${args.name}.md`);

          // Verificar si ya existe
          const exists = existsSync(filePath);
          const action = exists ? "actualizado" : "creado";

          // Escribir con el formato simple
          const content = `$$${args.title}$$\n&&${args.description}&&\n\n${args.content}`;
          writeFileSync(filePath, content, "utf-8");

          return JSON.stringify({
            ok: true,
            action,
            file: `${args.name}.md`,
            path: `workspec/domains/${args.name}.md`,
            title: args.title,
          });
        },
      }),
    },
  };
}) satisfies Plugin;
