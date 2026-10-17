# Especificación de Requisitos de Software (ERS) — versión 1.2

## EcoCleaner: guía de preparación y registro de limpieza

| Campo | Detalle |
|---|---|
| Versión | 1.2 — 16 de octubre de 2026 |
| Estado | Requisitos actualizados; no implica que estén implementados |
| Escenario | Hospital ficticio Nueva Aurora, sector Guamaní, Quito, Ecuador |
| Producto | Prototipo web móvil/PWA, React + Vite + TypeScript, Zod y Supabase |
| Flujo aprobado | Operario prepara su guía → ejecuta → registra el trabajo finalizado → revisor valida el registro |
| Límite | Demostración de software, no protocolo clínico ni autorización química o ambiental |

Esta versión sustituye los requisitos incompatibles de la v1.0: seis productos, dos roles sin acceso autenticado, incremento automático de dosis por suciedad y posible reúso del agua. La v1.0 se conserva al final **solo como archivo histórico**. Los identificadores RF/RNF se mantienen para trazabilidad; sus criterios vigentes son los de esta versión.

**Cambio v1.2 respecto de v1.1:** incorpora la meta de diseño frontend proporcionada por el responsable como fuente de verdad visual y de UX (§5.1–5.5): experiencias por rol, métricas compactas, colores semánticos compartidos, paginación, revisión en una sola superficie y estados sustentados en evidencia. Mantiene el escenario, las restricciones químicas y el flujo aprobado en v1.1. Son requisitos objetivo, no una declaración de implementación terminada.

**Alcance de esta edición:** actualizar únicamente este Markdown. `docs/plan-pruebas.md` y `docs/protocolo-mini-prueba.md` permanecen sin cambios y pendientes de alineación posterior. No se modifica código, base, rutas ni datos existentes mediante este documento.

## 1. Propósito, escenario y procedencia

La receta es una guía interna del operario. Distingue cantidades recomendadas por una instrucción, cantidades calculadas para la tarea y cantidades declaradas después de ejecutar. El revisor no aprueba recetas: valida el registro del trabajo terminado y deja trazabilidad de sus correcciones.

Nueva Aurora es un escenario ficticio con un único sitio activo en la demostración, sin eliminar el soporte multisitio ni su historial. Las salas se eligen desde listado, asignación o QR **antes** de entrar al calculador; sitio y área se conservan como contexto y relaciones de datos, no como selectores dentro de la receta.

Los datos llevan una procedencia explícita:

- **Documentado:** fuente identificable, versión y condiciones de aplicación revisadas.
- **Declarado:** aportado por entrevista o por el equipo, aún sin validación documental.
- **Simulado:** supuesto interno de demostración, nunca atribuido al fabricante ni usado como evidencia de eficacia, ahorro o cumplimiento legal.

Todas las tareas del escenario hospitalario tienen `fuente = simulada`, aunque representen una captura marcada como medida dentro del ejercicio. Una marca de medición no convierte una simulación en dato de campo.

No se ejecutan ensayos físicos en pacientes, dispositivos médicos ni áreas clínicas. La suciedad visible y un checklist no certifican desinfección. Las áreas asistenciales sin procedimiento sanitario validado se muestran como no habilitadas para crear recetas.

### 1.1 Salas y existencias iniciales: supuestos ficticios

Estos valores sirven para diseñar la demostración, no describen un hospital existente ni validan tasas técnicas.

| Área propuesta | Material supuesto | Superficie | Condición de uso |
|---|---|---|---|
| Sala administrativa | Cerámica sellada | 24 m² | Limpieza ambiental virtual; sin pacientes ni contaminación biológica |
| Sala de espera | Piso vinílico hospitalario | 48 m² | Tránsito y suciedad ligera virtual; autorización del material pendiente |
| Cuarto de mantenimiento | Hormigón sellado | 18 m² | Manchas localizadas simuladas; no confundir con superficie clínica |
| Sala de procedimientos | Piso epóxico | 30 m² | Escenario de bloqueo: procedimiento sanitario no validado |

Cada sala tiene sus propios criterios, material y procedimientos permitidos. Ejemplos exclusivamente visuales: ausencia de residuos visibles y de charcos. Los criterios de una sala no se copian automáticamente a todas las demás. Se añade vinílico al vocabulario de la demo como material, sin inferir autorización química.

| Producto candidato | Existencias ficticias iniciales | Unidad de control | Estado técnico inicial |
|---|---|---|---|
| ALKALIDEX | 12 bolsas de 20 g (240 g) | Bolsa íntegra / g | Identidad, instrucciones y autorización para pisos pendientes |
| Cloro Estrella PT290123 | 2 envases declarados de 3,785 L (7,570 L) | ml de producto | Confirmar correspondencia con Cloro Gel Estrella y ficha enlazada |
| Desengrasante Concentrado Textiquim | 1 envase de 3,785 L | ml de producto | Confirmar variante ZAKKA, dilución y HDS |

La presentación comercial no es el saldo disponible. Estos saldos deben mostrarse como **inventario simulado**, con fecha de carga. No se crea un inventario real a partir de los datos de una tienda.

### 1.2 Límites de la simulación técnica

Se simulan salas, existencias, recipientes y observaciones. No se fabrican HDS oficiales, aprobaciones sanitarias ni citas legales. La información comercial real y las hipótesis se almacenan por separado.

- ALKALIDEX: el equipo declaró 20 g en 4 L de agua y uso principal en dispositivos sumergibles. No sustituirlo por 20 ml ni interpretar esto como autorización para pisos. El significado de 0,5 % y el volumen final requieren documento.
- Cloro: la ficha comercial enlazada por Pintulac identifica Cloro Gel Estrella, revisión 0, fecha 15/03/2022. Indica contacto de 5–10 min, enjuague y guantes; expresa la dosis en «½ taza» y lista presentaciones distintas del galón. Esta discrepancia debe impedir usarla como receta automática hasta aclararla. Los 25/50 ml de la entrevista no sustituyen esa verificación.
- Desengrasante: el sitio del fabricante identifica Concentrado ZAKKA, 3785 ml y 20 L; no se inventa una dosis de uso para completar el catálogo.

Para demostrar el cálculo completo sin atribuir dosis inventadas a estos productos, se permite un **fixture separado de cálculo virtual**, no comercializable ni seleccionable como producto real: área 24 m², tasa ficticia 0,10 L de solución/m² y líquido ficticio a 10 ml/L final. Resultado matemático: 2,4 L finales, 24 ml de líquido y aproximadamente 2,376 L de agua. Recipiente ficticio: capacidad útil 5 L, resolución 1 ml para producto y 10 ml para agua. La interfaz debe advertir si no puede representar la cantidad con esos instrumentos, sin redondear silenciosamente la dosis. Este fixture no amplía el catálogo de tres productos ni habilita tareas hospitalarias reales.

Con los productos candidatos sin datos críticos, la demostración correcta es **mostrar el faltante y bloquear la creación**, no rellenarlo con una cifra que aparente provenir del fabricante.

## 2. Roles, estados y flujo obligatorio

| Rol | Responsabilidad |
|---|---|
| Operario | Elegir contexto, calcular guía, ejecutar y declarar consumo/tiempo efectivamente utilizados |
| Revisor | Validar únicamente registros de trabajos finalizados; evaluar criterios, observar y corregir con motivo |
| Supervisor | Administrar salas, catálogo, instrucciones y existencias; consultar panel y reporte |

Estados conceptuales propuestos, **todavía no equivalentes al esquema implementado**:

