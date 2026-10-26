# Urgencias PWA

Biblioteca personal de consulta documental: escribe una frase, compara los fragmentos relacionados y abre el PDF del capítulo o del caso en la página correspondiente.

Desde el lector, **Consultar con IA** prepara el PDF abierto y su texto extraído / OCR para ChatGPT o Gemini, con pregunta y referencias de página. Utiliza el menú de compartir del dispositivo cuando es compatible; también permite descargar los archivos y abrir la IA para adjuntarlos. No envía contenido automáticamente. [Consultar con IA](docs/CONSULTAR_CON_IA.md).

La primera versión funciona sin backend ni base de datos en servidor. Los datos del dispositivo se guardan localmente. Repositorio: [jmgo93/urgencias-pwa](https://github.com/jmgo93/urgencias-pwa). Aplicación: [Urgencias en GitHub Pages](https://jmgo93.github.io/urgencias-pwa/); el estado del despliegue se comprueba en Actions.

Para usar el libro en el móvil, **instala primero la app y ábrela desde su icono**. Importa entonces el paquete privado `Biblioteca.urgencias` desde la app instalada, pulsa **Preparar uso sin conexión** y espera al estado **Lista para usar sin conexión**. Introduce la contraseña una vez y deja marcado **Recordar este dispositivo**: después la biblioteca se abrirá directamente, incluso sin Internet. La importación es local: no sube el archivo a GitHub. [Guía para el móvil](docs/TRASLADO_AL_MOVIL.md).

## Probar la versión preparada

1. Abre **Abrir Urgencias.cmd**, situado en la carpeta de trabajo, junto a `repositorio-app` y `biblioteca-local`.
2. Se abrirá [la aplicación local](http://localhost:4173/urgencias-pwa/). Mantén abierta la ventana del servidor mientras consultas la biblioteca.
3. Copia la contraseña de `biblioteca-local/ACCESO_LOCAL.txt`, deja marcado **Recordar este dispositivo** si es tu equipo personal y pulsa **Desbloquear biblioteca**. Ese archivo está fuera del repositorio y no se sirve a través de la web.
4. Prueba «disnea dolor torácico» o «gasometría acidosis», abre un resultado y utiliza **Volver a resultados** para recuperar la búsqueda.

La [guía de primera prueba](docs/PRIMERA_PRUEBA_LOCAL.md) explica los controles, la instalación y el uso sin conexión.

## Qué incluye

- Búsqueda que exige todos los conceptos afirmados en el mismo fragmento o su encabezado: añadir otro concepto acota los resultados. Acepta un vocabulario inicial de sinónimos y equivalencias, sin exigir todas las variantes a la vez. Las palabras funcionales se omiten; las negaciones se conservan como contexto y se señalan siglas ambiguas. Las comillas exigen una frase literal.
- Índice preparado guardado cifrado en este dispositivo para reutilizarlo al abrir; no se vuelve a construir en cada inicio. Puedes escribir mientras termina de preparar la primera búsqueda.
- Historial privado local de las últimas 20 búsquedas: repite una consulta con sus filtros o utiliza **Borrar historial** para retirarlo sin borrar la biblioteca.
- Filtros por sección y por capítulos o casos, con coincidencias explicadas. Se priorizan la evidencia en el cuerpo, las coincidencias literales y la proximidad de los conceptos; no se mezclan resultados parciales cuando no hay coincidencia conjunta.
- Una tarjeta por PDF, identificado por su documento y no por su título. Dentro se agrupan las páginas en orden de lectura y se conservan todos los pasajes coincidentes, incluidos varios de una misma página. Se muestran inicialmente los 30 PDF más relevantes; **Mostrar más PDF** amplía en lotes de 30 y conserva los apartados desplegados. Los contadores distinguen PDF, páginas y pasajes.
- Vista **Sólo títulos**, activable en los resultados: toca un título para desplegar el PDF, elige una página y utiliza **Abrir página** en el pasaje que te interese. Desactívala para ver las tarjetas desplegadas. La elección se conserva en este navegador.
- Identidad propia de las 25 secciones mediante color tonal, icono y nombre, visible también en **Sólo títulos** y en el lector. La estrella señala el mejor PDF de la búsqueda y el mejor pasaje dentro de cada PDF, incluyendo el selector del lector. [Diseño móvil basado en Material Design 3](docs/DISENO_MATERIAL3_MOVIL.md).
- Lector de PDF con página original y página del documento pequeño, navegación, zoom y texto extraído. **Coincidencias en este PDF** permite saltar a cualquier pasaje encontrado sin volver a cargar el archivo. Conserva consulta, filtros y resultados al volver y despliega la página del pasaje seleccionado.
- Biblioteca local de **244 PDF: 198 capítulos, 45 casos y un documento de preliminares**, que cubren las **1.101 páginas** del libro. Las **32 páginas con OCR** están identificadas.
- Catálogo, texto y PDF cifrados; contraseña inicial y apertura automática en un dispositivo recordado. **Olvidar este dispositivo** retira el acceso guardado y cierra la sesión sin borrar la biblioteca. Si se desmarca **Recordar este dispositivo**, la clave queda sólo en memoria y vuelve el bloqueo tras 15 minutos de inactividad.
- PWA instalable con recursos locales y diseño basado en Material 3. El botón **Instalar app** está disponible antes del desbloqueo: ofrece la instalación del navegador o instrucciones para iPhone/iPad, Android y ordenador.
- Preparación explícita del uso sin conexión, con estado visible de los recursos de la app y de la biblioteca cifrada guardada en el dispositivo.

Las coincidencias expresan **relevancia documental, no probabilidad diagnóstica**. El contenido es de la edición de 2018. El texto extraído y los candidatos a subsección no sustituyen la página original; no se afirma que estén revisados clínicamente. Los cuestionarios, los casos interactivos y los algoritmos docentes pertenecen a fases posteriores.

## Preparación técnica

Requisitos del código: Node.js 22.13 o posterior y npm. Desde `repositorio-app`:

```console
npm ci
npm test
npm run build
npm run check:private
npm start
```

El servidor escucha sólo en el equipo local y sirve la app en `http://localhost:4173/urgencias-pwa/`. `npm run dev` utiliza el mismo servidor local; hay que volver a compilar tras modificar el código. El lanzador no instala dependencias ni genera archivos automáticamente.

La biblioteca personal se prepara por separado, fuera del repositorio. Para reconstruirla se necesita Python con `pypdf`; la comprobación visual utiliza también `pypdfium2` y Pillow. Estos comandos se ejecutan desde `repositorio-app`, con el PDF original y `Libro dividido` en la carpeta superior:

```console
python -X utf8 scripts/prepare-corpus.py --source .. --output ../biblioteca-local/preparado
python -X utf8 scripts/verify-pdfs.py --source .. --output ../biblioteca-local/preparado --render-all
npm run prepare:library
```

`prepare:library` cifra el catálogo y los PDF en `../biblioteca-local/cifrado`; reutiliza la contraseña del archivo de acceso si existe o genera una nueva. No imprime la contraseña. Para regenerar los PDF ya existentes se añade `--rebuild` al primer comando.

La extracción conserva las páginas originales sin reducir su resolución. Eso implica que algunos recursos compartidos se repiten entre documentos: el conjunto cifrado ocupa aproximadamente **549 MiB**, aunque sólo se carga el PDF seleccionado durante una consulta. El capítulo más grande conserva unos 13,4 MiB para mantenerlo íntegro.

## Información personal y publicación

El código compilado de `dist` excluye el libro, los PDF, las transcripciones, el corpus, los paquetes cifrados y las contraseñas. El servidor local conecta ese código con la carpeta personal externa. En Pages, la biblioteca se importa desde un único archivo `.urgencias` del dispositivo, por bloques y sin cargar el paquete entero en memoria. Se verifican sus archivos y se guarda la biblioteca cifrada. Al recordar el dispositivo, se conserva además una clave de acceso `CryptoKey` local en IndexedDB; la contraseña no se almacena ni se envía a un servidor. Quien tenga acceso a ese navegador podrá abrir la biblioteca mientras el dispositivo siga recordado.

La primera preparación del buscador guarda una copia cifrada del índice ya construido. Las aperturas posteriores reutilizan esa copia compatible; deben leerla y descifrarla, pero no reconstruirla. Se prepara de nuevo si cambia la biblioteca, la versión del índice o se retiran sus datos locales. El historial de consultas y filtros también se guarda cifrado en este dispositivo y no se envía a GitHub. **Borrar historial** elimina esas consultas y conserva el índice y los PDF.

El contenido permanece local; cambiar su formato o cifrarlo no concede derechos de distribución. [Separación de archivos personales](docs/ARCHIVOS_PERSONALES.md).

Para crear el archivo que se traslada al móvil, ejecuta `node scripts/pack-library.mjs` después del cifrado. El paquete se genera fuera del repositorio en `biblioteca-local/Para el movil/Biblioteca.urgencias` y no contiene la contraseña. El flujo **Publicar en GitHub Pages** publica automáticamente los cambios de `main` después de sus comprobaciones; también permite una ejecución manual. [Configuración de Pages](docs/PUBLICACION_PAGES.md).

Para el funcionamiento sin conexión, pulsa **Preparar uso sin conexión** y espera al estado **Lista para usar sin conexión**. La importación necesita espacio para unos 549 MiB de biblioteca cifrada, además del archivo personal y los recursos de la aplicación. La biblioteca se incorpora desde tu archivo; no se descarga de GitHub. Con **Recordar este dispositivo**, puedes cerrar y volver a abrir sin repetir la contraseña y sin bloqueo por inactividad. **Olvidar este dispositivo** borra la clave guardada y mantiene la biblioteca cifrada; la siguiente apertura pedirá la contraseña, también válida sin conexión. Si no recuerdas el dispositivo, se pide al iniciar otra sesión y se aplica el bloqueo de 15 minutos. El navegador puede liberar almacenamiento; conserva el archivo original y usa **Eliminar biblioteca del dispositivo** si deseas borrar la copia guardada en la app. Si instalas la app después de haber usado el navegador, comprueba su estado e importa la biblioteca desde la app instalada cuando sea necesario.

## Plan de evolución

- [Índice de planificación](docs/plan/00_Indice_y_decisiones.md).
- [PWA estática](docs/plan/14_Plan_PWA_estatica.md).
- [Buscador y relevancia](docs/plan/15_Buscador_local_y_relevancia.md).
- [PDF y navegación](docs/plan/16_PDF_navegacion_y_publicacion.md).
- [Acceso mediante contraseña](docs/plan/17_Acceso_con_contrasena.md).

Los documentos de backend describen una evolución posterior; no son dependencias de esta versión local.
