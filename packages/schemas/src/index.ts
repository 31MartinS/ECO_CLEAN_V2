import { z } from 'zod';

export const CATEGORIAS_QUIMICAS = [
    'hipoclorito', 'acido', 'alcalino', 'amoniaco',
    'amonio_cuaternario', 'peroxido', 'solvente', 'otro',
] as const;
export const CategoriaQuimicaSchema = z.enum(CATEGORIAS_QUIMICAS);

export const NivelSuciedadSchema = z.enum(['baja', 'media', 'alta']);
export const OrientacionSchema = z.enum(['verter', 'ajustar', 'reutilizar', 'gestor', 'no_disponible']);
export const DecisionFinalSchema = z.enum(['verter', 'ajustar', 'reutilizar', 'gestor']);

export const ROL_USUARIOS = ['operario', 'revisor', 'supervisor'] as const;
export const RolSchema = z.enum(ROL_USUARIOS);

export const ProfileSchema = z.object({
    id: z.string().uuid(),
    nombre: z.string().nullable().optional(),
    rol: RolSchema,
    created_at: z.string().optional(),
});

export const ESTADOS_TAREA = ['receta_enviada', 'completada'] as const;
export const EstadoTareaSchema = z.enum(ESTADOS_TAREA);

export const SitioSchema = z.object({
    id: z.string().uuid().optional(),
    nombre: z.string().min(2),
    tipo: z.string(),
    criterios_limpieza: z.array(z.string().min(3)).default([]),
    created_at: z.string().optional(),
});

export const AreaSchema = z.object({
    id: z.string().uuid().optional(),
    sitio_id: z.string().uuid(),
    nombre: z.string().min(2),
    superficie_m2: z.number().positive(),
    tipo_superficie: z.string(),
    criterios_limpieza: z.array(z.string().min(3)).optional(),
    litros_solucion_por_m2: z.number().positive().nullable().optional(),
    qr_path: z.string().nullable().optional(),
    created_at: z.string().optional(),
});

export const ProductoBaseSchema = z.object({
    id: z.string().uuid().optional(),
    nombre: z.string().min(2),
    tipo_quimico: z.string().nullable().optional(),
    categorias: z.array(CategoriaQuimicaSchema).default([]),
    incompatibilidades: z.array(CategoriaQuimicaSchema).default([]),
    epp_requerido: z.array(z.string().min(1)).optional(),
    biodegradable: z.boolean().optional(),
    incompleto: z.boolean().optional(),
    incompatibilidades_revisadas: z.boolean().optional(),
    unidad_dosis: z.literal('ml/L').optional(),
    ficha_version: z.number().int().positive().optional(),
    ficha_actualizada_en: z.string().optional(),
    dilucion_min_ml_por_litro: z.number().positive(),
    dilucion_ml_por_litro: z.number().positive(),
    dilucion_max_ml_por_litro: z.number().positive(),
    dilucion_texto_ficha: z.string().nullable().optional(),
    ph: z.number().min(0).max(14).nullable().optional(),
    concentracion_ph: z.string().nullable().optional(),
    ph_medido_a_ml_por_litro: z.number().positive().nullable().optional(),
    indicaciones_disposicion: z.string().nullable().optional(),
    url_ficha_tecnica: z.string().url().nullable().optional(),
    url_hoja_seguridad: z.string().url().nullable().optional(),
    created_at: z.string().optional(),
});

export const ProductoSchema = ProductoBaseSchema.refine(
    (p) =>
        p.dilucion_min_ml_por_litro <= p.dilucion_ml_por_litro &&
        p.dilucion_ml_por_litro <= p.dilucion_max_ml_por_litro,
    { message: 'Debe cumplirse mínimo ≤ recomendada ≤ máximo', path: ['dilucion_ml_por_litro'] }
);