1. Formulario incompleto o bloqueado: no existe receta utilizable ni tarea enviada.
2. Guía calculada: información suficiente y sin bloqueos; no altera existencias ni entra a revisión.
3. En ejecución: operario inicia el trabajo; conserva la instantánea de instrucciones y cantidades previstas.
4. Trabajo finalizado pendiente de revisión: operario captura y envía cantidades reales, unidad, tiempo, marca y fuente.
5. Registro validado u observado: revisor registra evaluación y motivo; una corrección conserva la declaración original.

Guardar una guía no debe crear `registros_uso`. No prellenar cantidades reales ni duración real con valores previstos y marcarlos como medidos. El revisor no debe crear una declaración faltante tomando la receta como sustituto.

## 3. Requisitos funcionales vigentes

Prioridad P0: flujo esencial. P1: funciones complementarias existentes que se conservan sin ampliarlas en esta reestructuración.

| ID | Requisito y criterio de aceptación | Prioridad |
|---|---|---|
| RF-01 | Configurar Nueva Aurora y sus salas con requisitos independientes. Sitio/área desaparecen del formulario de receta, pero su contexto, relaciones, QR e historial se conservan; un contexto inválido no selecciona otra sala silenciosamente. | P0 |
| RF-02 | Catálogo de tres candidatos con presentación, unidades, documentos y procedencia. Tarjetas muestran saldo, disponibilidad, función e información técnica disponible; la falta de datos no se representa como aprobación. Documentos accesibles por mecanismo secundario, sin botones FT/HDS en la vista principal. | P0 |
| RF-03 | Calcular dinámicamente por superficie, método e instrucción aplicable. Sin control manual de L/m² ni tasa universal de respaldo. Separar agua, concentrado y solución final; no aumentar concentración por suciedad. | P0 |
| RF-04 | Operario captura cantidades y duración después del trabajo, con unidad, marca y fuente; guarda y envía el registro finalizado. Cantidades previstas y declaradas permanecen distintas y trazables. | P0 |
| RF-05 | Antes de crear la guía, bloquear dosis fuera del rango o no medibles. Después del trabajo, registrar excesos declarados como incidencias sin ocultarlos ni convertirlos en recomendaciones permitidas. | P0 |
| RF-06 | Incompatibilidad documentada bloquea la mezcla; combinación desconocida tampoco habilita su creación. Primera versión: una preparación monoproducto por etapa. Uso secuencial no equivale a mezcla en un tanque. | P0 |
| RF-07 | Revisor valida trabajo finalizado con checklist de la sala/procedimiento. Solo cumple si todos los criterios fueron evaluados y cumplen; no hay aprobación anticipada de receta. | P0 |
| RF-08 | Conservar comparación fuera del formulario; solo comparar procedimientos equivalentes, unidades compatibles y resultados con procedencia explícita. No sumar ni comparar directamente gramos y ml. | P0 |
| RF-09 | Registrar que el agua usada y sobrantes del escenario se desechan, sin reúso. Separar agua residual, sobrante preparado y concentrado; no emitir autorización de vertido ni inferir pH del efluente desde el producto. | P0 |
| RF-10 | Panel por sala/tarea distingue previsto, declarado, revisado y simulado. Solo los registros finalizados cuentan como consumo; una guía no es trabajo consumado. | P0 |
| RF-11 | Reporte conserva unidades, procedencia, instrucciones/versiones y disposición declarada. La simulación no se presenta como ahorro medido ni cumplimiento sanitario. | P0 |
| RF-12 | Acceso y navegación por rol verificado. Regresar desde QR sin sesión lleva a inicio/login sin rol asignado; con sesión vuelve al rol correspondiente. QR nunca concede permisos. | P0 |
| RF-13 | Conservar simulador existente y su rotulado, separado de cualquier medición de campo. | P1 |
| RF-14 | Conservar identificación de sala por QR y alternativa de listado. El acceso interno requiere sesión válida y preserva únicamente destinos internos permitidos. | P0 |
| RF-15 | Conservar explicador fuera del camino crítico; no calcula, inventa instrucciones ni anula bloqueos. | P1 |
| RF-16 | Inventario con unidades y procedencia. Consultar/revalidar saldo; crear guía no descuenta. Registro final aplica un movimiento transaccional e idempotente; revisión no vuelve a descontar. | P0 |
| RF-17 | Nombre obligatorio; suciedad visual de tres niveles descriptivos con iconos/texto; material y m² editables. Toda modificación relevante invalida resultados anteriores antes de recalcular. | P0 |
| RF-18 | Receta central con resumen, recipiente, ingredientes, secuencia y consumos. Capacidad insuficiente propone lotes solo si son compatibles con instrucciones y formato de dosis. | P0 |
| RF-19 | Guía de preparación y tiempos después de ingredientes, antes de iniciar. Separar incorporación/disolución, contacto, enjuague y vida útil; no generar tiempos ficticios para los productos comerciales. | P0 |

## 4. Motor de cálculo, contexto y bloqueos

### 4.1 Reglas de cálculo

- `V_solucion_L = superficie_m2 × tasa_L_m2` únicamente si la tasa corresponde a solución final y al material/método/procedimiento aplicables. La tasa es parámetro técnico de solo lectura para el operario.
- En modo simulado, toda tasa interna se identifica como ficticia y no validada para uso físico. En modo real, una tasa simulada no habilita cálculo operativo.
- Si falta tasa, usar preparación por lote del fabricante solo cuando esté documentada; no deducir cobertura por m². Sin información suficiente, no crear la receta.
- Para líquidos con dosis `d` en ml/L **final**: `producto_ml = V_solucion_L × d`; `agua_L ≈ V_solucion_L − producto_ml/1000`, bajo la convención volumétrica aplicable.
- `1 parte de producto + n de agua` tiene `n + 1` partes finales; no es igual a una parte dentro de `n` partes finales. Una proporción ambigua bloquea la creación.
- Masa, volumen y dosis enteras son magnitudes distintas. Sin densidad y fundamento no convertir g a ml. Para polvo en agua no restar gramos de litros ni asumir volumen final exacto.
- No dividir bolsas hidrosolubles salvo instrucción expresa. El recipiente debe admitir el lote completo sin exceder su capacidad útil.
- La suciedad informa elección/pretratamiento, acción mecánica o contacto solo si existe una regla aplicable. No selecciona automáticamente mínima/recomendada/máxima.
- Duraciones ajustables: 15/30/45/60/90/120 min; no son tiempos químicos de contacto. No inferir productividad exacta por m² ni cambiar concentración para ajustar duración.
- Separar agua de mezcla y de enjuague. Informar consumo total solo si ambos son conocidos; no mostrar un total completo si falta enjuague obligatorio.
- Precisión y redondeo dependen del instrumento/formato; un número matemático preciso no necesariamente es una cantidad medible. No redondear una dosis fuera del rango permitido.

### 4.2 Clasificación de mensajes

| Nivel | Tratamiento |
|---|---|
| Información | Unidades, fuente, versión y procedencia |
| Recomendación | Alternativa permitida y documentada, sin evadir condiciones |
| Precaución | Incertidumbre que debe resolverse; si afecta seguridad o cálculo, impide crear |
| Bloqueo por seguridad | Incumplimiento obligatorio: acción de creación/inicio deshabilitada y rechazo también en servidor |

**No existe «aceptar riesgo», forzar creación ni excepción de supervisor que vuelva utilizable una receta bloqueada.** Se pueden conservar entradas temporales para corregir el formulario, pero no guardarlas como receta creada ni enviarlas a revisión.

Bloquean: incompatibilidad; combinación no verificada; superficie/uso no autorizado o sin respaldo; dosis inválida; tasa no válida para el modo; stock insuficiente/desconocido; conversión ambigua; contacto obligatorio incumplido; enjuague/EPP requerido no contemplado; dosis no medible; documentos críticos contradictorios o no revisados. Una confirmación visual de EPP no demuestra su uso físico.

