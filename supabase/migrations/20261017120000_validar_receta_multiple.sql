alter table public.tareas
  add column if not exists productos_receta jsonb not null default '[]'::jsonb;
alter table public.productos
  add column if not exists epp_requerido text[] not null default '{}';

create or replace function public.validar_productos_receta_tarea()
returns trigger language plpgsql set search_path = public as $$
declare
  item jsonb;
  prod record;
  otro record;
  area_base numeric;
  total_producto numeric;
begin
  if jsonb_typeof(new.productos_receta) <> 'array' or jsonb_array_length(new.productos_receta) = 0 then
    raise exception 'La receta requiere al menos un producto';
  end if;
  select superficie_m2 * litros_solucion_por_m2 into area_base
    from public.areas where id = new.area_id and litros_solucion_por_m2 is not null;
  if area_base is null or abs(area_base - new.litros_solucion_esperados) > 0.01 then
    raise exception 'El volumen esperado debe corresponder al área seleccionada';
  end if;
  for item in select value from jsonb_array_elements(new.productos_receta) loop
    if jsonb_typeof(item->'producto_id') <> 'string'
      or jsonb_typeof(item->'ml_por_litro') <> 'number'
      or jsonb_typeof(item->'ml_producto') <> 'number' then
      raise exception 'Cada producto requiere identificador y dosis numéricas válidas';
    end if;
    select id, categorias, incompatibilidades, dilucion_min_ml_por_litro, dilucion_max_ml_por_litro
      into prod from public.productos where id = (item->>'producto_id')::uuid;
    if not found then
      raise exception 'Producto inexistente en la receta';
    end if;
    if coalesce(array_length(prod.categorias, 1), 0) = 0 or prod.incompatibilidades is null
      or not (prod.categorias <@ array['hipoclorito','acido','alcalino','amoniaco','amonio_cuaternario','peroxido','solvente','otro']::text[])
      or not (prod.incompatibilidades <@ array['hipoclorito','acido','alcalino','amoniaco','amonio_cuaternario','peroxido','solvente','otro']::text[]) then
      raise exception 'Producto inexistente o sin categorías químicas completas';
    end if;
    if (item->>'ml_por_litro')::numeric < prod.dilucion_min_ml_por_litro
      or (item->>'ml_por_litro')::numeric > prod.dilucion_max_ml_por_litro
      or (item->>'ml_producto')::numeric < 1
      or abs((item->>'ml_producto')::numeric - new.litros_solucion_esperados * (item->>'ml_por_litro')::numeric) > 0.01 then
      raise exception 'Dosis del producto fuera del rango permitido';
    end if;
    for otro in select p.id, p.categorias, p.incompatibilidades from public.productos p
      where p.id in (select (value->>'producto_id')::uuid from jsonb_array_elements(new.productos_receta))
        and p.id <> prod.id loop
      if prod.incompatibilidades && otro.categorias or otro.incompatibilidades && prod.categorias then
        raise exception 'Incompatibilidad química: no mezclar productos en el mismo tanque';
      end if;
    end loop;
  end loop;
  if new.producto_id <> (new.productos_receta->0->>'producto_id')::uuid then
    raise exception 'El producto principal debe corresponder al primer componente de la receta';
  end if;
  select sum((value->>'ml_producto')::numeric) into total_producto
    from jsonb_array_elements(new.productos_receta);
  if total_producto > area_base * 1000 then
    raise exception 'El volumen total de producto excede el volumen base disponible';
  end if;
  if abs(new.ml_producto_esperados - (new.productos_receta->0->>'ml_producto')::numeric) > 0.01 then
    raise exception 'La cantidad esperada del producto principal no corresponde a la receta';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_productos_receta_tarea on public.tareas;
create trigger validar_productos_receta_tarea
before insert or update of productos_receta, producto_id on public.tareas
for each row execute function public.validar_productos_receta_tarea();
