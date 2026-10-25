# Decisiones confirmadas y alcance de la versión 1.1

Estado: respuestas del usuario incorporadas en v1.1 y cambio posterior de primera fase registrado en la sección 5. Fecha de referencia: 25 de octubre de 2026. Para la primera implementación prevalecen la sección 5 y los documentos 14–16; los apartados anteriores conservan las decisiones del producto completo como antecedente.

## 1. Respuestas registradas

| Pregunta | Respuesta | Decisión de producto |
| --- | --- | --- |
| 1 | C | Público multiprofesional sanitario, con itinerarios por nivel y profesión |
| 2 | C | Formación y consulta documental ahora; estudiar orientación individualizada como producto posterior separado |
| 3 | A | Primera versión de uso exclusivo del propietario, en entorno privado |
| 4 | A | Consulta personal del libro; no hay permiso de distribución acreditado |
| 5 | C | Guías actuales como estructura clínica principal; libro como referencia secundaria |
| 6 | A | Ámbito prioritario España |
| 7 | B | Adultos y pediatría desde el piloto |
| 8 | A | Soporte vital, síntomas cardiorrespiratorios y pruebas básicas |
| 9 | A | Prioridad máxima: búsqueda y consulta rápida |
| 10 | A | Docencia con grupos después de validar el uso individual |
| 11 | A | Seis perfiles: aprendiz, docente, editor, revisor, administrador y superadministrador técnico |
| 12 | No sabe | Escala sin determinar; no atribuir capacidad de usuarios ni concurrencia reales |
| 13 | Respuesta libre | Estructurar el conocimiento en la base de datos y resolver los usos de las fuentes; no elegir una descarga masiva del PDF |
| 14 | A | Sin conexión: lectura y tests formativos descargados en el primer alcance |
| 15 | C | Práctica y evaluación con políticas distintas; evaluación con integridad online |
| 16 | A | Casos adaptados del libro cuando su uso esté permitido y casos nuevos revisados |
| 17 | C | Equipo de revisión clínica todavía por organizar |
| 18 | B | Español e inglés clínicos desde el piloto; árabe y darija después |
| 19 | C | Sin IA en las primeras versiones |
| 20 | A | Casos ficticios o adaptados sin datos personales de pacientes |
| 21 | C | Alojamiento pendiente de decidir |
| 22 | B | Política futura de registro abierto con aprobación; no habilitar acceso externo en la versión privada |
| 23 | C | Comparar alternativas visuales antes de elegir identidad |
| 24 | B | Repaso, cambios relevantes, tareas y plazos; configurables y activados según la fase |
| 25 | A | Exportar apuntes/progreso; QR y calendarios sólo con un uso concreto |
| 26 | C | Mantener estrictamente las versiones del stack; documentar bloqueos y no desplegar hasta resolverlos |
| 27 | A | Proyecto personal, pocas horas semanales |
| 28 | A | Avanzar por hitos de calidad, sin fecha cerrada |

## 2. Cómo se resuelven las combinaciones

### Privado ahora y registro aprobado después

La primera instancia contiene una cuenta propietaria activa. El registro externo estará deshabilitado. El sistema de estados de cuenta y aprobación puede prepararse sin abrir el servicio. Cuando se decida ampliar el acceso, las solicitudes crearán cuentas `pending_approval`, sin acceso a contenidos, paquetes ni actividades hasta su aprobación. Abrir altas no concede derechos sobre el libro.

Los seis perfiles son un contrato de permisos confirmado, no seis personas ya disponibles. El propietario puede alternar vistas y capacidades autorizadas. No se fingirá la existencia de un revisor independiente por asignarle dos roles a la misma cuenta.

### Guías principales y libro secundario

La navegación clínica y las relaciones se organizan por problemas, conceptos y competencias conforme a fuentes actuales seleccionadas para España. La jerarquía original de las 23 secciones se conserva como índice del libro, sin convertirse en la única taxonomía clínica. Adultos y pediatría tienen ámbito y fuentes diferenciados desde el piloto.

