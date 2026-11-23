# Plataforma Educativa

Plataforma web para unidades educativas del Ecuador: planificaciones, evaluaciones,
calificaciones, asistencia, convivencia y documentos Word con hoja membretada.

## Estado

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Base: instituciones, roles, cursos, nóminas, generador Word con membrete | En curso |
| 2 | Planificaciones con IA (ERCA/ACC + DUA) | Pendiente |
| 3 | Asistencia y calificaciones | Pendiente |
| 4 | Evaluaciones y cuestionario en vivo | Pendiente |
| 5 | Convivencia, DECE, Vicerrectorado e Inspección | Pendiente |
| 6 | Piloto con docentes | Pendiente |

## Estructura

- `src/app/` páginas (`/` inicio, `/membrete` institución y oficio de prueba)
- `src/lib/word/membrete.ts` generador de Word con encabezado, pie, firma y plantilla de oficio
- `supabase/migrations/0001_base.sql` base de datos: instituciones, roles, cursos, clases,
  horarios, estudiantes, matrículas, documentos, bitácora y permisos por rol (RLS)

## Roles

administrador · autoridad · vicerrectorado · inspeccion · dece · tutor · docente

## Ejecutar en local

```bash
npm install
npm run dev   # http://localhost:3000
```

## Datos personales

Durante el desarrollo solo se usan datos ficticios. Antes de cargar datos reales de
estudiantes se requiere autorización de la autoridad institucional y consentimiento de
representantes (LOPDP). Los datos de estudiantes nunca se envían a la IA.
