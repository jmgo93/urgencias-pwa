# Producto, perfiles y alcance

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

Versión 1.1. Alcance ajustado a [las respuestas confirmadas](13_Decisiones_confirmadas.md): aplicación privada de un propietario, público de diseño multiprofesional, búsqueda prioritaria, fuentes clínicas actuales principales y libro secundario.

## 1. Finalidad y contextos de uso

La aplicación debe permitir pasar de una necesidad concreta —buscar una prueba, repasar un síntoma, practicar un caso— a una respuesta documental comprensible, con enlaces al detalle y a la fuente. El mismo conocimiento debe alimentar las fichas, las preguntas y los algoritmos; evitar copias manuales que luego se actualicen de forma independiente. Se organiza por problemas y conceptos de guías actuales seleccionadas para España, con ámbitos adulto y pediátrico diferenciados; el índice del libro se conserva como navegación de fuente secundaria.

| Contexto | Necesidad | Respuesta de la aplicación |
| --- | --- | --- |
| Consulta breve | Localizar información durante una pausa o una duda profesional | Buscador visible, fichas compactas, referencias y acceso al PDF |
| Estudio organizado | Trabajar un capítulo y comprobar comprensión | Objetivos, lectura, tests y casos relacionados |
| Refresco periódico | Recuperar conocimientos olvidados | Cola de repaso y sesiones breves |
| Aprendizaje basado en problemas | Razonar con información que aparece progresivamente | Caso ramificado, elección de pruebas y explicación posterior |
| Docencia | Asignar actividades y detectar dificultades | Grupos, tareas y resultados agregados con acceso limitado |
| Edición clínica | Convertir y mantener conocimiento fiable | Autoría, comparación, revisión, publicación y retirada versionada |

No se presupone que aprobar un test habilite profesionalmente ni que una ficha sustituya un protocolo del centro. La pantalla debe indicar el contexto de la fuente, población y estado de revisión, de manera útil y sin avisos repetitivos.

## 2. Principios de producto

- Encontrar antes de explorar: buscador disponible desde cualquier pantalla principal.
- Mostrar una síntesis estructurada y permitir abrir el detalle sin perder la posición.
- Separar lectura documental, simulación docente y evaluación.
- Dar una explicación verificable tras una respuesta, incluyendo por qué las alternativas no son adecuadas en el caso planteado.
- Permitir navegar en ambas direcciones: síntoma → diagnóstico diferencial → prueba y prueba → interpretaciones → enfermedades relacionadas.
- Conservar versión, fecha, ámbito y fuente en todos los contenidos publicados.
- Adaptar presentación a móvil y escritorio, sin reducir el móvil a una tabla administrativa comprimida.

## 3. Módulos funcionales

| Módulo | Capacidades | Primera entrega |
| --- | --- | --- |
| Biblioteca | Fuentes actuales, índice secundario del libro, referencias y notas privadas; fuentes íntegras según usos comprobados | Sí, con acceso restringido |
| Búsqueda | Título, sinónimos, siglas, texto, filtros y enlaces de resultados | Sí |
| Fichas clínicas | Síntoma, enfermedad, prueba, procedimiento y tratamiento documental | Piloto revisado |
| Pruebas diagnósticas | Indicación, preparación, muestra, unidades, limitaciones e interpretaciones contextualizadas | Piloto |
| Preguntas | Sesiones por tema, dificultad editorial, fallos y respuestas explicadas | Sí, banco piloto |
| Casos | Presentación progresiva, decisiones, resultados de pruebas simuladas y discusión | Online, tras validar búsqueda y tests |
| Algoritmos | Vista documental, pasos accesibles y recorrido guiado | Lectura y después recorrido online revisado |
| Progreso | Historial, objetivos, repaso y competencias practicadas | Básico |
| Docencia | Grupos, asignaciones, plazos, resultados y retroalimentación | Después de validar uso individual |
| Autoría | Importación, fichas, preguntas, casos, algoritmos, traducciones y revisión | Sí, imprescindible para el piloto |
| Administración | Accesos, roles, incidencias, auditoría y publicaciones | Sí |
| PWA | Instalación y paquetes permitidos para lectura y tests formativos offline | Tras núcleo online; sin casos/recorridos interactivos offline iniciales |

La IA queda excluida de las primeras versiones, incluida la generación editorial dentro de la app. Calculadoras, búsqueda semántica, recomendaciones para pacientes reales y certificaciones requieren una decisión futura independiente. La evaluación online y la práctica formativa sí forman parte del producto acordado, con docencia de grupos posterior.

## 4. Perfiles confirmados

Los nombres de paneles de la base técnica facilitada parecen proceder de otra aplicación. No se crearán automáticamente perfiles de convivencia, tertulias o voluntariado: se reutilizarán los mecanismos técnicos y se definirán permisos propios de urgencias.

| Perfil | Finalidad | Permisos característicos | Límites |
| --- | --- | --- | --- |
| Aprendiz / profesional lector | Consultar, estudiar y practicar | Contenido permitido, notas propias, intentos y descargas autorizadas | No editar publicaciones ni ver actividad ajena |
| Docente | Preparar actividades y acompañar aprendizaje | Grupos asignados, tareas, rúbricas, resultados de sus grupos | No ver grupos ajenos ni publicar contenido clínico por defecto |
| Editor clínico | Preparar fichas y material docente | Borradores, relaciones, citas, propuestas de revisión | No aprobar su propio material crítico |
| Revisor clínico | Cotejar evidencia y coherencia clínica | Observaciones, aprobación o rechazo y propuesta de retirada | No eludir trazabilidad ni autoaprobar si también editó |
| Administrador funcional | Gestionar personas, grupos y funcionamiento | Invitaciones, asignación de roles autorizados, soporte | No otorgar validez clínica ni editar respuestas para mejorar estadísticas |
| Superadministrador técnico | Operar el sistema | Configuración, incidencias y mantenimiento auditado | Sin acceso general al progreso individual por conveniencia; acceso excepcional justificado |

