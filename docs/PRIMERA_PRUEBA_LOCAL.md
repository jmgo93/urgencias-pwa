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

El botón **Instalar app** está disponible antes y después del desbloqueo. Si el navegador ofrece una instalación directa, la muestra; en los demás casos abre una guía para iPhone/iPad, Android y ordenador. Instala primero la app y ábrela desde su icono antes de importar tu biblioteca, para que quede guardada dentro de la app instalada.

En esta prueba, la dirección `localhost` pertenece al ordenador donde funciona el servidor; esa misma dirección en el teléfono no accede al ordenador. Para el móvil utiliza [Urgencias en GitHub Pages](https://jmgo93.github.io/urgencias-pwa/) y sigue la [guía de traslado e instalación](TRASLADO_AL_MOVIL.md). La biblioteca se incorpora desde tu archivo personal; no se descarga del repositorio público.

El panel de disponibilidad sin conexión aparece incluso con la biblioteca bloqueada. Para preparar el ordenador local:

1. Con el servidor abierto, desbloquea la biblioteca una vez para cargar la información de `biblioteca-local/cifrado`. Si has importado el paquete `Biblioteca.urgencias` desde la app, puedes preparar el uso sin conexión antes de introducir la contraseña.
2. Pulsa **Preparar uso sin conexión**. Si todavía no hay biblioteca disponible, se guardará la aplicación y se indicará que debes importar el archivo personal.
3. Espera a que termine la comprobación y el guardado de los recursos que falten. El conjunto cifrado ocupa aproximadamente **549 MiB**; necesitas espacio adicional para los recursos de la app y el archivo del paquete si lo conservas en el dispositivo.
4. Comprueba el estado **Lista para usar sin conexión**. Sólo aparece cuando están completos tanto la aplicación como la biblioteca. Abre **Ver qué está guardado en este dispositivo** para consultar los detalles.
5. Para comprobarlo en este ordenador, cierra la ventana del servidor, recarga la app, introduce tu contraseña y realiza una búsqueda. Abre también un PDF que no hubieras consultado antes. La biblioteca completa está preparada, por lo que no depende de haber abierto previamente cada documento.

Se guardan los archivos de la aplicación y la biblioteca cifrada; no se guarda la contraseña ni una copia persistente del texto descifrado. Tras cerrar, recargar o bloquear, podrás desbloquearla con la misma contraseña sin Internet, mientras se conserven sus datos locales.

**Eliminar biblioteca del dispositivo** borra la copia cifrada guardada en la app y bloquea la sesión activa. La aplicación sigue instalada y los originales de la carpeta de trabajo o tu archivo personal no se borran. Conserva ese archivo como copia: el navegador también puede liberar almacenamiento o perder sus datos si los eliminas manualmente.

Pulsa **Bloquear** al terminar. La aplicación también se bloquea tras 15 minutos sin actividad. El bloqueo vacía la búsqueda y cierra el lector.

## Si algo no abre

| Situación | Acción |
| --- | --- |
| El lanzador indica que falta Node.js | Instala Node.js 22.13 o posterior antes de iniciar el servidor. |
| Faltan dependencias o la compilación | Desde `repositorio-app`, ejecuta `npm ci`, `npm test` y `npm run build`. El lanzador no instala por su cuenta. |
| El navegador no conecta en la primera prueba | Mantén abierta la ventana del servidor y recarga la dirección completa con `/urgencias-pwa/`. Cuando la app indique **Lista para usar sin conexión**, podrás volver a abrirla sin servidor. |
| La contraseña no funciona | Copia de nuevo sólo el valor de `ACCESO_LOCAL.txt`; comprueba que se usa la carpeta `cifrado` correspondiente. |
| La biblioteca no está disponible | En local, conserva `biblioteca-local/cifrado` junto a `repositorio-app` y desbloquéala con el servidor abierto. En Pages o en la app instalada, importa tu archivo `Biblioteca.urgencias`. No muevas los paquetes a `dist`. |
| No aparece un aviso de instalación del navegador | Pulsa **Instalar app** y sigue la guía para tu dispositivo. La ausencia de un aviso automático no impide utilizar la guía de instalación. |
| La app instalada no encuentra una biblioteca que ya importaste en una pestaña | Abre la app desde su icono, importa el paquete allí y pulsa **Preparar uso sin conexión**. |
| La preparación sin conexión no termina | Comprueba el espacio disponible y vuelve a pulsar **Preparar uso sin conexión** para completar los archivos que falten. Puedes usar **Eliminar biblioteca del dispositivo** para retirar la copia local y volver a importarla; esta acción bloquea la sesión. |
| Indica que la aplicación está guardada pero falta la biblioteca | Importa tu paquete personal o, en local, desbloquea una vez la biblioteca con el servidor abierto. Vuelve a preparar hasta que aparezca **Lista para usar sin conexión**. |
| Faltan archivos después de borrar datos o liberar espacio | Recupera la conexión para preparar la aplicación y vuelve a importar tu paquete. Comprueba de nuevo el estado antes de desconectarte. |
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
