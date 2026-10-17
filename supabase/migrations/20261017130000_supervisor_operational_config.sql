alter table public.productos
  add column if not exists incompleto boolean not null default true,
  add column if not exists incompatibilidades_revisadas boolean not null default false,
  add column if not exists unidad_dosis text not null default 'ml/L',
  add column if not exists ficha_version integer not null default 1,
  add column if not exists ficha_actualizada_en timestamptz not null default now();

alter table public.areas
  add column if not exists criterios_limpieza text[] not null default '{}';

update public.areas a
set criterios_limpieza = coalesce((
  select array_agg(x.value)
  from jsonb_array_elements_text(s.criterios_limpieza) as x(value)
), '{}')
from public.sitios s
where s.id = a.sitio_id and cardinality(a.criterios_limpieza) = 0;

alter table public.tareas
  add column if not exists procedencia_configuracion jsonb not null default '{}'::jsonb,
  add column if not exists validaciones_receta text[] not null default '{}',
  add column if not exists configuracion_actualizada_despues boolean not null default false;
alter table public.tareas add column if not exists parametros_sistema_version integer not null default 1;

create table if not exists public.parametros_sistema (
  id smallint primary key default 1 check (id = 1),
  tolerancia_sobredosis_pct numeric not null default 10 check (tolerancia_sobredosis_pct between 0 and 100),
  rango_ph_descarga jsonb not null default '{"min":6,"max":9}'::jsonb check ((rango_ph_descarga->>'min')::numeric >= 0 and (rango_ph_descarga->>'min')::numeric < (rango_ph_descarga->>'max')::numeric and (rango_ph_descarga->>'max')::numeric <= 14),
  min_repeticiones integer not null default 3 check (min_repeticiones > 0),
  vocabulario_categorias jsonb not null default '[{"clave":"hipoclorito","etiqueta":"Hipoclorito"},{"clave":"acido","etiqueta":"Ácido"},{"clave":"alcalino","etiqueta":"Alcalino"},{"clave":"amoniaco","etiqueta":"Amoníaco"},{"clave":"amonio_cuaternario","etiqueta":"Amonio cuaternario"},{"clave":"peroxido","etiqueta":"Peróxido"},{"clave":"solvente","etiqueta":"Solvente"},{"clave":"otro","etiqueta":"Otro"}]'::jsonb,
  version integer not null default 1,
  configurado boolean not null default false,
  actualizado_en timestamptz not null default now()
);
insert into public.parametros_sistema (id) values (1) on conflict (id) do nothing;
alter table public.parametros_sistema enable row level security;
drop policy if exists parametros_sistema_demo on public.parametros_sistema;
create policy parametros_sistema_demo on public.parametros_sistema for all to anon, authenticated using (true) with check (true);

create or replace function public.versionar_parametros_sistema()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tolerancia_sobredosis_pct is distinct from old.tolerancia_sobredosis_pct or new.rango_ph_descarga is distinct from old.rango_ph_descarga or new.min_repeticiones is distinct from old.min_repeticiones or new.vocabulario_categorias is distinct from old.vocabulario_categorias then
    new.version := old.version + 1;
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;
drop trigger if exists versionar_parametros_sistema on public.parametros_sistema;
create trigger versionar_parametros_sistema before update on public.parametros_sistema
for each row execute function public.versionar_parametros_sistema();

create or replace function public.validar_vocabulario_parametros()
returns trigger language plpgsql set search_path = public as $$
declare
  claves text[];
begin
  if jsonb_typeof(new.vocabulario_categorias) <> 'array' or jsonb_array_length(new.vocabulario_categorias) <> 8 then
    raise exception 'El vocabulario debe declarar las ocho categorías químicas conocidas';
  end if;
  select array_agg(value->>'clave') into claves from jsonb_array_elements(new.vocabulario_categorias);
  if cardinality(array(select distinct unnest(claves))) <> 8
    or not (array['hipoclorito','acido','alcalino','amoniaco','amonio_cuaternario','peroxido','solvente','otro'] <@ claves)
    or exists (select 1 from jsonb_array_elements(new.vocabulario_categorias) v where nullif(btrim(v->>'etiqueta'), '') is null) then
    raise exception 'Categorías duplicadas o etiquetas vacías';
  end if;
  return new;
end;
$$;
drop trigger if exists validar_vocabulario_parametros on public.parametros_sistema;
create trigger validar_vocabulario_parametros before insert or update on public.parametros_sistema
for each row execute function public.validar_vocabulario_parametros();

create or replace function public.marcar_tareas_parametros_antiguos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.version > old.version then
    update public.tareas set configuracion_actualizada_despues = true where parametros_sistema_version < new.version;
  end if;
  return new;
