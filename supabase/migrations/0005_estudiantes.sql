-- =====================================================================
-- Fase 1 · Estudiantes: ficha completa con madre, padre y representante
-- (campos tomados de la ficha de Sistema Orozco). Se puede ejecutar
-- más de una vez sin dañar nada.
-- =====================================================================

-- ---------- Ficha del estudiante ----------
alter table estudiantes add column if not exists sexo                 text check (sexo in ('H','M'));
alter table estudiantes add column if not exists fecha_nacimiento     date;
alter table estudiantes add column if not exists nacionalidad         text;
alter table estudiantes add column if not exists provincia_nacimiento text;
alter table estudiantes add column if not exists etnia                text;
alter table estudiantes add column if not exists discapacidad         text;
alter table estudiantes add column if not exists lateralidad          text;
alter table estudiantes add column if not exists peso_kg              numeric(5,1);
alter table estudiantes add column if not exists talla_cm             numeric(5,1);
alter table estudiantes add column if not exists direccion            text;
alter table estudiantes add column if not exists celular              text;
alter table estudiantes add column if not exists correo               text;
alter table estudiantes add column if not exists creado_en            timestamptz not null default now();
alter table estudiantes add column if not exists actualizado_en       timestamptz not null default now();

-- ---------- Madre, padre y representante legal ----------
create table if not exists familiares (
  id                uuid primary key default gen_random_uuid(),
  estudiante_id     uuid not null references estudiantes(id) on delete cascade,
  tipo              text not null check (tipo in ('madre','padre','representante')),
  cedula            text,
  apellidos         text,
  nombres           text,
  parentesco        text,               -- solo representante: Madre, Padre, Abuela, Tío...
  celular           text,
  correo            text,
  direccion_trabajo text,
  nacionalidad      text,
  escolaridad       text,
  ocupacion         text,
  unique (estudiante_id, tipo)
);
alter table familiares enable row level security;

-- Ve los familiares quien puede ver al estudiante.
drop policy if exists fam_ver on familiares;
create policy fam_ver on familiares for select using (
  exists (select 1 from estudiantes e where e.id = estudiante_id));
-- Editan: administrador, Inspección y DECE.
drop policy if exists fam_adm on familiares;
create policy fam_adm on familiares for all
  using (exists (select 1 from estudiantes e where e.id = estudiante_id
                 and tiene_rol(e.institucion_id, array['administrador','inspeccion','dece']::rol_usuario[])))
  with check (exists (select 1 from estudiantes e where e.id = estudiante_id
                 and tiene_rol(e.institucion_id, array['administrador','inspeccion','dece']::rol_usuario[])));

-- DECE también puede actualizar la ficha del estudiante.
drop policy if exists est_adm on estudiantes;
create policy est_adm on estudiantes for all
  using (tiene_rol(institucion_id, array['administrador','inspeccion','dece']::rol_usuario[]))
  with check (tiene_rol(institucion_id, array['administrador','inspeccion','dece']::rol_usuario[]));

drop policy if exists mat_adm on matriculas;
create policy mat_adm on matriculas for all
  using (exists (select 1 from cursos cu where cu.id = curso_id
          and tiene_rol(cu.institucion_id, array['administrador','inspeccion','dece']::rol_usuario[])))
  with check (exists (select 1 from cursos cu where cu.id = curso_id
          and tiene_rol(cu.institucion_id, array['administrador','inspeccion','dece']::rol_usuario[])));

grant select, insert, update, delete on familiares to authenticated;
