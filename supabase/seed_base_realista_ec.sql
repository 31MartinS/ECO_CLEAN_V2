-- Seed inicial basado en páginas públicas de proveedores ecuatorianos.
-- Ejecutar después de bootstrap_ecocleaner.sql.
-- El sitio es genérico, sin afiliación a una universidad concreta.
-- No crea áreas, tareas, consumos, evaluaciones ni decisiones de efluente:
-- esos datos deben venir del laboratorio y de sus mediciones reales.
begin;

insert into public.sitios (id, nombre, tipo, criterios_limpieza)
values (
  '10000000-0000-4000-8000-000000000001',
  'Laboratorio Institucional de Análisis Ambiental',
  'Laboratorio universitario de análisis ambiental',
  '[]'::jsonb
)
on conflict (id) do update set nombre = excluded.nombre, tipo = excluded.tipo;

-- Los rangos y atributos se copian de las páginas enlazadas. Los valores
-- que el proveedor no publica (HDS, pH de dilución y compatibilidad) quedan
-- vacíos. Por eso el trigger deja todas estas fichas incompletas y bloquea
-- su uso operativo hasta que el supervisor las complete y valide.
insert into public.productos (
  id, nombre, dilucion_ml_por_litro, dilucion_min_ml_por_litro,
  dilucion_max_ml_por_litro, dilucion_texto_ficha, tipo_quimico,
  categorias, incompatibilidades, incompatibilidades_revisadas,
  ph, concentracion_ph, ph_medido_a_ml_por_litro,
  indicaciones_disposicion, url_ficha_tecnica, url_hoja_seguridad,
  epp_requerido, biodegradable
)
values
(
  '30000000-0000-4000-8000-000000000001',
  'CLEANER 2000 - detergente neutro multiusos (SERQUIN)',
  10, 10, 50,
  'SERQUIN: 1-5 L por cada 100 L según suciedad (10-50 ml/L). Dosis para cada tarea requiere validación local. Fuente: https://www.serquinec.com/cleaner-2000-detergente-multiusos-neutro',
  'Detergente neutro con surfactantes y desengrasantes',
  array['otro']::text[], array[]::text[], false,
  7, null, null, null,
  null,
  null, array[]::text[], true
),
(
  '30000000-0000-4000-8000-000000000002',
  'MILKLEEN 1 ALKALINE - detergente alcalino (SERQUIN)',
  6.25, 6.25, 90,
  'SERQUIN: 0.5 L/80 L para equipos (6.25 ml/L); también publica dosis específicas de proceso de 35-90 ml/L. Confirmar aplicación concreta. Fuente: https://www.serquinec.com/milkleen-1-alkaline-detergente-alcalino-industria',
  'Detergente alcalino concentrado',
  array['alcalino']::text[], array[]::text[], false,
  null, null, null, null,
  null,
  null, array['Mascarilla','Gafas de protección','Guantes'], true
),
(
  '30000000-0000-4000-8000-000000000003',
  'MILKLEEN 2 ACID - detergente ácido (SERQUIN)',
  5, 5, 6.25,
  'SERQUIN: 0.5 L/100 L (5 ml/L) o 0.5 L/80 L (6.25 ml/L) según aplicación. Sigue lavado alcalino y enjuague; no mezclar en tanque. Fuente: https://www.serquinec.com/milkleen-2-acid-detergente-acido-para-industria-alimenticia',
  'Detergente ácido concentrado',
  array['acido']::text[], array[]::text[], false,
  null, null, null, null,
  null,
  null, array[]::text[], true
),
(
  '30000000-0000-4000-8000-000000000004',
  'BANALAC - detergente multiuso biodegradable (Tecnoquim)',
  25, 25, 33.333333,
  'Tecnoquim: dilución 1:30 para desinfección y 1:30 o 1:40 para suciedad normal. Conversión aproximada a 33.33 y 25 ml/L; confirmar convención con proveedor. Fuente: https://tecnoquim.com.ec/index.php/hikashop-menu-for-brands-listing/product/44-banalac',
  'Detergente multiuso neutro',
  array['otro']::text[], array[]::text[], false,
  null, null, null, null,
  null,
  null, array[]::text[], true
)
on conflict (id) do update set
  nombre = excluded.nombre,
  dilucion_ml_por_litro = excluded.dilucion_ml_por_litro,
  dilucion_min_ml_por_litro = excluded.dilucion_min_ml_por_litro,
  dilucion_max_ml_por_litro = excluded.dilucion_max_ml_por_litro,
  dilucion_texto_ficha = excluded.dilucion_texto_ficha,
  tipo_quimico = excluded.tipo_quimico,
  categorias = excluded.categorias,
  incompatibilidades = excluded.incompatibilidades,
  incompatibilidades_revisadas = excluded.incompatibilidades_revisadas,
  ph = excluded.ph,
  concentracion_ph = excluded.concentracion_ph,
  ph_medido_a_ml_por_litro = excluded.ph_medido_a_ml_por_litro,
  indicaciones_disposicion = excluded.indicaciones_disposicion,
  url_ficha_tecnica = excluded.url_ficha_tecnica,
  url_hoja_seguridad = excluded.url_hoja_seguridad,
  epp_requerido = excluded.epp_requerido,
  biodegradable = excluded.biodegradable;

commit;
