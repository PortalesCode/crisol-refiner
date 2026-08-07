---
name: econative-skill-installer
description: Instala skills bajo demanda desde un repositorio remoto. North la usa cuando detecta que una skill externa es necesaria para la tarea actual. No descarga todo el catálogo, solo la skill específica.
---

# Skill Installer

## Cuándo usarla

- Antes de planificar, si el proyecto necesita una skill que no está en native/
- Cuando el stack del proyecto requiere experiencia específica (testing, frontend, etc.)
- Cuando un Executor reporta que le falta una skill para completar una tarea

## Pipeline

### 1. North detecta necesidad
- Analiza el contexto del proyecto (stack, tarea, requerimiento)
- Determina qué skill externa se necesita
- Verifica si ya está instalada en `.opencode/skills/extern/<skill>/`

### 2. Si no está instalada → instalar
1. Lee `workspec/context/SKILL-REGISTRY.md` para obtener la URL base del repositorio remoto
2. Consulta `<URL>/index.json` para verificar que la skill exista
3. Descarga `<URL>/<skill>/SKILL.md` (y archivos adicionales si existen)
4. Escribe los archivos en `.opencode/skills/extern/<skill>/`

### 3. Si ya está instalada
- Verificar si hace falta actualizarla (comparar versión local vs remota si existe)
- Si no, usar la que ya está instalada
- Si se actualiza, también actualizar la descripción en AGENTS.md si cambió

### 4. Actualizar AGENTS.md
- Abrir `AGENTS.md` (raíz del proyecto)
- Buscar la sección `### Skills externas` dentro del `## ⚙️ Manifiesto del proyecto`
- Agregar la skill instalada: `- **<skill-name>**: <descripción>`
- Reemplazar `- _(completar)_` si existe, o agregar después del último ítem

### 5. OpenCode descubre la skill
- Al reiniciar runtime, OpenCode detecta la nueva skill en `skills/extern/`
- Aparece en `<available_skills>` con su nombre y descripción
- Los agentes pueden cargarla con `skill("<nombre>")`

## Reglas

1. NO instalar skills que ya están en `skills/extern/`
2. NO descargar el catálogo completo
3. Si la descarga falla, North informa al usuario y continúa sin la skill
4. Si la skill remota no existe en el index, North informa y no crea archivos vacíos
5. La URL del registro se lee de `workspec/context/SKILL-REGISTRY.md`, no está hardcodeada
6. **Las skills instaladas NO están disponibles hasta reiniciar OpenCode.** Después de instalar, North informa al usuario: "Skill instalada. Necesitás reiniciar OpenCode para que esté disponible."
7. **Siempre actualizar AGENTS.md** después de instalar o actualizar una skill. Si AGENTS.md no refleja las skills instaladas, los agentes no saben que existen.

## Formato del repositorio remoto

```
https://raw.githubusercontent.com/PortalesCode/skill-library/main/
├── index.json
│   {
│     "skills": [
│       {
│         "name": "playwright-expert",
│         "description": "E2E testing with Playwright",
│         "files": ["SKILL.md"]
│       }
│     ]
│   }
├── playwright-expert/
│   └── SKILL.md
└── frontend-design/
    └── SKILL.md
```
