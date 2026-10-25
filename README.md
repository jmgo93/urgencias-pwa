# Urgencias PWA

Biblioteca personal de consulta documental: escribe una frase, compara los fragmentos relacionados y abre el PDF del capítulo o del caso en la página correspondiente.

La primera versión funciona sin backend ni base de datos. Repositorio: [jmgo93/urgencias-pwa](https://github.com/jmgo93/urgencias-pwa). Aplicación: [Urgencias en GitHub Pages](https://jmgo93.github.io/urgencias-pwa/); el estado del despliegue se comprueba en Actions.

Para usar el libro en el móvil, copia el paquete privado `Biblioteca.urgencias`, pulsa **Importar biblioteca del dispositivo** en la aplicación y desbloquéalo con la contraseña. La importación es local: no sube el archivo a GitHub. [Guía para el móvil](docs/TRASLADO_AL_MOVIL.md).

## Probar la versión preparada

1. Abre **Abrir Urgencias.cmd**, situado en la carpeta de trabajo, junto a `repositorio-app` y `biblioteca-local`.
2. Se abrirá [la aplicación local](http://localhost:4173/urgencias-pwa/). Mantén abierta la ventana del servidor mientras consultas la biblioteca.
3. Copia la contraseña de `biblioteca-local/ACCESO_LOCAL.txt` y pulsa **Desbloquear biblioteca**. Ese archivo está fuera del repositorio y no se sirve a través de la web.
4. Prueba «disnea dolor torácico» o «gasometría acidosis», abre un resultado y utiliza **Volver a resultados** para recuperar la búsqueda.

La [guía de primera prueba](docs/PRIMERA_PRUEBA_LOCAL.md) explica los controles, la instalación y el uso sin conexión.

## Qué incluye

- Búsqueda por frases, términos literales, siglas y un vocabulario inicial de sinónimos y equivalencias. Se conservan las negaciones y se señalan siglas ambiguas.
- Filtros por sección y por capítulos o casos, con conexiones explicadas, coincidencias y términos ausentes en cada fragmento.
- Lector de PDF con página original y página del documento pequeño, navegación, zoom y texto extraído. Conserva consulta, filtros, resultados y posición al volver.
- Biblioteca local de **244 PDF: 198 capítulos, 45 casos y un documento de preliminares**, que cubren las **1.101 páginas** del libro. Las **32 páginas con OCR** están identificadas.
- Catálogo, texto y PDF cifrados; desbloqueo local con contraseña, bloqueo manual y tras 15 minutos de inactividad. La clave de la sesión se mantiene en memoria.
- PWA con recursos locales, diseño basado en Material 3, instalación cuando el navegador la ofrece y descarga voluntaria de la biblioteca cifrada para consultar sin conexión.

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

El código compilado de `dist` excluye el libro, los PDF, las transcripciones, el corpus, los paquetes cifrados y las contraseñas. El servidor local conecta ese código con la carpeta personal externa. En Pages, la biblioteca se importa desde un único archivo `.urgencias` del dispositivo, por bloques y sin cargar el paquete entero en memoria. Se verifican sus archivos y se guardan sólo los datos cifrados.

El contenido permanece local; cambiar su formato o cifrarlo no concede derechos de distribución. [Separación de archivos personales](docs/ARCHIVOS_PERSONALES.md).

Para crear el archivo que se traslada al móvil, ejecuta `node scripts/pack-library.mjs` después del cifrado. El paquete se genera fuera del repositorio en `biblioteca-local/Para el movil/Biblioteca.urgencias` y no contiene la contraseña. La publicación del código se lanza manualmente con el flujo **Publicar en GitHub Pages**. [Configuración de Pages](docs/PUBLICACION_PAGES.md).

Para el funcionamiento sin conexión hay que pulsar **Guardar sin conexión**, esperar a que termine la descarga y disponer de espacio suficiente para unos 549 MiB adicionales en el navegador. Sólo se guardan los paquetes cifrados y los recursos de la aplicación. Al recargar, cerrar o bloquear se vuelve a pedir la contraseña. El navegador puede liberar almacenamiento; **Eliminar descargas** permite borrarlo voluntariamente.

## Plan de evolución

- [Índice de planificación](docs/plan/00_Indice_y_decisiones.md).
- [PWA estática](docs/plan/14_Plan_PWA_estatica.md).
- [Buscador y relevancia](docs/plan/15_Buscador_local_y_relevancia.md).
- [PDF y navegación](docs/plan/16_PDF_navegacion_y_publicacion.md).
- [Acceso mediante contraseña](docs/plan/17_Acceso_con_contrasena.md).

Los documentos de backend describen una evolución posterior; no son dependencias de esta versión local.
