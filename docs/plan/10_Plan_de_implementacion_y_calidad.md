# 10. Plan de implementación, validación y entrega

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

Versión de planificación: 1.1 · 25/10/2026 · Estado: alcance ajustado a las respuestas del usuario. Proyecto personal con pocas horas semanales, organizado por hitos sin fechas cerradas. Este plan no inicia desarrollo, contratación, despliegue ni publicación clínica.

## 1. Orden de trabajo y límites confirmados

El recorrido es **decisiones registradas → viabilidad del stack estricto → fuentes y borradores estructurados → búsqueda y consulta privada → aprendizaje → casos y algoritmos online → lectura/tests offline → docencia y acceso ampliado**. La primera prioridad es encontrar información fundamental con rapidez. El piloto privado se valida con la cuenta propietaria antes de incorporar grupos o terceros.

El catálogo clínico sigue **guías actuales como estructura principal**, con contexto de España, adultos y pediatría e itinerarios según profesión y nivel. El libro es referencia secundaria privada, con sus 25 divisiones documentales y trazabilidad a las páginas reales. Sus PDF y transcripciones se inventarían mediante hashes; OCR y extracción no equivalen a revisión médica. La transformación a base de datos no elimina derechos sobre el material. No hay permiso acreditado para distribuir el libro; reproducir figuras, transcripciones o adaptaciones en contenido para terceros exige comprobar el ámbito de derechos de cada recurso.

La interfaz y el contenido clínico del piloto están en español e inglés. Árabe y ambos alfabetos de darija quedan para fases posteriores. Las primeras versiones no incorporan IA ni datos de pacientes reales. Se usan exclusivamente casos ficticios o adaptados sin datos personales, con revisión clínica/docente. Una futura orientación individualizada se estudiará con alcance y validación propios.

La capacidad de revisión clínica está pendiente de organizar: permite avanzar con infraestructura, catálogo, importación privada a borrador y fixtures sintéticas; impide publicar como validado contenido que requiera esa revisión. No se convierte la ausencia de revisores en un bloqueo para todo el proyecto.

## 2. Hitos y puertas de salida

