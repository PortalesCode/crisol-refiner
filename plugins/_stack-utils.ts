/**
 * _stack-utils.ts — Helper centralizado para escaneo de stack del proyecto
 *
 * Todos los plugins que necesiten escanear el stack del proyecto (tecnologías,
 * frameworks, manifiestos) deben usar estas funciones en vez de repetir la lógica.
 *
 * Exporta: IGNORE_DIRS, MANIFESTS, walk, matchPattern, resolvePlatforms,
 * detectJSFramework, scanStack, ScanEntry, ManifestInfo, ManifestDef
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";

// ═══════════════════════════════════════════════════════════════
//  IGNORE DIRS — todo lo que no vale la pena escanear
// ═══════════════════════════════════════════════════════════════
export const IGNORE_DIRS = new Set([
  // OpenCode / dotfiles
  ".opencode", ".git", ".svn", ".hg", ".idea", ".vscode",
  // Node
  "node_modules", ".yarn", ".pnp", ".pnp.js",
  // Python
  "__pycache__", ".venv", "venv", "env", ".env", ".tox",
  ".eggs", "eggs", ".mypy_cache", ".pytest_cache", ".ruff_cache",
  ".cache", ".nox", ".hypothesis",
  // Rust
  "target",
  // Java / JVM
  ".gradle", "gradle", "build", ".mvn", "mvn",
  // Go
  "vendor",
  // Ruby
  ".bundle", "bundle", "vendor/bundle",
  // Elixir
  "_build", "deps",
  // Dart
  ".dart_tool", ".packages", ".pub-cache",
  // Elm
  "elm-stuff",
  // Haskell
  ".stack-work", "dist-newstyle", "dist-*",
  // PHP
  "vendor", ".composer",
  // .NET
  "bin", "obj", "packages",
  // iOS / macOS
  "Pods", ".build",
  // Generic build artifacts
  "dist", ".next", ".nuxt", ".output", ".vercel",
  ".netlify", ".cache", "out", "coverage",
  // Terraform
  ".terraform",
  // Helm
  "charts", ".helm",
  // Ansible
  ".ansible",
  // Nix
  "result",
  // Docker
  ".docker",
  // Generic
  "tmp", "temp", "logs", ".logs",
]);

// ═══════════════════════════════════════════════════════════════
//  MANIFEST REGISTRY
// ═══════════════════════════════════════════════════════════════
export type ManifestInfo = Record<string, string | string[] | undefined>;

export interface ManifestDef {
  patterns: string[];
  technology: string;
  parse: (content: string, filePath: string, raw: string) => ManifestInfo;
}

export const MANIFESTS: ManifestDef[] = [

  // ─────────────────────────────────────────────────────────────
  //  PYTHON
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["pyproject.toml"],
    technology: "Python",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name\s*=\s*["']([^"']+)["']/m);
      if (n) info.name = n[1];
      const v = content.match(/^version\s*=\s*["']([^"']+)["']/m);
      if (v) info.version = v[1];
      const p = content.match(/requires-python\s*=\s*["']([^"']+)["']/);
      if (p) info.python_version = p[1];
      const b = content.match(/build-backend\s*=\s*["']([^"']+)["']/);
      if (b) info.build_tool = b[1];

      const deps: string[] = [];
      const depSec = content.match(/^dependencies\s*=\s*\[([\s\S]*?)^\]/m);
      if (depSec) {
        for (const l of depSec[1].split("\n")) {
          const m = l.match(/["']([^"'=>]+?)["']/);
          if (m) deps.push(m[1].split(/[<>=~!^@]/)[0].trim());
        }
      }
      if (deps.length) info.dependencies = deps;

      const tools: string[] = [];
      if (/\[tool\.mypy\]/i.test(content)) tools.push("mypy");
      if (/\[tool\.pytest/i.test(content)) tools.push("pytest");
      if (/\[tool\.ruff\]/i.test(content)) tools.push("ruff");
      if (/\[tool\.black\]/i.test(content)) tools.push("black");
      if (/\[tool\.isort\]/i.test(content)) tools.push("isort");
      if (/\[tool\.coverage/i.test(content)) tools.push("coverage");
      if (/\[tool\.poetry/i.test(content)) tools.push("poetry");
      if (tools.length) info.tools = tools;

      // Detect frameworks from key deps in the raw content
      const raw = content.toLowerCase();
      if (raw.includes("fastapi")) info.framework = "FastAPI";
      else if (raw.includes("django")) info.framework = "Django";
      else if (raw.includes("flask")) info.framework = "Flask";
      else if (raw.includes("tornado")) info.framework = "Tornado";
      else if (raw.includes("aiohttp")) info.framework = "aiohttp";
      else if (raw.includes("sqlalchemy")) info.orm = "SQLAlchemy";
      else if (raw.includes("django-ninja")) info.framework = "Django Ninja";

      return info;
    },
  },
  {
    patterns: ["setup.py", "setup.cfg"],
    technology: "Python (legacy)",
    parse: (content, fp) => {
      const info: ManifestInfo = {};
      if (extname(fp) === ".cfg") {
        const m = content.match(/^name\s*=\s*(.+)/m);
        if (m) info.name = m[1].trim();
        const v = content.match(/^version\s*=\s*(.+)/m);
        if (v) info.version = v[1].trim();
      } else {
        const m = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (m) info.name = m[1];
        const v = content.match(/version\s*=\s*["']([^"']+)["']/);
        if (v) info.version = v[1];
      }
      return info;
    },
  },
  {
    patterns: ["requirements.txt"],
    technology: "Python",
    parse: (content) => {
      const deps = content.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#") && !l.startsWith("-"))
        .map(l => l.split(/[<>=~!@^]/)[0].trim())
        .filter(l => l);
      return deps.length ? { dependencies: deps } : {};
    },
  },
  {
    patterns: ["Pipfile"],
    technology: "Python (Pipenv)",
    parse: (content) => {
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/^(\w[\w-]*(?:\[\w+\])?)\s*=\s*"/);
        if (m) deps.push(m[1]);
      }
      return deps.length ? { dependencies: deps } : {};
    },
  },
  {
    patterns: ["poetry.lock"],
    technology: "Python (Poetry)",
    parse: () => ({ pm: "poetry" }),
  },
  {
    patterns: ["uv.lock"],
    technology: "Python (uv)",
    parse: () => ({ pm: "uv" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  NODE / JS / TS
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["package.json"],
    technology: "Node.js",
    parse: (_content, _fp, raw) => {
      try {
        const json = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (json.name) info.name = json.name;
        if (json.version) info.version = json.version;
        if (json.private) info.private = "true";
        if (json.type === "module") info.module_type = "esm";

        const deps: string[] = [];
        if (json.dependencies) deps.push(...Object.keys(json.dependencies));
        if (json.devDependencies) deps.push(...Object.keys(json.devDependencies));
        if (json.peerDependencies) deps.push(...Object.keys(json.peerDependencies));
        if (deps.length) info.dependencies = deps;

        const tools: string[] = [];
        if (json.scripts?.test) tools.push("test");
        if (json.scripts?.build) tools.push("build");
        if (json.scripts?.lint) tools.push("lint");
        if (json.scripts?.typecheck) tools.push("typecheck");
        if (json.devDependencies?.typescript) tools.push("typescript");
        if (json.devDependencies?.tsup) tools.push("tsup");
        if (json.workspaces) info.monorepo = "workspaces";

        // Detect frameworks from deps
        const allDeps = Object.keys({ ...json.dependencies, ...json.devDependencies });
        const framework = detectJSFramework(allDeps);
        if (framework) info.framework = framework;

        if (json.packageManager) info.pm = json.packageManager;

        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["pnpm-lock.yaml", "pnpm-workspace.yaml"],
    technology: "Node.js (pnpm)",
    parse: () => ({ pm: "pnpm" }),
  },
  {
    patterns: ["yarn.lock"],
    technology: "Node.js (Yarn)",
    parse: () => ({ pm: "yarn" }),
  },
  {
    patterns: ["package-lock.json"],
    technology: "Node.js (npm)",
    parse: () => ({ pm: "npm" }),
  },
  {
    patterns: ["tsconfig.json"],
    technology: "TypeScript",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.compilerOptions?.target) info.ts_target = j.compilerOptions.target;
        if (j.compilerOptions?.module) info.ts_module = j.compilerOptions.module;
        if (j.compilerOptions?.moduleResolution) info.module_resolution = j.compilerOptions.moduleResolution;
        if (j.compilerOptions?.strict) info.strict = "true";
        if (j.compilerOptions?.jsx) info.jsx = j.compilerOptions.jsx;
        if (j.references?.length) info.project_refs = String(j.references.length);
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["deno.json", "deno.jsonc"],
    technology: "Deno",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.name) info.name = j.name;
        if (j.version) info.version = j.version;
        if (j.tasks) info.tasks = Object.keys(j.tasks).join(", ");
        const deps: string[] = [];
        if (j.imports) deps.push(...Object.keys(j.imports));
        if (deps.length) info.dependencies = deps;
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["bun.lock", "bun.lockb"],
    technology: "Bun",
    parse: () => ({ runtime: "bun" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  FRONTEND FRAMEWORKS (config files + deps in package.json)
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["next.config.js", "next.config.mjs", "next.config.ts"],
    technology: "Next.js",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/experimental/i.test(content)) info.experimental = "true";
      if (/i18n/i.test(content)) info.i18n = "true";
      if (/images/i.test(content)) info.images = "configured";
      if (/middleware/i.test(content)) info.middleware = "true";
      return info;
    },
  },
  {
    patterns: ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"],
    technology: "Nuxt",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/ssr\s*:/i.test(content)) info.ssr = String(/ssr\s*:\s*true/i.test(content));
      if (/modules/i.test(content)) info.modules = "configured";
      if (/tailwindcss/i.test(content)) info.tailwind = "true";
      return info;
    },
  },
  {
    patterns: ["svelte.config.js", "svelte.config.mjs", "svelte.config.ts"],
    technology: "Svelte",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/kit/i.test(content)) info.framework = "SvelteKit";
      if (/adapter/i.test(content)) info.adapter = "configured";
      return info;
    },
  },
  {
    patterns: ["astro.config.mjs", "astro.config.ts", "astro.config.js"],
    technology: "Astro",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/integrations/i.test(content)) info.integrations = "configured";
      if (/react/i.test(content)) info.ui = "React";
      if (/vue/i.test(content)) info.ui = "Vue";
      if (/svelte/i.test(content)) info.ui = "Svelte";
      if (/solid/i.test(content)) info.ui = "Solid";
      return info;
    },
  },
  {
    patterns: ["angular.json"],
    technology: "Angular",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        const p = j.projects && Object.keys(j.projects);
        if (p?.length) info.projects = p.join(", ");
        if (j.defaultProject) info.default_project = j.defaultProject;
        if (j.cli?.analytics !== false) info.analytics = "enabled";
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["vue.config.js", "vue.config.ts"],
    technology: "Vue",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/defineConfig/i.test(content)) info.version = "3+";
      if (/css/i.test(content)) info.css = "configured";
      if (/devServer/i.test(content)) info.dev_server = "configured";
      return info;
    },
  },
  {
    patterns: ["gatsby-config.js", "gatsby-config.ts"],
    technology: "Gatsby",
    parse: () => ({ static: "true" }),
  },
  {
    patterns: ["remix.config.js"],
    technology: "Remix",
    parse: () => ({ version: "v2" }),
  },
  {
    patterns: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
    technology: "Vite",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/react/i.test(content)) info.plugin = "React";
      else if (/vue/i.test(content)) info.plugin = "Vue";
      else if (/svelte/i.test(content)) info.plugin = "Svelte";
      else if (/solid/i.test(content)) info.plugin = "Solid";
      else if (/lit/i.test(content)) info.plugin = "Lit";
      else if (/dioxus/i.test(content)) info.plugin = "Dioxus";
      if (/ssr/i.test(content)) info.ssr = "true";
      if (/dts/i.test(content)) info.dts = "true";
      if (/lib/i.test(content)) info.mode = "library";
      return info;
    },
  },
  {
    patterns: ["webpack.config.js", "webpack.config.ts", "webpack.config.mjs"],
    technology: "Webpack",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/HtmlWebpackPlugin/i.test(content)) info.plugins = "html";
      if (/MiniCssExtract/i.test(content)) info.plugins = "css-extract";
      if (/ModuleFederation/i.test(content)) info.federation = "true";
      if (/swc/i.test(content)) info.loader = "SWC";
      if (/babel/i.test(content)) info.loader = "Babel";
      if (/ts-loader/i.test(content)) info.loader = "ts-loader";
      if (/esbuild/i.test(content)) info.loader = "esbuild";
      return info;
    },
  },
  {
    patterns: ["rollup.config.js", "rollup.config.mjs", "rollup.config.ts"],
    technology: "Rollup",
    parse: () => ({ bundler: "rollup" }),
  },
  {
    patterns: ["parcelrc", ".parcelrc"],
    technology: "Parcel",
    parse: () => ({ bundler: "parcel" }),
  },
  {
    patterns: ["esbuild.config.js", "esbuild.config.mjs", "esbuild.config.ts"],
    technology: "esbuild",
    parse: () => ({ bundler: "esbuild" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  CSS / STYLING
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"],
    technology: "Tailwind CSS",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/content/i.test(content)) info.content = "configured";
      if (/darkMode/i.test(content)) info.dark_mode = String(
        !/darkMode\s*:\s*['"]?false['"]?/.test(content)
      );
      if (/theme\s*:\s*\{/i.test(content)) info.theme = "extended";
      return info;
    },
  },
  {
    patterns: ["postcss.config.js", "postcss.config.mjs"],
    technology: "PostCSS",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/tailwindcss/i.test(content)) info.plugins = "tailwindcss";
      if (/autoprefixer/i.test(content)) info.plugins = "autoprefixer";
      if (/postcss-preset-env/i.test(content)) info.plugins = "postcss-preset-env";
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  LINTING / FORMATTING
  // ─────────────────────────────────────────────────────────────
  {
    patterns: [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml",
               ".eslintrc.yml", ".eslintrc.json", "eslint.config.js", "eslint.config.mjs"],
    technology: "ESLint",
    parse: (_c, _f, raw) => {
      const info: ManifestInfo = {};
      if (/@[a-z]/.test(raw)) info.config = "extends";
      if (/react/i.test(raw)) info.react = "true";
      if (/typescript|@typescript-eslint/i.test(raw)) info.typescript = "true";
      if (/prettier/i.test(raw)) info.integration = "prettier";
      return info;
    },
  },
  {
    patterns: [".prettierrc", ".prettierrc.js", ".prettierrc.json",
               ".prettierrc.yaml", "prettier.config.js", ".prettierrc.toml"],
    technology: "Prettier",
    parse: (_c, _f, raw) => {
      try {
        // .prettierrc JSON
        const j = JSON.parse(raw);
        if (j.semi !== undefined) return { semi: String(j.semi), tab_width: String(j.tabWidth ?? j.tab_width ?? "?") };
      } catch { /* not JSON */ }
      try {
        if (raw.includes("module.exports")) {
          const tabs = raw.match(/tabWidth\s*:\s*(\d+)/);
          const semi = raw.match(/semi\s*:\s*(true|false)/);
          return { ...(tabs ? { tab_width: tabs[1] } : {}), ...(semi ? { semi: semi[1] } : {}) };
        }
      } catch { /* ignore */ }
      return {};
    },
  },
  {
    patterns: [".babelrc", ".babelrc.js", "babel.config.js", "babel.config.mjs"],
    technology: "Babel",
    parse: (_c, _f, raw) => {
      const info: ManifestInfo = {};
      if (/preset-env/i.test(raw)) info.presets = "env";
      if (/preset-react/i.test(raw)) info.presets = "react";
      if (/preset-typescript/i.test(raw)) info.presets = "typescript";
      if (/@emotion/i.test(raw)) info.plugins = "emotion";
      if (/styled-components/i.test(raw)) info.plugins = "styled-components";
      return info;
    },
  },
  {
    patterns: [".stylelintrc", ".stylelintrc.json", "stylelint.config.js"],
    technology: "Stylelint",
    parse: () => ({ linter: "stylelint" }),
  },
  {
    patterns: [".commitlintrc", ".commitlintrc.json", "commitlint.config.js"],
    technology: "Commitlint",
    parse: () => ({ conventional_commits: "enforced" }),
  },
  {
    patterns: [".huskyrc", ".huskyrc.json"],
    technology: "Husky",
    parse: () => ({ git_hooks: "managed" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  MONOREPO
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["nx.json"],
    technology: "Nx",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.plugins?.length) info.plugins = j.plugins.join(", ");
        if (j.targetDefaults) info.targets = Object.keys(j.targetDefaults).join(", ");
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["lerna.json"],
    technology: "Lerna",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        return { version: j.version || "independent" };
      } catch { return {}; }
    },
  },
  {
    patterns: ["rush.json"],
    technology: "Rush (Monorepo)",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.projects?.length) info.project_count = String(j.projects.length);
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["turbo.json"],
    technology: "Turborepo",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.pipeline) info.pipelines = Object.keys(j.pipeline).join(", ");
        if (j.tasks) info.tasks = Object.keys(j.tasks).join(", ");
        return info;
      } catch { return {}; }
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  RUST
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["Cargo.toml"],
    technology: "Rust",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name\s*=\s*["']([^"']+)["']/m);
      if (n) info.name = n[1];
      const v = content.match(/^version\s*=\s*["']([^"']+)["']/m);
      if (v) info.version = v[1];
      const e = content.match(/edition\s*=\s*["']([^"']+)["']/);
      if (e) info.edition = e[1];
      const deps: string[] = [];
      const depSec = content.match(/\[dependencies\]([\s\S]*?)(?:^\[|\Z)/m);
      if (depSec) {
        for (const l of depSec[1].split("\n")) {
          const m = l.match(/^(\w[\w-]*)\s*=/);
          if (m) deps.push(m[1]);
        }
      }
      if (deps.length) info.dependencies = deps;
      const features: string[] = [];
      const featSec = content.match(/\[features\]([\s\S]*?)(?:^\[|\Z)/m);
      if (featSec) {
        for (const l of featSec[1].split("\n")) {
          const m = l.match(/^(\w[\w-]*)\s*=/);
          if (m) features.push(m[1]);
        }
      }
      if (features.length) info.features = features;
      return info;
    },
  },
  {
    patterns: ["Cargo.lock"],
    technology: "Rust",
    parse: () => ({ locked: "true" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  GO
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["go.mod"],
    technology: "Go",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/^module\s+(\S+)/m);
      if (m) info.name = m[1];
      const g = content.match(/^go\s+([\d.]+)/m);
      if (g) info.go_version = g[1];
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const d = l.match(/^\s+(\S+)\s+v/);
        if (d) deps.push(d[1]);
      }
      if (deps.length) info.dependencies = deps;
      return info;
    },
  },
  {
    patterns: ["go.sum"],
    technology: "Go",
    parse: () => ({ locked: "true" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  JAVA / JVM
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["pom.xml"],
    technology: "Java (Maven)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const g = content.match(/<groupId>([^<]+)<\/groupId>/);
      const a = content.match(/<artifactId>([^<]+)<\/artifactId>/);
      if (g && a) info.name = `${g[1]}:${a[1]}`;
      else if (a) info.name = a[1];
      const v = content.match(/<version>([^<]+)<\/version>/);
      if (v) info.version = v[1];
      const j = content.match(/<java.version>([^<]+)<\/java.version>/);
      if (j) info.java_version = j[1];
      const deps: string[] = [];
      const depMatches = content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g);
      let first = true;
      for (const dm of depMatches) {
        if (first) { first = false; continue; } // skip project's own
        if (deps.length < 20) deps.push(dm[1]);
      }
      if (deps.length) info.dependencies = deps;
      if (/spring/i.test(content)) info.framework = "Spring";
      if (/quarkus/i.test(content)) info.framework = "Quarkus";
      if (/micronaut/i.test(content)) info.framework = "Micronaut";
      if (/kotlin/i.test(content)) info.language = "Kotlin";
      if (/scala/i.test(content)) info.language = "Scala";
      return info;
    },
  },
  {
    patterns: ["build.gradle", "build.gradle.kts"],
    technology: "Gradle",
    parse: (content) => {
      const info: ManifestInfo = {};
      const p = content.match(/(?:id\s*\(?["'])([^"']+)/);
      if (p) info.plugins = p[1];
      const j = content.match(/sourceCompatibility\s*=\s*["']?([^"'\n]+)/);
      if (j) info.java_version = j[1];
      if (/kotlin/i.test(content)) info.language = "Kotlin";
      if (/spring/i.test(content)) info.framework = "Spring";
      if (/quarkus/i.test(content)) info.framework = "Quarkus";
      if (/android/i.test(content)) info.platform = "Android";
      return info;
    },
  },
  {
    patterns: ["settings.gradle", "settings.gradle.kts"],
    technology: "Gradle",
    parse: (content) => {
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/['"]:?([\w-]+)['"]/);
        if (m && l.includes("include") || l.includes("project")) {
          deps.push(m[1]);
        }
      }
      return deps.length ? { subprojects: deps } : {};
    },
  },
  {
    patterns: ["gradlew"],
    technology: "Gradle Wrapper",
    parse: () => ({ wrapper: "true" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  SCALA / KOTLIN
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["build.sbt"],
    technology: "Scala (SBT)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/name\s*:=\s*"([^"]+)"/);
      if (n) info.name = n[1];
      const v = content.match(/version\s*:=\s*"([^"]+)"/);
      if (v) info.version = v[1];
      const s = content.match(/scalaVersion\s*:=\s*"([^"]+)"/);
      if (s) info.scala_version = s[1];
      return info;
    },
  },
  {
    patterns: ["*.gradle.kts"],
    technology: "Kotlin",
    parse: () => ({ language: "Kotlin" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  PHP
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["composer.json"],
    technology: "PHP",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.name) info.name = j.name;
        if (j.require) info.dependencies = Object.keys(j.require);
        if (j.require?.php) info.php_version = j.require.php;
        if (j.require?.laravel || j.require?.["laravel/framework"]) info.framework = "Laravel";
        if (j.require?.["symfony"]) info.framework = "Symfony";
        if (j.require?.wordpress) info.cms = "WordPress";
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["composer.lock"],
    technology: "PHP",
    parse: () => ({ locked: "true" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  RUBY
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["Gemfile"],
    technology: "Ruby",
    parse: (content) => {
      const info: ManifestInfo = {};
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/^\s*gem\s+["']([^"']+)["']/);
        if (m) deps.push(m[1]);
      }
      if (deps.length) info.dependencies = deps;
      if (/rails/i.test(content)) info.framework = "Rails";
      if (/sinatra/i.test(content)) info.framework = "Sinatra";
      if (/jekyll/i.test(content)) info.framework = "Jekyll";
      return info;
    },
  },
  {
    patterns: ["Gemfile.lock"],
    technology: "Ruby",
    parse: () => ({ locked: "true" }),
  },
  {
    patterns: ["Rakefile"],
    technology: "Ruby (Rake)",
    parse: () => ({ automation: "rake" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  DART / FLUTTER
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["pubspec.yaml"],
    technology: "Dart/Flutter",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/^name:\s*(.+)/m);
      if (m) info.name = m[1].trim();
      const v = content.match(/^version:\s*(.+)/m);
      if (v) info.version = v[1].trim();
      if (/flutter/i.test(content)) info.framework = "Flutter";
      if (/sdk:\s*(.+)/i.test(content)) {
        const s = content.match(/sdk:\s*(.+)/i)?.[1]?.trim();
        if (s) info.sdk = s;
      }
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const d = l.match(/^\s{2}(\w[\w-]*):/);
        if (d && !["name","version","description","environment","dev_dependencies","flutter"].includes(d[1])) {
          deps.push(d[1]);
        }
      }
      if (deps.length) info.dependencies = deps;
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  ELIXIR / ERLANG
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["mix.exs"],
    technology: "Elixir",
    parse: (content) => {
      const info: ManifestInfo = {};
      const a = content.match(/app\s*:\s*:(\w+)/);
      if (a) info.name = a[1];
      const v = content.match(/@version\s+"([^"]+)"/);
      if (v) info.version = v[1];
      const deps: string[] = [];
      // find deps inside defp deps do ... end
      const depBlock = content.match(/defp?\s+deps\s+do\s+([\s\S]*?)\s+end/);
      if (depBlock) {
        for (const l of depBlock[1].split("\n")) {
          const d = l.match(/\{:(\w+)/);
          if (d) deps.push(d[1]);
        }
      }
      if (deps.length) info.dependencies = deps;
      if (/phoenix/i.test(content)) info.framework = "Phoenix";
      if (/ecto/i.test(content)) info.orm = "Ecto";
      if (/nerves/i.test(content)) info.framework = "Nerves";
      return info;
    },
  },
  {
    patterns: ["rebar.config", "rebar.lock"],
    technology: "Erlang (Rebar)",
    parse: (content) => {
      const deps: string[] = [];
      const depBlock = content.match(/{deps,\s*\[([\s\S]*?)\]}/);
      if (depBlock) {
        for (const l of depBlock[1].split(",")) {
          const d = l.match(/\{(\w+)/);
          if (d) deps.push(d[1]);
        }
      }
      return deps.length ? { dependencies: deps } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  HASKELL
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["stack.yaml"],
    technology: "Haskell (Stack)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/resolver:\s*(.+)/);
      if (m) info.resolver = m[1].trim();
      const pkgs: string[] = [];
      const pkgBlock = content.match(/packages:\s*([\s\S]*?)(?:^[a-z]|\Z)/m);
      if (pkgBlock) {
        for (const l of pkgBlock[1].split("\n")) {
          const p = l.match(/^\s*-\s*(.+)/);
          if (p) pkgs.push(p[1].trim());
        }
      }
      if (pkgs.length) info.packages = pkgs;
      return info;
    },
  },
  {
    patterns: ["*.cabal"],
    technology: "Haskell (Cabal)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name:\s*(.+)/im);
      if (n) info.name = n[1].trim();
      const v = content.match(/^version:\s*(.+)/im);
      if (v) info.version = v[1].trim();
      return info;
    },
  },
  {
    patterns: ["cabal.project", "cabal.project.local"],
    technology: "Haskell (Cabal)",
    parse: () => ({ project: "cabal" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  .NET
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["*.csproj"],
    technology: ".NET",
    parse: (content) => {
      const info: ManifestInfo = {};
      const t = content.match(/<TargetFramework[^>]*>([^<]+)<\/TargetFramework>/);
      if (t) info.framework = t[1];
      const deps: string[] = [];
      for (const m of content.matchAll(/<PackageReference\s+Include="([^"]+)"/g)) {
        if (deps.length < 20) deps.push(m[1]);
      }
      if (deps.length) info.dependencies = deps;
      if (/blazor/i.test(content)) info.ui = "Blazor";
      if (/maui/i.test(content)) info.ui = "MAUI";
      return info;
    },
  },
  {
    patterns: ["*.fsproj"],
    technology: "F#",
    parse: () => ({ language: "F#" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  SWIFT / iOS / macOS
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["Package.swift"],
    technology: "Swift (SPM)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/name\s*:\s*"([^"]+)"/);
      if (n) info.name = n[1];
      const s = content.match(/swift-tools-version:\s*([\d.]+)/i);
      if (s) info.swift_version = s[1];
      if (/ios/i.test(content)) info.platform = "iOS";
      if (/macos/i.test(content)) info.platform = "macOS";
      return info;
    },
  },
  {
    patterns: ["Podfile", "Podfile.lock"],
    technology: "iOS (CocoaPods)",
    parse: (content) => {
      const deps: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/pod\s+['"]([^'"]+)['"]/);
        if (m) deps.push(m[1]);
      }
      return deps.length ? { dependencies: deps } : {};
    },
  },
  {
    patterns: ["Cartfile", "Cartfile.resolved"],
    technology: "iOS (Carthage)",
    parse: () => ({ pm: "carthage" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  C / C++
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["CMakeLists.txt"],
    technology: "CMake",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/project\s*\(\s*([^\s)]+)/i);
      if (m) info.name = m[1];
      const c = content.match(/cmake_minimum_required\s*\(?\s*VERSION\s+([^)\s]+)/i);
      if (c) info.cmake_version = c[1];
      const langs = content.match(/project\s*\([^)]*?(C|CXX|CSharp|Fortran|ASM)/i);
      if (langs) info.language = langs[1];
      return info;
    },
  },
  {
    patterns: ["Makefile", "makefile", "GNUmakefile", "Makefile.*"],
    technology: "Make",
    parse: (content) => {
      const targets: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/^([\w\-.]+):/);
        if (m && !m[1].startsWith(".") && !m[1].startsWith("$")) {
          targets.push(m[1]);
          if (targets.length >= 15) break;
        }
      }
      return targets.length ? { targets } : {};
    },
  },
  {
    patterns: ["meson.build"],
    technology: "Meson",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/project\s*\(\s*['"]([^'"]+)['"]/);
      if (m) info.name = m[1];
      return info;
    },
  },
  {
    patterns: ["SConstruct", "SConscript"],
    technology: "SCons",
    parse: () => ({ build: "scons" }),
  },
  {
    patterns: ["BUILD", "BUILD.bazel"],
    technology: "Bazel",
    parse: (content) => {
      const rules: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/^\s*(\w+)\s*\(/);
        if (m) rules.push(m[1]);
      }
      return rules.length ? { rules: [...new Set(rules)].slice(0, 10) } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  ZIG
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["build.zig", "build.zig.zon"],
    technology: "Zig",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/\.name\s*=\s*"([^"]+)"/);
      if (m) info.name = m[1];
      const v = content.match(/\.version\s*=\s*"([^"]+)"/);
      if (v) info.version = v[1];
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  NIM
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["*.nimble"],
    technology: "Nim",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/^name\s*=\s*"([^"]+)"/m);
      if (m) info.name = m[1];
      const v = content.match(/^version\s*=\s*"([^"]+)"/m);
      if (v) info.version = v[1];
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  CRYSTAL
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["shard.yml"],
    technology: "Crystal",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/^name:\s*(.+)/m);
      if (m) info.name = m[1].trim();
      const v = content.match(/^version:\s*(.+)/m);
      if (v) info.version = v[1].trim();
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  CLOJURE
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["project.clj"],
    technology: "Clojure (Lein)",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/defproject\s+([^\s]+)/);
      if (m) info.name = m[1];
      const v = content.match(/defproject\s+[^\s]+\s+"([^"]+)"/);
      if (v) info.version = v[1];
      const deps: string[] = [];
      const depBlock = content.match(/\[\[([\s\S]*?)\]\]/);
      if (depBlock) {
        for (const l of depBlock[1].split("\n")) {
          const d = l.match(/\[([^\s/]+\/[^\s\]]+)/);
          if (d) deps.push(d[1]);
        }
      }
      if (deps.length) info.dependencies = deps;
      return info;
    },
  },
  {
    patterns: ["deps.edn"],
    technology: "Clojure (deps)",
    parse: (content) => {
      const deps: string[] = [];
      const depBlock = content.match(/\{:deps\s+\{([\s\S]*?)\}\}/);
      if (depBlock) {
        for (const l of depBlock[1].split("\n")) {
          const d = l.match(/\{:\deps\s+\{([\s\S]*?)\}\}/)?.[1];
          const m = l.match(/^\s{4}([\w.-]+\/[\w.-]+)/);
          if (m) deps.push(m[1]);
        }
      }
      return deps.length ? { dependencies: deps } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  JULIA
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["Project.toml"],
    technology: "Julia",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name\s*=\s*"([^"]+)"/m);
      if (n) info.name = n[1];
      const v = content.match(/^version\s*=\s*"([^"]+)"/m);
      if (v) info.version = v[1];
      const j = content.match(/^julia\s*=\s*"([^"]+)"/m);
      if (j) info.julia_version = j[1];
      const deps: string[] = [];
      const depSec = content.match(/\[deps\]([\s\S]*?)(?:^\[|\Z)/m);
      if (depSec) {
        for (const l of depSec[1].split("\n")) {
          const m = l.match(/^(\w[\w-]*)\s*=/);
          if (m) deps.push(m[1]);
        }
      }
      if (deps.length) info.dependencies = deps;
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  R
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["DESCRIPTION"],
    technology: "R",
    parse: (content) => {
      const info: ManifestInfo = {};
      const m = content.match(/^Package:\s*(.+)/m);
      if (m) info.name = m[1].trim();
      const v = content.match(/^Version:\s*(.+)/m);
      if (v) info.version = v[1].trim();
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  OCAML / DUNE
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["dune-project"],
    technology: "OCaml (Dune)",
    parse: (content) => {
      const m = content.match(/\(name\s+(\w+)\)/);
      return m ? { name: m[1] } : {};
    },
  },
  {
    patterns: ["*.opam"],
    technology: "OCaml (OPAM)",
    parse: (content) => {
      const n = content.match(/^name:\s*"([^"]+)"/m);
      return n ? { name: n[1] } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  DOCKER
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["Dockerfile", "Dockerfile.*", "*.Dockerfile"],
    technology: "Docker",
    parse: (content) => {
      const m = content.match(/^FROM\s+(\S+)/m);
      const info: ManifestInfo = {};
      if (m) info.base_image = m[1];
      if (/as\s+\w+/i.test(content)) {
        const stages = content.match(/AS\s+(\w+)/gi);
        if (stages) info.stages = String(stages.length + 1);
      }
      if (/multi-stage/i.test(content) || content.match(/FROM\s+\S+\s+AS\s+\w+/i)) {
        info.multi_stage = "true";
      }
      if (/expose\s+\d+/i.test(content)) info.ports = "exposed";
      return info;
    },
  },
  {
    patterns: ["docker-compose.yml", "docker-compose.yaml"],
    technology: "Docker Compose",
    parse: (content) => {
      const info: ManifestInfo = {};
      const services: string[] = [];
      let inServices = false;
      for (const l of content.split("\n")) {
        if (/^services:\s*$/i.test(l)) { inServices = true; continue; }
        if (inServices) {
          const m = l.match(/^\s{2}(\w[\w-]*):\s*$/);
          if (m) services.push(m[1]);
          else if (/^\w/.test(l)) inServices = false;
        }
      }
      if (services.length) info.services = services;
      return info;
    },
  },
  // ─────────────────────────────────────────────────────────────
  //  CI / CD
  // ─────────────────────────────────────────────────────────────
  {
    patterns: [".github/workflows/*.yml", ".github/workflows/*.yaml"],
    technology: "GitHub Actions",
    parse: (content) => {
      const info: ManifestInfo = {};
      const jobs: string[] = [];
      let inJobs = false;
      for (const l of content.split("\n")) {
        if (/^jobs:/i.test(l)) { inJobs = true; continue; }
        if (inJobs) {
          const m = l.match(/^\s{2}(\w[\w-]*):/);
          if (m) jobs.push(m[1]);
          else if (l.trim() && !l.startsWith(" ")) inJobs = false;
        }
      }
      if (jobs.length) info.jobs = jobs;
      if (/on:\s*workflow_dispatch/i.test(content)) info.manual_trigger = "true";
      return info;
    },
  },
  {
    patterns: [".gitlab-ci.yml"],
    technology: "GitLab CI",
    parse: (content) => {
      const stages: string[] = [];
      const jobs: string[] = [];
      for (const l of content.split("\n")) {
        const s = l.match(/^\s*-\s*(\w+)/);
        if (s) stages.push(s[1]);
        const j = l.match(/^(\w[\w-]*):/);
        if (j && !/^(stages|variables|cache|default|before_script|after_script|include)$/i.test(j[1])) {
          jobs.push(j[1]);
        }
      }
      const info: ManifestInfo = {};
      if (stages.length) info.stages = stages;
      if (jobs.length) info.jobs = jobs;
      return info;
    },
  },
  {
    patterns: ["Jenkinsfile"],
    technology: "Jenkins",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/pipeline/i.test(content)) info.type = "pipeline";
      if (/stages/i.test(content)) info.stages = "configured";
      if (/docker/i.test(content)) info.docker = "true";
      return info;
    },
  },
  {
    patterns: [".circleci/config.yml"],
    technology: "CircleCI",
    parse: (content) => {
      const jobs: string[] = [];
      let inJobs = false;
      for (const l of content.split("\n")) {
        if (/^jobs:/i.test(l)) { inJobs = true; continue; }
        if (inJobs) {
          const m = l.match(/^\s{2}(\w[\w-]*):/);
          if (m) jobs.push(m[1]);
          else if (l.trim() && !l.startsWith(" ")) inJobs = false;
        }
      }
      return jobs.length ? { jobs } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  INFRASTRUCTURE / IaC
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["*.tf"],
    technology: "Terraform",
    parse: (content) => {
      const info: ManifestInfo = {};
      const providers: string[] = [];
      for (const l of content.split("\n")) {
        const m = l.match(/provider\s+"([^"]+)"/);
        if (m) providers.push(m[1]);
        const r = l.match(/resource\s+"([^"]+)"/);
        if (r) providers.push(r[1].split("_")[0]);
      }
      if (providers.length) info.providers = [...new Set(providers)];
      const ver = content.match(/required_version\s*=\s*"([^"]+)"/);
      if (ver) info.terraform_version = ver[1];
      return info;
    },
  },
  {
    patterns: ["*.tfvars"],
    technology: "Terraform",
    parse: () => ({ type: "variables" }),
  },
  {
    patterns: ["Chart.yaml"],
    technology: "Helm",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name:\s*(.+)/m);
      if (n) info.name = n[1].trim();
      const v = content.match(/^version:\s*(.+)/m);
      if (v) info.chart_version = v[1].trim();
      const a = content.match(/^apiVersion:\s*(.+)/m);
      if (a) info.api_version = a[1].trim();
      return info;
    },
  },
  {
    patterns: ["kustomization.yaml", "kustomization.yml"],
    technology: "Kustomize",
    parse: (_c, _f, raw) => {
      const info: ManifestInfo = {};
      if (/resources/i.test(raw)) info.resources = "configured";
      if (/patches/i.test(raw) || /patchesStrategicMerge/i.test(raw)) info.patches = "configured";
      if (/images/i.test(raw)) info.images = "configured";
      return info;
    },
  },
  {
    patterns: ["ansible.cfg", "ansible.yml", "ansible.yaml", "playbook.yml"],
    technology: "Ansible",
    parse: (_c, _f, raw) => {
      const info: ManifestInfo = {};
      if (/hosts:/i.test(raw)) info.playbook = "true";
      if (/tasks:/i.test(raw)) info.tasks = "configured";
      if (/roles:/i.test(raw)) info.roles = "configured";
      return info;
    },
  },
  {
    patterns: ["Pulumi.yaml", "Pulumi.yml"],
    technology: "Pulumi",
    parse: (content) => {
      const info: ManifestInfo = {};
      const n = content.match(/^name:\s*(.+)/m);
      if (n) info.name = n[1].trim();
      const r = content.match(/^runtime:\s*(.+)/m);
      if (r) info.runtime = r[1].trim();
      return info;
    },
  },
  {
    patterns: ["cdk.json"],
    technology: "AWS CDK",
    parse: (_c, _f, raw) => {
      try {
        const j = JSON.parse(raw);
        const info: ManifestInfo = {};
        if (j.app) info.app = j.app;
        if (j.language) info.language = j.language;
        if (j.context) info.context = Object.keys(j.context).join(", ");
        return info;
      } catch { return {}; }
    },
  },
  {
    patterns: ["serverless.yml", "serverless.yaml", "serverless.json"],
    technology: "Serverless",
    parse: (_c, _f, raw) => {
      const info: ManifestInfo = {};
      if (/service:/i.test(raw)) {
        const m = raw.match(/^service:\s*(.+)/m);
        if (m) info.name = m[1].trim();
      }
      if (/provider:/i.test(raw)) info.cloud = "configured";
      if (/functions:/i.test(raw)) info.functions = "configured";
      return info;
    },
  },
  {
    patterns: ["sst.config.ts", "sst.config.js"],
    technology: "SST",
    parse: () => ({ framework: "SST" }),
  },

  // ─────────────────────────────────────────────────────────────
  //  DATABASE
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["prisma/schema.prisma"],
    technology: "Prisma",
    parse: (content) => {
      const info: ManifestInfo = {};
      const p = content.match(/provider\s*=\s*"(\w+)"/);
      if (p) info.provider = p[1];
      if (/@@unique/i.test(content)) info.unique_constraints = "configured";
      if (/@relation/i.test(content)) info.relations = "configured";
      return info;
    },
  },
  {
    patterns: ["schema.prisma"],
    technology: "Prisma",
    parse: (content) => {
      const p = content.match(/provider\s*=\s*"(\w+)"/);
      return p ? { provider: p[1] } : {};
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  MONOREPO / WORKSPACE
  // ─────────────────────────────────────────────────────────────
  {
    patterns: [".yarnrc.yml"],
    technology: "Yarn Berry",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/yarnPath/i.test(content)) info.version = "berry";
      if (/nodeLinker/i.test(content)) info.node_linker = content.match(/nodeLinker:\s*"([^"]+)"/)?.[1] || "configured";
      return info;
    },
  },
  {
    patterns: [".npmrc"],
    technology: "npm",
    parse: (content) => {
      const info: ManifestInfo = {};
      if (/registry/i.test(content)) info.registry = "custom";
      if (/_auth/i.test(content)) info.auth = "configured";
      return info;
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  NIX / FLAKES
  // ─────────────────────────────────────────────────────────────
  {
    patterns: ["flake.nix", "flake.lock"],
    technology: "Nix",
    parse: (content) => {
      const info: ManifestInfo = {};
      const d = content.match(/description\s*=\s*"([^"]+)"/);
      if (d) info.description = d[1];
      if (/nixpkgs/i.test(content)) info.inputs = "nixpkgs";
      if (/devShell/i.test(content)) info.dev_shell = "true";
      if (/packages/i.test(content)) info.packages = "defined";
      return info;
    },
  },
  {
    patterns: ["default.nix", "shell.nix", "release.nix"],
    technology: "Nix",
    parse: () => ({ nix: "true" }),
  },

];

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

