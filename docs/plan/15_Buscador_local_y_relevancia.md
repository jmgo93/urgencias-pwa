# Buscador local: frases, conceptos y relevancia documental

Requisito añadido: el [acceso con contraseña](17_Acceso_con_contrasena.md) protege el paquete personal mediante cifrado. Los JSON e índices descritos aquí son el formato lógico que utiliza el worker después de desbloquear; cualquier copia persistente protegida será cifrada. Los objetivos de rendimiento deben incluir la apertura y descifrado iniciales por separado de la búsqueda caliente.

Estado: plan de implementación; no es una aplicación ya construida. Fecha: 25 de octubre de 2026. Este documento concreta el buscador de la [fase PWA estática](14_Plan_PWA_estatica.md) y su contrato con el [visor y la preparación de PDF](16_PDF_navegacion_y_publicacion.md). En esta fase no se ejecutan PHP, Laravel ni consultas a una base de datos. Las propuestas anteriores de búsqueda sobre MariaDB quedan reservadas para una fase posterior.

Actualización del 26 de octubre de 2026: el buscador local ya está implementado. El apartado 7 recoge su nueva política de cruce obligatorio; el resto conserva propuestas del diseño inicial que no deben interpretarse como funciones ya entregadas. El estado efectivo se documenta en el [README](../../README.md).

## 1. Resultado que debe ofrecer

El usuario escribe términos sueltos o una frase. El navegador busca en todo el corpus disponible, identifica coincidencias literales y variantes revisadas, cruza los conceptos por pasaje y presenta destinos concretos dentro de capítulos y subsecciones. Cada resultado explica qué parte de la consulta ha encontrado, dónde y mediante qué variante. Abrirlo lleva al PDF pequeño y a la página correspondiente; volver recupera la búsqueda y su posición.

La ordenación expresa **relevancia documental**: cuánto coincide un pasaje con lo escrito. No expresa probabilidades de enfermedad, confirmación diagnóstica, gravedad ni una recomendación de pruebas o tratamiento. Una cifra como «3 de 4 conceptos localizados» describe cobertura textual y no una probabilidad clínica.

Sin IA ni embeddings: el primer motor será búsqueda de texto con diccionario explícito, reglas pequeñas y verificables, y ordenación por evidencia. Las relaciones clínicas nuevas, si se añaden, se incorporarán como contenido editorial revisado y separado del texto de origen.

## 2. Lo que ya existe y lo que hay que preparar

La carpeta contiene 25 transcripciones `contenido.md`, una por PDF dividido. Suman 5.117.946 bytes, aproximadamente 4,88 MiB, antes de generar un índice. Hay 1.101 páginas originales, 198 capítulos y 45 casos clínicos: 243 entradas de contenido de esos dos tipos, además de preliminares y agrupación por secciones. El tamaño del Markdown no permite deducir todavía el del índice, su consumo de memoria ni la latencia en un móvil.

La inspección de los archivos cardiovascular, respiratorio y de casos confirma que ya existen:

- Índices de capítulos o casos y referencias a página original y página de sección.
- Separadores del tipo `## Página original 208 | Página de sección 52`.
- Enlaces a los PDF de sección y anclas `pagina-original-N`.
- Marcas de texto OCR pendiente de cotejo. El inventario previo registra 32 páginas OCR.

No existe todavía una jerarquía editorial fiable de todas las subsecciones. Buena parte de sus encabezados son líneas de texto, no títulos Markdown estructurados. También hay errores de extracción en títulos, por ejemplo «d olor torácico agudo». Por tanto, no basta con dividir automáticamente por títulos Markdown ni se puede prometer posición exacta de todas las subsecciones con el estado actual.

Se preparará una capa de navegación revisable que corrija exclusivamente los metadatos necesarios y conserve el texto fuente. La precisión del anclaje se distinguirá como `page_only`, `text_match` o `verified_region`: página, coincidencia de texto o región del PDF verificada, respectivamente. Por separado, la subsección tendrá estado `unverified` o `heading_verified`. Haber cotejado su encabezado permite anunciar la subsección, pero no acredita una posición exacta dentro de la página. La confianza en la localización no equivale a revisión clínica del contenido.