| Hito | Dependencias | Trabajo y entregables | Condición de aceptación |
| --- | --- | --- | --- |
| H0. Consolidar decisiones y alternativas | Respuestas ya recibidas | Aplicar la versión 1.1; registrar asuntos abiertos; preparar varias alternativas visuales Material 3; separar fase privada y acceso futuro | Alcance y decisiones coherentes; no se elige una identidad definitiva sin comparar alternativas; pendientes tienen siguiente acción |
| H1. Viabilidad técnica del stack estricto | H0 | Primero prueba acotada de resolución Composer/npm y lockfiles; informe de soporte, licencias y vulnerabilidades; después esqueleto Laravel y CI, PHP 8.3/8.5, Filament 3/Livewire 3 y Tailwind 3/Vite 5 | Mismos locks verificables y matriz compatible; incompatibilidades documentadas; ningún despliegue si queda un bloqueo; no usar cambios de major o ignorar requisitos para forzar éxito |
| H2. Fuentes y borradores estructurados | H1 para implementación; inventario posible antes | Inventario privado, guías primarias, libro secundario, referencias, derechos, modelo de datos y revisiones, importador idempotente, editor | Mapeo de fuente y permiso; importación repetida sin duplicados; nada se publica por importar; puede cerrarse sin equipo clínico si todo sigue en borrador |
| H3. Biblioteca y búsqueda piloto | H2; lote clínico revisado para publicar | Soporte vital, síntomas cardiorrespiratorios y pruebas básicas; adultos/pediatría; fichas ES/EN, búsqueda, relaciones, fuente visible, favoritos e incidencias | Consultas de referencia; revisión clínica/lingüística; filtros de población/profesión; acceso privado; retiradas correctas; métricas MariaDB |
| H4. Aprendizaje individual online | H3 y preguntas revisadas | Tests de práctica, explicaciones, progreso, repaso y simulacros personales; modelo separado para evaluación online | Revisiones fijas, puntuación determinista y feedback trazable; la calificación oficial no usa actividad offline como examen |
| H5. Casos y algoritmos online | H3; revisiones clínica/docente disponibles | Casos ficticios o adaptados, editor/visor de decisiones, vínculos entre síntomas/pruebas/enfermedades y alternativa textual | Grafos válidos; desconocidos explícitos; pasos con fuente y contexto adulto/pediátrico; no introducir datos de pacientes reales |
| H6. PWA, lectura y tests offline | H4 y contratos estables | Instalación, paquetes permitidos, lector, test formativo local, búsqueda local, firma/hash, cuotas, eventos idempotentes y actualización segura | Matriz móvil real; cortes sin pérdida silenciosa; logout sin fugas; casos, algoritmo interactivo y evaluación requieren red |
| H7. Piloto privado operativo | H3–H6 según alcance implementado | Preproducción/despliegue privado cuando stack y hosting lo permitan; uso del propietario; exportación de apuntes/progreso; avisos de repaso y cambios configurables; restauración | Ningún defecto crítico; revisión editorial del lote; recuperación ensayada; cuenta propietaria única y registro externo desactivado |
| H8. Docencia, evaluación y acceso ampliado | Validación del uso individual; derechos, operación y equipo de revisión resueltos | Grupos, tareas, plazos, evaluación online, perfiles docentes, notificaciones por categoría y registro abierto con aprobación | Cuenta pendiente sin acceso; permisos y ámbito de actividad probados; material distribuible comprobado; ninguna alta activa automática |
| H9. Cobertura y mejoras por lotes | Capacidad editorial real y resultados del piloto | Ampliar temas, idiomas posteriores y contenidos; QR/ICS solo con caso de uso; optimización de búsqueda solo si las mediciones la justifican | Cobertura por fuente, población, idioma, revisión y función; no confundir importación del libro con catálogo clínico vigente |

La precaché de activos puede prepararse antes de H6, pero las descargas y tests offline se habilitan solo con sus contratos verificados. Con pocas horas semanales se recomienda una línea principal de trabajo y lotes pequeños; H4/H5 no necesitan ejecutarse en paralelo. No se exige completar las 23 secciones para validar el primer recorrido.

## 3. Piloto de contenido y criterios de escala

Quedan confirmados soporte vital, síntomas cardiorrespiratorios y pruebas básicas, con guías actuales, contexto español y distinción adulto/pediátrica. El primer sublote se elige por utilidad para búsqueda y disponibilidad de revisión, sin excluir pediatría del modelo o del alcance del piloto. Cada uno de los temas publicados se ofrece en español e inglés revisados. Se priorizan pocas fichas completas frente a importar masivamente respuestas sin verificar.

Lote técnico orientativo, ajustable a capacidad editorial y a las fuentes elegidas:

- Una unidad de consulta con texto propio estructurado, tablas y figuras permitidas, más otra que pruebe relaciones cruzadas; referencias comprobables a guías y, cuando aporte contexto, a páginas del libro privado.
- Al menos 10 fichas de concepto, 10 relaciones contextualizadas y 5 fichas de prueba revisadas; ejemplos de adultos y pediatría diferenciados.
- 20 preguntas con explicación y referencias para comprobar aprendizaje, con versiones ES/EN; ningún número se considera una cuota obligatoria de contenido clínico.
- En H5, 2 casos simulados y 2 algoritmos con bifurcaciones, desconocidos y alternativa textual; su interacción solo online en el primer alcance.
- En H6, un paquete de lectura y test formativo y otro que pruebe reemplazo, retirada y sincronización; sin PDF del libro para terceros ni casos o grafos interactivos locales.

