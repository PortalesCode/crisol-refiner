# CONVENTIONS

## Git Workflow

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `refactor:` cambio sin cambio de comportamiento
  - `chore:` tareas de mantenimiento
  - `docs:` documentación
  - `style:` formato, estilos
- **Rama principal:** `main`
- **Ramas de trabajo:** `feat/<nombre>`, `fix/<nombre>`

---

## Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | `kebab-case` | `mi-archivo.ts` |
| Directorios | `kebab-case` | `mi-directorio/` |
| Funciones | `camelCase` | `miFuncion()` |
| Clases/Tipos | `PascalCase` | `MiClase` |
| Constantes | `UPPER_SNAKE_CASE` | `MI_CONSTANTE` |
| Variables | `camelCase` | `miVariable` |

---

## Estructura del Proyecto

```
proyecto/
├── workspec/           ← Plan de trabajo y contexto
│   ├── context/         ← Documentación del proyecto
│   └── plans/           ← Planes activos e históricos
└── .opencode/          ← Ecosistema Crisol-Refiner
```

---

## Estilo de Código

_Pendiente de definir según lenguaje/framework._

---

## Workflow

1. Refiner refina y clarifica la intención del user
2. North comprende la acción pulida y delega
3. Executor implementa
4. Auditor revisa (cuando corresponda)
5. Especialista-Bibliotecario aporta conocimiento experto (según complejidad)
6. Se actualiza STATUS.md y plan.md
7. Commit con conventional commit