Conservar excepciones de captura histórica: un consumo que ya ocurrió debe registrarse fielmente como incidencia, aunque exceda saldo o recomendación. No ocultarlo ni generar automáticamente stock negativo o una autorización retroactiva; requiere conciliación trazable.

### 4.3 Agua residual: decisión del escenario

**No se reutiliza el agua.** Se recoge y desecha después de la limpieza; los sobrantes preparados también se registran como desecho, no como solución disponible para la siguiente tarea. El destino final concreto y su gestión quedan registrados por separado: no se afirma que todo residuo pueda ir al drenaje.

Para Nueva Aurora, la ruta de saneamiento, tratamiento y permisos es **desconocida**: Guamaní indica ubicación, no autorización. En la demo se representa la entrega al procedimiento ficticio de gestión de residuos del establecimiento. No recomendar neutralización ni añadir agua para cumplir un umbral.

El pH del producto no es el pH del efluente. Solo registrar un valor medido o simulado con su origen explícito; sin fundamento, dato no disponible. El rango legal permanece sin verificar. DQO, DBO, tensoactivos y grasas quedan fuera de esta implementación, lo que impide afirmar cumplimiento ambiental completo incluso con pH en rango. No borrar registros históricos de reúso de otros escenarios, pero no ofrecer esa acción en Nueva Aurora.

## 5. Presentación, tiempos y requisitos no funcionales

| ID | Requisito vigente |
|---|---|
| RNF-01 | Responsive PC/tablet/móvil; controles de al menos 44 px, sin desplazamiento horizontal; navegación por teclado, texto/iconos además del color. Comprobar en dos celulares físicos. |
| RNF-02 | Reglas críticas compartidas y verificadas en servidor; rechazar manipulación del cliente y no permitir saltar bloqueos. |
| RNF-03 | Sin secretos de servidor en cliente ni `.env` versionados; no exponer contraseñas mediante consultas de frontend. |
| RNF-04 | Roles respaldados por autenticación/autorización de servidor y RLS; no presentar una sesión editable en localStorage o políticas abiertas como seguridad real. Modo local rotulado como demostración. |
| RNF-05 | Flujo independiente del LLM. |
| RNF-06 | Instantánea de cálculo, documentos/versiones, advertencias, bloqueos, cantidades originales y correcciones con autor/fecha/motivo. |
| RNF-07 | Mantener monorepo, funciones puras en core y tipos Zod; no incorporar frameworks innecesarios. |
| RNF-08 | Objetivo de carga inicial menor de 3 s en perfil móvil 4G; imágenes comprimidas y estados skeleton durante consultas, sin cifras provisionales aparentando resultado final. |
| RNF-09 | Conservar PWA y QR. No introducir requisito de operación sin conexión. |
| RNF-10 | Interfaz y documentación en español; nombres nuevos de código según CONTRIBUTING. |

Vista principal: qué preparar, cuánto, cómo y precauciones. En móvil, tres bloques progresivos (trabajo, producto/método, guía), con resumen compacto y detalles secundarios colapsables. Los bloqueos, cantidades esenciales y precauciones obligatorias nunca quedan ocultos. No repetir cabeceras/resúmenes innecesariamente.

Recipiente: capacidad/nivel según cantidades, sin dibujar gramos como volumen ni capas físicas inexistentes. Ingredientes muestran unidad, proporción, saldo y procedencia. Mostrar un solo producto como preparación monoproducto, no como formulación múltiple.

La guía de tiempos no prescribe un orden universal: usa la secuencia específica revisada. Si falta tiempo de disolución/contacto, indicar «no disponible» y bloquear cuando sea necesario para ejecutar. El contacto de Cloro Gel no es tiempo de dosificación en agua. Las duraciones de 8/72 h relatadas en entrevista no son valores vigentes de catálogo.

Etiquetas ambientales: indicar «biodegradabilidad documentada» solo con evidencia de ese producto, como información secundaria de estilo neutro, sin confundirla con validación del trabajo. Rojo identifica peligros o bloqueos respaldados. Estas etiquetas no sustituyen pictogramas/indicaciones SGA ni implican vertido permitido.

### 5.1 Fuente de verdad del diseño frontend

La meta es un frontend responsive, claro y orientado a tareas: información importante primero, sin espacios o decoración innecesarios y con estados legibles en desktop, tablet y móvil. No se busca comprimir indiscriminadamente: se conserva legibilidad, jerarquía y tamaño táctil.

**Principio de presentación:** el Operario ejecuta, el Revisor verifica y el Supervisor analiza. Comparten lenguaje visual; cambia la prioridad informativa, no el significado de los colores ni la forma de los controles.

Esta fuente rige presentación y UX. Las secciones de flujo, dominio y seguridad siguen rigiendo qué operaciones se permiten. «Revisor certifica la información» significa validar un registro trazable, no certificar eficacia clínica, seguridad de una mezcla ni autorización ambiental. Nueva Aurora continúa siendo el escenario ficticio de esta versión, aunque el producto se presente como sistema de limpieza industrial.

| Experiencia | Contenido prioritario | Estructura objetivo |
|---|---|---|
| Operario | Acción de crear guía/iniciar o finalizar trabajo, resumen del turno, consumos y estado de tareas | `OperarioHome`: métricas compactas, filtros, tabla desktop y tarjetas táctiles móviles, ambas paginadas |
| Revisor | Trabajos finalizados pendientes, evidencia, comparación de cantidades y decisión trazable | `RevisorHome`: bandeja con pendientes por defecto, métricas de revisión, filtros y paginación. `ValidationWizard`: revisión compacta en una sola superficie |
| Supervisor | Consumos globales y por sala, registros validados, comparación y administración | `SupervisorHome`: métricas, tablas paginadas y accesos contextuales a catálogo, sitios/áreas, efluentes, reportes y usuarios |

`App.tsx` y `MobileLayout.tsx` separan navegación del contenido operativo y resuelven acceso por rol. Las sidebars no repiten paneles de contenido ni agregan acciones decorativas. `components/ui`, `services`, `context`, `lib` e `index.css` conservan sus responsabilidades actuales.

### 5.2 Base visual y componentes compartidos

| ID | Requisito verificable |
|---|---|
| UI-01 | Quitar banners hero, órbitas, círculos ornamentales y bloques promocionales de las homes. La primera sección operativa contiene título breve, acción contextual y métricas o pendientes; sin una introducción que desplace el trabajo. |
| UI-02 | Tarjetas simples y métricas compactas: referencia inicial de padding de 12–16 px en móvil y 16–20 px en escritorio, ampliable solo por legibilidad. No imponer alturas mínimas que generen huecos ni sombras/animaciones que no comuniquen estado. |
| UI-03 | Azul para acciones principales, consumos y superficies; verde para información efectivamente validada o cumplimiento explícitamente evaluado; amarillo para pendientes/advertencias; rojo para errores, incumplimientos y bloqueos. Neutro para dato ausente/no evaluado. No utilizar verde como identidad general del Revisor ni morado como significado alternativo de consumo. |
| UI-04 | Botones principales consistentes entre roles: misma familia, altura táctil mínima de 44 px y estados de foco/carga/deshabilitado. Una acción principal por contexto; no duplicar «Nueva receta» o «Nuevo producto» en cabecera, tabla y tarjetas de soporte visibles simultáneamente. Un vacío puede ofrecer la misma acción si no se muestra ya en ese contexto. |
| UI-05 | Tablas para comparación desktop; tarjetas apiladas o resumen de columnas esenciales con detalle expandible en móvil. No depender de una tabla ancha con desplazamiento horizontal para realizar la tarea principal. Estados, nombres largos y etiquetas permiten wrapping sin cubrir botones ni perder unidades. |
| UI-06 | Cada colección operativa se filtra, se ordena de más reciente a más antigua y luego se pagina. Usar fecha de creación/envío del registro según la colección, no la fecha de modificación como sustituto silencioso. Catálogo/sitios sin fecha disponible conservan orden determinista documentado. |
| UI-07 | Paginación inicial de 10 registros, con cantidad total, rango visible y anterior/siguiente accesibles. Reiniciar o ajustar página al cambiar filtros; tabla y tarjetas representan el mismo conjunto. Los totales se calculan sobre todo el conjunto filtrado, no sobre la página visible. |
| UI-08 | Componentes/patrones compartidos para métricas, etiquetas, acciones, filtros y paginación. Consolidar estilos inline y sobrescrituras globales gradualmente, sin reescritura general ni agregar nuevas capas de `!important` como solución de diseño. |
| UI-09 | Distinguir carga, error, lista vacía y sin resultados del filtro. Un error no se presenta como «0 pendientes» o ausencia de consumo. Skeletons/carga no muestran ceros ni marcas verdes como si fueran datos finales; ofrecer recuperación cuando la consulta falla. |

