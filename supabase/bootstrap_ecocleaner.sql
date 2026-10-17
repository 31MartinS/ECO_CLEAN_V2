-- EcoCleaner: esquema inicial para un PROYECTO SUPABASE NUEVO.
-- No ejecutar sobre una base con datos existentes: este script no hace DROP,
-- pero las tablas deben crearse vacías. Mantiene el acceso anon abierto que
-- requiere el login local de demostración actual; no es una política de producción.
begin;

create extension if not exists pgcrypto with schema extensions;

create table public.sitios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  criterios_limpieza jsonb not null default '[]'::jsonb check (jsonb_typeof(criterios_limpieza) = 'array'),
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  sitio_id uuid not null references public.sitios(id) on delete cascade,
  nombre text not null,
  superficie_m2 numeric not null check (superficie_m2 > 0),
  tipo_superficie text not null,
  litros_solucion_por_m2 numeric check (litros_solucion_por_m2 is null or litros_solucion_por_m2 > 0),
  criterios_limpieza text[] not null default '{}',
  qr_path text generated always as ('/areas/' || id::text) stored,
  created_at timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dilucion_ml_por_litro numeric not null,
  ph numeric check (ph is null or ph between 0 and 14),
  concentracion_ph text,
  incompatibilidades text[] not null default '{}',
  dilucion_min_ml_por_litro numeric not null,
  dilucion_max_ml_por_litro numeric not null,
  dilucion_texto_ficha text,
  tipo_quimico text,
  categorias text[] not null default '{}',
  ph_medido_a_ml_por_litro numeric,
  indicaciones_disposicion text,
  url_ficha_tecnica text,
  url_hoja_seguridad text,
  epp_requerido text[] not null default '{}',
  biodegradable boolean not null default false,
  incompleto boolean not null default true,
  incompatibilidades_revisadas boolean not null default false,
  unidad_dosis text not null default 'ml/L',
  ficha_version integer not null default 1 check (ficha_version > 0),
  ficha_actualizada_en timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint productos_dilucion_rango_chk check (
    dilucion_min_ml_por_litro > 0 and
    dilucion_min_ml_por_litro <= dilucion_ml_por_litro and
    dilucion_ml_por_litro <= dilucion_max_ml_por_litro
  )
);

-- Los IDs de usuario son de public.usuarios (demo/local), no de auth.users.
-- Por eso estas columnas intencionalmente no tienen FK a Supabase Auth.
create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  rol text not null check (rol in ('operario','revisor','supervisor')),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- Compatibilidad de lectura con el lookup heredado de rol. No está vinculado
-- a auth.users porque la sesión actual usa IDs de usuario de demostración.
create table public.profiles (
  id uuid primary key,
  rol text not null check (rol in ('operario','revisor','supervisor')),
  created_at timestamptz not null default now()
);

create table public.parametros_sistema (
  id smallint primary key default 1 check (id = 1),
  tolerancia_sobredosis_pct numeric not null default 10 check (tolerancia_sobredosis_pct between 0 and 100),
  rango_ph_descarga jsonb not null default '{"min":6,"max":9}'::jsonb,
  min_repeticiones integer not null default 3 check (min_repeticiones > 0),
  vocabulario_categorias jsonb not null default '[{"clave":"hipoclorito","etiqueta":"Hipoclorito"},{"clave":"acido","etiqueta":"Ácido"},{"clave":"alcalino","etiqueta":"Alcalino"},{"clave":"amoniaco","etiqueta":"Amoníaco"},{"clave":"amonio_cuaternario","etiqueta":"Amonio cuaternario"},{"clave":"peroxido","etiqueta":"Peróxido"},{"clave":"solvente","etiqueta":"Solvente"},{"clave":"otro","etiqueta":"Otro"}]'::jsonb,
  version integer not null default 1,
  configurado boolean not null default false,
  actualizado_en timestamptz not null default now(),
  constraint parametros_ph_rango_chk check (
    (rango_ph_descarga->>'min')::numeric >= 0 and
    (rango_ph_descarga->>'min')::numeric < (rango_ph_descarga->>'max')::numeric and
    (rango_ph_descarga->>'max')::numeric <= 14
  )
);

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  productos_receta jsonb not null default '[]'::jsonb,
  procedencia_configuracion jsonb not null default '{}'::jsonb,
  validaciones_receta text[] not null default '{}',
  parametros_sistema_version integer not null default 1,
  configuracion_actualizada_despues boolean not null default false,
  tipo_tarea text,
  nivel_suciedad text check (nivel_suciedad in ('baja','media','alta')),
  litros_solucion_esperados numeric not null check (litros_solucion_esperados > 0),
  ml_producto_esperados numeric not null check (ml_producto_esperados > 0),
  estado text not null default 'receta_enviada' check (estado in ('receta_enviada','completada')),
  hora_inicio timestamptz not null default now(),
  tiempo_estimado_min numeric check (tiempo_estimado_min is null or tiempo_estimado_min > 0),
  operario_id uuid,
  revisor_id uuid,
  validada_en timestamptz,
  created_at timestamptz not null default now(),
  constraint tarea_receta_array_chk check (jsonb_typeof(productos_receta) = 'array')
);

