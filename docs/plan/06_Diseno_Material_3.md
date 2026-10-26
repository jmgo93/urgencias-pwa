# 06 · Sistema de diseño Material Design 3

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

> Implementación del 26 de octubre de 2026: la PWA ya utiliza identidad cromática e iconos para sus 25 secciones y estrellas para las mejores coincidencias. Los criterios y componentes efectivamente entregados se describen en [Diseño Material 3 para móvil](../DISENO_MATERIAL3_MOVIL.md); las alternativas pendientes de este plan se refieren a la evolución del producto completo.

**Estado:** v1.1 · alcance actualizado con las respuestas del propietario; identidad visual pendiente de elección entre tres alternativas.  
**Fecha:** 25 de octubre de 2026.  
**Ámbito:** aplicación web adaptable e instalable como PWA; experiencia de lectura, consulta y aprendizaje, más herramientas de gestión.  
**Relacionados:** [decisiones confirmadas](13_Decisiones_confirmadas.md), [pantallas y flujos](07_Pantallas_y_flujos.md) y los documentos de arquitectura, contenidos y seguridad de este plan. Las decisiones confirmadas prevalecen sobre propuestas anteriores.

## 1. Decisiones de partida

La aplicación debe permitir tres acciones con muy poco esfuerzo: localizar una respuesta documentada, comprender un contenido y practicar su recuperación. La interfaz debe transmitir orden y facilitar la lectura de información clínica densa. El sistema de referencia solicitado es [Material Design 3 de Google](https://m3.material.io/).

Son requisitos recibidos: Blade, Livewire 3, Alpine.js, Tailwind CSS 3, Filament 3, Tabler, fuentes alojadas en la aplicación y tokens de color generados mediante `@material/material-color-utilities`. Se mantiene el stack indicado. Los tamaños, navegación, distribución de fuentes y componentes concretos de este documento son **propuestas de producto**, pendientes de validar con prototipos. Ninguna identidad cromática está aprobada.

El piloto será privado, para el propietario, orientado a consulta documental y aprendizaje multiprofesional. Prioriza búsqueda rápida, adultos y pediatría, y contenido clínico en español e inglés. Las guías actuales serán la estructura principal; el libro de 2018 será una fuente secundaria de referencia privada, identificada como tal. No habrá IA, datos de pacientes ni recomendaciones individualizadas. Los recorridos educativos y las funciones docentes se incorporarán por hitos tras validar consulta y aprendizaje individual. El equipo revisor sigue pendiente: la interfaz nunca mostrará una revisión inexistente.

Se propone implementar el espacio de estudio y consulta con componentes Blade propios inspirados en M3, comportamiento progresivo con Alpine y operaciones de servidor con Livewire. Filament se utilizará para gestión editorial, docencia y administración; compartirá tokens, tipografía y convenciones. Filament admite temas personalizados, pero no proporciona por ello una implementación nativa completa de M3. La integración debe realizarse y verificarse de forma explícita. [Temas de Filament 3](https://filamentphp.com/docs/3.x/panels/themes).

No se impone `@material/web`: su repositorio oficial declara que está en modo de mantenimiento pendiente de nuevos mantenedores. La elección de Blade evita convertir esa biblioteca en dependencia obligatoria y encaja con el stack indicado. Esto no impide estudiar componentes aislados en el futuro si aportan una ventaja concreta. [Repositorio oficial Material Web](https://github.com/material-components/material-web).

## 2. Principios que deben guiar cada pantalla

1. **Una tarea principal visible.** En una ficha, leer y consultar relaciones; en una pregunta, responder; en una revisión editorial, comparar y decidir.
2. **Jerarquía clínica explícita.** Alertas y criterios de exclusión se muestran antes que la información complementaria cuando el contenido revisado así lo determine. La interfaz no calcula por sí sola gravedad ni prioridad asistencial.
3. **La fuente siempre está a un paso.** Las afirmaciones, tablas, algoritmos y respuestas educativas enlazan a la versión y localizador de procedencia: página, sección o tabla según la fuente.
4. **Pocas interrupciones.** No usar modales para explicaciones extensas, avisos repetitivos o cambios rutinarios de sección. Los avisos persistentes de edición o revisión se integran en la ficha.
5. **Lectura antes que decoración.** Espacio suficiente, texto seleccionable, unidades claras y diagramas ampliables. La aplicación no usará fondos animados, ilustraciones que imiten pruebas reales ni fotografías ornamentales en consulta.
6. **Estado comprensible.** Diferenciar datos descargados, sincronizados, pendientes, históricos, revisados y retirados con texto e iconos.
7. **Sin falsa certeza.** No representar coincidencias de búsqueda como probabilidad diagnóstica; tampoco un porcentaje de aciertos como competencia clínica acreditada.

## 3. Arquitectura visual y navegación

Los cinco destinos principales propuestos son **Inicio, Buscar, Practicar, Biblioteca y Mi progreso**. Cuenta, idioma, apariencia, descargas y ayuda se encuentran en el menú de usuario. Los usuarios con permisos adicionales disponen de una entrada «Gestión» separada. La barra principal no crecerá al asignar más roles.

El acceso «Consulta rápida» se destaca en Inicio. Buscar será el destino inicial propuesto para el piloto, modificable en ajustes; en móvil la búsqueda se alcanza con una sola pulsación. Los destinos que todavía no tengan una función disponible no se mostrarán como botones vacíos: se incorporarán conservando el orden canónico Inicio, Buscar, Practicar, Biblioteca y Mi progreso. La barra inferior se usará cuando haya de tres a cinco destinos funcionales; si hay menos se empleará navegación breve en la cabecera. Google recomienda de tres a cinco destinos del mismo nivel en ese patrón. [Patrones oficiales de navegación de Google](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).

Los filtros de población distinguen adultos y pediatría; edad y contexto se mantienen visibles en fichas y resultados. El itinerario profesional cambia vocabulario, objetivos y contenidos autorizados, sin convertir permisos de una profesión en competencias acreditadas por la aplicación. La biblioteca separa «Guías y fichas» de «Archivo personal del libro»; transformar el PDF en tablas no se representará como autorización para compartirlo.

| Anchura disponible propuesta | Navegación | Organización del contenido |
|---|---|---|
| Menos de `40rem` | Barra inferior con tres a cinco destinos activos y barra superior breve; cabecera sencilla si hay menos | Una columna; detalle en nueva ruta; filtros en panel modal |
| De `40rem` a menos de `70rem` | Rail lateral al inicio del eje de lectura | Una columna amplia o listado y detalle si caben sin estrechar la lectura |
| Desde `70rem` | Drawer lateral persistente, plegable | Lista/detalle o contenido con índice lateral; tercera zona sólo si aporta valor |

Estos umbrales son una **adaptación web propuesta**, no una transcripción normativa de las clases Android expresadas en `dp`. Se probarán con aumento de texto y distintos idiomas antes de fijarlos. La elección dependerá del espacio útil real, no de detectar un modelo de teléfono.

Reglas de navegación:

- Usar enlaces HTML para cambiar de ruta, con `aria-current="page"`; no convertir la navegación global en un `tablist`.
- Reservar pestañas para vistas hermanas de una misma ficha: resumen, pruebas, algoritmo y fuentes, cuando existan.
- Mantener la consulta, filtros, página y posición al volver de una ficha a los resultados.
- Mantener un botón «Volver» que respete el historial. Las fichas también deben abrirse mediante URL directa.
- Evitar barras superiores e inferiores duplicadas. En una sesión de práctica, ofrecer «Pausar y salir» de forma visible.
- La búsqueda no debe depender de que se abra primero un menú lateral.

## 4. Contrato de tokens

### 4.1 Tres alternativas para decidir la identidad visual

Las tres alternativas aplican Material 3 y comparten accesibilidad, las mismas tareas, estados editoriales y permisos. Son direcciones comparables, **no temas elegidos ni paletas finales**. No se genera todavía una semilla ni se garantiza contraste: cada alternativa tendrá que producir sus tokens claros/oscuros y pasar mediciones antes de poder aprobarse.

| Aspecto | A · Índigo y azul verdoso | B · Azul y pizarra | C · Verde petróleo y ámbar |
|---|---|---|---|
| Carácter | Consulta clínica ordenada, con separación visible entre grupos de contenido | Biblioteca editorial sobria, centrada en texto y procedencia | Aprendizaje guiado, con apoyo a objetivos y continuidad |
| Dirección cromática propuesta | Primario índigo; apoyo azul verdoso | Primario azul contenido; superficies neutras orientadas a pizarra | Primario verde petróleo; apoyo ámbar limitado a identidad y selección |
| Inicio | Campo de búsqueda amplio, consultas recientes y tarjetas de temas adultos/pediátricos | Lista de búsqueda y continuaciones; índice de fuentes en una segunda zona en escritorio | Campo de búsqueda primero; después bloque «Continuar» y objetivos de práctica |
| Resultados | Lista principal con agrupadores tonales por tipo de entidad; panel de filtros lateral | Filas con separadores y mayor densidad; fuente, fecha y población visibles en la misma unidad | Lista de resultados con resumen breve y una siguiente acción educativa secundaria |
| Ficha | Encabezado tonal discreto, contenido en una columna y relaciones en panel lateral | Cabecera compacta, índice de epígrafes persistente y metadatos de fuente destacados | Encabezado de objetivo, contenido principal y bloque final de recuperación o repaso |
| Práctica | Panel de pregunta y feedback con límites claros | Presentación continua de enunciado, respuesta y justificación, evitando tarjetas innecesarias | Progreso por pasos y feedback estructurado; sin premios que sugieran competencia clínica |
| Tipografía y forma | Poppins en títulos; Nunito en cuerpo; radios grandes en contenedores funcionales | Títulos más compactos; Nunito en lectura; radios discretos y menos superficies contenidas | Poppins en títulos; Nunito en cuerpo; radios grandes y agrupación tonal por tarea |
| Densidad por defecto | Cómoda, con opción compacta para resultados | Compacta sólo en escritorio; cómoda en lectura y móvil | Cómoda en práctica y lectura; compacta opcional en consulta |
| Riesgo de diseño a probar | Exceso de tarjetas y de zonas tonales | Densidad que pueda dificultar lectura en móvil | Exceso de acentos o de elementos de progreso en consulta |

El ámbar de C no se aplicará automáticamente a advertencias clínicas; los roles de marca y de estado son independientes. Ninguna propuesta usa color como única señal de gravedad, corrección, vigencia o disponibilidad.

La siguiente decisión visual será comparar las tres propuestas con **el mismo contenido y las mismas cuatro pantallas**: buscar, resultados, ficha de prueba y pregunta con explicación; móvil y escritorio, claro y oscuro. Se registrarán legibilidad, facilidad para localizar fuente/población/fecha y tiempo de tarea. La elección será del propietario; podrá combinar rasgos antes de generar la semilla definitiva. No se ha elegido A por ser la primera de la tabla.

### 4.2 Generación y control

La paleta se generará en compilación a partir de la semilla elegida después de comparar las alternativas anteriores. Las semillas de exploración y sus salidas tendrán estado de propuesta y no se incorporarán como identidad aprobada. El color de error conservará un significado independiente de la identidad de marca.

`@material/material-color-utilities` proporciona utilidades HCT, paletas, contraste y esquemas dinámicos. Se fijará su versión y el algoritmo de generación para que una recompilación no cambie la identidad sin una revisión. Se guardarán la semilla y la configuración; el resultado se exportará a un archivo CSS y a JSON para pruebas. [Material Color Utilities](https://github.com/material-foundation/material-color-utilities).

La aplicación consumirá **roles semánticos**, no tonos de una paleta elegidos en cada pantalla. Cada rol de superficie o contenedor tiene su correspondiente color de texto. Las ampliaciones que necesite el producto se documentarán como tokens propios. El generador debe producir todos los roles contratados o fallar: no habrá colores de reserva escritos a mano en componentes.

| Familia de tokens | Contrato mínimo | Uso previsto |
|---|---|---|
| Marca | `primary`, `on-primary`, `primary-container`, `on-primary-container` | Acción principal, selección y elementos de identidad |
| Apoyo | Equivalentes `secondary` y `tertiary` con sus pares `on-*` | Filtros seleccionados y acentos secundarios con uso limitado |
| Superficies | `surface`, `on-surface`, `on-surface-variant`, `surface-container-low`, `surface-container`, `surface-container-high` | Fondos, lectura, tarjetas y paneles |
| Límites | `outline`, `outline-variant` | Campos, separadores y límites de grupos |
| Error | `error`, `on-error`, `error-container`, `on-error-container` | Fallo de validación, operación o contenido bloqueado |
| Superposición | `scrim`, roles de sombra y superficie inversa | Modales, snackbars y capas |
| Producto | `app-warning-*`, `app-success-*`, `app-info-*` | Avisos, confirmaciones y comunicación informativa; pares fondo/texto/borde |
| Interacción | `app-focus-ring`, `app-disabled-*`, `app-state-layer-*` | Foco, deshabilitado y estados de interacción |

Los tokens `app-*` de color se generarán y contrastarán también. No se asume que advertencia o éxito sean roles estándar de M3. Los alias completos y su procedencia formarán parte del catálogo del proyecto.

Reglas de implementación:

- Se permiten literales cromáticos únicamente en las entradas y salidas controladas del generador y en fixtures justificados de pruebas.
- Tailwind mapeará las utilidades del proyecto a variables CSS. Se evitarán utilidades cromáticas arbitrarias, colores inline y variantes `red-*` o `green-*` introducidas por pantalla.
- Las gráficas usarán una paleta de datos derivada y contrastada, con patrón o etiqueta adicional.
- Los valores RGB que necesite Filament se exportarán desde el mismo generador; la adaptación no se resolverá aplicando transparencia a ciegas sobre un hexadecimal.
- Se implementarán modo claro, oscuro y «seguir sistema». La preferencia se guardará localmente y, si existe cuenta, en su configuración.
- Una actualización de semilla, algoritmo o biblioteca requerirá revisión de capturas y contraste de las pantallas clave.

### 4.3 Ejemplo de consumo

Este fragmento define el contrato de consumo; el archivo generado aportará los valores. No es todavía una implementación de componentes.

```css
.clinical-card {
    color: var(--md-sys-color-on-surface);
    background: var(--md-sys-color-surface-container-low);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--app-shape-large);
    padding: var(--app-space-4);
}

.action-primary {
    color: var(--md-sys-color-on-primary);
    background: var(--md-sys-color-primary);
    min-block-size: max(3rem, 48px);
    min-inline-size: max(3rem, 48px);
}

:where(a, button, input, select, textarea):focus-visible {
    outline: var(--app-focus-width) solid var(--app-focus-ring);
    outline-offset: var(--app-focus-offset);
}
```

El selector de foco debe ampliarse a widgets interactivos personalizados que realmente lo necesiten; nunca se usará `outline: none` sin una alternativa accesible comprobada.

## 5. Tipografía, iconos y densidad

La escala siguiente es una propuesta adaptada al contenido médico. Se basa en roles tipográficos consistentes, con mayor prioridad a la lectura prolongada que al uso de grandes titulares.

| Rol | Fuente propuesta | Tamaño/interlineado inicial | Uso |
|---|---|---|---|
| Título de página | Poppins, 600 | `1.75rem / 2.25rem` | Título principal, nunca todo en mayúsculas |
| Título de sección | Poppins, 600 | `1.25rem / 1.75rem` | Grupos de contenido |
| Texto clínico | Nunito, 400/600 | `1.0625rem / 1.65` | Fichas, preguntas y explicaciones |
| Interfaz | Nunito, 500/700 | `1rem / 1.5` | Botones, listas, formularios |
| Metadatos | Nunito, 400/600 | `0.875rem / 1.4` | Fuente, revisión, identificadores; nunca dosis ni instrucciones esenciales |
| Árabe y darija árabe | Noto Sans Arabic | Ajuste óptico equivalente, mayor interlineado si es necesario | Interfaz y contenido con escritura árabe |
| Acento opcional | Caveat | Sin papel funcional | Sólo una bienvenida o elemento editorial no clínico, si se aprueba |

Las fuentes se servirán desde la aplicación mediante Fontsource y archivos `woff2`, con subconjuntos de caracteres adecuados y `font-display: swap`. Se cargarán únicamente los pesos necesarios. El contenido será legible con la fuente de reserva antes de completar la descarga.

Reglas de legibilidad:

- Base `1rem` sin impedir la preferencia de tamaño del navegador. Control de tamaño de lectura, con prueba de desbordamientos y persistencia.
- Anchura de lectura inicial de aproximadamente `65ch`; las tablas y diagramas pueden ocupar más espacio.
- Números alineados mediante `font-variant-numeric: tabular-nums` donde la fuente lo admita, manteniendo signos y separadores decimales.
- No separar entre líneas una cantidad de su unidad cuando eso dificulte interpretarla; no reemplazar unidades del original por supuestos equivalentes sin validación editorial.
- No truncar el enunciado de una pregunta, una contraindicación, un resultado o una condición de un algoritmo.
- Tabler como sistema de iconos único. Iconos decorativos con `aria-hidden="true"`; acciones sin etiqueta visual, únicamente cuando sean inequívocas, con nombre accesible y tooltip como apoyo.
- No invertir ECG, radiografías, figuras anatómicas o diagramas originales al activar RTL.

## 6. Espaciado, formas y elevación

Escala de espacio propuesta: `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `3rem`. Los componentes usarán alias `--app-space-*`; los márgenes de página crecerán según el espacio disponible. No se usarán separaciones distintas por pantalla sin una razón documentada.

Formas iniciales: radio pequeño `0.5rem`, medio `0.75rem`, grande `1rem` y contenedor tipo píldora para filtros y selección de navegación. Las tablas densas y los diagramas conservarán esquinas discretas. Los botones no cambiarán de forma para expresar peligro.

La elevación se reservará a capas: menú, panel flotante, diálogo y barra superpuesta. En lectura, la separación debe proceder principalmente del tono de superficie, el espacio y la jerarquía. Evitar sombras en cada bloque.

Objetivo táctil del producto: **al menos 48 × 48 píxeles CSS**, implementado de forma escalable, para botones, acciones de lista y opciones de respuesta; icono visible menor dentro de ese área. Es una adaptación web deliberada de la recomendación Material de 48 `dp`, no una equivalencia física universal. El mínimo WCAG 2.2 AA para objetivos de puntero es 24 × 24 píxeles CSS, con excepciones, por lo que el objetivo del producto es más amplio. [Google: tamaño táctil](https://support.google.com/accessibility/android/answer/7101858?hl=en), [W3C: tamaño mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 7. Catálogo mínimo de componentes

Cada componente tendrá variantes permitidas, anatomía, estados, comportamiento con teclado, dirección RTL y ejemplos de contenido largo. El catálogo será una ruta interna de desarrollo, sin datos de usuarios.

| Componente | Anatomía y comportamiento exigidos |
|---|---|
| `AppShell` | Enlace de salto, navegación, barra superior, región principal, anuncios de estado y espacio seguro inferior |
| `NavigationBar / Rail / Drawer` | Mismos destinos y selección; icono y etiqueta; cambio de distribución sin cambiar orden lógico |
| `SearchField` | Etiqueta, texto, limpiar, buscar, sugerencias si existen; envío explícito además de búsqueda incremental |
| `SearchResult` | Tipo, título, fragmento, relación encontrada, sección, fuente/revisión y disponibilidad offline |
| `FilterChip` | Etiqueta, estado seleccionado, contador si aporta valor; acción accesible para quitarlo |
| `PrimaryButton / TonalButton / TextButton` | Etiqueta breve; un único primario por bloque de decisión; estado de envío sin saltos de tamaño |
| `IconButton` | Área táctil completa, nombre accesible, foco; no usar sólo icono para acciones clínicas ambiguas |
| `ContentCard` | Título, metadatos, resumen y enlace principal; sin enlaces o botones anidados incorrectamente |
| `ClinicalHeader` | Tipo de ficha, título, versión, edición de fuente, revisión y acciones guardar/descargar |
| `ClinicalNotice` | Icono, título y texto; distinción entre revisión pendiente, contenido histórico, retirado y actualización disponible |
| `SourceReference` | Guía/fuente, versión, fecha y localizador verificable; para el libro, edición, página real original, página de extracción y acceso privado al visor |
| `RelationList` | Relaciones tipadas: síntoma, enfermedad, prueba, algoritmo, capítulo; explicación breve cuando exista |
| `EvidenceTable` | Encabezados semánticos, título, notas, unidades, fuente y contenedor de desplazamiento identificado |
| `AlgorithmStep` | Pregunta/criterio, opciones, contexto, referencias y ruta ya recorrida; «No consta» cuando proceda |
| `AlgorithmOverview` | Diagrama ampliable y alternativa textual completa; la escala no altera la información |
| `QuestionOption` | Radio/checkbox semántico, etiqueta completa, selección y resultado separados; feedback posterior al envío |
| `AnswerFeedback` | Respuesta, razonamiento, explicación de distractores, referencia y acción de repaso |
| `CaseStage` | Etapa, información disponible, decisiones y consecuencias educativas; no revelar etapas futuras prematuramente |
| `ProgressSummary` | Denominador, periodo y cobertura; enlaces a los intentos que explican la cifra |
| `DownloadPackage` | Tamaño, versión, estado de integridad, fecha de descarga y acciones de actualizar/eliminar |
| `SyncStatus` | Última sincronización, operaciones pendientes, conflictos y acción de reintento |
| `Snackbar` | Resultado no crítico con duración suficiente; no alberga información clínica esencial |
| `Dialog / Sheet` | Título, foco inicial, cierre, restauración de foco, confirmación sólo cuando haya consecuencias relevantes |
| `Skeleton / Empty / Error` | Mensaje real de estado, acción útil y ausencia de datos ficticios |

## 8. Anatomía de una ficha de consulta

Orden recomendado:

1. Tipo de contenido y título, sin siglas ambiguas como único nombre.
2. Franja editorial breve: «Fuente principal: [guía, versión y fecha] · Revisión de esta ficha: [fecha/estado] · Población: [adultos/pediatría y contexto]». Si procede, una referencia secundaria separada indica «Archivo personal: libro, edición 2018». La fecha de revisión no cambia la antigüedad de ninguna fuente.
3. Avisos específicos de vigencia o alcance, si existen.
4. Resumen estructurado redactado y revisado, con enlaces de procedencia. Mientras falte equipo revisor, los borradores permanecen en gestión y el archivo documental personal se identifica como no validado por el proyecto. No se presenta una ficha clínica como revisada por el mero hecho de importar su texto.
5. Apartados propios de la entidad: presentación, datos orientadores, exploraciones, relaciones, algoritmo o contenido del capítulo.
6. Algoritmos y tablas vinculados, ampliables y con alternativa de lectura.
7. Fuentes, versiones y cambios relevantes.
8. Acciones «Practicar este tema», «Guardar» y «Comunicar un problema».

Las fichas de pruebas no muestran una lista de «enfermedades que confirma». Presentan asociaciones revisadas, contexto, limitaciones, variables que influyen y significado de los patrones descritos. Si una magnitud no tiene intervalo validado en el corpus para una población y método, se indicará esa ausencia.

## 9. Accesibilidad verificable

El objetivo es **WCAG 2.2 nivel AA** en los flujos completos, incluidos autenticación y gestión utilizada para tareas esenciales. No se considerará cumplido por usar una biblioteca de componentes. [Recomendación WCAG 2.2](https://www.w3.org/TR/WCAG22/).

| Área | Criterio de producto y verificación |
|---|---|
| Contraste textual | Al menos 4,5:1 para texto normal y 3:1 para texto grande según la definición WCAG; medir pares de tokens en ambos temas. [W3C 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| Componentes y gráficos | Al menos 3:1 para la información visual necesaria de componentes y gráficos frente a los colores adyacentes, considerando sus excepciones. [W3C 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| Teclado y foco | Todo flujo operable con teclado; foco visible, orden coherente, sin trampas. Las capas fijas no deben ocultarlo; objetivo del producto: elemento y foco completos visibles. [W3C 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) |
| Reflujo y tamaño | Probar 320 píxeles CSS y zoom equivalente al 400%; texto al 200% sin pérdida de funciones. Tablas/diagramas con alternativa adecuada cuando requieran dos dimensiones |
| Semántica | Un `h1`, encabezados jerárquicos, landmarks, tablas con `th`, `caption` y relaciones correctas; controles HTML nativos antes que ARIA |
| Feedback | No usar sólo rojo/verde. Mostrar «Correcta», «Incorrecta», «Pendiente» y símbolos o bordes equivalentes |
| Formularios | Etiquetas persistentes, instrucciones y errores asociados; resumen de errores al enviar; conservar valores |
| Lectores de pantalla | Probar navegación, una pregunta completa, fuente PDF, un caso y una descarga con lector real |
| Movimiento | Respetar `prefers-reduced-motion`; eliminar desplazamientos, confeti y animaciones que dificulten seguir una lectura |
| Tiempo | Práctica sin límite por defecto. Si hay examen cronometrado, definir ajustes y excepciones de accesibilidad en su configuración |
| Gráficos clínicos | Texto alternativo que preserve el propósito educativo; descripción extensa para algoritmos y tablas complejas |
| Autenticación | Permitir gestores de contraseñas, pegado y métodos accesibles; no exigir recordar una transcripción visual como única vía |

La accesibilidad del PDF original puede ser limitada. El visor no la corrige automáticamente: debe ofrecer el texto revisado disponible y alternativas de figuras sin declarar equivalencia completa cuando todavía no se haya comprobado.

## 10. Idiomas y escritura bidireccional

Se separan idioma de interfaz, idioma del contenido y escritura. Una interfaz árabe no implica que el libro esté traducido; las traducciones médicas tendrán versión y estado de revisión propios.

Alcance confirmado del piloto: interfaz y contenido clínico en español e inglés, con revisión propia por idioma y cobertura visible. La falta de una traducción se comunica, no se oculta mediante sustitución automática. Árabe, darija en escritura árabe y darija en escritura latina quedan como evolución posterior; se prepara la estructura para ellas, sin prometer que ya existen traducciones. Los identificadores internos se normalizarán en arquitectura; en HTML se emplearán etiquetas BCP 47 adecuadas, por ejemplo `ar`, `ary-Arab` y `ary-Latn` cuando se confirmen con quienes traduzcan.

Para árabe y darija árabe, declarar `lang` y `dir="rtl"` en HTML. Usar propiedades lógicas `margin-inline`, `padding-inline`, `inset-inline-start` y `text-align: start`. Los campos de texto mixto admiten `dir="auto"`; fragmentos como siglas, identificadores y unidades requieren aislamiento bidi cuando proceda. [Guía W3C de dirección HTML](https://www.w3.org/International/questions/qa-html-dir).

Reglas del producto:

- Reflejar disposición y flechas de navegación cuando su significado sea direccional; no reflejar iconos universales ni figuras clínicas originales.
- Mantener cifras, signos, intervalos y unidades en un orden comprobado con ejemplos reales. No confiar sólo en capturas con texto de relleno.
- No convertir automáticamente notación de laboratorio entre formatos o unidades por cambiar el idioma.
- Cambiar idioma sin perder entidad, filtros o contexto. Si falta traducción, mostrar «Contenido disponible en español» y una acción clara.
- Las opciones de respuesta y su feedback deben pertenecer a una misma versión lingüística. No mezclar una pregunta traducida con explicaciones de otra versión sin avisarlo.
- Revisar cadenas largas, pluralización, pantallas estrechas y orden de lectura con hablantes de cada variante.

## 11. Estados de red, instalación y sincronización

- El primer alcance sin conexión permite lectura y tests formativos descargados. Los textos y figuras de algoritmos pueden leerse; los casos por etapas, recorridos interactivos, exámenes evaluables y funciones docentes requieren conexión. El control que inicie una actividad incompatible explica el requisito y conserva el contexto, sin mostrar una pantalla vacía.
- El modo sin conexión muestra «Contenido descargado · versión [x] · comprobado el [fecha]». No presenta un indicador verde que sugiera vigencia clínica actual.
- Diferenciar «sin conexión», «servidor no disponible», «sesión caducada» y «contenido no descargado».
- Las respuestas de práctica pendientes de sincronizar llevan un estado explícito. No duplicar intentos al reintentar.
- Si se retira contenido, comunicar la retirada en cuanto se conozca y deshabilitar su uso en nuevas actividades. Un dispositivo desconectado no puede conocer una retirada posterior: la fecha de última comprobación debe seguir visible.
- El aviso de instalar la PWA será contextual y descartable. No interrumpirá un caso o una pregunta.
- La actualización de la aplicación se ofrece al terminar o pausar una actividad; no reemplaza una sesión activa sin conservar su estado.
- La petición de permisos push se hará después de que el usuario active una función de recordatorios, explicando qué recibirá.
- Los avisos configurables cubren repaso y cambios relevantes; tareas y plazos docentes sólo cuando se habilite esa fase. Se respetan preferencias por canal, frecuencia y horario. Las exportaciones de apuntes/progreso están previstas; QR y calendarios sólo se incorporarán con una tarea concreta que los justifique.

## 12. Entregables de diseño previos a implementar

1. Comparación de las alternativas A/B/C con las mismas pantallas, seguida de elección explícita; ninguna se da por aprobada en este documento.
2. Inventario de tokens y paletas clara/oscura generadas para la elección, con contraste automatizado.
3. Catálogo de componentes y variantes con texto largo, teclado y estructura preparada para RTL.
4. Prototipos por hitos: localizar tema, abrir fuente y descargar lectura; después responder pregunta y sincronizar. Caso y algoritmo interactivo se diseñan antes de su fase.
5. Pantallas de gestión para editar, comparar y revisar un contenido clínico, sin suplir al equipo revisor pendiente.
6. Prueba de uso inicial con el propietario y, antes de ampliar el acceso, representantes de los perfiles elegidos, registrando tiempo, errores y comprensión de estados.
7. Capturas aprobadas de móvil, tableta y escritorio en claro/oscuro, español e inglés. Las comprobaciones de una variante RTL serán condición previa a habilitarla posteriormente.

No es necesario diseñar cada capítulo para comenzar: se diseñarán patrones reutilizables y después se probarán con textos, algoritmos y tablas difíciles del corpus real.

## 13. Guardas de diseño y criterios de aceptación

- El análisis del código propio rechaza colores literales fuera de archivos autorizados del generador; las excepciones de dependencias quedan delimitadas, no extendidas a toda la aplicación.
- Las capturas verifican menú y acciones visibles de cada perfil, en tamaños representativos y ambos temas.
- El foco no desaparece en la navegación Livewire, tras cerrar un diálogo ni después de una validación.
- La búsqueda y la lectura se completan sin ratón, y con un lector de pantalla.
- Ninguna condición de un algoritmo queda disponible únicamente mediante hover, color o posición de una flecha.
- Los estados pendientes, revisados, históricos y retirados son distinguibles por texto.
- Una pregunta larga y una tabla ancha siguen siendo utilizables en móvil; las fuentes enlazadas abren la página correcta.
- Una fuente antigua y una ficha revisada nunca se presentan con una fecha que confunda ambas circunstancias.
- El modo offline comunica versión y fecha de última comprobación en todas las fichas consultables.
- Se usa una sola taxonomía de iconos y acciones; «Guardar» no cambia de significado entre pantallas.

## 14. Referencias y límite de verificación

Las referencias primarias se consultaron el 25 de octubre de 2026. El portal M3 requiere JavaScript y no expone todo su contenido al lector web utilizado; por ello no se atribuyen a Google los tamaños web, fuentes concretas ni umbrales propuestos aquí. Los patrones verificables se apoyan en la documentación oficial complementaria y los requisitos accesibles en W3C. Antes de cerrar la implementación se contrastará visualmente el catálogo con las páginas oficiales de cada componente de [Material Design 3](https://m3.material.io/).