Estas cifras ejercitan tipos y flujos, no garantizan suficiencia clínica ni fijan esfuerzo. Se mide el tiempo real de estructuración, cotejo, revisión y traducción antes de estimar el resto del catálogo. Si el equipo revisor no está disponible, se usan fixtures sintéticas identificadas para validar infraestructura, conservando bloqueada la publicación clínica.

Cada tema tendrá una ficha de cobertura separada:

| Dimensión | Estados de progreso |
| --- | --- |
| Fuente y derechos | Inventariada / referencia verificada / permiso por uso y audiencia |
| Transcripción privada del libro | Extraída / con OCR / cotejada en elementos críticos; no equivale a material distribuible |
| Estructuración clínica por población | Pendiente / borrador / revisada / publicada, con guía principal y contexto |
| Preguntas y casos | Borradores / revisión docente / revisión clínica / publicados |
| Algoritmos y pruebas | Identificados / estructurados / validados / publicados |
| Idioma | Español e inglés: borrador / revisión lingüística / revisión clínica / publicado; demás idiomas posteriores |
| Offline | No permitido / lectura-test pendiente / generado / verificado / retirado |

La cobertura documental de 1.101 páginas puede alcanzar el 100 % antes de tener una sola pregunta publicada; ambas medidas se informan por separado. La escala futura de usuarios es desconocida y no se dimensiona infraestructura institucional por defecto. Se comienza midiendo el uso individual y se replantea capacidad antes de H8.

## 4. Entregas pequeñas y prioridades

**P0, preparación:** registro de decisiones, alternativas visuales, inventario de fuentes/derechos y prueba de viabilidad del stack estricto. Ninguna alternativa visual se toma por aprobada al generarla. El alojamiento queda pendiente; esta fase produce necesidades de operación, no una contratación.

**P1, primera entrega útil:** acceso privado del propietario, biblioteca piloto ES/EN, búsqueda por tema/síntoma/prueba, fichas estructuradas, referencias, población adulta/pediátrica, favoritos e incidencias. Editor/revisor y estados de publicación hacen posible el flujo editorial; su existencia no sustituye contar con revisores.

**P2, aprendizaje y movilidad:** tests, feedback, progreso/repaso y simulacro individual; casos y algoritmos online cuando se revisen; instalación PWA y después lectura/tests offline verificados. Exportación de apuntes/progreso y avisos configurables se añaden con los flujos correspondientes. La evaluación oficial requiere servidor, con grupos en fase posterior.

**P3, tras validar el uso individual:** grupos, tareas, plazos, evaluación docente online y registro abierto con aprobación. Se mantienen los seis perfiles confirmados, pero sus menús solo aparecen cuando existe función activa. La revisión de derechos precede a abrir contenidos a terceros.

**P4, ampliaciones justificadas:** más cobertura y árabe/darija, QR e ICS con uso concreto, informes avanzados u otro motor de búsqueda si se demuestra necesidad. La IA queda excluida de las primeras versiones; no se incluye asistente, generación de tests ni búsqueda generativa. Su incorporación exigiría una decisión nueva.

## 5. Backlog inicial priorizado

Cada tarjeta tendrá escenario, dependencias, criterio de aceptación, revisión de datos y posible migración. Estas son tarjetas de planificación, no trabajo ya implementado:

| ID / prioridad | Resultado | Criterio verificable |
| --- | --- | --- |
| TEC-001 / P0 | Prueba acotada de dependencias y ADR | Informe Composer/npm con locks candidatos, PHP 8.3/8.5 y stack estricto; incompatibilidades registradas sin ignorar plataforma; no desplegar si no se resuelven |
| UX-000 / P0 | Alternativas visuales Material 3 | Varias direcciones comparables para búsqueda/ficha móvil; tokens, jerarquía y tipografía; elección posterior registrada |
| DAT-001 / P0 | Inventario de fuentes y derechos | Guías actuales primarias y libro secundario privado; hashes/páginas; permiso por recurso y audiencia; conversión a BD no cambia derechos |
| TEC-002 / P1 | Contexto privado y permisos | Solo propietario activo; registro externo desactivado; manipular una URL, body o acción Livewire no cambia ámbito ni permisos |
| DAT-002 / P1 | Modelo y revisión inmutable | Importación idempotente a borrador; un payload publicado no se altera; cada corrección conserva versión y fuentes |
| EDI-001 / P1 | Circuito de revisión | Sin revisores se permite borrador y desarrollo; no publicación clínica que exija aprobación; trazabilidad de autor, revisor y motivo |
| BUS-001 / P1 | Buscador trazable ES/EN | Revisión/fuente correctas; filtros adulto/pediátrico y nivel; borradores/retirados no aparecen como contenido publicado |
| APR-001 / P2 | Práctica y simulacro individual | Misma revisión y respuesta producen mismo resultado; opción ajena rechazada; modalidad oficial solo online |
| ALG-001 / P2 | Casos y grafos online | Validador rechaza referencias ausentes y ciclos; escenarios ficticios; fuente y contexto por paso; sin modo interactivo offline |
| PWA-001 / P2 | Lectura/test offline íntegros | Fallo de hash, cuota o red no marca paquete listo; diagrama estático legible; casos, algoritmo interactivo y examen oficial requieren red |
| PWA-002 / P2 | Sincronización formativa | Diez reenvíos del mismo evento generan un recibo lógico y una modificación de progreso; no se transforma en nota oficial |
| EXP-001 / P2 | Apuntes/progreso y avisos | Exportación autorizada sin datos de pacientes ni fuentes no distribuibles; categorías/frecuencia/silencio configurables |
| DOC-001 / P3 | Docencia y acceso aprobado | Grupos, tareas, plazos, evaluación y notificaciones; alta pendiente sin contenido; derechos y aislamiento verificados antes de habilitar |
| UX-001 / transversal | Componentes M3 | Alternativa elegida, tokens, foco, interacción móvil/teclado y ES/EN; preparación RTL sin exigir árabe/darija publicados |
| OPS-001 / antes de desplegar | Hosting, restauración y despliegue | Necesidades y costes documentados; stack compatible; copia restaurada con fuentes/revisiones/actividad; objetivos acordados |

## 6. Estrategia de pruebas

Pest 3 y su plugin Laravel son el requisito de base, con Mockery, Faker y Collision cuando ayuden. «Unas 2.000 pruebas» describe la referencia de calidad aportada por el usuario, no una suite presente en esta carpeta ni una cuota que se rellenará con casos redundantes. El número final dependerá de los riesgos y escenarios implementados. Las pruebas se ejecutan en paralelo con aislamiento de bases y directorios temporales por proceso.

| Capa | Qué se verifica | Datos o escenarios esenciales |
| --- | --- | --- |
| Dominio | Reglas de puntuación, repaso, estados editoriales, grafos y unidades | Límites, dato desconocido, valor cero, cambio de unidad, versión y retirada |
| Persistencia | FK, únicos, transacciones, idempotencia y migraciones | Revisiones huérfanas imposibles, duplicados concurrentes, fallo tras commit y proyección recuperable |
| Autorización | Políticas y organización activa en todos los accesos | Usuario A/organización A frente a B, función editorial global separada y revocación |
| HTTP/API/Livewire | Validación, CSRF, respuestas, límites y contratos | IDs no visibles, opciones de otra revisión, lotes parciales, archivos y rutas traducidas |
| Editorial | Importación, cotejo, aprobación, publicación, reemplazo y retirada | OCR señalado, fuentes ausentes, traducción antigua, falta de revisor y dependencia de revisión retirada |
| Búsqueda | Relevancia ES/EN, sinónimos, población, nivel, filtros y permisos | Consultas de referencia, abreviaturas ambiguas, adulto frente a pediatría, término sin resultado y contenido retirado |
| PWA/cliente | Paquetes, persistencia, cuota, actualización y eventos | Cortes, reinicio, doble pestaña, dos cuentas, sesión vencida y reloj incorrecto |
| Navegador real | Flujos completos y accesibilidad | Buscar → abrir ficha → fuente; práctica → explicación → repaso; editar → revisar → publicar |
| Operación | Build, despliegue, migración y restauración | Esquema con datos, workers antiguos, copia verificada y vuelta al release anterior |
| Clínica y docencia | Correspondencia con fuentes, coherencia y utilidad educativa | Casos de referencia y errores frecuentes revisados por profesionales; no sustituibles por aserciones de código |