create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  nombre text not null,
  dilucion_ml_por_litro numeric not null check (dilucion_ml_por_litro > 0),
  repeticiones integer not null default 1 check (repeticiones > 0),
  created_at timestamptz not null default now()
);

create table public.registros_uso (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  variante_id uuid references public.variantes(id) on delete set null,
  litros_agua_reales numeric not null check (litros_agua_reales > 0),
  ml_producto_reales numeric not null check (ml_producto_reales >= 0),
  duracion_min numeric check (duracion_min is null or duracion_min >= 0),
  marca text not null check (marca in ('medido','estimado')),
  fuente text not null check (fuente in ('manual','simulada','sensor')),
  alerta_sobredosis boolean not null default false,
  validado_por uuid,
  validado_en timestamptz,
  declarado_operario jsonb,
  created_at timestamptz not null default now()
);

create table public.resultados (
  id uuid primary key default gen_random_uuid(),
  registro_uso_id uuid not null unique references public.registros_uso(id) on delete cascade,
  cumple_criterio boolean not null,
  criterios_evaluados jsonb,
  observaciones text,
  created_at timestamptz not null default now()
);

create table public.decisiones_efluente (
  id uuid primary key default gen_random_uuid(),
  resultado_id uuid not null unique references public.resultados(id) on delete cascade,
  orientacion text not null check (orientacion in ('verter','ajustar','reutilizar','gestor','no_disponible')),
  decision_final text not null check (decision_final in ('verter','ajustar','reutilizar','gestor')),
  ph_estimado numeric check (ph_estimado is null or ph_estimado between 0 and 14),
  observaciones text,
  created_at timestamptz not null default now()
);

create index areas_sitio_id_idx on public.areas(sitio_id);
create index tareas_area_id_idx on public.tareas(area_id);
create index tareas_producto_id_idx on public.tareas(producto_id);
create index variantes_tarea_id_idx on public.variantes(tarea_id);
create index registros_tarea_id_idx on public.registros_uso(tarea_id);
create index registros_variante_id_idx on public.registros_uso(variante_id);
create index tareas_created_at_idx on public.tareas(created_at desc);
create index registros_created_at_idx on public.registros_uso(created_at desc);

insert into public.parametros_sistema (id) values (1) on conflict (id) do nothing;

-- Producto marcado como incompleto hasta reunir ficha de seguridad, EPP,
-- compatibilidad y datos fisicoquímicos requeridos.
create or replace function public.marcar_producto_incompleto()
returns trigger language plpgsql set search_path = public as $$
begin
  new.incompleto := cardinality(coalesce(new.categorias, '{}')) = 0
    or not coalesce(new.incompatibilidades_revisadas, false)
    or cardinality(coalesce(new.epp_requerido, '{}')) = 0
    or new.ph is null or nullif(btrim(new.concentracion_ph), '') is null
    or new.ph_medido_a_ml_por_litro is null
    or nullif(btrim(new.url_ficha_tecnica), '') is null
    or nullif(btrim(new.url_hoja_seguridad), '') is null;
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
end $$;
create trigger marcar_producto_incompleto before insert or update on public.productos
for each row execute function public.marcar_producto_incompleto();

create or replace function public.versionar_parametros_sistema()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tolerancia_sobredosis_pct is distinct from old.tolerancia_sobredosis_pct
    or new.rango_ph_descarga is distinct from old.rango_ph_descarga
    or new.min_repeticiones is distinct from old.min_repeticiones
    or new.vocabulario_categorias is distinct from old.vocabulario_categorias then
    new.version := old.version + 1;
    new.actualizado_en := now();
  end if;
  return new;
end $$;
create trigger versionar_parametros_sistema before update on public.parametros_sistema
for each row execute function public.versionar_parametros_sistema();