Una persona puede acumular roles. La política de independencia se aplica por autoría real del registro, no sólo por nombre del rol. Ser administrador no implica ser revisor clínico.

Estos seis perfiles están confirmados como diseño; la primera instancia sólo tendrá la cuenta propietaria. La política de alta futura será registro con aprobación, con registro externo deshabilitado mientras el uso siga siendo exclusivamente privado. La revisión clínica independiente todavía no tiene equipo asignado: crear varios roles para el propietario no resuelve esa carencia.

**Traducción:** inicialmente es una capacidad asignable a editor y revisor por idioma; si el equipo lo necesita se separará un rol de traductor. Traducir una dosis o una condición lógica requiere revisión clínica del idioma correspondiente.

## 5. Matriz de autorización por recurso

Leyenda: P = propio; G = grupos asignados; A = ámbito de organización autorizado; E = permiso editorial global; T = operación técnica justificada.

| Acción | Aprendiz | Docente | Editor | Revisor | Administrador | Superadmin |
| --- | --- | --- | --- | --- | --- | --- |
| Leer contenido publicado permitido | P | P | P | P | P | P |
| Ver intentos o notas privadas | P | G, sólo intentos de tareas | P | P | Sin acceso por defecto | T excepcional |
| Crear y asignar tareas | — | G | — | — | A si se concede | T |
| Proponer contenido | — | Si además tiene E | E | E si concedido | — | — |
| Aprobar revisión clínica | — | — | — | E con independencia | — | — |
| Publicar una revisión aprobada | — | — | E `content.publish` | E `content.publish` | — | T sin omitir aprobación |
| Retirar contenido por incidencia | Reportar | Reportar | Proponer | E `content.withdraw` | Escalar | T emergencia auditada |
| Conceder roles | — | — | — | — | A, lista permitida | T |
| Descargar fuentes | Según derechos y política del documento para todos los roles | | | | | |

Implementación: roles y permisos Spatie globales; `memberships` define pertenencia y las Policies Laravel comprueban organización activa, propiedad y asignación. La pertenencia a un centro no concede permisos editoriales globales. Roles diferentes por organización son una ampliación explícita, no una semántica implícita del MVP.

## 6. Recorridos de referencia

1. **Consulta:** escribir una sigla → elegir su significado si es ambiguo → abrir ficha de prueba → leer límites de interpretación → abrir referencia exacta.
2. **Estudio:** capítulo → objetivos → lectura → cinco preguntas → explicación de fallos → añadir objetivos al repaso.
3. **Problema clínico simulado:** caso → hipótesis → seleccionar una prueba → recibir un resultado guionizado → elegir siguiente paso → discusión con fuentes.
4. **Edición:** pregunta clínica → fuentes actuales con usos comprobados → ficha propia estructurada y citas, con libro secundario cuando proceda → cotejo documental → revisión independiente → publicación → reindexación y paquete de lectura/práctica permitido.

## 7. Alcance inicial confirmado y tamaño propuesto

El libro existente se conserva inventariado y restringido al propietario, sin que ello acredite nuevos usos o redistribución. La base clínica principal se construirá a partir de guías actuales y contenido editorial propio. No se hará una conversión masiva del texto del libro para presentarla como material libre de derechos.

Temas confirmados: soporte vital, síntomas cardiorrespiratorios y pruebas básicas. Adultos y pediatría, español e inglés clínicos desde el piloto. Propuesta de cobertura final del piloto: 15-20 fichas, 20-30 preguntas, 3 casos y 2 algoritmos cortos, divididos en sublotes compatibles con pocas horas semanales. No es una cuota de producción inmediata. La revisión debe cubrir ambos ámbitos y ambos idiomas antes de publicar cada sublote.

El primer recorrido útil será buscar → ficha breve → interpretación contextual → fuente, seguido de tests formativos. Casos online, algoritmos online y evaluación docente se incorporan después. No hay fecha cerrada; tampoco una cifra de usuarios confirmada. Las pruebas de carga usarán escenarios explícitos, sin atribuirlos a una demanda estimada.

Exportación de apuntes y progreso incluida cuando exista información que exportar. QR y calendarios se aplazan hasta un uso concreto. Recordatorios de repaso y cambios relevantes primero; tareas y plazos cuando se active docencia. Todos serán configurables.

## 8. Qué mediremos

| Objetivo | Medida | Condición para evaluar |
| --- | --- | --- |
| Localización rápida | Tiempo y tasa de éxito en tareas de búsqueda observadas | Usuarios del público real y conjunto de tareas previamente definido |
| Comprensión | Respuestas y razonamiento antes/después y en un repaso posterior | No confundir aciertos inmediatos con retención |
| Fiabilidad documental | Proporción de contenido publicado con fuente, versión y revisión completas | Objetivo de publicación: 100 % de campos obligatorios |
| Facilidad de uso | Finalización de lectura, caso y descarga sin ayuda | Pruebas móvil y escritorio, también con teclado |
| Rendimiento | Latencia p50/p95, errores y peso de descarga | Presupuestos y entorno en documento 10; todavía no medidos |
| Mantenimiento | Tiempo de propagación de una corrección a fichas, preguntas y paquetes | Simulacro de retirada y recuperación |

La aplicación mostrará progreso de aprendizaje, no una puntuación de competencia clínica validada. El número de preguntas contestadas o los días consecutivos son datos de actividad; no certificaciones.
