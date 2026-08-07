# SKILL REGISTRY

## Fuente Remota

| Campo | Valor |
|---|---|
| **URL base (raw)** | `https://raw.githubusercontent.com/PortalesCode/skill-library/main/` |
| **Repositorio** | [PortalesCode/skill-library](https://github.com/PortalesCode/skill-library) |
| **Formato** | `index.json` con lista de skills + carpetas con SKILL.md |

---

## Skills Instaladas Localmente

Las skills externas que Refiner instala bajo demanda viven en:

```
.opencode/skills/extern/<nombre-de-la-skill>/
```

No es necesario listarlas acá — el sistema las detecta automáticamente.

---

## Flujo de Instalación

```
1. Refiner detecta necesidad de skill específica
2. Consulta este registro para obtener la URL base
3. Consulta index remoto (<URL>/index.json) para verificar existencia
4. Descarga solo <URL>/<skill>/SKILL.md (y archivos adicionales si existen)
5. Instala en .opencode/skills/extern/<skill>/
6. OpenCode descubre la skill en el próximo scan
```

> **Nunca** se descarga el catálogo completo. Solo la skill necesaria.
