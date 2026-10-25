# PDF pequeños, navegación precisa y publicación en GitHub

Estado: propuesta de implementación; no se han generado nuevos PDF ni publicado archivos en esta actuación. Fecha: 25 de octubre de 2026. Alcance: primera versión personal de la PWA estática, sin servidor propio ni base de datos, con búsqueda documental y lectura como funciones prioritarias.

Documentos relacionados: [plan de la PWA estática](14_Plan_PWA_estatica.md) y [buscador local y relevancia](15_Buscador_local_y_relevancia.md). Estos tres documentos concretan la nueva fase y prevalecen sobre los requisitos de backend del plan anterior para esta entrega.

## 1. Decisión de arquitectura

La aplicación se podrá alojar en GitHub Pages. El código, el diseño y los recursos necesarios para ejecutar el buscador serán independientes de la biblioteca personal. El libro, sus transcripciones y el índice que permite buscar en todo su texto se prepararán en el equipo y se seleccionarán localmente desde la PWA.

Este modo cumple el objetivo de abrir una aplicación instalada y moverse rápidamente por documentos pequeños, manteniendo el contenido del libro fuera de una publicación pública mientras sólo consta autorización para consulta personal. No se considera que convertir el libro en JSON, OCR, capítulos o índices autorice su distribución. La reproducción y la comunicación pública están reguladas por la Ley de Propiedad Intelectual; cualquier distribución futura deberá tener un fundamento específico. [BOE, artículos 17 a 20](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930#a17).

Hay dos entregables separados:

| Entregable | Ubicación inicial | Contenido |
| --- | --- | --- |
| Aplicación PWA | Repositorio de código y, cuando se despliegue, GitHub Pages | Interfaz Material 3, motor de búsqueda, lector PDF.js, recursos e índices de demostración escritos para el proyecto |
| Biblioteca personal versionada | Carpeta del ordenador o archivos del teléfono seleccionados por su propietario | PDF por capítulos, catálogo, fragmentos con referencias, índice de búsqueda y manifiesto de integridad |

La generación local del índice será un paso de preparación, no un proceso que recorra 1.101 páginas cada vez que el usuario abra la aplicación. No se introducirán IndexedDB, SQL, cuentas, permisos de usuario o un servidor de búsqueda en esta primera fase.

## 2. Situación comprobada del material

Se parte de los archivos existentes y de `Libro dividido/manifiesto.json`:

- PDF original: 1.101 páginas; 298.005.200 bytes, aproximadamente 284,2 MiB.
- 25 PDF por secciones, incluidos preliminares y casos clínicos.
- 198 inicios de capítulo y 45 casos clínicos ya localizados en el manifiesto.
- 32 páginas identificadas como dependientes de OCR para la transcripción auxiliar.
- La sección 02 tiene 120 páginas y 62.998.566 bytes, aproximadamente 60,1 MiB. Dividir sólo por las secciones actuales no basta para una lectura ágil en todos los móviles.

Estas cifras describen los archivos actuales; no certifican todavía la exactitud de subsecciones, los rectángulos de texto ni el rendimiento del futuro visor. El manifiesto contiene los inicios de capítulo, no un inventario verificado de todos los epígrafes interiores.

## 3. Unidad de apertura: capítulo; unidad de búsqueda: fragmento

Se diferencian cuatro niveles:

1. Sección: agrupación de navegación estable del libro.
2. Capítulo: PDF pequeño que se abre normalmente desde los resultados.
3. Subsección: epígrafe interno identificado y validado; puede comenzar a mitad de página.
4. Fragmento: párrafo o bloque coherente usado para encontrar coincidencias, con referencia a sus páginas y, cuando exista, a su posición gráfica.

El resultado de una frase puede apuntar a un fragmento de un capítulo de cardiología, otro de laboratorio y otro de pediatría. El visor abrirá cada PDF correspondiente en su posición; la aplicación conservará la lista de resultados para comparar otras conexiones documentales.

El fragmento no sustituye el contexto. La tarjeta mostrará un extracto breve y la acción abrirá la página completa. Las tablas, los algoritmos y los párrafos continuados tendrán referencias a todas sus páginas. No se cortará un algoritmo para que encaje en un extracto, ni se tomará una fila de tabla como recomendación aislada.

## 4. Preparación de los PDF por capítulos

### 4.1. Procedimiento

1. Verificar la huella del original contra el manifiesto existente y conservarlo como fuente inmutable.
2. Tomar los 198 inicios de capítulo y 45 casos como candidatos de división; comprobar encabezados, páginas de continuación y finales de cada sección.
3. Generar PDF copiando las páginas originales completas. Conservar imágenes, vectores, tablas, fórmulas y texto original. No rasterizar, recortar contenido clínico o reducir resolución para cumplir un objetivo de peso.
4. Añadir marcadores internos verificados cuando sea posible y registrar enlaces que deban resolverse mediante el mapa de páginas. No prometer que un vínculo interno del libro siga funcionando tras extraer sus páginas sin comprobarlo.
5. Registrar tamaño, número de páginas, huella SHA-256 y mapa explícito de cada PDF.
6. Comparar las páginas de cada extracción con su página original renderizada; revisar además la legibilidad con el zoom habitual del lector.

### 4.2. Límites y páginas compartidas

El final inicial de un capítulo será la página anterior al siguiente inicio dentro de la misma sección. Esta regla sólo es provisional: se corrige si un encabezado comparte página con el capítulo anterior o si el bloque continúa en la página del siguiente encabezado.

Cuando dos capítulos ocupen una misma página, se copiará la página completa en ambos PDF si es necesario para mantener ambos contenidos. El catálogo señalará `sharedOriginalPage: true`. La búsqueda deduplicará por fragmento canónico, no por nombre de PDF. La copia física de una página en dos archivos no implica dos resultados distintos para un mismo párrafo.

Las 1.101 páginas deben permanecer cubiertas por el conjunto de documentos, incluidos preliminares y páginas sin capítulo. No se exigirá que la suma de páginas de todos los PDF sea 1.101 cuando haya páginas compartidas justificadas; se exigirá que la unión de páginas originales sea exactamente el conjunto de 1 a 1.101 y que cada duplicación esté explicada.

### 4.3. Presupuesto de tamaño

Objetivo inicial de planificación: PDF habituales de 1 a 8 MiB. No es una medida observada ni un compromiso antes de extraerlos. Un capítulo que supere 12 MiB se revisará para una división adicional por subsecciones completas; puede conservarse mayor si dividirlo deteriora el contexto o un algoritmo ocupa muchas páginas. Se registrará cada excepción.

La división se realizará por límites documentales, no cada número fijo de páginas. La linealización u otras optimizaciones sin pérdida se podrán evaluar después, comprobando que no alteran el contenido. El original y las extracciones fieles seguirán disponibles localmente.

No se generará un PDF por cada coincidencia de una consulta. El navegador reutilizará los PDF por capítulos y sus mapas; así se evita crear miles de archivos redundantes y se conserva la lectura continua.

## 5. Contrato de referencia y mapas de páginas

Toda referencia pública de la aplicación usará páginas reales del archivo, base 1. El número impreso del libro es un dato adicional; nunca reemplaza la página real. Los identificadores deben ser estables, independientes del título traducido y de los nombres de archivos.

El contrato de lectura se añadirá al catálogo del buscador. Los JSON y DTO del corpus estático usan camelCase conforme al documento 15; el manifiesto histórico snake_case se normaliza al preparar el paquete. Los significados siguientes son obligatorios:

| Campo | Significado |
| --- | --- |
| `corpusId`, `corpusVersion` | Biblioteca y versión compatibles del índice, el catálogo y los PDF |
| `sourceId`, `sourceSha256` | Fuente canónica y huella de su PDF original |
| `sectionId`, `chapterId`, `subsectionId` | Jerarquía; `subsectionId` puede ser nulo si aún no está verificada |
| `fragmentId` | Identidad del bloque buscable, estable para esa versión del corpus |
| `documentId`, `relativeFile` | PDF pequeño y ruta relativa dentro de la biblioteca seleccionada |
| `documentSha256`, `byteLength`, `pageCount` | Integridad y dimensiones del archivo que se abrirá |
| `pageMap[]` | Por cada página local: `localPage`, `originalPage` y, si se conoce, `sectionPage` y `printedLabel` |
| `locations[]` | Una o varias ubicaciones del fragmento: página original, página local y rectángulos opcionales |
| `anchorPrecision` | `verified_region`, `text_match` o `page_only`; nunca una precisión inventada |
| `subsectionVerification` | `heading_verified` o `unverified`; un encabezado cotejado no implica una región exacta |
| `extractionMethod` | Texto nativo, OCR o revisión manual, con estado de validación |

Ejemplo verificable a partir del manifiesto actual: el capítulo 8, «Gasometría, pulsioximetría y capnografía», empieza en la página original 71 y la página 35 de la sección 02. Si el PDF del capítulo se extrae comenzando en 71, su primera página local será 1. No se afirma aquí una subsección o rectángulo concreto dentro de esa página.

Para extracciones contiguas se puede comprobar `localPage = originalPage - originalStart + 1`; se almacenará igualmente el mapa explícito para soportar páginas compartidas, anexos y futuras divisiones. Toda ubicación debe ser resoluble sin cargar el PDF de 1.101 páginas.

### 5.1. Rectángulos y precisión interior

Cuando exista una ubicación verificada, se guardarán uno o varios rectángulos normalizados `[x0, y0, x1, y1]` entre 0 y 1, respecto al área visible de la página con su rotación canónica. El origen de estas coordenadas será la esquina superior izquierda de esa representación. El generador registrará CropBox y rotación usados; el lector transformará los puntos mediante el viewport de PDF.js para el zoom y la rotación actuales.

No se convertirán coordenadas PDF sin transformar su origen, escala, recorte y rotación. Las pruebas incluirán páginas con columnas, tablas y distintos giros. Un bloque que cruce columnas o páginas tendrá varias ubicaciones; no un rectángulo que seleccione texto ajeno entre ambas columnas.

La transcripción Markdown existente puede ayudar a localizar un pasaje, pero sus saltos de línea no proporcionan coordenadas del PDF. Se extraerán posiciones del texto nativo o del OCR de la página correspondiente y se cotejarán. El índice conservará un mapa entre el texto normalizado para buscar y el texto original, para que eliminar tildes o unir palabras partidas no desplace los resaltados.

Si no hay posición fiable, se abrirá la página y se mostrará «Coincidencia en esta página». Si una búsqueda de texto dentro de esa página encuentra varias ocurrencias, el lector permitirá recorrerlas y mantendrá la precisión `text_match`. Sólo las regiones cotejadas se mostrarán como «Ir al apartado» o «Ir al fragmento». Un resultado OCR no localizado gráficamente nunca se presentará como un salto exacto a una línea.

## 6. Lector integrado con PDF.js

Se integrará PDF.js en la propia PWA, con su worker y sus recursos distribuidos en la misma versión. El buscador permanecerá activo mientras se abre el documento y no se dependerá del comportamiento del visor PDF del sistema ni de que un enlace `#page=` funcione igual en todos los móviles. PDF.js recomienda renderizar las páginas visibles; la carga parcial remota depende del navegador y de las respuestas HTTP del servidor. [FAQ oficial de PDF.js](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#i-want-to-render-all-100-pages-in-a-document-at-a-high-resolution-is-it-a-good-idea).

### 6.1. Apertura local

La aplicación resolverá `documentId` contra los archivos seleccionados por el usuario. Leerá únicamente los bytes del PDF de ese capítulo y los entregará como `Uint8Array` o mediante una URL de objeto local controlada por la aplicación. Abrir el capítulo no exige leer el libro completo ni subir el archivo a GitHub. La File API permite leer archivos seleccionados explícitamente; seleccionar no equivale a enviarlos por red. [MDN, File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications).

El lector liberará tareas de render, objetos PDF y URLs temporales cuando ya no sean necesarios. Un cambio rápido de resultado cancelará el render anterior para evitar que una página de otro capítulo aparezca después del nuevo resultado.

### 6.2. Páginas base 1 y destinos base 0

`PDFDocumentProxy.getPage(localPage)` recibe la primera página como 1. En cambio, `getPageIndex(ref)` devuelve un índice base 0, y los destinos explícitos del visor que usan `pageIndex` exigen la conversión `localPage - 1`. La conversión se hará sólo en el adaptador que la necesite; restar 1 antes de llamar a `getPage` sería un error. [API oficial PDFDocumentProxy](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html#getPage).

### 6.3. Ciclo de lectura

1. Comprobar versión de biblioteca y existencia del PDF.
2. Resolver el mapa y abrir la página local destino.
3. Renderizar esa página con prioridad y preparar las inmediatamente contiguas cuando haya recursos.
4. Aplicar zoom al ancho o zoom elegido por el usuario, con texto seleccionable y navegación por teclado.
5. Desplazarse a la región verificada, o al inicio de la página cuando la precisión sea `page_only`.
6. Mostrar en la barra el capítulo, la página local y la original; permitir avanzar y retroceder sin salir del lector.
7. Mantener accesibles las acciones «Volver a resultados», «Siguiente sugerencia» y «Anterior sugerencia».

Se conservarán en memoria la consulta, filtros, orden de resultados, resultado seleccionado y posición de desplazamiento. El botón Atrás restaurará exactamente esa lista, sin volver a ordenarla por una consulta ya ejecutada. Una consulta nueva sí generará una lista nueva.

En escritorio se propone lista y lector simultáneos. En móvil se abrirá una pantalla de lectura con cabecera compacta y retorno claro; un panel accesible permitirá cambiar de sugerencia. Los enlaces profundos internos guardarán sólo los identificadores de biblioteca, versión, documento y ancla necesarios para abrir el destino. No incluirán la frase clínica en la URL por defecto.

Si se abre un enlace sin biblioteca seleccionada, la aplicación pedirá vincularla y después retomará el destino. Un enlace no transfiere los PDF, no concede acceso al contenido y no convierte un archivo local en un recurso compartido.

### 6.4. Documentos remotos futuros

Sólo para materiales que puedan publicarse se evaluará abrir PDF por URL. Se medirán solicitudes Range y respuestas 206, CORS cuando proceda y funcionamiento con el service worker. No se dará por hecho que `HEAD`, `Accept-Ranges` o una URL de GitHub garantizan lectura parcial en el despliegue final.

PDF.js permite configurar `disableRange`, `disableStream` y `disableAutoFetch`; desactivar la precarga automática exige también desactivar streaming según su API. La política concreta se fijará mediante medición, no copiando opciones sin comprobar la descarga resultante. Si el servidor no admite rangos útiles, se descargará el capítulo completo y se informará de su tamaño, manteniendo el mismo destino de página. [API de carga de PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html#~DocumentInitParameters).

La biblioteca local no depende de solicitudes Range HTTP: la reducción real de trabajo procede de abrir un capítulo pequeño y renderizar las páginas necesarias.

## 7. Biblioteca personal sin base de datos

### 7.1. Estructura propuesta del paquete

```text
biblioteca-personal/
  content-manifest.json
  index/
    catalog.<hash>.json
    search.<hash>.json
    concepts.<hash>.json
  evidence/
    <chapter-id>.<hash>.json
  pdf/
    <document-id>.<hash>.pdf
  page-maps/
    <document-id>.<hash>.json
  qa/
    integrity.json
    page-coverage.json
    unresolved-anchors.json
```

Los archivos de índice y fragmentos serán consumidos por el worker del buscador. Las rutas efectivas se leen del manifiesto; el árbol no se reconstruye a partir de nombres clínicos. Un capítulo puede tener varios PDF pequeños: cada tramo de evidencia resuelve `documentId` y `localPage`, sin suponer que el número dentro del capítulo sea la página del archivo que se abre. La división exacta y los campos del índice se fijan en el documento de búsqueda. Este árbol expresa una biblioteca preparada, no una base de datos ni un ZIP que deba extraerse entero en memoria al abrir la PWA.

`content-manifest.json` identificará versión de esquema y biblioteca, fuentes, archivos necesarios, tamaños, huellas y compatibilidad con la aplicación. El proceso local lo generará junto a los documentos; es distinto del `Libro dividido/manifiesto.json` histórico. Una actualización será un paquete coherente completo o un reemplazo validado; no se mezclarán un índice nuevo y mapas PDF antiguos.

### 7.2. Vinculación en ordenador y móvil

La vía base será seleccionar archivos con un control de archivos múltiple. Se podrá ofrecer selección de carpeta mediante `webkitdirectory` donde funcione, con alternativa clara si el sistema no permite elegir carpetas. No se exigirá File System Access API ni acceso a rutas locales escrito a mano, porque no se puede asumir soporte uniforme en todos los teléfonos.

El catálogo resolverá archivos por sus rutas relativas cuando estén disponibles; el modo de archivos múltiples usará nombres únicos y validará que no haya ambigüedades. La interfaz mostrará «Biblioteca completa» o una lista concreta de archivos faltantes. No interpretará un documento ausente como si no hubiera resultados relevantes.

Un formato ZIP puede añadirse como comodidad después de medir la importación en móvil, usando extracción limitada y progresiva. No será el único modo de uso ni se prometerá que un paquete de cientos de megabytes cabe en memoria sin copias adicionales.

La selección de archivos por el usuario se pierde normalmente al cerrar o recargar la aplicación; la primera entrega debe explicar cuándo se necesita volver a vincular la biblioteca. No se prometerá conservar permisos de archivos indefinidamente.

### 7.3. Disponibilidad sin conexión y caché opcional

La PWA precargará sólo su interfaz y recursos esenciales. El corpus no se incluirá en el precache público. La lectura offline requiere la biblioteca accesible desde el dispositivo o una copia local que el usuario decida guardar en Cache Storage.

Como mejora posterior dentro de este alcance, «Guardar biblioteca en este dispositivo» podrá almacenar respuestas construidas con los archivos seleccionados bajo claves internas de versión. Será un almacén de archivos, sin IndexedDB ni un servicio externo. Mostrará tamaño estimado, progreso, falta de espacio y opción de borrar biblioteca. El índice se mantendrá en memoria de trabajo al buscar.

Cache Storage requiere HTTPS y gestión explícita de actualizaciones; su persistencia depende del navegador. La aplicación comprobará disponibilidad, estimará cuota y manejará errores o expulsión de archivos. Una copia en caché no es una copia de seguridad ni un permiso de distribución. [MDN, Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache).

La eliminación de una biblioteca borrará sus PDF, índices y fragmentos guardados, liberará los objetos en memoria y restablecerá el estado de vinculación. Una actualización de la interfaz no borrará automáticamente archivos personales sin una migración o acción explícita; un cambio incompatible bloqueará su uso con explicación y opción de reimportar.

El service worker distinguirá recursos de la interfaz y biblioteca local. Si se sirven PDF desde respuestas cacheadas completas, no simulará una respuesta 206 sin implementar correctamente el rango; alternativamente el lector recibirá los bytes del capítulo completo. Se probarán ambas rutas elegidas, incluida la ausencia de conectividad.

## 8. Publicación y límites de GitHub

GitHub Pages aloja HTML, CSS y JavaScript estáticos; puede publicar una compilación, pero no ejecuta Laravel o PHP como servidor. El futuro backend queda aplazado y la estructura de referencias debe permitir incorporarlo después sin rehacer el catálogo. [GitHub, qué es Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

### 8.1. Qué se podrá publicar en esta fase

| Material | Decisión inicial |
| --- | --- |
| Código de la PWA, iconos y recursos con licencia compatible | Publicable cuando se configure el despliegue |
| Datos ficticios para comprobar búsqueda, visor y pantallas | Publicables con revisión del paquete final |
| PDF original o sus extracciones por capítulos | Sólo biblioteca personal local |
| Markdown/OCR del libro, fragmentos extensos y figuras | Sólo biblioteca personal local |
| Índice invertido o catálogo enriquecido que incorpore texto del libro | No se publica como mecanismo indirecto de distribución; permanece en el paquete personal |
| Futuras guías o contenido propio con permisos suficientes | Se evalúan por fuente antes de incluirlos en una entrega pública |

Antes de desplegar se inspeccionará el artefacto final, no sólo la carpeta de código: ni los PDF ni sus derivados privados pueden entrar por una copia automática, una dependencia, un source map, un archivo de prueba o un informe generado. La biblioteca se ubicará fuera de los directorios de publicación y se excluirá del seguimiento de Git. No se ejecutará su preparación con material privado dentro de un workflow público.

### 8.2. Repositorio privado y sitio privado son decisiones diferentes

La disponibilidad de Pages desde un repositorio privado depende del plan. La publicación privada con control de acceso de Pages requiere una organización con GitHub Enterprise Cloud y condiciones concretas de repositorio; no debe suponerse que un repositorio privado da lugar a una web privada. Se comprobará la cuenta real antes del despliegue. [GitHub, visibilidad y control de acceso](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

No se implementará una falsa protección con una contraseña en JavaScript, un enlace difícil de adivinar o un token de GitHub incrustado en el navegador. Si en el futuro se requiere servir el corpus remotamente con acceso restringido, se elegirá una infraestructura con autenticación y autorización reales, además de aclarar los permisos del contenido.

El nuevo requisito de contraseña se concreta en el [documento 17](17_Acceso_con_contrasena.md): paquete personal cifrado, desbloqueo local y caché únicamente cifrada. No equivale a autenticación de Pages ni autoriza la publicación del corpus. Las pruebas de apertura se repetirán incluyendo el coste de descifrar el capítulo pequeño.

### 8.3. Límites relevantes

La documentación consultada establece un máximo de 1 GB para el sitio publicado y un límite flexible de 100 GB de transferencia al mes; los límites y el plan se volverán a comprobar al desplegar. Separar corpus y aplicación reduce el peso del sitio y evita usar Pages como almacén del libro. [GitHub, límites de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

En Git ordinario se bloquean archivos mayores de 100 MiB y se advierte por encima de 50 MiB; el original actual supera el primer límite y la sección 02 supera el segundo. Son restricciones distintas de las de Pages y no constituyen el motivo principal de mantener la biblioteca local. Cambiar a LFS, Releases o un repositorio privado tampoco resuelve por sí mismo el permiso para distribuir el contenido. [GitHub, archivos grandes](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## 9. Validación y criterios de aceptación

Esta actuación sólo define el trabajo; los siguientes son controles exigidos a la implementación futura.

### 9.1. Integridad documental

- La fuente conserva su SHA-256 y sus 1.101 páginas.
- La unión de mapas cubre todas las páginas de 1 a 1.101; cada página compartida tiene justificación.
- Cada PDF abre, tiene el número declarado de páginas y coincide con su huella.
- Toda página extraída se compara con la original con el mismo renderizador y resolución; las discrepancias deben resolverse o documentarse antes de aceptar la biblioteca.
- Los capítulos y casos empiezan donde corresponde; las páginas de cierre, tablas y algoritmos continuados se conservan.
- Las 32 páginas OCR mantienen su procedencia y no adquieren una precisión de ancla que no haya sido validada.
- No existen rutas de catálogo a archivos ausentes, duplicados ambiguos o fuera del paquete.

### 9.2. Exactitud de navegación

- Comprobación automática de todos los destinos: identificadores válidos, `localPage` entre 1 y `pageCount`, correspondencia con la página original y rectángulos válidos.
- Revisión visual de los inicios de todos los capítulos y casos; muestreo estratificado de subsecciones y prueba exhaustiva de los destinos usados en el conjunto de consultas de aceptación.
- Regresión de errores de una página: primera página, última, caso clínico, capítulo compartido y página impresa diferente de la real.
- Prueba de columnas, rotación, OCR, párrafo continuado, tabla y algoritmo de varias páginas.
- Si no se valida una región, el resultado baja a `page_only`; el control de calidad no se supera con un rectángulo aproximado presentado como exacto.

### 9.3. Fluidez y retorno

- Abrir un resultado no solicita ni lee el PDF original completo.
- Sólo se carga el PDF del capítulo elegido y se renderizan las páginas necesarias; los documentos abandonados liberan recursos.
- Atrás restaura consulta, filtros, orden y desplazamiento; siguiente sugerencia mantiene el conjunto de resultados de esa consulta.
- Se mide el tiempo de apertura de primera página en una muestra de capítulos ligeros, pesados, escaneados y con algoritmos, en escritorio y móvil de referencia. Se registran carga inicial, caché y modo offline por separado.
- Objetivo inicial sujeto a medición: primera página local habitual visible en menos de 1 segundo en el dispositivo de referencia, con percentil 95 registrado; los documentos pesados se muestran como casos separados. No se afirmará «ultrarrápido» sólo con una medida en un ordenador potente.
- Los objetivos del buscador y del lector se miden por separado: que aparezcan resultados no implica que el PDF ya esté renderizado.

### 9.4. Instalación y publicación

- Prueba de instalación y reapertura en Android, iOS y escritorio mediante sus flujos disponibles.
- Selección de biblioteca con archivos múltiples y alternativa a carpetas no soportadas; verificación de reimportación después de cerrar.
- Sin conexión: interfaz disponible y apertura de documentos vinculados o guardados; los ausentes se identifican sin simulación de éxito.
- Ninguna petición envía consultas, texto del corpus o archivos personales a servicios externos; los recursos esenciales se sirven desde la propia aplicación.
- El artefacto de Pages contiene sólo la aplicación y demostración permitida. No incorpora el libro, sus derivados privados ni credenciales.

## 10. Orden de ejecución

1. Cerrar los contratos de biblioteca, fragmentos y mapas con el motor de búsqueda.
2. Preparar localmente una muestra de capítulos de soporte vital, síntomas cardiorrespiratorios y pruebas básicas; validar precisión y tamaños antes de procesar toda la biblioteca.
3. Construir el flujo completo consulta → resultado → página/región → regreso a la misma lista.
4. Corregir los límites de capítulos y anclas que revele la muestra; preparar y validar la biblioteca completa.
5. Añadir instalación, funcionamiento offline y gestión explícita del almacenamiento.
6. Preparar un despliegue de la aplicación con demostración propia en GitHub Pages; comprobar contenido del artefacto y privacidad real del plan de GitHub.
7. Probar la aplicación instalada con la biblioteca personal del propietario, sin incorporarla al sitio publicado.

La prioridad es que una búsqueda encuentre el lugar adecuado y que abrirlo y volver sean fiables. La generación de tests, los casos interactivos, las cuentas y el backend se mantienen fuera de esta entrega.
