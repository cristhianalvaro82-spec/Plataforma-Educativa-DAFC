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