export function detectJSFramework(deps: string[]): string | undefined {
  const depMap: [RegExp, string][] = [
    [/^next\b/, "Next.js"],
    [/^react$/, "React"],
    [/^@remix/, "Remix"],
    [/^gatsby/, "Gatsby"],
    [/^vue$|^vue-router/, "Vue"],
    [/^nuxt/, "Nuxt"],
    [/^svelte$/, "Svelte"],
    [/^@sveltejs/, "SvelteKit"],
    [/^astro$/, "Astro"],
    [/^solid-js/, "Solid"],
    [/^@angular/, "Angular"],
    [/^@qwik/, "Qwik"],
    [/^express/, "Express"],
    [/^fastify/, "Fastify"],
    [/^nestjs/, "NestJS"],
    [/^@nestjs/, "NestJS"],
    [/^strapi/, "Strapi"],
    [/^keystone/, "Keystone"],
    [/^@11ty/, "Eleventy"],
    [/^hono$/, "Hono"],
    [/^elysia$/, "Elysia"],
    [/^@redwoodjs/, "Redwood"],
  ];
  for (const [re, name] of depMap) {
    if (deps.some(d => re.test(d))) return name;
  }
  return undefined;
}

export interface ScanEntry {
  file: string;
  basename: string;
  ext: string;
  size_bytes: number;
  manifest_type: string;
  technology: string;
  parsed: ManifestInfo;
  raw: string;
}