create or replace function public.marcar_tareas_parametros_antiguos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.version > old.version then
    update public.tareas set configuracion_actualizada_despues = true
      where parametros_sistema_version < new.version;
  end if;
  return new;
end $$;
create trigger parametros_actualizados_marcar_tareas after update on public.parametros_sistema
for each row execute function public.marcar_tareas_parametros_antiguos();

create or replace function public.marcar_tareas_area_actualizada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.superficie_m2 is distinct from old.superficie_m2
    or new.litros_solucion_por_m2 is distinct from old.litros_solucion_por_m2
    or new.tipo_superficie is distinct from old.tipo_superficie
    or new.criterios_limpieza is distinct from old.criterios_limpieza then
    update public.tareas set configuracion_actualizada_despues = true where area_id = new.id;
  end if;
  return new;
end $$;
create trigger area_actualizada_marcar_tareas after update on public.areas
for each row execute function public.marcar_tareas_area_actualizada();

create or replace function public.marcar_tareas_producto_actualizado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ficha_version > old.ficha_version then
    update public.tareas set configuracion_actualizada_despues = true
      where producto_id = new.id;
  end if;
  return new;
end $$;
create trigger producto_actualizado_marcar_tareas after update on public.productos
for each row execute function public.marcar_tareas_producto_actualizado();

create or replace function public.validar_tarea_configuracion_operativa()
returns trigger language plpgsql set search_path = public as $$
declare area_row record; producto_row record; component jsonb; version_sistema integer;
begin
  select version into version_sistema from public.parametros_sistema where id = 1;
  if version_sistema is null or new.parametros_sistema_version <> version_sistema then
    raise exception 'Los parámetros del sistema cambiaron; vuelve a cargar la configuración antes de registrar';
  end if;
  select * into area_row from public.areas where id = new.area_id;
  if not found or area_row.litros_solucion_por_m2 is null or area_row.litros_solucion_por_m2 <= 0
    or cardinality(coalesce(area_row.criterios_limpieza, '{}')) = 0 then
    raise exception 'Área incompleta: configure tasa L/m² y criterios de limpieza';
  end if;
  if jsonb_typeof(new.productos_receta) <> 'array' or jsonb_array_length(new.productos_receta) = 0 then
    raise exception 'La receta requiere al menos un producto';
  end if;
  for component in select value from jsonb_array_elements(new.productos_receta) loop
    if jsonb_typeof(component->'producto_id') <> 'string'
      or jsonb_typeof(component->'ml_por_litro') <> 'number'
      or jsonb_typeof(component->'ml_producto') <> 'number' then
      raise exception 'Cada producto requiere identificador y dosis numéricas válidas';
    end if;
    select * into producto_row from public.productos where id = (component->>'producto_id')::uuid;
    if not found or producto_row.incompleto then
      raise exception 'Producto incompleto o no habilitado';
    end if;
    if producto_row.biodegradable is not true then
      raise exception 'El producto no está habilitado como biodegradable';
    end if;
    if (component->>'ml_por_litro')::numeric < producto_row.dilucion_min_ml_por_litro
      or (component->>'ml_por_litro')::numeric > producto_row.dilucion_max_ml_por_litro
      or (component->>'ml_producto')::numeric <= 0
      or abs((component->>'ml_producto')::numeric - new.litros_solucion_esperados * (component->>'ml_por_litro')::numeric) > 0.01 then
      raise exception 'Dosis del producto fuera del rango permitido';
    end if;
    if producto_row.categorias && producto_row.incompatibilidades then
      raise exception 'Incompatibilidad química del producto';
    end if;
  end loop;
  if new.producto_id <> (new.productos_receta->0->>'producto_id')::uuid then
    raise exception 'El producto principal debe corresponder al primer componente de la receta';
  end if;
  if abs(new.litros_solucion_esperados - area_row.superficie_m2 * area_row.litros_solucion_por_m2) > 0.01 then
    raise exception 'El volumen esperado no corresponde al área';
  end if;
  return new;
end $$;
create trigger validar_tarea_configuracion_operativa before insert or update of area_id, productos_receta
on public.tareas for each row execute function public.validar_tarea_configuracion_operativa();

