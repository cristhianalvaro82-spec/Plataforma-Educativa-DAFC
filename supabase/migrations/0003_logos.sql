-- =====================================================================
-- Fase 1 · Logos de las instituciones (Supabase Storage)
-- Carpeta por institución: logos/<institucion_id>/logo.png
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists logos_subir on storage.objects;
drop policy if exists logos_actualizar on storage.objects;
drop policy if exists logos_borrar on storage.objects;

create policy logos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'logos'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid, array['administrador']::public.rol_usuario[]));

create policy logos_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'logos'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid, array['administrador']::public.rol_usuario[]));

create policy logos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'logos'
    and public.tiene_rol(((storage.foldername(name))[1])::uuid, array['administrador']::public.rol_usuario[]));

-- Paleta institucional por defecto (azul del logo de la U.E. Dr. Andrés F. Córdova)
alter table public.instituciones alter column color_primario set default '#011681';
update public.instituciones set color_primario = '#011681' where color_primario = '#1F4E79';
