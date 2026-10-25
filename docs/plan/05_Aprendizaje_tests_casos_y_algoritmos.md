# Aprendizaje, preguntas, casos y algoritmos

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

Versión 1.1, según [decisiones confirmadas](13_Decisiones_confirmadas.md). Público multiprofesional; guías actuales como fuente principal, libro secundario; adultos y pediatría, español e inglés desde el piloto. Práctica y evaluación son capacidades confirmadas con políticas distintas. Sin IA ni pacientes reales.

## 1. Modelo docente

Cada unidad tendrá objetivos observables: reconocer información relevante, seleccionar una prueba, interpretar un resultado en contexto, priorizar una actuación en una simulación o explicar un diagnóstico diferencial. Los objetivos enlazan contenidos y actividades mediante relaciones revisadas, no sólo por etiquetas del capítulo.

Ciclo propuesto: problema breve → compromiso con una respuesta → explicación → lectura focalizada → nueva aplicación → recuperación posterior. La recuperación mediante pruebas tiene apoyo experimental en educación médica; no se promete que el sistema concreto de esta app mejore resultados hasta evaluarlo. [Ensayo de Larsen, Butler y Roediger](https://pubmed.ncbi.nlm.nih.gov/19930508/).

Los modos «estudiar», «evaluación» y «consulta» comparten conocimiento pero cambian las reglas de presentación. Mostrar una respuesta antes de contestar puede ser útil para consulta y perjudicar una evaluación; no mezclar ambos recorridos. La primera instancia es individual y privada. Tests formativos y lectura funcionarán offline; casos y recorridos interactivos de algoritmos empezarán online. Grupos, tareas y exámenes docentes se activarán después de validar el uso individual.

## 2. Objetivos y mapa de competencias

| Objeto | Campos esenciales | Ejemplo de formulación, sin resolverlo clínicamente |
| --- | --- | --- |
| Objetivo | Código estable, texto, nivel editorial, población, revisión | Interpretar una prueba en un caso con contexto explícito |
| Unidad | Capítulo/tema, objetivos, prerrequisitos y contenidos | Tema piloto vinculado a un capítulo |
| Actividad | Tipo, objetivos, versiones de recursos, duración orientativa | Caso y tres preguntas de recuperación |
| Evidencia de aprendizaje | Respuesta, razonamiento codificado, ayuda usada y momento | Error al confundir rango de referencia y umbral |

El nivel editorial de dificultad es una estimación inicial. La dificultad empírica se calcula después con una muestra descrita; no se convierte una impresión del autor en un parámetro psicométrico validado.

## 3. Banco de preguntas

MVP: pregunta de una mejor respuesta, con opciones plausibles y explicación por opción. Añadir posteriormente ordenación, emparejamiento o interpretación de imagen si mejora un objetivo concreto. No usar múltiples formatos sólo para aumentar variedad.

Campos del payload de la revisión de pregunta:

| Campo | Regla |
| --- | --- |
| `item_type` | Enum controlado, inicialmente `single_best_answer` |
| `stem`, `lead_in` | Enunciado y pregunta concreta, traducibles por revisión |
| `options[]` | Clave estable interna al ítem, texto, explicación y orden editorial |
| `answer_key` | Opción válida en esa revisión; oculta en entrega de examen |
| `objective_public_ids[]` | Objetivos revisados |
| `citations[]` | Citas de la solución y de afirmaciones clínicas relevantes |
| `population`, `setting` | Contexto que hace defendible la respuesta |
| `difficulty_editorial` | Valor inicial separado del observado |
| `randomization_policy` | Permite barajar o fija orden si es semánticamente necesario |
| `rationale`, `pitfalls` | Explicación y error de razonamiento que se trabaja |
| `review_status`, `rights_status` | Condiciones de publicación |

Reglas editoriales: viñeta suficiente, pregunta enfocada, opciones homogéneas, evitar pistas gramaticales, dobles negaciones y discriminación irrelevante. Una opción errónea debe ser explicable en el caso dado. No añadir información esencial sólo dentro de una opción. La guía NBME aporta una referencia metodológica para este trabajo. [NBME Item-Writing Guide](https://www.nbme.org/institutions/nbme-item-writing-guide/).

No transformar automáticamente todas las frases del libro en preguntas. Redactar preguntas propias desde objetivos y fuentes actuales con usos comprobados, incluyendo explicación revisada en español e inglés. Evitar ítems sobre recomendaciones antiguas presentadas como actuales; si se evalúa una edición histórica, el modo y la fuente deben quedar explícitos. La prioridad del proyecto es búsqueda y consulta; el banco crece por sublotes, no mediante generación masiva.

## 4. Selección y sesiones

El alumno puede elegir tema, objetivos, número de preguntas y modo: repaso, fallos, mezcla o simulacro. El generador usa un blueprint versionado con cuotas por objetivo y tipo; comprueba que hay suficientes preguntas elegibles y evita repetir la misma pregunta dentro de una sesión.

Selección inicial: contenido publicado permitido, idioma revisado, población seleccionada y sin retiradas. Después ponderar objetivos pendientes de repaso y preguntas no vistas. Si el banco no permite cumplir el blueprint, informar o reducirlo con una opción explícita; no rellenar con preguntas no revisadas.

Guardar el orden y revisiones de los ítems y las opciones en un snapshot de sesión. Reanudar una sesión debe presentar el mismo conjunto, aunque se publiquen nuevas versiones entretanto. La aleatorización se resuelve una vez y se registra.

### Ciclo de un intento

```text
created -> in_progress -> submitted -> graded
                  |          |
                  v          v
               abandoned   voided (decisión auditada)
```

El servidor conserva usuario, organización, blueprint, revisión exacta de pregunta, respuesta mediante el ULID público de opción, orden presentado, ayudas, tiempos informativos y clave de idempotencia. El ULID resuelve a `question_options` y su clave lógica interna; no depende del texto traducido ni de la letra visual A/B/C. El cliente asigna `event_public_id`, que el servidor registra como `sync_operations.client_operation_public_id`; la unicidad por usuario y la validación del hash/organización siguen el documento 09.

Reintentos de red no duplican respuestas ni cambian notas. Dos envíos con la misma clave y payload distinto producen conflicto, no una segunda corrección. Una política publicada determina si se permite modificar una respuesta antes del envío final.

## 5. Corrección y retroalimentación

| Modo | Momento de explicación | Cálculo inicial |
| --- | --- | --- |
| Práctica | Tras comprometer la respuesta | 1 correcta, 0 incorrecta u omitida; sin penalización propuesta |
| Repaso | Tras respuesta y autovaloración | Resultado más confianza declarada; no equiparar confianza con exactitud |
| Simulacro | Al entregar o cerrar la ventana | Regla congelada en `scoring_policy_version` |
| Examen docente | Según la política de la asignación | Corrección de servidor; no incluir claves en el cliente |

Mostrar explicación, fuente, fecha de revisión y enlace a la página. Una pregunta impugnada abre incidencia contra su revisión, conserva el intento y puede suspender nuevos usos. La recalificación se realiza como evento separado con motivo y alcance.

La práctica offline debe descargar la solución para corregir sin servidor, por lo que no puede proteger el secreto de respuestas. Se considera formativa; la evaluación que necesite integridad se realiza online y con reglas específicas. El checksum de un paquete comprueba integridad, no impide inspeccionarlo.

## 6. Repaso espaciado y progreso

Primera propuesta: programador transparente de intervalos configurables por objetivo. Un acierto sin ayuda alarga el intervalo; fallo o ayuda vuelve a un intervalo corto; el alumno puede aplazar. Los intervalos y la versión del programador se guardan en cada decisión. La elección exacta se calibra en el piloto; no se presenta un algoritmo comercial o propio como clínicamente validado.

Separar:

- Lectura: páginas/objetivos consultados, sin inferir aprendizaje.
- Rendimiento: aciertos, omisiones, ayudas, tiempo y muestra.
- Retención: respuestas a objetivos tras un intervalo.
- Cobertura: objetivos practicados frente al plan.

No mostrar porcentajes concluyentes con dos respuestas. Ofrecer tamaño de muestra y estado «datos insuficientes». Un panel docente accede sólo a tareas y grupos autorizados; las notas privadas del alumno no se comparten.

No se usará dificultad adaptativa IRT ni estimación de dominio sin calibración. El MVP puede recomendar repaso por reglas claras. Cambiar de revisión clínica invalida las asociaciones obsoletas o genera una tarea de actualización, sin borrar el historial.

## 7. Casos clínicos progresivos

Los 45 casos existentes son documentos fuente. Se combinarán adaptaciones permitidas y casos nuevos ficticios revisados. La adaptación interactiva exige revisión de derechos, actualización y autoría; no se consideran 45 simulaciones ya implementadas. Sin datos de pacientes reales y sin modo interactivo offline en el primer alcance. La capacidad editorial pendiente condiciona su publicación.

Estructura del payload de una revisión de caso:

```text
case_revision
  contexto y objetivos
  estado inicial sintético
  nodos: presentación, decisión, petición de prueba, resultado, evolución, discusión
  opciones y condiciones explícitas
  resultados guionizados por rama
  tiempos simulados y recursos opcionales
  rúbrica, acciones críticas y explicación
  citas y activos visuales permitidos
```

Una prueba solicitada devuelve un resultado previsto por el autor para esa rama y momento. No se genera un resultado «típico» al azar ni se deduce de una sola enfermedad. Un caso puede incluir resultados discordantes de forma intencional, siempre explicados.

En modo aprendizaje se permite volver atrás y ver consecuencias alternativas, marcando la ayuda. En modo evaluación el autor puede limitar retrocesos. Cambiar una decisión anterior invalida los estados descendientes del recorrido actual; el registro de eventos previo se conserva para discusión.

La rúbrica distingue prioridades, justificación, uso de pruebas y errores críticos definidos por revisión. No otorgar una nota clínica global basada sólo en haber llegado al nodo final. Coste y tiempo son variables de simulación explícitas, no tarifas ni recomendaciones asistenciales reales.

## 8. Algoritmos: dos representaciones del mismo contenido

1. **Referencia:** figura del documento y transcripción accesible cotejada, con página completa disponible.
2. **Versión estructurada:** nodos y condiciones editables que producen vista gráfica y vista paso a paso a partir de la misma revisión.

Una figura no se convierte en un motor ejecutable por reconocimiento de flechas. Editor y revisor deben confirmar cada arista, su condición y la salida «información insuficiente».

Tipos de nodo: `start`, `information`, `question`, `action`, `reference`, `end`. Tipos de dato admitidos: enum, booleano, número con unidad y dato ausente. Añadir cálculos sólo mediante funciones revisadas y permitidas. Queda excluido `eval`, código PHP/JavaScript arbitrario o SQL suministrado por un editor.

### Contrato sintético de un fragmento

```json
{
  "schema_version": "1.0",
  "algorithm_revision_public_id": "<ULID de revisión>",
  "purpose": "educational_simulation",
  "start_node": "n_start",
  "nodes": [
    {"key": "n_start", "type": "start", "next": "n_context"},
    {"key": "n_context", "type": "question", "field": "context_complete",
     "value_type": "boolean", "routes": {"true": "n_info", "false": "n_missing", "unknown": "n_missing"}},
    {"key": "n_info", "type": "information", "content_revision_public_id": "<ULID de revisión>", "next": "n_end"},
    {"key": "n_missing", "type": "end", "outcome": "insufficient_information"},
    {"key": "n_end", "type": "end", "outcome": "learning_step_complete"}
  ]
}
```

Es un ejemplo de contrato, no un algoritmo médico. En JSON de producción se usan ULID reales y se valida el esquema antes de almacenarlo o ejecutarlo.

## 9. Semántica del motor

- Dato desconocido no equivale a falso, a cero ni a ausencia de hallazgo.
- Cada campo especifica tipo, unidad, rango de entrada técnico y contexto requerido.
- Una comparación dimensional exige unidades compatibles y una conversión revisada; no comparar números crudos con unidades distintas.
- Toda salida tiene una condición verificable o es un fallback explícito de información insuficiente.
- Si dos ramas se solapan sin prioridad declarada, la publicación falla.
- Un recorrido siempre queda ligado a la revisión inicial. No cambiar silenciosamente al algoritmo nuevo a mitad del caso.
- Las revisiones retiradas no permiten comenzar recorridos nuevos. La regla de una sesión ya abierta se define según gravedad y conectividad.
- La explicación de un paso enlaza la afirmación y fuente que justifican esa condición, no sólo la bibliografía general del capítulo.

MVP: grafos acíclicos. Si una fuente describe reevaluación repetida, representarla como una acción con indicación de volver a evaluar y final de ese recorrido docente; admitir ciclos ejecutables más adelante sólo con contador, salida y batería específica.

No transformar este motor en un clasificador automático de pacientes reales mediante un cambio de etiqueta. Introducir datos reales o decisiones personalizadas obliga a revisar finalidad, validación y requisitos adicionales.

## 10. Validadores y pruebas del contenido

| Objeto | Condiciones mínimas de publicación |
| --- | --- |
| Pregunta | Exactamente una mejor respuesta en contexto, opciones estables, explicaciones y citas |
| Sesión | Blueprint realizable, sin duplicados, versiones y política de puntuación congeladas |
| Caso | Nodos alcanzables, datos coherentes, ramas con discusión y rúbrica |
| Algoritmo | Inicio único, referencias válidas, sin ciclos MVP, todos los caminos terminan |
| Condición | Casos frontera, unidad incorrecta, ausencia de dato y ramas incompatibles |
| Traducción | Misma clave de respuesta y misma semántica de condiciones; no recalcular por traducción |
| Offline | Lectura y tests formativos con el mismo resultado que online, sin multiplicar intentos al sincronizar. Casos y motor de algoritmos offline fuera del primer alcance |

La verificación incluye todos los caminos críticos, alternativas, datos ausentes y límites. Las pruebas de software no reemplazan la revisión de contenido: un algoritmo puede ejecutarse sin errores y representar una recomendación incorrecta.

## 11. IA excluida de las primeras versiones

Decisión confirmada Q19C: la aplicación no incluirá generación editorial por IA, asistente conversacional, respuestas generadas en consulta ni tests generados al vuelo en las primeras versiones. No se contratará un proveedor ni se enviarán fuentes a un modelo como parte de su funcionamiento. Se usarán edición humana, consultas indexadas y reglas deterministas revisadas.

Una incorporación futura requeriría una nueva decisión de alcance, evaluación clínica, derechos, privacidad y costes. No queda como dependencia técnica ni como tarea pendiente del MVP.
