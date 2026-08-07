# Crisol Refiner — Agentic Ecosystem for OpenCode

## Install

In the root of your project repo, clone the ecosystem into `.opencode/`:

```bash
git clone https://github.com/PortalesCode/crisol-refiner.git .opencode/
```

On the first `start_session`, Refiner lands the landing payload (`desembarco/`) and the ecosystem scaffolds the workspace. The clone brings its own `.opencode/.git` inside your project. If your work repo is itself a git root, decide whether to track the ecosystem checkout as a submodule or keep it untracked/gitignored, so the two git histories do not interfere.

Agentic development ecosystem for OpenCode. Refiner (primary) is the entry
point: it refines/clarifies user intent, coordinates the creative triangle, and
translates between the user and the technical agents. North (subagent) is the
brain: it receives the refined action and delegates by complexity.

## Agent roles
- **Refiner** (primary) — user gateway. Refines intent, coordinates Boehmio + Realistic, voices North, translates technical (left) Natural language.
- **North** (subagent) — brain. Receives the refined action, delegates to Executor/Auditor/Especialista-Bibliotecario. Never asks the user (question: deny).
- **Boehmio** (subagent) — creative counterpart, consulted by Refiner in the triangle.
- **Realistic** (subagent) — pragmatic counterpart, scores 1-10, consulted by Refiner in the triangle.
- **Executor** (subagent) — implements.
- **Auditor** (subagent) — verifies.
- **Especialista-Bibliotecario** (subagent) — senior expert + knowledge curator; consulted by North; owns domain curation.

## Flow
1. User talks to Refiner.
2. For open/large ideas, Refiner consults the triangle (Boehmio creative + Realistic scoring 1-10).
3. User decides whether to proceed or discard.
4. On confirmed action, Refiner delegates to North.
5. North dispatches Executor(s) in parallel when independent, calls Auditor for review, consults Especialista-Bibliotecario when expert knowledge is missing.
6. Status is updated in STATUS.md and plan.md.

## Structure
- `agents/` — agent definitions (frontmatter: mode, permissions, description).
- `plugins/` — Tool/plugin implementations (TypeScript).
- `skills/native/` — native skills, grouped by owner agent.
- `desembarco/` — landing payload copied into any project using the ecosystem on first start_session (context templates, conventions, opencode.json, gitignore).

## Knowledge
Domains live in workspec/domains/ (curated by Especialista-Bibliotecario via the curacion-dominios skill). Context lives in workspec/context/. Memory lives in workspec/Memoria/.

## Skills
Native skills by owner: Especialista-Bibliotecario (architecture-review, curacion-dominios), Refiner (skill-installer), North (parallel-dispatch), Executor (implement-safe, debug-systematic, test-and-validate), Auditor (audit-review).