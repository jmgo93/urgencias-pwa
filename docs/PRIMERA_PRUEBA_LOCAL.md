# Primera prueba local

La aplicación y la biblioteca ya están preparadas en este equipo. No necesitas crear una cuenta ni instalar una base de datos.

## Abrir y desbloquear

1. En la carpeta **Urgencias**, abre **Abrir Urgencias.cmd**.
2. El navegador abrirá [http://localhost:4173/urgencias-pwa/](http://localhost:4173/urgencias-pwa/). Si la página se abre antes de arrancar el servidor, recárgala una vez.
3. Deja abierta la ventana del servidor. Puedes minimizarla; al cerrarla se detiene el servicio local.
4. Abre `biblioteca-local/ACCESO_LOCAL.txt`, copia únicamente el valor que aparece tras «Contraseña:» y pégalo en la aplicación.
5. Pulsa **Desbloquear biblioteca** y espera a que se prepare el buscador. La contraseña se borra del formulario y no queda guardada por la aplicación.

Si ya hay un servidor en el puerto 4173, el lanzador abrirá la misma dirección sin crear otro. Si el navegador no muestra Urgencias, puede haber otra aplicación utilizando ese puerto.

El archivo de acceso es privado y está fuera del repositorio. No envíes la carpeta `biblioteca-local` ni su contraseña a GitHub.

## Buscar y seguir las conexiones

Escribe una frase con los conceptos que te interesan y pulsa **Buscar**. También puedes utilizar los cuatro ejemplos de la pantalla inicial. Pruebas útiles:

| Consulta | Qué permite comprobar |
| --- | --- |
| `disnea dolor torácico` | Cruce de síntomas y comparación de varios capítulos y casos. |
| `gasometría acidosis` | Relación entre una prueba y un trastorno descrito en el libro. |
| `fiebre rigidez de nuca` | Consulta con una expresión de varias palabras. |
| `síncope palpitaciones` | Variantes con acentos y conexiones entre conceptos. |

La búsqueda combina términos literales con un vocabulario inicial de sinónimos y siglas. No interpreta cualquier frase como un diagnóstico ni calcula probabilidades de enfermedad. Las expresiones desconocidas siguen buscando por sus palabras; la cobertura del vocabulario se ampliará tras la prueba.

Puedes limitar los resultados a una sección o elegir **Capítulos** o **Casos clínicos**. Cada tarjeta presenta el fragmento, los términos encontrados, los términos que faltan en ese fragmento cuando corresponda, la página original y la página del PDF pequeño. También indica el tamaño y el número de páginas del documento.

Una «referencia de texto» es un candidato obtenido de la extracción; no implica que la subsección o sus coordenadas estén verificadas. Las páginas con reconocimiento OCR se identifican como pendientes de revisión.

## Leer y volver

Pulsa **Abrir página** o el título de una tarjeta. La aplicación carga sólo el PDF del capítulo o del caso seleccionado, no el libro completo de 1.101 páginas.

- Las flechas junto al número de página recorren el documento; puedes escribir un número de página local.
- Los botones de zoom ajustan el tamaño. En pantallas pequeñas el documento puede desplazarse horizontalmente al ampliarlo.
- **Ver texto** muestra el texto extraído de la página; la imagen del PDF conserva tablas, figuras y disposición originales.
- El botón de apertura externa permite consultar el PDF descifrado en otra pestaña durante la sesión.
- Las flechas de **Otras sugerencias** cambian al resultado anterior o siguiente.
- **Volver a resultados** conserva la consulta, los filtros, las sugerencias y la posición de lectura de la lista.

La referencia más fiable para la presentación de tablas y algoritmos es el PDF original. El libro es de 2018 y esta versión ofrece consulta documental, sin actualización clínica automática.

## Instalar y consultar sin conexión

El botón **Instalar app** aparece si el navegador ofrece la instalación. También puedes utilizar su menú de instalación. En esta prueba, la dirección `localhost` pertenece al ordenador donde está funcionando el servidor; abrir esa misma dirección en el teléfono no accede al ordenador. La prueba móvil entre dispositivos requerirá una dirección HTTPS accesible que se preparará posteriormente.

Para descargar el material:

1. Desbloquea la biblioteca y pulsa **Guardar sin conexión**.
2. Espera a que finalice. El conjunto cifrado ocupa aproximadamente **549 MiB**; el navegador necesita espacio adicional y puede solicitar conservar los datos.
3. Comprueba que se muestra **Biblioteca guardada sin conexión**. La descarga es voluntaria y no se inicia por el mero hecho de buscar.
4. Tras la descarga, la aplicación y el material pueden consultarse en el mismo navegador sin conexión al servidor, siempre que la caché se conserve. Necesitarás de nuevo la contraseña al recargar.

Se guardan archivos cifrados; no se guarda la contraseña ni una copia persistente del texto descifrado. **Eliminar descargas** borra del navegador los paquetes de la biblioteca, sin borrar los originales de la carpeta de trabajo. La aplicación puede seguir abierta con la sesión activa hasta que la bloquees. El navegador también puede eliminar sus datos si falta espacio o si se borran manualmente.

Pulsa **Bloquear** al terminar. La aplicación también se bloquea tras 15 minutos sin actividad. El bloqueo vacía la búsqueda y cierra el lector.

## Si algo no abre

| Situación | Acción |
| --- | --- |
| El lanzador indica que falta Node.js | Instala Node.js 22.13 o posterior antes de iniciar el servidor. |
| Faltan dependencias o la compilación | Desde `repositorio-app`, ejecuta `npm ci`, `npm test` y `npm run build`. El lanzador no instala por su cuenta. |
| El navegador no conecta | Mantén abierta la ventana del servidor y recarga la dirección completa con `/urgencias-pwa/`. |
| La contraseña no funciona | Copia de nuevo sólo el valor de `ACCESO_LOCAL.txt`; comprueba que se usa la carpeta `cifrado` correspondiente. |
| La biblioteca no está disponible | Conserva `biblioteca-local/cifrado` junto a `repositorio-app`. No hace falta mover los paquetes a `dist`. |
| La descarga sin conexión no termina | Comprueba el espacio del navegador. Puedes volver a pulsar para continuar o eliminar las descargas parciales. |
| Un fragmento se lee mal | Abre la página del PDF y revisa el original, especialmente si lleva indicación OCR. |

## Regeneración opcional en este equipo

La biblioteca ya está generada. Si se modifica la extracción, desde `repositorio-app` puede usarse el Python disponible en este equipo:

```powershell
& 'C:\Users\usuario\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -X utf8 scripts/prepare-corpus.py --source .. --output ../biblioteca-local/preparado
& 'C:\Users\usuario\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -X utf8 scripts/verify-pdfs.py --source .. --output ../biblioteca-local/preparado --render-all
npm run prepare:library
```

La primera orden conserva los PDF generados si ya existen; añade `--rebuild` sólo cuando quieras regenerarlos. El cifrado utiliza la contraseña del archivo local existente, salvo que se configure otra explícitamente. Los informes de preparación y verificación están en `biblioteca-local/preparado`.

La versión local contiene 198 capítulos, 45 casos y preliminares en 244 documentos, con cobertura completa de las 1.101 páginas y 32 páginas OCR. Los cuestionarios, el estudio de casos interactivos y los algoritmos docentes aún no forman parte de esta primera entrega.
