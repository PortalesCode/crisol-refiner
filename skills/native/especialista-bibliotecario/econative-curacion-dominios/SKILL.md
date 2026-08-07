---
name: econative-curacion-dominios
description: Usá esta skill cuando necesites crear, expandir o refinar un dominio de conocimiento en workspec/domains/. Especialista-Bibliotecario la usa cuando North le consulta y falta conocimiento: investiga, escribe y verifica dominios.
---

# Curación de Dominios — Crisol-Refiner

## Cuándo usarla

- Detectás que un tema aparece recurrentemente y no hay dominio
- El usuario te pide explícitamente que cures un tema
- Estás investigando algo y querés dejar el conocimiento estructurado para futuras sesiones

## Formato de dominio (MUY simple)

Solo 2 reglas fijas:

```markdown
$$Título del Dominio$$
&&Descripción breve (1 línea)&&

[markdown libre — sin estructura rígida]
```

## Pipeline de curación

### 1. Detectar el gap
- El tema aparece seguido en conversaciones
- No hay dominio existente (verificar con `econative_domain_list`)
- El usuario pide investigar algo

### 2. Investigar
Usá las herramientas disponibles según el tema:
- `websearch` — búsqueda general
- `webfetch` — leer documentación online
- `context7_resolve-library-id` + `context7_query-docs` — documentación viva de librerías
- `github_search_code` / `github_get_file_contents` — ejemplos reales de código

### 3. Escribir el dominio
Usá `econative_domain_write` con:
- **name**: slug kebab-case (ej: `api-github-rest`)
- **title**: título legible (ej: `API REST de GitHub`)
- **description**: una línea que explique de qué trata
- **content**: markdown libre con lo investigado

### 4. Verificar
- `econative_domain_list` para confirmar que aparece
- `econative_domain_reader` para leerlo completo y verificar calidad

## Lo que NO es un dominio

| Esto... | Es mejor como... |
|---|---|
| "Cómo debuggear este error específico" | Una etapa en el debugging actual |
| "El puerto es 3001, no 3000" | Discovery con `econative_remember_it` |
| "Usamos Ruff para formatear" | Convention en CONVENTIONS.md |
| "Qué estamos construyendo ahora" | Context en STATUS.md |
| Pasos repetitivos para una tarea | Skill, no dominio |

## Reglas

1. No crear dominios que ya existen (verificar con `domain_list` primero)
2. Si el dominio es muy específico de una sola tarea, mejor un discovery
3. Si el patrón es operativo (pasos a seguir), mejor una skill
4. Un dominio bueno: alguien que no sabe del tema lo entiende en 2 minutos
5. Cantidad de contenido: lo suficiente para ser útil, no más
6. No archivar URLs sin contexto — siempre explicar QUÉ es y PARA QUÉ sirve