end;
$$;
drop trigger if exists parametros_actualizados_marcar_tareas on public.parametros_sistema;
create trigger parametros_actualizados_marcar_tareas after update on public.parametros_sistema
for each row execute function public.marcar_tareas_parametros_antiguos();

create or replace function public.marcar_producto_incompleto()
returns trigger language plpgsql set search_path = public as $$
begin
  new.incompleto := cardinality(coalesce(new.categorias, '{}')) = 0
    or not coalesce(new.incompatibilidades_revisadas, false)
    or cardinality(coalesce(new.epp_requerido, '{}')) = 0
    or new.ph is null or nullif(btrim(new.concentracion_ph), '') is null or new.ph_medido_a_ml_por_litro is null
    or nullif(btrim(new.url_ficha_tecnica), '') is null or nullif(btrim(new.url_hoja_seguridad), '') is null;
  if tg_op = 'UPDATE' and (
    new.nombre is distinct from old.nombre or new.tipo_quimico is distinct from old.tipo_quimico or
    new.categorias is distinct from old.categorias or new.incompatibilidades is distinct from old.incompatibilidades or
    new.dilucion_min_ml_por_litro is distinct from old.dilucion_min_ml_por_litro or
    new.dilucion_ml_por_litro is distinct from old.dilucion_ml_por_litro or
    new.dilucion_max_ml_por_litro is distinct from old.dilucion_max_ml_por_litro or
    new.epp_requerido is distinct from old.epp_requerido or new.incompatibilidades_revisadas is distinct from old.incompatibilidades_revisadas or
    new.unidad_dosis is distinct from old.unidad_dosis or new.ph is distinct from old.ph or
    new.concentracion_ph is distinct from old.concentracion_ph or new.ph_medido_a_ml_por_litro is distinct from old.ph_medido_a_ml_por_litro or
    new.url_ficha_tecnica is distinct from old.url_ficha_tecnica or new.url_hoja_seguridad is distinct from old.url_hoja_seguridad
  ) then
    new.ficha_version := old.ficha_version + 1;
    new.ficha_actualizada_en := now();
  end if;
  return new;
end;
$$;
drop trigger if exists marcar_producto_incompleto on public.productos;
create trigger marcar_producto_incompleto before insert or update on public.productos
for each row execute function public.marcar_producto_incompleto();
update public.productos set incompleto = true;

create or replace function public.marcar_tareas_configuracion_antigua()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tareas set configuracion_actualizada_despues = true
    where producto_id = new.id and new.ficha_version > old.ficha_version;
  return new;
end;
$$;
drop trigger if exists producto_actualizado_marcar_tareas on public.productos;
create trigger producto_actualizado_marcar_tareas after update on public.productos
for each row execute function public.marcar_tareas_configuracion_antigua();

create or replace function public.marcar_tareas_area_actualizada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.superficie_m2 is distinct from old.superficie_m2 or new.litros_solucion_por_m2 is distinct from old.litros_solucion_por_m2 or new.tipo_superficie is distinct from old.tipo_superficie or new.criterios_limpieza is distinct from old.criterios_limpieza then
    update public.tareas set configuracion_actualizada_despues = true where area_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists area_actualizada_marcar_tareas on public.areas;
create trigger area_actualizada_marcar_tareas after update on public.areas
for each row execute function public.marcar_tareas_area_actualizada();

create or replace function public.validar_tarea_configuracion_operativa()
returns trigger language plpgsql set search_path = public as $$
declare
  area_row record;
  p record;
  component jsonb;
  version_sistema integer;
begin
  select version into version_sistema from public.parametros_sistema where id = 1;
  if not found or new.parametros_sistema_version <> version_sistema then
    raise exception 'Los parámetros del sistema cambiaron; vuelve a cargar la configuración antes de registrar';
  end if;
  select id, superficie_m2, litros_solucion_por_m2, criterios_limpieza into area_row from public.areas where id = new.area_id;
  if not found or area_row.litros_solucion_por_m2 is null or area_row.litros_solucion_por_m2 <= 0 or cardinality(coalesce(area_row.criterios_limpieza, '{}')) = 0 then
    raise exception 'Área incompleta: configure tasa L/m² y criterios de limpieza con supervisión';
  end if;
  for component in select value from jsonb_array_elements(new.productos_receta) loop
    select * into p from public.productos where id = (component->>'producto_id')::uuid;
    if not found or p.incompleto then
      raise exception 'Producto incompleto o no habilitado. El supervisor debe completar su ficha técnica';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validar_tarea_configuracion_operativa on public.tareas;
create trigger validar_tarea_configuracion_operativa before insert or update of area_id, productos_receta on public.tareas
for each row execute function public.validar_tarea_configuracion_operativa();