Los colores siempre se acompañan de texto/iconos; el color de éxito no reemplaza una evaluación. La fuente simulada permanece visible aun en un registro validado: validación de una simulación no es medición de campo.

### 5.3 Métricas y estados: significado antes que apariencia

- **Previsto/calculado:** viene de la receta. No se denomina «agua utilizada», «producto dosificado», «superficie atendida» ni «auditado» si el trabajo no se realizó o revisó.
- **Declarado:** viene del registro del trabajo finalizado; conserva marca y fuente. Identificar claramente si está pendiente de revisión.
- **Validado:** proviene de la revisión guardada con autor/fecha. El panel del Supervisor diferencia validación del registro de cumplimiento de limpieza; un registro revisado puede documentar un incumplimiento.
- **Resumen del turno:** define y muestra el intervalo de fechas/turno usado. No sumar todo el historial y etiquetarlo como «este turno».
- **Filtros:** indicar si cada métrica corresponde a todas las salas o a la selección activa; no mezclar silenciosamente cifras globales con cifras filtradas. Preservar identificación de sala, no solo su nombre visible.
- **Unidades:** separar masa, volumen y dosis; el total de producto no suma gramos con litros. Agua total incluye enjuague solo cuando se conoce. Mostrar faltantes, no convertirlos en cero.
- **Evidencia faltante:** lista vacía de incompatibilidades significa «sin información registrada/no verificado», nunca «Conforme» en verde. Tener enlace PDF tampoco acredita revisión técnica o compatibilidad.
- **Checklist:** iniciar cada criterio como «sin evaluar», sin `cumple = true` por defecto. Solo mostrar cumplimiento global cuando todos hayan sido evaluados afirmativamente; la ausencia de criterios bloquea la conclusión de cumplimiento.
- **Textos de trabajo:** usar «trabajo finalizado pendiente de revisión», «registro validado» o «registro observado». Evitar «receta enviada a aprobar», «certificación química» y otras afirmaciones que cambien el flujo aprobado.

### 5.4 Revisión compacta en una sola superficie

`ValidationWizard` puede conservar su nombre/ruta, pero no debe obligar a alternar entre tres pantallas excluyentes para contrastar evidencia. Presenta un único espacio de revisión con:

1. Resumen breve de trabajo finalizado, sala, operario, fecha y procedencia.
2. Comparación alineada de previsto, declarado y revisado, con unidades y desvíos; declaración original visible y correcciones con motivo.
3. Checklist de la sala/procedimiento, evidencia y observaciones; sin aprobación anticipada.
4. Disposición del agua residual y sobrantes. En Nueva Aurora no hay opción de reúso ni afirmación automática de vertido permitido.
5. Resumen de hallazgos y acción final trazable, diferenciando registro validado de cumplimiento del trabajo.

En móvil se permiten secciones colapsables con un resumen de estado por sección; abrir la que contiene un error y conservar los valores al alternar. Errores/bloqueos y acción final permanecen localizables, sin botones que cubran campos o navegación inferior. En escritorio se facilita comparar cantidades sin perder contexto.

### 5.5 Alcance, diagnóstico y orden de unificación

La inspección local sobre `709c619` encontró base por rol y tarjetas móviles, pero aún banners y accesos repetidos en las tres homes, listas sin paginación, colores de acción diferentes y validación por pasos excluyentes. **No se da por implementada la meta por aparecer descrita en una propuesta.** Ese diagnóstico es de código/estilos, no evidencia de validación visual en dispositivos.

| Orden | Trabajo requerido | Condición de salida |
|---|---|---|
| 1 | Corregir significado de métricas, etiquetas y estados | Previsto/declarado/validado distinguibles; sin éxito anticipado o conformidad por dato faltante |
| 2 | Compactar homes y quitar redundancias | Sin hero/decoración secundaria ni acciones principales repetidas; prioridad correcta por rol |
| 3 | Unificar componentes, colores y paginación | Patrones compartidos y últimos registros primero; filtros, totales y páginas coherentes |
| 4 | Compactar revisión en una superficie | Uso, criterios, efluente y decisión verificables sin perder contexto ni evidencia |
| 5 | Extender patrón a secundarias | Reportes, comparación, altas, usuarios, receta y otras páginas de Operario/Revisor, login, áreas/QR, sidebars y LLM siguen la misma base; conservar rutas y funciones |
| 6 | Verificar desktop, tablet y móvil | Textos largos, múltiples páginas, carga/error/vacíos, teclado, zoom y dos celulares físicos, sin saturación ni desbordamiento |

Estos criterios amplían la aceptación frontend del ERS; no autorizan cambiar reglas químicas ni reemplazar el flujo. Los documentos de pruebas y mini-prueba se actualizarán en otra tarea.

## 6. Arquitectura y persistencia requeridas

Conservar React/Vite, componentes funcionales, servicios, core, Zod, Supabase y migraciones. Los siguientes son **cambios requeridos**, no tablas/endpoints que se afirme que existen:

- Ampliar contratos para estado físico, masa/volumen/dosis, fuente y versión de instrucción, material/método, contacto, enjuague y EPP.
- Mantener sitio–área–tarea. Añadir requisitos por área y una instantánea de superficie/material/procedimiento de cada trabajo; no recuperar m² desde `variantes.repeticiones`.
- Separar guía/ejecución de registro final y revisión. Conservar cantidades recomendadas/calculadas/declaradas/revisadas, unidades, tiempo estimado/real y momento de finalización/envío.
- Definir inventario y movimientos por producto/unidad/sitio, con saldos simulados independientes de cualquier entorno real. Transacción e idempotencia para registrar consumo y conciliaciones.
- Bloqueos calculados en core y comprobados en servidor; usar la infraestructura Supabase existente, sin nuevo servicio o BD. Reutilizar/adaptar la RPC de validación para registros finalizados, no recetas.
- Nunca informar éxito remoto si falló la base y se guardó solo una copia local. Mostrar modo y destino de persistencia; mantener simulación local explícita.
- Nuevas migraciones aditivas, sin editar historial SQL ni eliminar datos multisitio. No migrar automáticamente `receta_enviada` a trabajo finalizado sin revisar su significado.
- Conservar rutas QR, historial, reporte, comparación y LLM fuera de la reestructuración. Sus adaptadores deben respetar unidades y estados; no sumar g como L.

## 7. Aceptación de la reestructuración

