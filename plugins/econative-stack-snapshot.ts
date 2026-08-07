import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { scanStack, resolvePlatforms, type ScanEntry } from "./_stack-utils.js";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

// ═══════════════════════════════════════════════════════════════
//  PLUGIN EXPORT
// ═══════════════════════════════════════════════════════════════
export default (async () => {
  return {
    tool: {
      econative_stack_snapshot: tool({
        description:
          "ESCÁNER universal de stack. Recorre recursivamente el proyecto (ignorando .opencode/, "
          + "node_modules/, .venv/, vendor/, build/, dist/ y más de 50 carpetas no relevantes). "
          + "Detecta 80+ tipos de manifiestos: Python, Node, React, Next, Vue, Angular, Svelte, Astro, "
          + "Rust, Go, Java, Gradle, Kotlin, Scala, PHP, Ruby, Dart/Flutter, Elixir, Haskell, .NET, F#, "
          + "Swift, iOS, C/C++, Zig, Nim, Crystal, Clojure, Julia, R, OCaml, "
          + "Docker, Docker Compose, Terraform, Helm, Kustomize, Ansible, Pulumi, AWS CDK, Serverless, "
          + "GitHub Actions, GitLab CI, Jenkins, CircleCI, "
          + "Vite, Webpack, Rollup, Tailwind, ESLint, Prettier, Babel, "
          + "Nx, Turborepo, Lerna, Prisma, Nix, y más. "
          + "Parsea cada manifiesto para extraer nombre, versión, framework, dependencias y herramientas. "
           + "Guarda snapshot en workspec/Memoria/stack/current.json con formato JSON estándar. "
          + "Acepta 'path' opcional para escanear subdirectorios.",
        args: {
          path: tool.schema.string().optional()
            .describe("Ruta relativa al proyecto. Si se omite, escanea la raíz. Ej: 'md-toc' escanea md-toc/"),
        },
        async execute(args, context) {
          const stackDir = join(context.directory, "workspec", "Memoria", "stack");
          const snapshotsDir = join(stackDir, "snapshots-old");
          if (!existsSync(stackDir)) mkdirSync(stackDir, { recursive: true });
          if (!existsSync(snapshotsDir)) mkdirSync(snapshotsDir, { recursive: true });

          const scanRoot = args.path
            ? join(context.directory, args.path)
            : context.directory;

          const entries = scanStack(scanRoot);
          const platforms = resolvePlatforms(entries);

          const snapshot = {
            schema: "econative-stack-v2",
            timestamp: new Date().toISOString(),
            scanned_path: args.path || ".",
            file_count: entries.length,
            platforms,
            technologies: entries.map(e => ({
              file: e.file,
              type: e.manifest_type,
              technology: e.technology,
              size_bytes: e.size_bytes,
              ...e.parsed,
              raw: e.raw,
            })),
          };

          // Archivar snapshot anterior
          const currentFile = join(stackDir, "current.json");
          if (existsSync(currentFile)) {
            const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            try {
              const oldContent = readFileSync(currentFile, "utf-8");
              writeFileSync(join(snapshotsDir, `stack-${ts}.json`), oldContent, "utf-8");
            } catch { /* ignore */ }
          }

          writeFileSync(currentFile, JSON.stringify(snapshot, null, 2), "utf-8");

          return JSON.stringify({
            ok: true,
            file_count: entries.length,
            platforms,
            technologies: snapshot.technologies.map((t: Record<string, unknown>) => ({
              file: t.file,
              type: t.type,
              technology: t.technology,
              name: t.name || null,
              version: t.version || null,
              framework: (t as Record<string, string>).framework || null,
            })),
          });
        },
      }),
    },
  };
}) satisfies Plugin;
