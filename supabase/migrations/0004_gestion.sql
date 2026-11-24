-- =====================================================================
-- Fase 1 · Módulo Gestión (administrador)
-- 1. Permisos de lectura/escritura para usuarios con sesión (las reglas
--    RLS siguen decidiendo qué fila ve cada uno).
-- 2. Limpieza: unidades educativas repetidas o sin miembros.
-- 3. Docentes: correo en el perfil, invitaciones y administración.
-- 4. Cursos, asignaturas y distribución usan las tablas de 0001.
-- Se puede ejecutar más de una vez sin dañar nada.
-- =====================================================================

-- ---------- 1. Permisos ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

-- ---------- 2. Limpieza de registros repetidos ----------
-- Instituciones sin ningún miembro.
delete from instituciones i
where not exists (select 1 from miembros m where m.institucion_id = i.id);

-- Si un mismo usuario registró varias, se conserva la que tiene AMIE
-- (o la más antigua) y se borran las demás que estén vacías.
with propias as (
  select i.id, i.codigo_amie, i.creado_en, m.usuario_id
  from instituciones i
  join miembros m on m.institucion_id = i.id and m.rol = 'administrador'
  where not exists (select 1 from miembros o where o.institucion_id = i.id and o.usuario_id <> m.usuario_id)
    and not exists (select 1 from cursos c where c.institucion_id = i.id)
), orden as (
  select id, row_number() over (partition by usuario_id order by (codigo_amie is null), creado_en) as n
  from propias
)
delete from instituciones where id in (select id from orden where n > 1);

-- Una persona registra una sola unidad educativa; los demás entran por invitación.
create or replace function crear_institucion(p_nombre text, p_amie text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nueva uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if exists (select 1 from miembros where usuario_id = auth.uid()) then
    raise exception 'Ya perteneces a una unidad educativa';
  end if;
  insert into instituciones (nombre, codigo_amie) values (p_nombre, nullif(trim(p_amie), ''))
  returning id into nueva;
  insert into miembros (institucion_id, usuario_id, rol) values (nueva, auth.uid(), 'administrador');
  insert into miembros (institucion_id, usuario_id, rol) values (nueva, auth.uid(), 'docente');
  return nueva;
end;
$$;

-- Unidades educativas del usuario con sus roles (para el panel).
create or replace function mis_instituciones()
returns table (id uuid, nombre text, codigo_amie text, roles text[])
language sql stable security definer set search_path = public as $$
  select i.id, i.nombre, i.codigo_amie, array_agg(m.rol::text order by m.rol)
  from miembros m join instituciones i on i.id = m.institucion_id
  where m.usuario_id = auth.uid() and m.activo
  group by i.id, i.nombre, i.codigo_amie, i.creado_en
  order by i.creado_en;
$$;

-- ---------- 3. Docentes ----------
alter table perfiles add column if not exists correo text;
update perfiles p set correo = lower(u.email) from auth.users u where u.id = p.id and p.correo is null;

create or replace function crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombres, apellidos, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombres', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    lower(new.email)
  )
  on conflict (id) do update set correo = excluded.correo;
  return new;
end;
$$;

create table if not exists invitaciones (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  correo         text not null,
  nombres        text not null default '',
  apellidos      text not null default '',
  roles          rol_usuario[] not null default array['docente']::rol_usuario[],
  creado_por     uuid references perfiles(id) on delete set null,
  creado_en      timestamptz not null default now(),
  aceptada_en    timestamptz
);
create unique index if not exists un_invitacion on invitaciones (institucion_id, lower(correo));
alter table invitaciones enable row level security;
drop policy if exists inv_adm on invitaciones;
create policy inv_adm on invitaciones for all
  using (tiene_rol(institucion_id, array['administrador']::rol_usuario[]))
  with check (tiene_rol(institucion_id, array['administrador']::rol_usuario[]));
grant select, insert, update, delete on invitaciones to authenticated;

-- Al ingresar, el docente invitado queda unido a su unidad educativa
-- (solo si ya confirmó su correo).
create or replace function aceptar_invitaciones()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_correo text;
  v_conf   timestamptz;
  inv      record;
  r        rol_usuario;
  n        int := 0;
