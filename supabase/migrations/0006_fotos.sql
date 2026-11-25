-- =====================================================================
-- Fase 1 · Foto tamaño carné del estudiante (opcional)
-- Se guarda en un depósito PRIVADO: solo la ven los roles autorizados
-- de la misma institución. Ruta: <institucion_id>/<estudiante_id>/foto-*.jpg
-- Se puede ejecutar más de una vez sin dañar nada.
-- =====================================================================
alter table public.estudiantes add column if not exists foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-estudiantes', 'fotos-estudiantes', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists fotos_ver on storage.objects;
drop policy if exists fotos_subir on storage.objects;
drop policy if exists fotos_actualizar on storage.objects;
drop policy if exists fotos_borrar on storage.objects;

-- Ven la foto: administrador, Inspección, DECE, Vicerrectorado y Autoridad.
create policy fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fotos-estudiantes'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid,
        array['administrador','inspeccion','dece','vicerrectorado','autoridad']::public.rol_usuario[]));

-- Suben, cambian o quitan la foto: administrador, Inspección y DECE.
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-estudiantes'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid,
        array['administrador','inspeccion','dece']::public.rol_usuario[]));

create policy fotos_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'fotos-estudiantes'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid,
        array['administrador','inspeccion','dece']::public.rol_usuario[]));

create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-estudiantes'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid,
        array['administrador','inspeccion','dece']::public.rol_usuario[]));