Las ramas de algoritmos se cubren con ejemplos positivos, negativos y desconocidos cuando se implemente su fase online. El primer motor admite grafos acíclicos: una recomendación de reevaluar se expresa como instrucción y salida, sin bucles ejecutables. Admitir ciclos en el futuro requerirá límites, salida explícita y una nueva versión de motor/contrato. Ningún test de código acredita que un dato clínico sea actual: esa validación se registra editorialmente. Se prueban además bloqueo de registro externo privado, aprobación de altas futuras y exclusión de contenido no distribuible en exportaciones, aunque su origen se haya convertido a BD.

## 7. Matriz de integración continua

En cada PR y en `main`, workflow «Pruebas»:

| Trabajo | Entorno | Salida requerida |
| --- | --- | --- |
| Estilo y análisis | PHP 8.3 | Pint sin cambios; Larastan/PHPStan sin errores nuevos; contratos/tipos comprobados |
| Suite común | PHP 8.3 × SQLite y MariaDB 11 | Pruebas funcionales paralelas con procesos aislados |
| Compatibilidad web | PHP 8.5 × SQLite y MariaDB 11 | Mismo lockfile, arranque y suite; fallos/deprecaciones atendidos |
| Integración MariaDB | Minor exacto acordado de MariaDB 11 | FULLTEXT, JSON, colaciones, bloqueos, concurrencia e índices; no delegar esto a SQLite |
| Migraciones | Base vacía y copia sintética del esquema anterior | Subida limpia, datos preservados y compatibilidad del release previo cuando proceda |
| Build y dependencias | Node LTS fijado | `npm ci`, build reproducible, auditoría Composer/npm y activos servibles |
| Navegador CDP | Chrome fijado, Node | Flujos críticos, capturas y guardias de diseño con servidor real |
| Integridad documental | Corpus de prueba y manifiestos | Rango/página/hash correctos, enlaces de fuente y esquema de revisiones |

La suite completa puede repartirse en shards para reducir tiempo sin omitir escenarios. Los procesos paralelos no comparten tablas mutables, colas, caché privada ni archivos de salida. La configuración exacta de SQLite se registra; no se interpreta su rapidez como equivalencia con producción.

Chrome sin ventana/CDP es la herramienta prevista para automatización de navegador. Una comprobación manual documentada en Safari/iOS y Chrome/Android sigue siendo necesaria para instalación, PDF, WebAuthn, teclado, almacenamiento y push: la emulación de tamaño no reproduce el sistema operativo móvil.

## 8. Guardias de diseño y accesibilidad