begin
  select lower(email), email_confirmed_at into v_correo, v_conf from auth.users where id = auth.uid();
  if v_correo is null or v_conf is null then return 0; end if;
  insert into perfiles (id, nombres, apellidos, correo) values (auth.uid(), '', '', v_correo)
  on conflict (id) do update set correo = excluded.correo;
  for inv in select * from invitaciones where lower(correo) = v_correo and aceptada_en is null loop
    foreach r in array inv.roles loop
      insert into miembros (institucion_id, usuario_id, rol) values (inv.institucion_id, auth.uid(), r)
      on conflict (institucion_id, usuario_id, rol) do update set activo = true;
    end loop;
    update perfiles set
      nombres   = case when nombres = ''   then inv.nombres   else nombres end,
      apellidos = case when apellidos = '' then inv.apellidos else apellidos end
    where id = auth.uid();
    update invitaciones set aceptada_en = now() where id = inv.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Lista de docentes de la institución (solo administrador y autoridades).
create or replace function listar_docentes(p_inst uuid)
returns table (usuario_id uuid, nombres text, apellidos text, correo text, roles text[], activo boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombres, p.apellidos, p.correo,
         array_agg(m.rol::text order by m.rol), bool_or(m.activo)
  from miembros m join perfiles p on p.id = m.usuario_id
  where m.institucion_id = p_inst and es_gestion(p_inst)
  group by p.id, p.nombres, p.apellidos, p.correo
  order by p.apellidos, p.nombres;
$$;

-- Cambiar nombre, roles y estado de un docente.
create or replace function administrar_docente(
  p_inst uuid, p_usuario uuid, p_nombres text, p_apellidos text,
  p_roles rol_usuario[], p_activo boolean)
returns void language plpgsql security definer set search_path = public as $$
declare otros_admin int;
begin
  if not tiene_rol(p_inst, array['administrador']::rol_usuario[]) then
    raise exception 'Solo el administrador puede hacer este cambio';
  end if;
  if not exists (select 1 from miembros where institucion_id = p_inst and usuario_id = p_usuario) then
    raise exception 'Ese docente no pertenece a la institución';
  end if;
  if p_roles is null or array_length(p_roles, 1) is null then
    raise exception 'Elige al menos un rol';
  end if;
  select count(distinct usuario_id) into otros_admin from miembros
  where institucion_id = p_inst and rol = 'administrador' and activo and usuario_id <> p_usuario;
  if otros_admin = 0 and (not p_activo or not ('administrador' = any(p_roles))) then
    raise exception 'La institución debe tener al menos un administrador activo';
  end if;

  update perfiles set nombres = trim(p_nombres), apellidos = trim(p_apellidos) where id = p_usuario;
  delete from miembros where institucion_id = p_inst and usuario_id = p_usuario and not (rol = any(p_roles));
  insert into miembros (institucion_id, usuario_id, rol, activo)
  select p_inst, p_usuario, unnest(p_roles), p_activo
  on conflict (institucion_id, usuario_id, rol) do update set activo = excluded.activo;
  update miembros set activo = p_activo where institucion_id = p_inst and usuario_id = p_usuario;

  insert into bitacora (institucion_id, usuario_id, accion, detalle)
  values (p_inst, auth.uid(), 'administrar_docente',
          jsonb_build_object('docente', p_usuario, 'roles', p_roles, 'activo', p_activo));
end;
$$;

-- Quitar a un docente de la institución (no borra su cuenta).
create or replace function quitar_docente(p_inst uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tiene_rol(p_inst, array['administrador']::rol_usuario[]) then
    raise exception 'Solo el administrador puede hacer este cambio';
  end if;
  if p_usuario = auth.uid() then
    raise exception 'No puedes quitarte a ti mismo';
  end if;
  if exists (select 1 from clases where institucion_id = p_inst and docente_id = p_usuario and not archivada) then
    raise exception 'Primero reasigna sus clases en Distribución, o desactívalo';
  end if;
  delete from miembros where institucion_id = p_inst and usuario_id = p_usuario;
  update cursos set tutor_id = null where institucion_id = p_inst and tutor_id = p_usuario;
  insert into bitacora (institucion_id, usuario_id, accion, detalle)
  values (p_inst, auth.uid(), 'quitar_docente', jsonb_build_object('docente', p_usuario));
end;
$$;

grant execute on function mis_instituciones() to authenticated;
grant execute on function aceptar_invitaciones() to authenticated;
grant execute on function listar_docentes(uuid) to authenticated;
grant execute on function administrar_docente(uuid, uuid, text, text, rol_usuario[], boolean) to authenticated;
grant execute on function quitar_docente(uuid, uuid) to authenticated;

-- ---------- 4. Cursos y asignaturas ----------
alter table asignaturas add column if not exists orden int not null default 0;
create unique index if not exists un_asignatura on asignaturas (institucion_id, lower(nombre));
-- Un mismo curso puede tener una asignatura con varios docentes solo si se
-- separa por grupo; por ahora, una asignatura por curso (unique de 0001).