1. No hay selectores Sitio/Área en receta; el contexto correcto persiste y sus dependencias funcionan.
2. FT/HDS no tienen botones en la vista principal; fuentes y consulta secundaria permanecen.
3. Productos provienen de inventario con saldo/unidad/procedencia; los tres candidatos y datos simulados están identificados.
4. Tasa técnica no editable por operario; no existe valor universal silencioso.
5. Agua, solución y concentrados se calculan con base/unidad explícitas; las reglas ficticias solo operan en demostración separada.
6. Datos críticos faltantes o contradictorios bloquean creación; no aparecen cifras sustitutas ni «aceptar riesgo».
7. Mensajes son contextuales y accionables; un cambio invalida receta anterior.
8. Mezclas prohibidas o desconocidas no se crean; tampoco se eluden controles desde el cliente.
9. Recipiente, lotes, proporciones y precisión visual corresponden a valores y unidades.
10. No se copia la receta como consumo medido; agua de enjuague, tiempo real y cantidades declaradas se registran tras ejecutar.
11. Funciones ajenas conservan historial y comportamiento compatible.
12. Solo registros de trabajos finalizados entran a revisión; crear guía no modifica inventario.
13. Se verifica coherencia de unidades, valores límite, cambios consecutivos, faltantes, contacto, enjuague, stock, permisos QR, persistencia y vista móvil.
14. Las tres homes cumplen UI-01–UI-09: información prioritaria primero, tarjetas compactas, sin hero ni accesos redundantes y con acciones azules consistentes.
15. Previsto, declarado, validado, no evaluado y simulado se distinguen en métricas y estados; no hay cifras históricas etiquetadas como turno actual ni éxito por falta de datos.
16. Las colecciones se filtran/ordenan antes de paginar; con más de 10 registros se muestran controles funcionales y totales independientes de la página. Cambiar filtro no deja una página inválida.
17. La revisión se realiza en una sola superficie; las secciones colapsables móviles conservan datos y exponen sus errores. No se permite concluir cumplimiento con criterios sin evaluar.
18. En desktop, tablet y dos celulares físicos se comprueban etiquetas largas, wrapping, controles táctiles, foco visible, estados de carga/error/vacío y acciones sin superposición. Eliminar decoración no oculta evidencia ni advertencias.

El cierre exige evidencias de pruebas e integración cuando se implemente; no se declara aprobado con este documento. La adaptación del plan de pruebas y protocolo 3×3 se hará posteriormente por instrucción del responsable. No se generan resultados experimentales ni se hacen pruebas físicas hospitalarias a partir de esta simulación.

## 8. Fuentes y pendientes