- Detectar colores hex/rgb/hsl escritos directamente en componentes, excepto en el archivo generador/token autorizado, activos externos y fixtures documentados. Los componentes consumen tokens semánticos.
- Detectar eliminación de foco sin sustituto accesible. Comprobar foco real, orden y retorno tras modal o cambio de pantalla.
- Instantánea del menú por perfil y organización, junto con pruebas de permisos del servidor; la instantánea por sí sola no demuestra seguridad.
- Comparación inicial de las alternativas visuales antes de elegir identidad; después, capturas representativas en móvil y escritorio, claro y oscuro, español e inglés, zoom y texto ampliado. Preparar pruebas de propiedades lógicas/RTL con fixtures de interfaz; la publicación de árabe y darija queda para una fase posterior. Cambios de referencia requieren revisión humana del resultado.
- Contraste, nombre accesible, etiqueta/error de campos, objetivos táctiles, navegación por teclado, lector de pantalla, movimiento reducido y equivalencia textual de diagramas.
- Estados completos en componentes: inicial, carga, vacío, error, sin red, permiso insuficiente, contenido retirado y sincronización pendiente.
- Fuentes locales, iconos consistentes, formato de unidades/números y ausencia de desbordamiento horizontal en fichas; tablas extensas usan un contenedor y alternativa de lectura claros.

El documento de diseño M3 establece valores, componentes y comportamiento. Las guardias comprueban ese contrato, no solo que la pantalla tenga una apariencia parecida a Material.

## 9. Análisis estático, dependencias y seguridad del desarrollo

