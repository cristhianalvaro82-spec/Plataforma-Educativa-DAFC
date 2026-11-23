-- Archivo único para pegar en Supabase > SQL Editor (une todas las migraciones).

-- =====================================================================
-- Plataforma Educativa · Fase 1 · Esquema base
-- Multi-institución: cada unidad educativa tiene sus datos y su membrete.
-- La seguridad se aplica en la base (Row Level Security): cada usuario
-- solo ve los datos de las instituciones a las que pertenece y según su rol.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Catálogos ----------
create type rol_usuario as enum (
  'administrador',   -- configura la institución
  'autoridad',       -- rector/a, director/a
  'vicerrectorado',
  'inspeccion',
  'dece',
  'tutor',
  'docente'
);

create type jornada as enum ('matutina','vespertina','nocturna','intensiva');

create type subnivel as enum (
  'inicial','preparatoria','elemental','media','superior','bachillerato'
);

-- ---------- Instituciones y membrete ----------
create table instituciones (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,                 -- "Unidad Educativa ..."
  codigo_amie     text unique,
  sostenimiento   text check (sostenimiento in ('fiscal','fiscomisional','municipal','particular')),
  zona            text,
  distrito        text,
  circuito        text,
  provincia       text,
  canton          text,
  direccion       text,
  telefono        text,
  correo          text,
  lema            text,
  -- Membrete para los documentos Word
  logo_path       text,                          -- ruta en Storage
  logo_ministerio boolean not null default true, -- mostrar franja MinEduc en encabezado
  encabezado_extra text,                         -- línea adicional opcional
  pie_pagina      text,                          -- dirección/teléfono al pie
  color_primario  text default '#1F4E79',
  creado_en       timestamptz not null default now()
);

create table anios_lectivos (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre         text not null,                  -- "2026-2027"
  fecha_inicio   date,
  fecha_fin      date,
  activo         boolean not null default false
);
create unique index un_anio_activo on anios_lectivos(institucion_id) where activo;

-- Autoridades que firman los documentos (rector, vicerrector, inspector...)
create table autoridades (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  cargo          text not null,                  -- "Rector", "Inspector General"
  nombre         text not null,
  titulo         text,                           -- "Mgs.", "Lic."
  orden          int not null default 0
);

-- ---------- Usuarios ----------
create table perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombres    text not null,
  apellidos  text not null,
  titulo     text,
  telefono   text,
  creado_en  timestamptz not null default now()
);

-- Un usuario puede pertenecer a varias instituciones y tener varios roles.
create table miembros (
  institucion_id uuid not null references instituciones(id) on delete cascade,
  usuario_id     uuid not null references perfiles(id) on delete cascade,
  rol            rol_usuario not null,
  activo         boolean not null default true,
  primary key (institucion_id, usuario_id, rol)
);

-- ---------- Estructura académica ----------
create table cursos (
  id              uuid primary key default gen_random_uuid(),
  institucion_id  uuid not null references instituciones(id) on delete cascade,
  anio_lectivo_id uuid not null references anios_lectivos(id) on delete cascade,
  subnivel        subnivel not null,
  grado           text not null,                 -- "8.º EGB", "1.º BGU"
  paralelo        text not null,                 -- "A"
  jornada         jornada not null default 'matutina',
  especialidad    text,                          -- bachillerato técnico
  tutor_id        uuid references perfiles(id),
  unique (anio_lectivo_id, grado, paralelo, jornada)
);

create table asignaturas (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre         text not null,                  -- "Matemática"
  area           text
);

-- Una "clase" = asignatura + curso + docente (lo que Tiza llama "curso").
create table clases (
  id               uuid primary key default gen_random_uuid(),
  institucion_id   uuid not null references instituciones(id) on delete cascade,
  curso_id         uuid not null references cursos(id) on delete cascade,
  asignatura_id    uuid not null references asignaturas(id) on delete cascade,
  docente_id       uuid not null references perfiles(id),
  periodos_semana  int not null default 1,
  archivada        boolean not null default false,
  unique (curso_id, asignatura_id)
);