Las guías actuales también tienen condiciones de uso. Su acceso público no se tratará automáticamente como licencia de reproducción, traducción o redistribución. Las referencias y los hechos clínicos se expresarán en contenido editorial propio, con procedencia y revisión, usando materiales reutilizables o permisos cuando corresponda.

### Base de datos y derechos del PDF

La respuesta 13 se interpreta como una preferencia por fichas, relaciones, preguntas y algoritmos estructurados, en lugar de hacer depender toda la experiencia del visor PDF. No es una autorización para eliminar atribuciones ni convertir el libro completo en una copia redistribuible.

Cambiar el formato no acredita nuevos derechos sobre el contenido. El [documento 04](04_Ingesta_y_gobierno_del_contenido.md) desarrolla esta distinción y enlaza la referencia normativa; no se presume una excepción por tratarse de una aplicación privada.

Decisión de diseño: conservar el archivo documental ya existente restringido al propietario; registrar sus metadatos, páginas y citas; construir una capa clínica propia desde guías actuales y fuentes con usos comprobados. No incorporar el texto íntegro ni imágenes del libro a una entrega web, exportación o paquete general sin comprobar el uso previsto. No se garantiza «ausencia de copyright» por una conversión técnica. El documento 04 concreta el proceso.

### Uso personal y revisión clínica pendiente

Se puede avanzar en datos, interfaz, búsqueda y pruebas con metadatos, contenido autorizado y ejemplos sintéticos. La falta de equipo revisor no bloquea ese trabajo. Las fichas y actividades clínicas que requieran revisión seguirán como borradores o material pendiente, sin marcas de aprobación ficticias. El piloto clínico revisado depende de organizar esa revisión, también en inglés y pediatría.

### Pocas horas y varios idiomas

Se trabajará en un único sublote cada vez. Cada sublote publicable incluirá español e inglés revisados antes de ampliar el número de temas; no se traducirá todo el libro por adelantado. La infraestructura prepara los otros idiomas sin exigir su producción editorial en el piloto.

### Evaluación y falta de red

La práctica offline puede incluir soluciones descargadas y resultados provisionales. Una evaluación que necesite proteger respuestas y controlar plazos será online. Los casos y recorridos interactivos de algoritmos offline se aplazan; leer sus fichas o diagramas descargados sí forma parte de lectura.

### Stack estricto

No se actualizará una versión mayor o menor fijada para resolver una incompatibilidad sin una nueva decisión del usuario. Primero se comprobará si hay una combinación exacta compatible y mantenible dentro de los rangos solicitados. Un bloqueo sin solución aceptable dentro de ellos impide el despliegue afectado; no impide preparar documentos, datos o prototipos locales. No se omitirán comprobaciones de plataforma o auditorías para aparentar compatibilidad.

## 3. Decisiones aún pendientes, sin repetir el cuestionario

| Aspecto | Qué falta | Cuándo hace falta resolverlo |
| --- | --- | --- |
| Identidad visual | Elegir entre las alternativas del documento 06 | Antes de fijar semilla, nombre y componentes definitivos |
| Revisión clínica | Responsable y disponibilidad de revisión independiente por idioma/ámbito | Antes de publicar el lote clínico correspondiente |
| Hosting | Entorno, recursos, costes y control de PHP/colas | Antes de preproducción/despliegue |
| Escala | Uso observado y, si se amplía, concurrencia prevista | Antes de dimensionar producción multiusuario |
| Fuentes y permisos | Ediciones concretas y usos permitidos | Antes de importar/reutilizar contenido de cada fuente |
| Compatibilidad | Lockfiles y pruebas reales del stack estricto | Antes de aprobar viabilidad técnica y desplegar |

No se solicita otro cuestionario general. La siguiente revisión concreta puede centrarse en las alternativas visuales cuando el usuario quiera escogerlas.

## 4. Orden de trabajo ajustado