## 3. Arquitectura mínima elegida

Primera opción: **un índice global precompilado, un Web Worker de búsqueda y ficheros de evidencia por capítulo**. Se usará esta opción si supera los presupuestos de transferencia, memoria y tiempos del documento 14. No se introduce de entrada una segunda arquitectura con fragmentación del índice.

MiniSearch es el candidato inicial. La documentación del proyecto describe búsqueda en memoria, configuración por campos, búsqueda aproximada y exportación/carga de un índice JSON; el paquete oficial consultado declara la versión 7.2.0. Se propone fijar exactamente esa versión, comprobar su publicación y licencia al generar el lockfile y registrar la configuración del índice. No se da por demostrada su idoneidad con este corpus antes de medirlo. [Documentación del proyecto](https://lucaong.github.io/minisearch/), [API de serialización y carga](https://lucaong.github.io/minisearch/classes/MiniSearch.MiniSearch.html), [declaración oficial del paquete](https://raw.githubusercontent.com/lucaong/minisearch/master/package.json).

La ejecución del motor se aislará en un Worker para que cargar y consultar el índice no bloquee la interfaz; la interfaz y el Worker intercambiarán mensajes con identificador de petición. Ese es el uso documentado de los Web Workers. [Documentación de Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

Flujo previsto:

```text
Preparación local / build
  PDF y Markdown permitidos
       → inventario y mapa de páginas
       → capítulos, subsecciones y fragmentos revisables
       → índice JSON + manifiesto + evidencias + PDF por capítulo

Navegador
  interfaz y catálogo pequeño
       → consulta al Worker con el índice preparado
       → candidatos + comprobación de cobertura y evidencias
       → resultados agrupados por capítulo
       → visor PDF en página y anclaje disponibles
```

El navegador no descargará los 25 Markdown para reconstruir el índice en cada apertura, ni extraerá el texto de los PDF para buscar. Esos trabajos se harán una vez en la preparación. Los PDF completos no forman parte de la carga inicial de búsqueda.

El catálogo ligero permite empezar a navegar por títulos mientras el índice de texto se prepara. Esa vista indicará «Buscando en títulos; preparando texto completo». Sólo cuando el índice completo esté disponible se podrá anunciar «Búsqueda en todo el contenido disponible». Un resultado provisional nunca se presentará como búsqueda exhaustiva.

## 4. Archivos, versiones e identificadores

Contratos lógicos que se crearán al implementar; estos nombres no implican que los archivos existan ya:

```text
content-manifest.json                 # versión, archivos, hashes y cobertura
index/catalog.<hash>.json              # secciones, capítulos y títulos
index/search.<hash>.json               # índice global precompilado
index/concepts.<hash>.json             # términos, variantes y revisión
evidence/<chapter-id>.<hash>.json       # fragmentos, texto y trazas de página
pdf/<chapter-id>.<hash>.pdf             # capítulo fiel, según documento 16
```

Las rutas finales dependen de si el corpus se carga de forma privada local o es publicable. La aplicación no incluirá texto, índices derivados ni fragmentos del libro en una entrega pública por el mero hecho de ser JSON. El modo de empaquetado y publicación lo establece el documento 16. El motor debe admitir un proveedor de contenido que lea esos mismos contratos desde el paquete local permitido.

El manifiesto contendrá `schemaVersion`, `corpusVersion`, `indexConfigVersion`, versión del motor, hash de cada archivo y cobertura. Una actualización de datos se aceptará como conjunto coherente. No se mezclará un índice nuevo con evidencias o PDF de otra versión.

Los contratos JSON estáticos y sus DTO usarán campos en `camelCase`, compartidos con el visor del documento 16. Los manifiestos históricos que usen `snake_case` se normalizarán durante la preparación; no se expondrán dos nombres distintos para la misma propiedad en la aplicación. Los nombres y rutas del árbol anterior son orientativos: los recursos efectivos se resolverán desde `content-manifest.json`.

Los identificadores serán cadenas estables de documentos, capítulos, subsecciones y fragmentos; no son claves de una base de datos. Ejemplo de espacio de nombres: `jm-local/ch025/p0208/b0001`. Un registro de preparación conservará estos identificadores al corregir OCR o títulos. El hash identifica una versión del archivo, no la identidad permanente de un capítulo. Si cambia la segmentación, se guardará una correspondencia de anclas antiguas o se reconocerá que el destino ya no existe.

## 5. Unidad de búsqueda y procedencia

Se indexará el **fragmento de un pasaje**, no la sección completa. Como punto de partida se usarán bloques de aproximadamente 120–250 palabras, ajustados a párrafos y límites de subsección, sin atravesar capítulos. Son valores iniciales que se medirán; no una condición que obligue a romper una tabla o un algoritmo.

Los fragmentos podrán compartir una franja pequeña de contexto para evitar perder una frase partida, pero sus resultados se deduplicarán mediante la identidad del pasaje. En páginas de columnas, la secuencia de texto debe comprobarse. No se reconstruirá una tabla clínica ni un algoritmo a partir del orden accidental de sus tokens; el resultado llevará a la imagen PDF conservada.

Contrato orientativo en TypeScript:

```ts
type Population = 'adult' | 'pediatric' | 'mixed' | 'unspecified';
type AnchorPrecision = 'page_only' | 'text_match' | 'verified_region';
type SubsectionVerification = 'unverified' | 'heading_verified';

interface SourceSpan {
  originalPage: number;              // página real del PDF original, desde 1
  documentId: string;                // PDF pequeño real que contiene el tramo
  localPage: number;                 // página de ese PDF, desde 1
  sectionPage?: number;              // página del PDF de sección, si se conserva
  pageTextStart: number;             // offsets UTF-16 del texto fuente de página
  pageTextEnd: number;               // fin exclusivo; no offsets normalizados
  source: 'native' | 'ocr' | 'mixed';
  pdfAnchorId?: string;              // posición conforme al contrato del visor
}

interface SearchFragment {
  id: string;
  sourceDocumentId: string;
  corpusVersion: string;
  sectionId: string;
  chapterId: string;
  subsectionId?: string;
  title: string;
  headingPath: string[];
  language: 'es' | 'en';
  population: Population;
  text: string;                     // transcripción, sin reescritura clínica
  spans: SourceSpan[];               // admite pasaje en dos páginas
  conceptIds: string[];              // asignaciones trazables, no diagnósticos
  contentKind: 'text' | 'table' | 'algorithm' | 'case' | 'mixed';
  anchorPrecision: AnchorPrecision;
  subsectionVerification: SubsectionVerification;
  extractionReview: 'pending' | 'checked';
}
```

Cada coincidencia tiene que poder remontarse a un tramo de texto y a una página. `sourceDocumentId` identifica la fuente original, mientras que cada `SourceSpan.documentId` identifica el PDF pequeño que se abre. Un capítulo grande podrá ocupar varios PDF, y una página compartida por capítulos mantendrá sus correspondencias explícitas; por eso `localPage` pertenece a cada tramo y no se calcula suponiendo un solo PDF por capítulo. Si se indexa un encabezado heredado de una subsección, debe señalarse como coincidencia de encabezado y localizarse ese encabezado; no se inventará su presencia en el párrafo. Las cajas del PDF y la transformación de coordenadas pertenecen al contrato del documento 16, no se calcularán a partir de offsets del Markdown.

La normalización conservará un mapa entre tokens de búsqueda y offsets del texto original. Se distinguirán texto bruto, texto normalizado y texto mostrado. Corregir una separación de línea para buscar no autoriza a cambiar un número, un signo o una dosis en la fuente.

## 6. Cómo se interpretará una frase

La primera versión no necesita interpretar una historia clínica entera. Aplicará un proceso determinista que el usuario pueda ver y corregir:

1. Conservar la frase original en memoria; separar frases y palabras con posiciones.
2. Normalizar Unicode, mayúsculas y variantes de vocales acentuadas para la búsqueda. Mantener `ñ`, números, signos y unidades médicas relevantes; comprobar los casos `O2`, `SpO2`, `PaO2` y decimales con coma o punto.
3. Reconocer primero las expresiones de varias palabras del diccionario, usando la coincidencia más larga, y después términos sueltos y siglas. Evitar contar «dolor torácico» y cada una de sus dos palabras como tres conceptos distintos.
4. Añadir variantes admitidas por ese concepto, con origen y estado de revisión. Las palabras que el diccionario no reconozca seguirán buscándose literalmente: un diccionario incompleto no debe eliminar términos de la consulta.
5. Conservar negaciones y expresiones de incertidumbre. Presentar los conceptos detectados como chips editables, incluidos los no usados como síntomas afirmados.
6. Recuperar coincidencias y verificar su cobertura sobre el texto y los encabezados antes de presentar resultados.

No se usarán raíces agresivas que fusionen palabras médicas distintas. Las palabras funcionales pueden omitirse en la recuperación por términos, pero se conservarán en frases entrecomilladas y en el análisis de negación. Una lista de palabras vacías nunca eliminará indiscriminadamente «no» o «sin».

Para siglas ambiguas, el diccionario mantendrá sus sentidos separados. La expansión debe ser visible y desactivable; si falta contexto, no se escogerá un sentido clínico en silencio. El catálogo inicial será pequeño y revisado, a partir de los capítulos y necesidades del piloto; no se promete un vocabulario médico universal.

El diccionario español–inglés permitirá buscar términos ingleses en fuentes españolas cuando exista una equivalencia revisada. Esa expansión aparecerá indicada. No equivale a disponer del capítulo traducido ni autoriza una traducción automática del libro.

### Negación, incertidumbre y población

«Dolor torácico sin fiebre» no se convertirá en dos síntomas afirmados. La interfaz mostrará `dolor torácico` como término principal y `fiebre: mencionada en negativo` como contexto. En la primera versión, los términos negados no aumentarán la puntuación como síntomas presentes ni excluirán páginas enteras: una página útil puede describir tanto pacientes con fiebre como sin ella.

Las reglas de alcance serán limitadas y comprobables, con corte por puntuación y excepciones explícitas. «No se puede descartar» se tratará como incertidumbre, no como negación confirmada de una enfermedad. Si el alcance es ambiguo se mostrará como contexto sin resolver y el usuario podrá editarlo. No se inferirá la polaridad clínica de un pasaje sólo porque contenga una palabra.

La edad, la población y el sexo no se deducirán para aplicar filtros obligatorios. Un usuario podrá seleccionar «pediatría», «adultos» o «todos»; mientras no lo haga se buscará en todos los ámbitos. Los documentos con ámbito desconocido se identificarán, evitando fingir una clasificación ya revisada. Un filtro que los excluya mostrará ese efecto.

Los valores de laboratorio incluidos en una frase podrán localizar menciones literales; el buscador no los interpretará como normales o patológicos ni calculará su relación con enfermedades.

## 7. Recuperación: todos los conceptos por defecto

La aplicación exige evidencia de **todos los conceptos afirmados** dentro del mismo fragmento, admitiendo también su encabezado indexado. Las palabras funcionales se omiten y las variantes del mismo concepto son alternativas. No se completará una consulta sumando coincidencias de páginas separadas.

| Modo | Comportamiento |
| --- | --- |
| Todos los conceptos, único modo actual | Exige cada concepto afirmado y cada frase entre comillas; añadir otro concepto independiente restringe el conjunto elegible |
| Sin coincidencia conjunta | Muestra un estado vacío y propone quitar un concepto o cambiar filtros; no activa resultados parciales automáticamente |

Las variantes del mismo concepto se combinan con OR. Los conceptos obligatorios se combinan con AND después de comprobar la evidencia. No se construirá un AND de todas las palabras de una frase narrativa: artículos, verbos genéricos y contexto producirían demasiados falsos negativos. MiniSearch admite combinaciones y opciones de expansión; la aplicación compondrá esas consultas y verificará sus resultados. [Opciones oficiales de búsqueda](https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html).

La recuperación de un término ajeno al diccionario se resuelve de manera independiente: coincidencia exacta si existe en el índice, después prefijo si procede, y finalmente corrección de una edición para términos largos sin coincidencia exacta ni por prefijo. Se señalan con «…» los prefijos y con «≈» las erratas. Añadir otro concepto no amplía la recuperación de los anteriores. Una frase entre comillas siempre exige la secuencia literal.

Las negaciones siguen siendo contexto, no filtros de exclusión ni conceptos afirmados obligatorios. El reconocimiento de una expresión compuesta puede sustituir un término genérico por otro concepto con sus propias variantes. La garantía de restricción se refiere a añadir conceptos afirmados independientes conservando los anteriores, con los mismos filtros. Se muestran hasta 30 destinos, con un máximo de tres páginas por documento: una página que antes quedaba fuera de ese límite puede hacerse visible al acotar, aunque haya menos coincidencias totales. Los contadores muestran también el total de fragmentos y documentos encontrados.

Las frases entre comillas exigirán la secuencia de tokens acordada. La aplicación verificará el orden y la adyacencia en la evidencia; no confundirá la mera presencia separada de las palabras con una frase exacta. Si una frase está partida entre páginas, se utilizarán sus tramos contiguos dentro de la misma subsección, manteniendo ambas referencias.

Los fragmentos de páginas vecinas sólo podrán dar contexto cuando pertenezcan al mismo capítulo y continuidad documentada. No se unirán el final de un capítulo y el principio de otro para completar artificialmente los conceptos pedidos.

Cuando varias partes de un capítulo cubran conceptos distintos, la tarjeta podrá indicar «conceptos encontrados en pasajes diferentes» y ofrecer sus destinos por separado. No se afirmará que el capítulo demuestra una asociación entre ellos. La modalidad estricta por pasaje no se satisfará sumando coincidencias de páginas no contiguas.

## 8. Ordenación y explicaciones

El proyecto de MiniSearch documenta una puntuación basada en frecuencia, rareza de términos y longitud de campos, con BM25 y BM25+ como referencia. Se usará como señal de texto, no como modelo clínico. [Diseño del motor](https://raw.githubusercontent.com/lucaong/minisearch/master/DESIGN_DOCUMENT.md).

La aplicación reordenará los candidatos mediante una política explícita y versionada. Orden inicial propuesto:

1. Cumplimiento de restricciones que el usuario haya marcado obligatorias, incluidas frases exactas y filtros.
2. Número de conceptos distintos cubiertos en la unidad elegida; una repetición de la misma palabra no suma conceptos.
3. Coincidencias literales frente a variantes revisadas, prefijos o correcciones aproximadas.
4. Coincidencia en título o encabezado pertinente, con evidencia de ese campo.
5. Proximidad de los conceptos dentro del mismo pasaje, sin atravesar un límite no válido.
6. Puntuación de texto ponderada por campos y, para empates, identificador estable.

Los valores y desempates se ajustarán con el conjunto de consultas revisadas; no se asignan porcentajes clínicos ni pesos supuestamente validados. Una coincidencia en OCR pendiente puede aparecer, con su estado visible. La calidad de extracción no sustituye a la relevancia ni hará desaparecer silenciosamente el único destino disponible.

En la primera versión no se necesitan porcentajes de afinidad. Se mostrarán explicaciones como «Coincide con 2 de 3 conceptos», «Variante terminológica revisada» o «Frase exacta en este apartado». Una ampliación futura de relaciones editoriales tendrá otra etiqueta, «Relacionado mediante el índice revisado», y deberá citar el vínculo que la justifica. No se generarán conexiones por coocurrencia de palabras como si fueran hechos clínicos.

Contrato orientativo de evidencia:

```ts
interface MatchEvidence {
  queryConceptId: string;
  queryLabel: string;
  matchedLabel: string;
  method: 'literal' | 'reviewed-alias' | 'prefix' | 'typo';
  fragmentId: string;
  field: 'title' | 'heading' | 'text';
  originalPage: number;
  sourceStart: number;
  sourceEnd: number;
}

interface SearchHit {
  fragmentId: string;
  chapterId: string;
  destinationAnchorId: string;
  evidence: MatchEvidence[];
  missingConceptIds: string[];
  coverageUnit: 'passage' | 'subsection';
  anchorPrecision: AnchorPrecision;
  subsectionVerification: SubsectionVerification;
}
```

Una tarjeta no podrá anunciar un concepto sin al menos una evidencia compatible con su método de coincidencia. Lo no localizado se mostrará como «no encontrado en este pasaje», nunca como síntoma ausente en el paciente ni como hecho ausente en toda la obra.

## 9. Resultados y regreso a otras sugerencias

Cada tarjeta mostrará título, ruta sección → capítulo → subsección disponible, página original y página del PDF pequeño, breve extracto fiel y conceptos encontrados. El estado OCR y la precisión del destino deben poder verse sin abrir un panel técnico.

Se agruparán los fragmentos del mismo capítulo. Por defecto se ofrecerán hasta tres destinos distintos dentro de ese grupo, ampliables, evitando diez tarjetas casi iguales por el solapamiento de ventanas. Un capítulo con una sola coincidencia útil mostrará una sola. El grupo conservará los pasajes alternativos sin sumar sus puntuaciones para inflar artificialmente la cobertura de un pasaje.

Abrir un destino conservará en memoria: frase, conceptos editados, filtros, versión del corpus, orden de resultados, tarjeta seleccionada y desplazamiento de la lista. En móvil, el visor incluirá «Volver a resultados» y «Otras coincidencias»; en escritorio podrá convivir con la lista. Cambiar entre destinos del mismo grupo reutilizará el PDF ya cargado cuando sea posible.

La ruta del visor contendrá como máximo identificadores de documento/anclaje. La frase no viajará en parámetros de URL ni en enlaces al PDF. Para el historial de navegación se usará un identificador opaco de sesión de búsqueda, cuya información estará en memoria; una recarga podrá perder la consulta y deberá explicarse con un estado de recuperación sencillo. No habrá historial persistente de frases por defecto.

Se restaurarán también foco del teclado y posición de lectura. Abrir y cerrar el visor con teclado tendrá el mismo resultado que usar los controles táctiles. El orden de resultados no cambiará por detrás mientras el usuario lee: las mejoras procedentes de un índice que acaba de estar disponible se anunciarán y se aplicarán de forma controlada.

## 10. Consultas incompletas y estados de error

| Estado | Respuesta prevista |
| --- | --- |
| Consulta vacía | Mostrar secciones y acceso al índice, sin fingir una búsqueda |
| Término fuera del diccionario | Buscarlo literalmente; permitirlo como término editable |
| Sólo coincidencias parciales | Mostrar qué falta y permitir ampliar o quitar un concepto |
| Sin resultados exactos | Ofrecer variantes, corregir una errata propuesta o buscar por palabras; no cambiar silenciosamente la consulta |
| Frase exacta sin resultados | Mantenerla como restricción hasta que el usuario acepte quitar las comillas |
| Índice todavía cargando | Mostrar fase y alcance; catálogo provisional separado de búsqueda completa |
| Un archivo de evidencia no disponible | Mantener el resultado identificable, sin extracto inventado; ofrecer página si su mapa está disponible |
| Sin red y corpus parcial | Mostrar la cobertura descargada y avisar que faltan fuentes; no declarar «sin resultados en todo el libro» |
| Paquete e índice de versiones distintas | No combinar; recuperar una versión coherente o solicitar reimportación |
| Worker no disponible o falla | Conservar navegación por catálogo y ofrecer reintento; no bloquear toda la PWA |

Los límites de longitud o de expansión serán visibles. No se recortará una frase en silencio. Las consultas extensas podrán pedir dividir la búsqueda; un límite inicial razonable de interfaz se fijará tras probar los casos reales, en lugar de eliminar conceptos sin informar.

## 11. Rendimiento y funcionamiento sin conexión

El rendimiento se medirá por separado para apertura en frío, primera búsqueda de texto completo, búsqueda caliente, resultado al volver del visor y primera página PDF. Se distinguirán tiempo de red, parseo del índice, consulta y presentación; una búsqueda caliente muy rápida no compensa una descarga inicial sin medir.

El catálogo, el Worker y los recursos de interfaz podrán prepararse antes que el índice completo. Los fragmentos de evidencia y PDF se cargarán bajo demanda; no se incluirá el texto de todos los capítulos en `storeFields` si eso duplica innecesariamente el corpus. El índice conservará sólo la información necesaria para localizar candidatos y verificar las condiciones. Los detalles de los primeros resultados se resolverán en lotes para evitar una petición por palabra o por tarjeta.

Todas las consultas de una sesión llevarán `requestId`. Se ignorará una respuesta antigua si el usuario ya ha escrito otra frase. El trabajo largo deberá ceder entre lotes para procesar nuevas peticiones; ignorar un mensaje obsoleto no evita por sí solo que bloquee al Worker. En la interfaz se usará una espera breve de escritura, orientativamente 100–150 ms, ajustable tras medición, y envío inmediato al pulsar buscar.

Se compartirá la misma configuración de tokenización y normalización entre preparación y navegador. La configuración y versión del motor se guardarán en el manifiesto. Los índices serializados se cargarán con las opciones con las que se generaron; una configuración incompatible obligará a regenerarlos. No se usarán funciones serializadas recibidas del paquete ni código ejecutable dentro del corpus.

Sin base de datos: los datos permanentes de esta fase serán archivos estáticos y, cuando el usuario descargue material, copias administradas en CacheStorage. El índice activo y las frases estarán en memoria. No se añadirá IndexedDB para ocultar otra base de datos bajo el requisito del usuario. La caché y los paquetes tendrán limpieza y estados de cobertura definidos en el documento 14.

Para búsqueda completa sin conexión hay que disponer del índice completo permitido, diccionario y mapa de documentos. Las evidencias y los PDF requieren sus propios archivos disponibles; poder encontrar un destino no garantiza que ese PDF esté descargado. Las tarjetas distinguirán «localizable» de «disponible sin conexión». Se podrá borrar el material descargado sin conservar una falsa marca de disponibilidad.

### Si el índice único no cumple

Sólo después de medir se decidirá fragmentarlo. La opción de reserva es un enrutador léxico global que identifique qué partes contienen los términos, con carga de esas partes y evidencias bajo demanda. El enrutador se construirá con todo el corpus: no bastará con buscar primero una especialidad elegida por una suposición clínica.

Se conservará la cobertura de todas las secciones pertinentes, incluidas las que sólo aportan una variante. Una entrega parcial se etiquetará como tal hasta completar la carga de las partes necesarias. Al combinar índices de secciones no se compararán directamente puntuaciones BM25 calculadas con corpus diferentes: habrá que usar estadísticas globales o una política común de fusión y verificar de nuevo cobertura y posiciones. Este incremento de complejidad necesita un resultado de rendimiento que lo justifique.

## 12. Preparación y validación del contenido

1. Leer inventario de secciones y separar el Markdown por anclas de páginas reales. Comprobar unicidad, orden y fórmulas de página, sin perder preliminares ni casos.
2. Reconstruir capítulos a partir de los índices ya existentes y contrastarlos con sus marcadores y páginas. Las fronteras ambiguas pasarán a una lista de revisión.
3. Identificar candidatos a subsección y cotejarlos con el PDF. En el piloto se revisarán primero soporte vital, síntomas cardiorrespiratorios y pruebas básicas. El resto seguirá localizable por página aunque sus subsecciones no estén verificadas.
4. Crear fragmentos con trazas a las páginas, separando encabezados de texto y marcando OCR. Conservar texto bruto y correcciones editoriales por separado.
5. Elaborar y revisar el diccionario inicial, con autor, fecha, fuente y posibles ambigüedades. La corrección de extracción y la revisión clínica tendrán estados independientes.
6. Generar un índice global reproducible y evidencias, con hashes y configuración versionada.
7. Ejecutar controles de enlaces, cobertura y búsqueda antes de empaquetar material. Un fallo no se corregirá eliminando silenciosamente la página o el concepto problemático.

Los 198 capítulos y 45 casos deben tener destino individual en el mapa, pero no se presentará todo su texto como revisado por haber superado una validación técnica. El origen y la edición seguirán visibles. Encontrar rápido un pasaje del libro tampoco significa que sus recomendaciones se hayan actualizado a guías actuales.

## 13. Pruebas de aceptación

El primer lote de evaluación contendrá consultas reales seleccionadas por el propietario, sin datos personales. Propuesta inicial: al menos 50 consultas, equilibradas entre título exacto, síntoma, frase con varios conceptos, sigla ambigua, negación, español/inglés, errata, pediatría, término desconocido y consulta sin respuesta esperable. Cada consulta tendrá destinos aceptables revisados, no respuestas clínicas generadas automáticamente.

Objetivos iniciales que deberán medirse, no resultados ya obtenidos:

- Un destino correcto entre los tres primeros grupos en al menos el 90 % de las consultas del lote con respuesta documentada. Se registrarán los fallos por tipo, sin atribuir precisión diagnóstica al porcentaje.
- En modo estricto, todas las condiciones obligatorias del resultado estarán respaldadas por evidencia válida. Cero resultados aceptados sólo por combinar capítulos distintos o fragmentos no contiguos.
- Todo resultado abre el capítulo y la página real correctos. Sólo un destino con ancla verificada anuncia apertura en la posición de subsección; los demás declaran su precisión real.
- Los conceptos no encontrados se identifican como tales. Una coincidencia por sigla o sinónimo tiene trazabilidad hasta la variante usada.
- Volver desde varios PDF conserva frase, filtros, lista, selección y desplazamiento durante la misma sesión, también con el botón atrás del navegador.
- Sin conexión, el alcance anunciado coincide con los archivos presentes. Una descarga interrumpida o una caché desalojada no se presenta como corpus completo.
- Ninguna consulta se incorpora a una URL, petición de analítica, registro de aplicación o recurso de un tercero. Las peticiones de archivos se limitan al proveedor de contenido autorizado; esto no equivale a afirmar que el alojamiento no genere metadatos ordinarios de acceso.

Las metas de latencia y transferencia del documento 14 se probarán en ordenador y en un móvil de referencia identificado, con caché fría y caliente. Se registrarán mediana y percentil 95, número de ejecuciones, tamaño del índice y memoria observada. No se fijará una promesa de «ultrarrápido» a partir de una captura en el ordenador de desarrollo.

Casos de regresión necesarios: diferencias de acento sin confundir `ñ`, expresiones de varias palabras, palabras partidas por guion, numeración real frente a impresa, doble columna, título OCR defectuoso, pasaje entre dos páginas, encabezado heredado, coincidencia que sólo aparece como subcadena, petición obsoleta, restricción entrecomillada, `sin fiebre`, «no se puede descartar», sigla con dos sentidos y filtro pediátrico con documentos sin ámbito asignado.

## 14. Entregas pequeñas en el orden adecuado

**Entrega 1: catálogo y trazabilidad.** Navegación completa por secciones y 243 entradas de capítulos/casos, mapa de páginas y estados de subsecciones. Validación de un recorrido de búsqueda → PDF pequeño → vuelta a resultados.

**Entrega 2: búsqueda literal en todo el corpus disponible.** Índice precompilado en Worker, resultados por pasaje, snippets fieles, filtros y métricas de carga. Ninguna dependencia de IA o servicio externo de búsqueda.

**Entrega 3: cruce por conceptos.** Diccionario revisado del piloto, cobertura explícita, modo todos los conceptos, siglas, negación contextual y explicaciones. Incorporar corrección ortográfica sólo después de evaluar la búsqueda literal.

**Entrega 4: uso PWA fiable.** Descarga del índice y lectura seleccionada, estados sin red, manejo de caché y actualizaciones coherentes. Ensayo en móvil instalado, persistencia de la navegación durante la sesión y accesibilidad.

**Entrega 5: ampliar por evidencia.** Más subsecciones verificadas, variantes bilingües y relaciones editoriales cuando su revisión esté disponible. El siguiente paso lo decide el registro de búsquedas de evaluación voluntarias y sus fallos observados, sin telemetría de frases personales.

Estas entregas desarrollan la primera herramienta de consulta. Tests, repaso, casos interactivos y una futura base de datos podrán consumir los identificadores y referencias resultantes, pero no forman parte de la implementación inicial del buscador.