export const TareaSchema = z.object({
    id: z.string().uuid().optional(),
    area_id: z.string().uuid(),
    producto_id: z.string().uuid(),
    productos_receta: z.array(z.object({ producto_id: z.string().uuid(), ml_por_litro: z.number().positive(), ml_producto: z.number().positive() })).optional(),
    procedencia_configuracion: z.record(z.string(), z.unknown()).optional(),
    validaciones_receta: z.array(z.string()).optional(),
    nivel_suciedad: NivelSuciedadSchema,
    litros_solucion_esperados: z.number().positive(),
    ml_producto_esperados: z.number().positive(),
    estado: EstadoTareaSchema.default('receta_enviada'),
    hora_inicio: z.string().nullable().optional(),
    tiempo_estimado_min: z.number().int().positive().nullable().optional(),
    operario_id: z.string().uuid().nullable().optional(),
    revisor_id: z.string().uuid().nullable().optional(),
    validada_en: z.string().nullable().optional(),
    created_at: z.string().optional(),
});

export const ParametrosSistemaSchema = z.object({
    tolerancia_sobredosis_pct: z.number().min(0).max(100),
    rango_ph_descarga: z.object({ min: z.number().min(0).max(14), max: z.number().min(0).max(14) }),
    min_repeticiones: z.number().int().positive(),
    vocabulario_categorias: z.array(z.object({ clave: CategoriaQuimicaSchema, etiqueta: z.string().min(1) })),
    configurado: z.boolean().default(false),
}).refine((p) => p.rango_ph_descarga.min < p.rango_ph_descarga.max, { path: ['rango_ph_descarga'], message: 'El rango mínimo debe ser menor que el máximo.' });
export type ParametrosSistema = z.infer<typeof ParametrosSistemaSchema>;

export const VarianteSchema = z.object({
    id: z.string().uuid().optional(),
    tarea_id: z.string().uuid(),
    nombre: z.string(),
    dilucion_ml_por_litro: z.number().positive(),
    repeticiones: z.number().int().positive().default(1),
    created_at: z.string().optional(),
});

export const RegistroUsoSchema = z.object({
    id: z.string().uuid().optional(),
    tarea_id: z.string().uuid(),
    variante_id: z.string().uuid().nullable().optional(),
    litros_agua_reales: z.number().positive(),
    ml_producto_reales: z.number().nonnegative(),
    duracion_min: z.number().positive().nullable().optional(),
    marca: z.enum(['medido', 'estimado']),
    fuente: z.enum(['manual', 'simulada', 'sensor']),
    alerta_sobredosis: z.boolean().default(false),
    validado_por: z.string().uuid().nullable().optional(),
    validado_en: z.string().nullable().optional(),
    declarado_operario: z.record(z.string(), z.unknown()).nullable().optional(),
    created_at: z.string().optional(),
});

export const CriterioEvaluadoSchema = z.object({
    criterio: z.string(),
    cumple: z.boolean(),
});

export const ResultadoSchema = z.object({
    id: z.string().uuid().optional(),
    registro_uso_id: z.string().uuid(),
    cumple_criterio: z.boolean(),
    criterios_evaluados: z.array(CriterioEvaluadoSchema).nullable().optional(),
    observaciones: z.string().nullable().optional(),
    created_at: z.string().optional(),
});

export const DecisionEfluenteSchema = z.object({
    id: z.string().uuid().optional(),
    resultado_id: z.string().uuid(),
    orientacion: OrientacionSchema,
    decision_final: DecisionFinalSchema,
    ph_estimado: z.number().min(0).max(14).nullable().optional(),
    observaciones: z.string().nullable().optional(),
    created_at: z.string().optional(),
});

export type CategoriaQuimica = z.infer<typeof CategoriaQuimicaSchema>;
export type NivelSuciedad = z.infer<typeof NivelSuciedadSchema>;
export type Orientacion = z.infer<typeof OrientacionSchema>;
export type DecisionFinal = z.infer<typeof DecisionFinalSchema>;
export type Rol = z.infer<typeof RolSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type EstadoTarea = z.infer<typeof EstadoTareaSchema>;
export type Sitio = z.infer<typeof SitioSchema>;
export type Area = z.infer<typeof AreaSchema>;
export type Producto = z.infer<typeof ProductoSchema>;
export type Tarea = z.infer<typeof TareaSchema>;
export type Variante = z.infer<typeof VarianteSchema>;
export type RegistroUso = z.infer<typeof RegistroUsoSchema>;
export type Resultado = z.infer<typeof ResultadoSchema>;
export type DecisionEfluente = z.infer<typeof DecisionEfluenteSchema>;