1. Comparar identidad visual y comprobar viabilidad del stack, con tareas locales acotadas.
2. Inventario y fuentes actuales del primer sublote, con alcance adulto/pediátrico y registro de usos.
3. Base de datos, revisión editorial y búsqueda trazable como primer recorrido completo.
4. Fichas y tests del sublote en español e inglés; revisión clínica antes de publicación.
5. Lectura y práctica formativa offline, exportación de apuntes y progreso.
6. Casos y algoritmos online, repaso y mejora de búsqueda.
7. Docencia, evaluaciones de grupos y altas aprobadas sólo después de validar el uso individual y decidir ampliar acceso.

Todo el plan sigue siendo documental. No se han iniciado la programación, la importación clínica ni un despliegue con estas respuestas.

## 5. Cambio posterior confirmado: PWA estática y buscador primero

El usuario establece una primera fase sin base de datos, alojada como aplicación estática en GitHub. Su objetivo inmediato es escribir frases con términos clínicos, cruzar todo el corpus disponible, recibir sugerencias relacionadas y abrir PDF pequeños en la sección/subsección y página correspondientes, conservando la búsqueda al volver.

Consecuencias respecto a v1.1:

- PHP/Laravel/MariaDB y paneles Filament no son requisitos de ejecución de esta fase; quedan para después. No se despliega un backend en Pages.
- Se generan catálogo, fragmentos e índices estáticos localmente; búsqueda en el navegador, sin IA ni API remota y sin IndexedDB inicial.
- Se profundiza la división de los PDF hasta capítulos y, donde convenga, subsecciones completas, con mapa explícito a las páginas originales. Es trabajo futuro; las 25 divisiones existentes se conservan.
- La precisión de ancla se declara: página, coincidencia textual o región verificada. No se promete una línea exacta usando sólo el Markdown.
- Las sugerencias reflejan relevancia documental y contexto, no probabilidades diagnósticas.
- La app conserva consulta, filtros, orden y scroll al abrir un PDF y volver a la lista.
- La privacidad y el uso personal del libro siguen vigentes. La app de GitHub puede funcionar con una biblioteca seleccionada localmente; eso evita publicar PDF, transcripciones e índices textuales del libro por defecto.
- No se simulan roles, registro aprobado, sincronización ni permisos con JavaScript. Esas funciones esperan una fase con servicios adecuados.
- Las guías actuales siguen siendo el fundamento de futuras fichas clínicas. Buscar en el libro histórico es una función documental y no una validación clínica de sus contenidos.
- El diseño Material 3 se mantiene. Idiomas, docencia, tests y demás decisiones se retoman después de validar el buscador; el idioma real del corpus y cualquier equivalencia bilingüe se muestran sin traducción clínica ficticia.

Plan actual: [14. Implementación estática](14_Plan_PWA_estatica.md), [15. Búsqueda y relevancia](15_Buscador_local_y_relevancia.md), [16. PDF, navegación y publicación](16_PDF_navegacion_y_publicacion.md).

## 6. Requisito posterior: acceso mediante contraseña

El usuario solicita que sólo quien conozca la contraseña pueda usar el contenido de la PWA. Se incorpora pantalla de desbloqueo con protección criptográfica del paquete personal, manteniendo la fase estática y sin BD. No basta ocultar la interfaz ni dejar los PDF e índices en claro. El [documento 17](17_Acceso_con_contrasena.md) concreta cifrado, sesión, caché, límites y pruebas. La contraseña compartida no identifica una persona, no impide que se comparta y no cambia los usos permitidos del libro. No se ha establecido contraseña ni publicado ningún archivo.

## 7. Cuenta de destino en GitHub

Cuenta confirmada por el usuario: **jmgo93**, la cuenta conectada. Esta confirmación corrige la elección anterior escrita como **jmago93**. Repositorio creado y verificado como privado: [jmgo93/urgencias-pwa](https://github.com/jmgo93/urgencias-pwa). GitHub Pages se configurará posteriormente, cuando exista una aplicación con el acceso mediante contraseña implementado y verificado. No se ha publicado la aplicación ni configurado una contraseña. El libro y sus derivados personales quedan fuera del repositorio.