Código nuevo sin deuda ocultada. Nivel de Larastan/PHPStan acordado desde el esqueleto; al no existir todavía una base heredada, la meta es una línea base vacía. Si se incorpora código existente, se registra la deuda y CI impide aumentar exclusiones o trasladar errores a patrones más amplios. Se conservan avisos de exclusiones ya innecesarias. PHPStan permite una línea base para gestionar deuda conocida, pero su existencia no justifica esconder errores nuevos. [Línea base PHPStan](https://phpstan.org/user-guide/baseline).

Revisión de lockfiles, advisories, permisos de workflows y secretos. La decisión Q26C mantiene estrictamente el stack indicado: las dependencias no se actualizan a otro major para hacer pasar una instalación. Se registra soporte y fecha de revisión de los paquetes antiguos; si no se puede resolver un bloqueo dentro de la base autorizada, no se despliega y se documenta su impacto. No se autoriza por esta planificación sustituir tecnologías o ignorar advisories. Las ramas nuevas parten de `main`, cada cambio pasa por PR, no se usa `push --force` y el workflow de despliegue se lanza manualmente sobre un commit con controles aprobados.

Datos de Faker se usan para infraestructura educativa, nunca como evidencia médica. Las fixtures clínicas se elaboran y revisan como casos sintéticos, con su fuente y versión; no se inventan rangos de laboratorio o respuestas «de referencia» para llenar la base.

## 10. Objetivos medibles del piloto

Son objetivos de diseño a acordar y medir en el hardware/red declarados, no resultados ya alcanzados:

| Medida | Objetivo inicial | Método |
| --- | --- | --- |
| Respuesta de búsqueda en servidor | p95 ≤ 300 ms con caché caliente y corpus piloto | Medición individual y fixture de referencia configurable de 20 usuarios concurrentes; consultas y entorno descritos; no acredita capacidad real prevista |
| Lectura de ficha en servidor | p95 ≤ 250 ms sin incluir descarga de PDF | Instrumentación y prueba de carga con datos representativos |
| Búsqueda offline en paquete piloto | p95 ≤ 250 ms después de cargar el índice | Medición en el móvil de referencia; separar primer arranque |
| Apertura útil móvil | Meta ≤ 2,5 s en conexión de prueba acordada | Medir qué contenido se ve, con carga inicial y repetida; registrar tamaño y red |
| Relevancia | Respuesta esperada entre los 5 primeros en ≥ 90 % del conjunto piloto | Al menos 40 consultas revisadas y estratificadas; analizar ausencias y falsos positivos |
| Trazabilidad publicada | 100 % de fichas, preguntas, pasos críticos y relaciones del piloto con referencia revisada | Consulta automática de integridad más muestreo clínico |
| Sincronización | Cero duplicaciones de puntuación en escenarios de reenvío/concurrencia definidos | Pruebas repetibles de idempotencia y transacciones |
| Usabilidad | ≥ 80 % de tareas críticas completadas sin ayuda en el piloto | Tareas observadas con participantes del perfil objetivo; registrar errores y tiempos |
| Recuperación | RPO/RTO acordados y restauración demostrada | Simulacro cronometrado con verificación documental y educativa |

Q12 queda sin estimación: no se asigna una capacidad objetivo ni un tamaño de servidor. El escenario de 20 usuarios es una fixture técnica ajustable para comparar resultados, no una previsión de usuarios. Se revisan escala y presupuesto antes de abrir acceso en H8. Ninguna optimización se acepta si permite resultados no autorizados, pierde referencias o usa una revisión retirada. La relevancia se mide por separado en español e inglés durante el piloto; árabe y darija requieren sus propios ensayos cuando se incorporen.

## 11. Definición de terminado

Una funcionalidad está terminada cuando cumple sus escenarios y permisos, está disponible en los tamaños/idiomas del alcance, tiene estados de carga/error/offline pertinentes, pasa la CI aplicable y cuenta con documentación de operación. Si cambia datos, incluye migración y recuperación verificadas. Si usa material clínico, cuenta con revisión editorial registrada y fuente accesible. Si introduce descargas o exportación, se ha comprobado el permiso de distribución.

Una entrega se puede pilotar cuando no hay defectos críticos de acceso, integridad, trazabilidad, puntuación o presentación clínica; las limitaciones restantes están identificadas y aceptadas para el alcance. Se conserva un acta de validación con versión de software, corpus y revisiones, dispositivos, pruebas y responsables. Capturas o un número elevado de tests no sustituyen ese acta.

## 12. Responsabilidades y mantenimiento

| Función | Responsabilidad de entrega |
| --- | --- |
| Responsable de producto | Prioridad, aceptación del MVP, presupuesto y decisiones abiertas |
| Responsable clínico | Fuente vigente, reglas de revisión, casos de referencia, retiradas y aceptación médica |
| Responsable docente | Objetivos, calidad de preguntas, feedback, dificultad y lectura de resultados |
| Desarrollo | Modelo, permisos, pruebas, contratos, interfaz, PWA y documentación técnica |
| Diseño/UX | Sistema M3, accesibilidad, comprensión de estados y pruebas con usuarios |
| Operaciones/seguridad | Entornos, secretos, copias, despliegue, alertas y recuperación |
| Revisión lingüística clínica | Traducciones, términos, RTL y equivalencia con la revisión fuente |

Una misma persona puede asumir varias funciones en el piloto, conservando la separación de aprobación que exija la gobernanza. El propietario es inicialmente la única cuenta activa; asignarse permisos no resuelve la falta de revisión independiente. El equipo clínico/lingüístico está pendiente de organizar: se agenda su definición antes de publicar el primer lote clínico ES/EN, manteniendo posibles los borradores y las verificaciones técnicas. No se promete una cadencia semanal de entregas o contenido con una dedicación personal limitada. El mantenimiento incluye dependencias del stack estricto, revisión clínica, traducciones dependientes y renovación de paquetes. Se medirá la capacidad editorial junto al tiempo de programación.

## 13. Próximas acciones y cuestiones todavía abiertas

Las respuestas ya están incorporadas a la versión 1.1. El siguiente trabajo técnico propuesto es TEC-001, la prueba acotada de lockfiles y compatibilidad, antes de construir el esqueleto. En paralelo documental pueden inventariarse guías, derechos y recursos de revisión y compararse alternativas visuales. Ninguna de esas tareas requiere que se conozca ya el volumen final de usuarios.

Siguen abiertos equipo clínico/lingüístico, alojamiento/coste operativo, escala futura y elección visual definitiva. Se resolverán en el hito que los necesita; no se repite todo el cuestionario ni se paraliza la preparación por esas incógnitas. El avance se acepta por resultados y no por fechas. Este trabajo entrega planificación documental, sin código de aplicación, contratación, despliegue, alta de usuarios o publicación del libro.