create table horarios (
  id        uuid primary key default gen_random_uuid(),
  clase_id  uuid not null references clases(id) on delete cascade,
  dia       int not null check (dia between 1 and 5),   -- 1 = lunes
  hora_inicio time not null,
  hora_fin    time not null
);

-- Estudiantes: solo los datos mínimos necesarios (LOPDP).
create table estudiantes (
  id              uuid primary key default gen_random_uuid(),
  institucion_id  uuid not null references instituciones(id) on delete cascade,
  apellidos       text not null,
  nombres         text not null,
  cedula          text,
  nee             boolean not null default false, -- detalle solo para DECE
  representante   text,
  telefono_repr   text,
  unique (institucion_id, cedula)
);

create table matriculas (
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  curso_id      uuid not null references cursos(id) on delete cascade,
  numero_lista  int,
  retirado      boolean not null default false,
  primary key (estudiante_id, curso_id)
);

-- Registro de documentos generados (para numeración y evidencia).
create table documentos (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  autor_id       uuid not null references perfiles(id),
  tipo           text not null,                  -- 'oficio','memorando','acta','planificacion'...
  numero         text,                           -- "UEAFC-INSP-2026-001"
  asunto         text,
  creado_en      timestamptz not null default now()
);

-- Bitácora de actividad (seguridad y auditoría)
create table bitacora (
  id             bigint generated always as identity primary key,
  institucion_id uuid references instituciones(id) on delete cascade,
  usuario_id     uuid references perfiles(id),
  accion         text not null,
  detalle        jsonb,
  creado_en      timestamptz not null default now()
);

-- =====================================================================
-- Funciones de ayuda para los permisos
-- =====================================================================
create or replace function es_miembro(inst uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where institucion_id = inst and usuario_id = auth.uid() and activo);
$$;