function walk(dir: string, baseDir: string, depth: number): ScanEntry[] {
  if (depth > 4) return [];
  const results: ScanEntry[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try { stat = statSync(fullPath); } catch { continue; }

    if (stat.isDirectory()) {
      // Ignorar paths que contengan IGNORE_DIRS en cualquier nivel
      const rel = relative(baseDir, fullPath);
      const parts = rel.split(/[/\\]/);
      if (parts.some(p => IGNORE_DIRS.has(p))) continue;
      results.push(...walk(fullPath, baseDir, depth + 1));
    } else if (stat.isFile() && stat.size > 0 && stat.size < 2_000_000) {
      const rel = relative(baseDir, fullPath);
      const ext = extname(entry);
      const base = basename(entry);

      for (const def of MANIFESTS) {
        if (matchPattern(def.patterns, base, rel)) {
          let content = "";
          try { content = readFileSync(fullPath, "utf-8"); } catch { continue; }
          const parsed = def.parse(content, rel, content);
          results.push({
            file: rel,
            basename: base,
            ext,
            size_bytes: stat.size,
            manifest_type: base,
            technology: (parsed.technology as string) || def.technology,
            parsed,
            raw: content.slice(0, 600),
          });
          break;
        }
      }
    }
  }
  return results;
}

function matchPattern(patterns: string[], basename: string, relPath: string): boolean {
  for (const p of patterns) {
    if (p.includes("*")) {
      const escaped = p.replace(/\./g, "\\.").replace(/\*/g, ".*");
      // `Makefile.*` → debe matchear Makefile.something
      // `.github/workflows/*.yml` → debe matchear la ruta completa
      const re = new RegExp("^" + escaped + "$", "i");
      if (re.test(basename) || re.test(relPath)) return true;
    } else if (basename.toLowerCase() === p.toLowerCase()) {
      return true;
    } else if (relPath.toLowerCase() === p.toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function resolvePlatforms(entries: ScanEntry[]): string[] {
  const langMap: Record<string, string> = {
    "Python": "python", "Python (legacy)": "python", "Python (Pipenv)": "python",
    "Python (Poetry)": "python", "Python (uv)": "python",
    "Node.js": "node", "Node.js (pnpm)": "node", "Node.js (Yarn)": "node",
    "Node.js (npm)": "node",
    "TypeScript": "typescript", "Deno": "deno", "Bun": "bun",
    "Next.js": "nextjs", "Nuxt": "nuxt", "Svelte": "svelte",
    "SvelteKit": "svelte", "Astro": "astro", "Angular": "angular",
    "Vue": "vue", "Gatsby": "gatsby", "Remix": "remix",
    "Vite": "vite", "Webpack": "webpack", "Rollup": "rollup",
    "Tailwind CSS": "tailwindcss", "PostCSS": "postcss",
    "ESLint": "eslint", "Prettier": "prettier", "Babel": "babel",
    "Rust": "rust", "Go": "go",
    "Java (Maven)": "java", "Gradle": "java", "Gradle Wrapper": "java",
    "Scala (SBT)": "scala", "Kotlin": "kotlin",
    "PHP": "php", "Ruby": "ruby", "Ruby (Rake)": "ruby",
    "Dart/Flutter": "dart", "Elixir": "elixir", "Erlang (Rebar)": "erlang",
    "Haskell (Stack)": "haskell", "Haskell (Cabal)": "haskell",
    ".NET": "dotnet", "F#": "fsharp",
    "Swift (SPM)": "swift", "iOS (CocoaPods)": "ios", "iOS (Carthage)": "ios",
    "CMake": "cpp", "Make": "make", "Meson": "cpp", "SCons": "cpp",
    "Bazel": "bazel", "Zig": "zig", "Nim": "nim", "Crystal": "crystal",
    "Clojure (Lein)": "clojure", "Clojure (deps)": "clojure",
    "Julia": "julia", "R": "r",
    "OCaml (Dune)": "ocaml", "OCaml (OPAM)": "ocaml",
    "Docker": "docker", "Docker Compose": "docker",
    "GitHub Actions": "github-actions", "GitLab CI": "gitlab-ci",
    "Jenkins": "jenkins", "CircleCI": "circleci",
    "Terraform": "terraform", "Helm": "helm", "Kustomize": "kustomize",
    "Ansible": "ansible", "Pulumi": "pulumi", "AWS CDK": "aws-cdk",
    "Serverless": "serverless", "SST": "sst",
    "Prisma": "prisma",
    "Nx": "nx", "Lerna": "lerna", "Turborepo": "turbo", "Rush (Monorepo)": "rush",
    "Yarn Berry": "yarn-berry",
    "Nix": "nix",
  };

  const techs = [...new Set(entries.map(e => e.technology))];
  const result = new Set<string>();
  for (const t of techs) {
    const mapped = langMap[t];
    if (mapped) result.add(mapped);
  }
  // Si hay TypeScript pero no Node, agregar node implícito
  if (result.has("typescript") && !result.has("node")) result.add("node");
  return [...result].sort();
}

// ═══════════════════════════════════════════════════════════════
//  SHORTCUT
// ═══════════════════════════════════════════════════════════════

/**
 * Escanea el stack del proyecto desde rootDir.
 * Wrapper sobre walk() que simplifica el uso desde plugins.
 */
export function scanStack(rootDir: string): ScanEntry[] {
  return walk(rootDir, rootDir, 0);
}