| Fuente | Alcance y estado |
|---|---|
| [Cloro Gel Estrella — ficha enlazada por SKU PT290123](https://www.pintulac.com.ec/media/catalog/fichas_tecnicas/PT290123.pdf) | Revisión 0, 15/03/2022; contacto/enjuague y precauciones. Correspondencia de presentación, dosis y actualidad pendientes; no es HDS. |
| [Textiquim — Concentrado ZAKKA 3785 ml](https://www.textiquim.com/producto/desengrasante-concentrado-zakka-3785ml/) | Página comercial; no reemplaza ficha de dosificación ni HDS. |
| Datos de ALKALIDEX aportados por el equipo | Declarados; falta fuente primaria inequívoca y uso autorizado para pisos. |
| [ISO 11014:2009](https://www.iso.org/standard/44690.html) | ISO indica confirmación en 2025. No acredita por sí sola edición o obligatoriedad de NTE INEN-ISO 11014. |
| [Catálogo INEN](https://apps.normalizacion.gob.ec/) | Verificar NTE INEN-ISO 11014, 2266 y 2288: edición, vigencia y aplicabilidad antes de derivar obligaciones. |
| [SGA/GHS, revisión 11, ONU/UNECE, 2025](https://unece.org/transport/dangerous-goods/ghs-rev11-2025) | Referencia de comunicación de peligros; no presumir adopción legal ecuatoriana completa. |
| [Reglamento SST, Decreto 255, 2024](https://epavenep.gob.ec/wp-content/uploads/2025/08/REGLAMENTO-DE-SEGURIDAD-Y-SALUD-EN-EL-TRABAJO-DECRETO-No.-255.pdf) | Copia en entidad pública, arts. 42 y 47–49; comprobar reformas y aplicación. No fija dosis ni L/m². |
| COA, Reglamento al COA y AM 097-A | Verificar versiones, destino y regla local antes de usar límites. No hay cita legal de autorización para este hospital ficticio. |
| [CDC — Cleaning Supplies and Equipment, 2024](https://www.cdc.gov/healthcare-associated-infections/hcp/cleaning-global/supplies-and-equipment.html) | Buena práctica internacional: instrucciones de fabricante, contacto y EPP. No legislación ecuatoriana. |

Toda regla debe distinguir ley aplicable, norma voluntaria, instrucción del fabricante y buena práctica. No declarar cumplimiento normativo mientras falte verificación. La simulación no suple esa verificación para uso físico.

---

<details>
<summary>Archivo histórico: ERS v1.0, 10 de octubre de 2026 — no vigente para esta reestructuración</summary>

# ERS v1.0 — contenido histórico
## EcoCleaner: optimización del uso de agua y químicos en la limpieza industrial

| Campo | Detalle |
|---|---|
| Versión y fecha | 1.0 - 10 de octubre de 2026 |
| Evento | Hackatón Expo Clean 2026 - Reto 4 |
| Reto | Optimización y neutralización del impacto ambiental, en el uso de agua y vertido de residuos químicos |
| Equipo | EcoCleaner (5 integrantes) |
| Tipo de producto | Prototipo funcional: aplicación web móvil (PWA) con base de datos |
| Destinatarios | Equipo de desarrollo (backend y frontend), QA y datos, y revisión del comité |

**Versión 1.0 · 10 de octubre de 2026 · Borrador para desarrollo**

---

# 1. Introducción

## 1.1 Propósito

Este documento define qué debe hacer EcoCleaner y cómo se construirá su prototipo. Sirve como referencia común para backend, frontend, QA y datos, y como base de los criterios de aceptación.

## 1.2 Alcance

EcoCleaner es una aplicación web móvil para empresas de limpieza industrial. Ayuda a preparar la mezcla correcta, registrar lo que realmente se usa, comprobar si la limpieza cumplió su criterio, recomendar el procedimiento de menor consumo que sí funciona y orientar qué hacer con el efluente. Funciona desde el primer día con registros manuales, sin sensores propios.

El alcance inicial es el lavado de pisos y superficies industriales no críticas (bodegas, almacenes logísticos y zonas de tránsito de plantas). No cubre superficies donde la eficacia sanitaria es crítica, como las de hospitales, porque reducir la dosis allí podría comprometer el control de infecciones.

## 1.3 Problema y objetivo

En la limpieza industrial el agua y los productos químicos suelen usarse sin medir: las soluciones se preparan «a ojo» y casi nunca se registra cuánto se usó ni si la limpieza cumplió su objetivo. Esa es nuestra hipótesis de trabajo y se contrasta con entrevistas a usuarios. El objetivo es reducir el consumo evitable en origen sin perder calidad, y dar trazabilidad y orientación sobre el efluente. No se prometen porcentajes de ahorro: se medirán en una prueba controlada propia (3 variantes por 3 repeticiones), declarada como muestra pequeña.

## 1.4 Relación con el reto

| Elemento del reto | Cómo lo atiende EcoCleaner |
|---|---|
| Optimizar | Receta con dilución dentro del rango de la ficha y recomendación del procedimiento de menor consumo que cumple el criterio de limpieza. |
| Neutralizar el impacto | Menos carga química en origen, alertas de sobredosis y de mezclas incompatibles, guía de efluente (verter, ajustar, reutilizar o gestor autorizado) y trazabilidad. El software no neutraliza físicamente el efluente: orienta, previene y documenta. |
| Uso de agua | Registro de litros por tarea y área, comparación con la receta y con variantes. |
| Vertido de químicos | Estimación de pH desde la ficha, decisión de efluente registrada y reporte por sitio y periodo. |

## 1.5 Definiciones

| Término | Significado |
|---|---|
| Ficha técnica (TDS) | Documento del fabricante con modo de uso y dilución recomendada. |
| Hoja de datos de seguridad (HDS o SDS) | Documento de 16 secciones. Se usan la 9 (pH), la 10 (incompatibilidades) y la 13 (disposición). |
| ml/L | Mililitros de producto por litro de solución final. Es la única convención de dilución del sistema. |
| Receta | Litros de solución, litros de agua y ml de producto calculados para una tarea. |
| Variante | Procedimiento alternativo (por ejemplo, otra dilución) que se compara en la mini-prueba. |
| Efluente | Agua residual con producto que resulta de la limpieza. |
| Medido / estimado | Marca que indica si el operario midió el dato o lo estimó. |
| PWA | Aplicación web instalable con diseño móvil primero. |
| RLS | Seguridad por filas de la base de datos (Row Level Security). |

# 2. Descripción general

## 2.1 Usuarios

| Perfil | Qué hace | Dispositivo |
|---|---|---|
| Operario | Consulta la receta, registra consumo y resultado de limpieza y revisa la guía de efluente. | Celular, en terreno |
| Supervisor | Crea sitios y áreas, define criterios de limpieza, revisa panel y comparación de variantes y genera el reporte. | Celular o computador |
| Cliente (fuera del sistema) | Recibe el reporte impreso o en PDF. En el prototipo no accede a la aplicación. | No aplica |

## 2.2 Flujo principal

**Receta → registro de uso → resultado de limpieza → comparación de variantes y recomendación → guía de efluente → panel y reporte.**

## 2.3 Restricciones y supuestos

- El registro de consumo es autodeclarado por el operario. Se reduce la fricción con selectores y se distingue medido de estimado.
- No hay inicio de sesión real en el prototipo: un selector de rol permite entrar como operario o supervisor.
- Los datos simulados se rotulan como tales (fuente «simulada») y no se usan como evidencia de ahorro.
- Los litros de solución por m² no los da la ficha: se calibran con la mini-prueba y mientras tanto son un supuesto editable.
- El catálogo del prototipo tiene 6 productos con ficha técnica y hoja de seguridad reales.
- La IA es opcional (P1) y nunca está en el camino crítico.

## 2.4 Fuera de alcance

- Sensores reales de caudal o pH, y dosificadores automáticos.
- Neutralización física del efluente y certificación de ahorros.
- Autenticación real y políticas de seguridad por usuario.
- Aplicación nativa, modo sin conexión, foto con IA e integración con WhatsApp (hoja de ruta).

# 3. Requisitos funcionales

Prioridades: **P0** es obligatorio y debe funcionar de punta a punta; **P1** solo entra si el P0 está estable.

| ID | Requisito | Criterio de aceptación | Prior. |
|---|---|---|---|
| RF-01 | Crear un sitio desde una plantilla por tipo de lugar, con áreas editables (nombre, superficie en m², tipo de superficie y litros de solución por m²) y criterios de limpieza. | Un sitio con sus áreas se crea en menos de 2 minutos. | P0 |
| RF-02 | Consultar el catálogo de productos y cargarlo desde un JSON validado contra el esquema. | Los 6 productos cargan sin errores y cada uno enlaza a su ficha técnica y a su hoja de seguridad. | P0 |
| RF-03 | Calcular la receta según m², litros por m², nivel de suciedad y rango de dilución del producto. | Un ejemplo conocido da los litros y ml esperados; nunca sale del rango de la ficha. | P0 |
| RF-04 | Registrar el uso: litros de agua, ml de producto, duración, marca medido o estimado y fuente. | El registro se guarda en la base de datos con selectores, sin texto libre para cantidades. | P0 |
| RF-05 | Alertar de sobredosis frente a la receta y cuando se supere el máximo de la ficha. | La alerta aparece al registrar y queda guardada en el registro. | P0 |
| RF-06 | Alertar de mezclas incompatibles entre los productos usados en una tarea. | Hipoclorito con ácido se detecta en ambos sentidos. | P0 |
| RF-07 | Evaluar el criterio de limpieza con un checklist de cumple o no cumple definido por el supervisor. | El resultado cumple solo si todos los criterios cumplen y queda vinculado al registro. | P0 |
| RF-08 | Comparar variantes: descartar las que no cumplen y recomendar la de menor consumo observado, con su tamaño de muestra. | Una variante más barata que no limpió se descarta y se explica el motivo. | P0 |
| RF-09 | Guiar la decisión de efluente (verter, ajustar, reutilizar, gestor o no disponible) y registrar la decisión final. | La orientación aparece al terminar la tarea y la decisión queda guardada con el pH estimado. | P0 |
| RF-10 | Panel del supervisor con litros y ml por área y tarea frente a la receta, desvíos y áreas con consumo atípico. | El panel muestra datos reales de la base y marca las áreas atípicas. | P0 |
| RF-11 | Reporte imprimible por sitio y periodo con consumo, resultados y decisiones de efluente. | El reporte se imprime a PDF desde el navegador con formato legible. | P0 |
| RF-12 | Selector de rol (operario o supervisor) sin inicio de sesión, con navegación distinta por rol. | Cada rol ve solo sus pantallas en la barra inferior. | P0 |
| RF-13 | Simulador de fuga o sobreconsumo, generado en el navegador, para la demostración en vivo. | Los datos generados se guardan con fuente «simulada» y se rotulan en pantalla. | P1 |
| RF-14 | Abrir un área mediante código QR. | Un QR abre la receta del área correcta; sin QR se elige de una lista. | P1 |
| RF-15 | Explicador con LLM: redacta en lenguaje simple resultados ya calculados y responde preguntas del supervisor con los datos recibidos. | Si falla o tarda, se muestra un texto plantilla; nunca calcula ni emite alertas de seguridad. | P1 |

# 4. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-01 | Usabilidad móvil: diseño móvil primero, botones de al menos 44 px, sin desplazamiento horizontal, estados de carga y error. | Probado en al menos 2 celulares reales. |
| RNF-02 | Seguridad del dominio: nunca recomendar una dilución fuera del rango de la ficha. | Validado en el código (core) y con restricciones en la base. |
| RNF-03 | Seguridad de claves: la clave del LLM vive solo en el servidor; la clave service_role no se usa ni se sube; los archivos .env no se versionan. | Revisión del repositorio antes de cada merge. |
| RNF-04 | Seguridad de datos del prototipo: RLS activado con políticas de demostración abiertas. Es una limitación declarada, no seguridad de producción. | Documentada en el README y la hoja de ruta. |
| RNF-05 | Fiabilidad: el LLM está fuera del camino crítico y existe un texto plantilla de respaldo. | La demo funciona con el LLM desactivado. |
| RNF-06 | Trazabilidad: cada registro lleva marca (medido o estimado) y fuente (manual, simulada o sensor). | Campos obligatorios en la base y en el esquema. |
| RNF-07 | Mantenibilidad: monorepo, lógica de negocio pura y probada en `packages/core`, tipos derivados de los esquemas Zod. | CI en verde en cada pull request. |
| RNF-08 | Rendimiento: carga inicial ágil en conexión móvil típica e imágenes comprimidas. | Objetivo de equipo: menos de 3 s en 4G, verificado con Lighthouse. |
| RNF-09 | Portabilidad: PWA instalable en navegadores móviles actuales. | Se ofrece instalar la app en el celular. |
| RNF-10 | Idioma: interfaz y documentación en español. | Revisión de textos antes del evento. |

# 5. Reglas de negocio y cálculo

Las reglas RN-05 a RN-08 incluyen parámetros propuestos por el equipo que deben acordarse (sección 10.3).

| ID | Regla |
|---|---|
| RN-01 | Convención de dilución: ml de producto por litro de solución final. Se convierte desde la notación de cada fabricante (por ejemplo, 1:20) y se guarda el texto original. |
| RN-02 | `litros_solucion = superficie_m2 × litros_solucion_por_m2`. |
| RN-03 | Concentración según suciedad: baja usa el mínimo de la ficha, media usa el recomendado y alta usa el máximo. |
| RN-04 | `ml_producto = litros_solucion × ml_por_litro`. `litros_agua = litros_solucion - ml_producto ÷ 1000`. Ejemplo: 10 L a 50 ml/L dan 500 ml de producto y 9,5 L de agua. |
| RN-05 | Desvío: la concentración real es `ml_reales ÷ (litros_agua_reales + ml_reales ÷ 1000)`. Hay sobredosis si supera la receta más la tolerancia (propuesta: 10%). También se marca si supera el máximo de la ficha. |
| RN-06 | Comparación de variantes: es elegible la que tiene al menos el mínimo de repeticiones (propuesta: 3) y cumple el criterio en todas. Se recomienda la de menor producto promedio y se desempata por agua promedio. |
| RN-07 | Incompatibilidad: hay conflicto si alguna categoría del producto A figura en las incompatibilidades del producto B, o al revés. |
| RN-08 | Efluente, en este orden: no disponible si el pH es nulo o la concentración preparada está lejos de la del pH de la ficha; gestor si quedan sobrantes concentrados; ajustar si el pH estimado está fuera del rango de descarga; reutilizar si se permite el reúso; en otro caso, verter. El rango de descarga es configurable (valor de ejemplo hasta verificarlo en el TULSMA, Acuerdo 097-A, Libro VI). |
| RN-09 | El resultado cumple el criterio solo si todos los criterios evaluados cumplen. El valor se calcula en código, no se digita. |
| RN-10 | Todo dato simulado se guarda con fuente «simulada» y se rotula en la interfaz. |

# 6. Modelo de datos

Base de datos PostgreSQL en Supabase. Todas las tablas tienen `id` (uuid) y `created_at`. Los esquemas Zod de `packages/schemas` reflejan este modelo y son la fuente de los tipos. Relaciones: sitio 1-N área 1-N tarea; producto 1-N tarea; tarea 1-N variante; tarea 1-N registro de uso; registro 1-1 resultado 1-1 decisión de efluente.

| Tabla | Campos principales | Restricciones |
|---|---|---|
| `sitios` | `nombre`, `tipo`, `criterios_limpieza` (lista de textos en JSON) | — |
| `areas` | `sitio_id`, `nombre`, `superficie_m2`, `tipo_superficie`, `litros_solucion_por_m2` | `sitio_id` obligatorio; superficie mayor que 0; litros por m² opcional y mayor que 0 |
| `productos` | `nombre`, `tipo_quimico`, `categorias`, `incompatibilidades`, `dilucion_min` / `dilucion` / `dilucion_max` (ml por litro), `dilucion_texto_ficha`, `ph`, `concentracion_ph`, `ph_medido_a_ml_por_litro`, `indicaciones_disposicion`, `url_ficha_tecnica`, `url_hoja_seguridad` | mínimo menor o igual que recomendada menor o igual que máximo; pH entre 0 y 14 |
| `tareas` | `area_id`, `producto_id`, `nivel_suciedad`, `litros_solucion_esperados`, `ml_producto_esperados` | área y producto obligatorios; suciedad: baja, media o alta; esperados mayores que 0 |
| `variantes` | `tarea_id`, `nombre`, `dilucion_ml_por_litro`, `repeticiones` (planificadas) | dilución mayor que 0; repeticiones enteras positivas |
| `registros_uso` | `tarea_id`, `variante_id` (opcional), `litros_agua_reales`, `ml_producto_reales`, `duracion_min`, `marca`, `fuente`, `alerta_sobredosis` | agua mayor que 0; producto mayor o igual que 0; marca: medido o estimado; fuente: manual, simulada o sensor |
| `resultados` | `registro_uso_id`, `cumple_criterio`, `criterios_evaluados` (JSON), `observaciones` | un resultado por registro (único) |
| `decisiones_efluente` | `resultado_id`, `orientacion`, `decision_final`, `ph_estimado`, `observaciones` | orientación: verter, ajustar, reutilizar, gestor o no disponible; decisión final sin «no disponible»; una por resultado |

Los cambios al modelo se hacen con migraciones nuevas en `supabase/migrations`, nunca editando a mano en el panel, para que el repositorio y la base sigan iguales.

# 7. Arquitectura y construcción

## 7.1 Visión general

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React, Vite y TypeScript, como PWA | Pantallas del operario y del supervisor, navegación móvil, reporte imprimible. |
| Lógica de dominio | `packages/core` (TypeScript puro) | Receta, desvío, comparación, incompatibilidades y efluente, sin dependencia de interfaz ni de la base. |
| Contratos | `packages/schemas` (Zod) | Validación y tipos compartidos por frontend y backend. |
| Datos y backend | Supabase (PostgreSQL) | Tablas, restricciones, migraciones y políticas RLS de demostración. |
| Función de IA (P1) | Función serverless en el servidor | Recibe JSON ya calculado y devuelve texto explicativo; guarda la clave del LLM. |
| Despliegue y calidad | Vercel, GitHub y GitHub Actions | Enlace público, vista previa por pull request y CI con lint, build y pruebas. |

## 7.2 Estructura del repositorio

```text
ecocleaner/
  apps/web/src/
    app/                         router, layouts, MobileLayout
    features/
      operario/pages/            receta, registro, criterio, efluente
      supervisor/pages/          sitio nuevo, panel, comparacion, reporte
    components/ui/               Button, Card, Field, Select, Alert, PageHeader
    services/                    un archivo por entidad (productos, sitios...)
    lib/                         utilidades y cliente de Supabase
  packages/core/                 logica de dominio y pruebas
  packages/schemas/              esquemas Zod y tipos
  supabase/migrations/           SQL versionado
  docs/                          alcance, catalogo, decisiones, arquitectura
```

## 7.3 Frontend

- Los componentes no llaman a Supabase directamente: usan `services/`. La lógica de negocio se importa de `@ecocleaner/core`.
- Cada persona edita solo su carpeta de feature. Los cambios en `App.tsx`, `MobileLayout` o `components/ui` se coordinan por el grupo o con un pull request pequeño aparte.
- Las cantidades se capturan con selectores de litros y mililitros, sin texto libre.
- Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` van en `apps/web/.env`, que no se versiona.

### Rutas y pantallas

| Ruta | Pantalla | Perfil | Prior. |
|---|---|---|---|
| `/` | Inicio y selección de rol | Ambos | P0 |
| `/operario` | Inicio del operario | Operario | P0 |
| `/operario/receta` | Receta de la tarea | Operario | P0 |
| `/operario/registro` | Registro de uso y alertas | Operario | P0 |
| `/operario/criterio` | Criterio de limpieza | Operario | P0 |
| `/operario/efluente` | Guía de efluente y decisión | Operario | P0 |
| `/supervisor` | Inicio del supervisor | Supervisor | P0 |
| `/supervisor/sitios/nuevo` | Crear sitio desde plantilla | Supervisor | P0 |
| `/supervisor/panel` | Panel de consumo | Supervisor | P0 |
| `/supervisor/comparacion` | Comparación de variantes | Supervisor | P0 |
| `/supervisor/reporte` | Reporte imprimible | Supervisor | P0 |

## 7.4 Backend

- Supabase aloja las tablas y las restricciones del modelo. Las migraciones se versionan en el repositorio.
- RLS está activo con políticas de demostración abiertas. Para producción harán falta autenticación y políticas por usuario (hoja de ruta).
- Función de IA (P1): recibe únicamente JSON con resultados ya calculados, no calcula ni inventa cifras, responde «no tengo esa información, revise la ficha de seguridad» cuando el dato no está, y tiene un tiempo máximo de espera con texto plantilla de respaldo.
- Se evalúa el explicador con 10 a 15 preguntas de prueba, incluidos casos en los que debe negarse a responder.

## 7.5 Núcleo de dominio (`packages/core`)

Funciones puras y probadas. Usan los tipos de `@ecocleaner/schemas` y no acceden a la base.

| Función | Entradas | Salidas |
|---|---|---|
| `calcularReceta` | `superficie_m2`, `litros_solucion_por_m2`, `nivel_suciedad`, producto (rango de dilución) | `litros_solucion`, `ml_por_litro`, `ml_producto`, `litros_agua` |
| `calcularDesvio` | receta, `litros_agua_reales`, `ml_producto_reales`, dilución máxima, tolerancia | `ml_por_litro_real`, `desvio_pct`, `sobredosis`, `supera_maximo_ficha` |
| `compararVariantes` | variantes con sus registros (agua, producto, cumple), mínimo de repeticiones | resumen por variante, variante recomendada o nula, motivo |
| `detectarIncompatibilidades` | productos con categorías e incompatibilidades | pares en conflicto con su categoría |
| `evaluarEfluente` | pH y concentración del producto, ml por litro preparado, rango de descarga, sobrantes, reúso | orientación, pH estimado, motivo |

## 7.6 Calidad y flujo de trabajo

- Ramas cortas y un pull request por tarjeta del tablero, con una aprobación y el check de CI en verde antes del merge.
- El CI ejecuta lint, build y pruebas en cada pull request. Las pruebas pendientes se declaran con `it.todo` para no bloquearlo.
- Pruebas unitarias de core: 16 casos definidos en `packages/core/src/pendientes.test.ts`.
- Dependencias declaradas en el `package.json` del workspace que las usa, para que Vercel pueda instalarlas.

# 8. Catálogo de productos y datos de demostración

- Seis productos con ficha técnica (dilución) y hoja de seguridad (pH, incompatibilidades, disposición), con enlace a ambos documentos.
- Variedad de categorías para demostrar las incompatibilidades. Vocabulario propuesto: `hipoclorito`, `acido`, `alcalino`, `amoniaco`, `amonio_cuaternario`, `peroxido`, `solvente` y `otro`. Debe validarse con la sección 10 de cada hoja de seguridad.
- El pH de la ficha se usa solo si fue medido a una concentración cercana a la preparada; si no, el sistema responde «dato no disponible».
- Plantilla de carga en `docs/catalogo-plantilla.json` (contiene un ejemplo ficticio que debe reemplazarse con datos reales).
- Los datos de demostración combinan los resultados reales de la mini-prueba con datos simulados rotulados como tales.

# 9. Pruebas y criterios de aceptación

## 9.1 Mini-prueba controlada

Protocolo escrito antes de medir: producto, superficie, 3 variantes con 3 repeticiones, qué se mide (agua, producto y tiempo) y criterio de limpieza. Los resultados se presentan como muestra pequeña, sin extrapolar.

## 9.2 Flujo de demostración

| Paso | Qué se muestra |
|---:|---|
| 1 | Se elige el área y el producto, y la app muestra la receta calculada. |
| 2 | Se registra el uso real, marcado como medido o estimado, y salta una alerta de sobredosis. |
| 3 | Se evalúa el criterio de limpieza. |
| 4 | La comparación descarta la variante barata que no limpió y recomienda la siguiente que sí cumple. |
| 5 | La guía de efluente orienta qué hacer y se registra la decisión. |
| 6 | El panel muestra consumo y desvíos, y se imprime el reporte. |
| 7 | (P1) El simulador de fuga dispara la alerta en vivo y el explicador redacta la recomendación. |

## 9.3 Criterios de cierre del prototipo

- El flujo P0 completo funciona de punta a punta con datos guardados en Supabase.
- Probado en al menos 2 celulares reales y desplegado en un enlace público.
- CI en verde y pruebas de core implementadas.
- Existe un video de respaldo de la demostración y datos precargados por si falla la red.

# 10. Plan, roles, riesgos y decisiones abiertas

## 10.1 Cronograma

| Fechas | Objetivo |
|---|---|
| Sábado 10 a jueves 15 de octubre | Desarrollo previo. Flujo completo desplegado el lunes 12 y P0 congelado el jueves 15. |
| Viernes 16 de octubre (8 horas) | Día de desarrollo: P1, corrección de errores, integración y datos finales. Congelamiento al final. |
| Sábado 17 de octubre (4 horas) | Pruebas, corrección de errores críticos, entregables y ensayos del pitch. |

## 10.2 Roles

| Rol | Responsabilidades principales |
|---|---|
| Líder técnico e integración | Repositorio, CI y despliegue, esquema y migraciones, revisión de pull requests y control de alcance. |
| Backend y dominio | `packages/core` con pruebas, consultas y agregados para panel y reporte, función del LLM (P1). |
| Frontend operario | Receta, registro de uso, criterio de limpieza, guía de efluente, PWA y QR (P1). |
| Frontend supervisor | Sitio desde plantilla, panel, comparación, reporte imprimible y simulador de fuga (P1). |
| QA, datos y documentación | Catálogo de 6 productos, mini-prueba, plan de pruebas en celulares, README, diagrama y bitácora de decisiones. |

## 10.3 Decisiones abiertas (parámetros propuestos)

| Decisión | Propuesta actual |
|---|---|
| Tolerancia de sobredosis | 10% sobre la receta, configurable. |
| Mínimo de repeticiones para recomendar | 3, igual que la mini-prueba. |
| Orden entre variantes | Menor producto promedio y desempate por agua; evaluar ponderar ambos. |
| Rango de pH de descarga | Configurable, con valor de ejemplo; verificar en el TULSMA (Acuerdo 097-A, Libro VI). |
| Cercanía de concentración para usar el pH de la ficha | Entre 0,5 y 2 veces la concentración a la que se midió. |
| Litros de solución por m² | Calibrar con la mini-prueba; supuesto editable mientras tanto. |
| Vocabulario de categorías químicas | Lista propuesta; validar con la sección 10 de cada hoja de seguridad. |

## 10.4 Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Registro autodeclarado por el operario | Selectores en lugar de texto libre, marca medido o estimado y dosificadores con medición automática en la hoja de ruta. |
| Datos simulados en la demostración | Rotulados como simulados; no se presentan como evidencia de ahorro. |
| Recomendar una dilución insegura | Rango de la ficha obligatorio en el código y restricciones en la base. |
| Fichas incompletas | Solo productos con ficha técnica y hoja de seguridad; respuesta «dato no disponible» cuando falta un dato. |
| Muestra pequeña en la mini-prueba | Declarar el tamaño y no extrapolar los resultados. |
| LLM lento o impreciso | Fuera del camino crítico, texto plantilla de respaldo y solo narra datos ya calculados. |
| RLS de demostración abierta | Limitación declarada; autenticación y políticas por usuario en la hoja de ruta. |
| Cambios tardíos que rompen la demo | Congelar funciones el jueves 15 y mantener un video de respaldo. |

## Referencias internas

- `docs/alcance.md`
- `supabase/migrations`
- `packages/schemas`
- `packages/core`
- Tablero de Trello del equipo
- Criterios de evaluación del hackatón

---

**Versión 1.0 · 10 de octubre de 2026 · Borrador para desarrollo**

</details>