create or replace function public.validar_productos_receta_tarea()
returns trigger language plpgsql set search_path = public as $$
declare item jsonb; prod record; otro record; area_base numeric; total_producto numeric;
begin
  select superficie_m2 * litros_solucion_por_m2 into area_base from public.areas
    where id = new.area_id and litros_solucion_por_m2 is not null;
  if area_base is null or abs(area_base - new.litros_solucion_esperados) > 0.01 then
    raise exception 'El volumen esperado debe corresponder al área seleccionada';
  end if;
  for item in select value from jsonb_array_elements(new.productos_receta) loop
    select id, categorias, incompatibilidades into prod from public.productos where id = (item->>'producto_id')::uuid;
    for otro in select p.id, p.categorias, p.incompatibilidades from public.productos p
      where p.id in (select (value->>'producto_id')::uuid from jsonb_array_elements(new.productos_receta)) and p.id <> prod.id loop
      if prod.incompatibilidades && otro.categorias or otro.incompatibilidades && prod.categorias then
        raise exception 'Incompatibilidad química: no mezclar productos en el mismo tanque';
      end if;
    end loop;
  end loop;
  select sum((value->>'ml_producto')::numeric) into total_producto from jsonb_array_elements(new.productos_receta);
  if total_producto > area_base * 1000 then raise exception 'El volumen total de producto excede el volumen disponible'; end if;
  if abs(new.ml_producto_esperados - (new.productos_receta->0->>'ml_producto')::numeric) > 0.01 then
    raise exception 'La dosis principal no corresponde a la receta';
  end if;
  return new;
end $$;
create trigger validar_productos_receta_tarea before insert or update of productos_receta, producto_id
on public.tareas for each row execute function public.validar_productos_receta_tarea();

create or replace function public.validar_tarea_transaccional(
  p_tarea_id uuid, p_litros_agua numeric, p_ml_producto numeric, p_marca text, p_fuente text,
  p_declarado_original jsonb, p_cumple_criterio boolean, p_criterios_evaluados jsonb,
  p_observaciones_resultado text, p_orientacion text, p_decision_final text,
  p_ph_estimado numeric, p_observaciones_efluente text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_reg_id uuid; v_res_id uuid; v_dec_id uuid; v_now timestamptz := now();
begin
  perform 1 from public.tareas where id = p_tarea_id for update;
  if not found then raise exception 'Tarea inexistente'; end if;
  select id into v_reg_id from public.registros_uso where tarea_id = p_tarea_id order by created_at desc limit 1 for update;
  if v_reg_id is null then
    insert into public.registros_uso(tarea_id, litros_agua_reales, ml_producto_reales, marca, fuente, validado_en, declarado_operario)
    values (p_tarea_id, p_litros_agua, p_ml_producto, p_marca, p_fuente, v_now, p_declarado_original) returning id into v_reg_id;
  else
    update public.registros_uso set litros_agua_reales=p_litros_agua, ml_producto_reales=p_ml_producto,
      marca=p_marca, fuente=p_fuente, validado_en=v_now, declarado_operario=p_declarado_original where id=v_reg_id;
  end if;
  insert into public.resultados(registro_uso_id,cumple_criterio,criterios_evaluados,observaciones)
  values(v_reg_id,p_cumple_criterio,p_criterios_evaluados,p_observaciones_resultado)
  on conflict(registro_uso_id) do update set cumple_criterio=excluded.cumple_criterio,
    criterios_evaluados=excluded.criterios_evaluados,observaciones=excluded.observaciones returning id into v_res_id;
  insert into public.decisiones_efluente(resultado_id,orientacion,decision_final,ph_estimado,observaciones)
  values(v_res_id,p_orientacion,p_decision_final,p_ph_estimado,p_observaciones_efluente)
  on conflict(resultado_id) do update set orientacion=excluded.orientacion,decision_final=excluded.decision_final,
    ph_estimado=excluded.ph_estimado,observaciones=excluded.observaciones returning id into v_dec_id;
  update public.tareas set estado='completada', validada_en=v_now where id=p_tarea_id;
  return jsonb_build_object('tarea_id',p_tarea_id,'registro_id',v_reg_id,'resultado_id',v_res_id,
    'decision_id',v_dec_id,'estado','completada','validada_en',v_now);
end $$;

-- RLS para que funcione el cliente anon del prototipo. Preserva el modo demo
-- solicitado, pero da acceso público completo a los datos de la aplicación.
do $$ declare t text; begin
  foreach t in array array['sitios','areas','productos','usuarios','profiles','parametros_sistema','tareas','variantes','registros_uso','resultados','decisiones_efluente'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='ecocleaner_demo_all') then
      execute format('create policy ecocleaner_demo_all on public.%I for all to anon, authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;
grant execute on function public.validar_tarea_transaccional(uuid,numeric,numeric,text,text,jsonb,boolean,jsonb,text,text,text,numeric,text) to anon, authenticated;

commit;