create or replace function tiene_rol(inst uuid, roles rol_usuario[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where institucion_id = inst and usuario_id = auth.uid()
                   and activo and rol = any(roles));
$$;

-- Roles con visión de toda la institución
create or replace function es_gestion(inst uuid)
returns boolean language sql stable as $$
  select tiene_rol(inst, array['administrador','autoridad','vicerrectorado','inspeccion','dece']::rol_usuario[]);
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table instituciones  enable row level security;
alter table anios_lectivos enable row level security;
alter table autoridades    enable row level security;
alter table perfiles       enable row level security;
alter table miembros       enable row level security;
alter table cursos         enable row level security;
alter table asignaturas    enable row level security;
alter table clases         enable row level security;
alter table horarios       enable row level security;
alter table estudiantes    enable row level security;
alter table matriculas     enable row level security;
alter table documentos     enable row level security;
alter table bitacora       enable row level security;

-- Instituciones: los miembros las ven; solo el administrador edita membrete.
create policy inst_ver    on instituciones for select using (es_miembro(id));
create policy inst_editar on instituciones for update using (tiene_rol(id, array['administrador']::rol_usuario[]));

-- Catálogos de la institución: ver miembros, editar administrador.
create policy anio_ver on anios_lectivos for select using (es_miembro(institucion_id));
create policy anio_adm on anios_lectivos for all    using (tiene_rol(institucion_id, array['administrador']::rol_usuario[]));
create policy aut_ver  on autoridades    for select using (es_miembro(institucion_id));
create policy aut_adm  on autoridades    for all    using (tiene_rol(institucion_id, array['administrador']::rol_usuario[]));
create policy asig_ver on asignaturas    for select using (es_miembro(institucion_id));
create policy asig_adm on asignaturas    for all    using (tiene_rol(institucion_id, array['administrador','vicerrectorado']::rol_usuario[]));

-- Perfiles: cada uno el suyo; compañeros de la misma institución pueden verse.
create policy perfil_propio on perfiles for all using (id = auth.uid());
create policy perfil_companeros on perfiles for select using (
  exists (select 1 from miembros m1 join miembros m2 on m1.institucion_id = m2.institucion_id
          where m1.usuario_id = auth.uid() and m2.usuario_id = perfiles.id));

-- Miembros: se ven dentro de la institución; administra el administrador.
create policy miem_ver on miembros for select using (es_miembro(institucion_id));
create policy miem_adm on miembros for all    using (tiene_rol(institucion_id, array['administrador']::rol_usuario[]));

-- Cursos: todos los miembros los ven; gestión los edita.
create policy curso_ver on cursos for select using (es_miembro(institucion_id));
create policy curso_adm on cursos for all    using (tiene_rol(institucion_id, array['administrador','vicerrectorado']::rol_usuario[]));

-- Clases y horarios: el docente ve las suyas; gestión ve todas.
create policy clase_ver on clases for select using (docente_id = auth.uid() or es_gestion(institucion_id));
create policy clase_adm on clases for all    using (tiene_rol(institucion_id, array['administrador','vicerrectorado']::rol_usuario[]));
create policy hor_ver on horarios for select using (
  exists (select 1 from clases c where c.id = clase_id and (c.docente_id = auth.uid() or es_gestion(c.institucion_id))));
create policy hor_docente on horarios for all using (
  exists (select 1 from clases c where c.id = clase_id and c.docente_id = auth.uid()));

-- Estudiantes: gestión ve todos; docente y tutor solo los de sus cursos.
create policy est_gestion on estudiantes for select using (es_gestion(institucion_id));
create policy est_docente on estudiantes for select using (
  exists (select 1 from matriculas m
          join cursos cu on cu.id = m.curso_id
          left join clases cl on cl.curso_id = cu.id
          where m.estudiante_id = estudiantes.id
            and (cl.docente_id = auth.uid() or cu.tutor_id = auth.uid())));
create policy est_adm on estudiantes for all using (
  tiene_rol(institucion_id, array['administrador','inspeccion']::rol_usuario[]));

create policy mat_ver on matriculas for select using (
  exists (select 1 from cursos cu where cu.id = curso_id and es_miembro(cu.institucion_id)));
create policy mat_adm on matriculas for all using (
  exists (select 1 from cursos cu where cu.id = curso_id
          and tiene_rol(cu.institucion_id, array['administrador','inspeccion']::rol_usuario[])));

-- Documentos: el autor ve los suyos; gestión ve todos.
create policy doc_ver   on documentos for select using (autor_id = auth.uid() or es_gestion(institucion_id));
create policy doc_crear on documentos for insert with check (autor_id = auth.uid() and es_miembro(institucion_id));

-- Bitácora: solo administrador y autoridad la leen; todos los miembros escriben.
create policy bit_ver   on bitacora for select using (tiene_rol(institucion_id, array['administrador','autoridad']::rol_usuario[]));
create policy bit_crear on bitacora for insert with check (usuario_id = auth.uid());

-- =====================================================================
-- Fase 1 · Registro de usuarios y creación de la institución
-- =====================================================================

-- Al registrarse, se crea automáticamente el perfil del usuario.
create or replace function crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombres, apellidos)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombres', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function crear_perfil_nuevo_usuario();

-- El primer usuario crea su unidad educativa y queda como administrador.
create or replace function crear_institucion(p_nombre text, p_amie text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nueva uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  insert into instituciones (nombre, codigo_amie) values (p_nombre, nullif(p_amie, ''))
  returning id into nueva;
  insert into miembros (institucion_id, usuario_id, rol) values (nueva, auth.uid(), 'administrador');
  insert into miembros (institucion_id, usuario_id, rol) values (nueva, auth.uid(), 'docente');
  return nueva;
end;
$$;

grant execute on function crear_institucion(text, text) to authenticated;
