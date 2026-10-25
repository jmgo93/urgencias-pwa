# Revisión limitada de la protección local

Fecha: 25 de octubre de 2026. Alcance: `src/crypto.js`, `scripts/encrypt-library.mjs`, `scripts/serve.mjs` y las salidas públicas disponibles. Esta revisión comprueba comportamientos concretos; no equivale a una auditoría independiente de toda la aplicación ni del equipo del usuario.

## Protección comprobada

La biblioteca se cifra por archivo mediante AES-256-GCM con etiqueta de autenticación de 128 bits. La clave se deriva con PBKDF2 y SHA-256, 600.000 iteraciones y sal aleatoria de 24 bytes. Cada archivo recibe un IV aleatorio de 12 bytes. La clave Web Crypto se crea como no exportable. El identificador del archivo y la versión del corpus forman los datos autenticados adicionales, por lo que cambiar cualquiera de ellos impide descifrar el mismo archivo.

El corpus se comprime con gzip antes del cifrado. La prueba de interoperabilidad usa la salida de `node:zlib` y la descifra/descomprime con `Blob`, `Response` y `DecompressionStream`, las mismas interfaces web utilizadas por el cliente. Esta prueba se ejecutó en Node; la validación del recorrido de usuario en un navegador real se informa por separado.

La semántica de autenticación y los parámetros empleados corresponden a la [especificación Web Cryptography de W3C](https://www.w3.org/TR/webcrypto-1/#aes-gcm).

## Pruebas ejecutadas

Comando reproducible desde la carpeta de la aplicación:

```text
node --test tests/crypto.test.js
```

Resultado final, después de generar `dist`: **13 pruebas aprobadas, cero fallos y ninguna omitida**. Se comprobó tanto el manifiesto cifrado real como el directorio público. La ejecución duró aproximadamente tres segundos en este equipo; no constituye una medición del rendimiento en móviles.

- Conversión base64 de los 256 valores posibles de un byte.
- Cifrado y descifrado íntegros de texto sintético, sin utilizar información del libro.
- Rechazo de una contraseña errónea.
- Rechazo al modificar el contenido cifrado, la etiqueta, el IV o la longitud del archivo.
- Rechazo al intercambiar identificadores de documento o versiones del corpus.
- Interoperabilidad gzip con `DecompressionStream`.
- Salidas diferentes con IV diferentes para el mismo contenido.
- Rechazo de algoritmos y hashes no admitidos, sales demasiado cortas y parámetros de iteraciones inválidos.
- Aceptación de los límites declarados por el cliente: 100.000 y 2.000.000 de iteraciones. El empaquetador usa 600.000.
- Lectura exclusiva de metadatos del manifiesto cifrado real: 245 IV distintos de 96 bits, identificadores y nombres de archivo válidos, y tamaños coincidentes. Esta prueba no lee la contraseña ni el corpus personal.
- Arranque de un servidor local aislado: rechazo de doce rutas privadas y variantes de escape de directorios, y de métodos de escritura. Los metadatos permitidos se sirven con `no-store`, `nosniff`, política de referente y CSP.

La comprobación opcional de `dist` busca archivos PDF, paquetes cifrados, corpus, manifiestos personales, archivos de acceso, claves y marcadores conocidos del origen. También rechaza enlaces simbólicos. Sirve para detectar inclusiones accidentales frecuentes; no demuestra por sí sola la ausencia de cualquier secreto posible.

## Hallazgos y límites

1. **Archivo de acceso en claro fuera de la raíz servida.** La contraseña local se guarda en `biblioteca-local/ACCESO_LOCAL.txt` para que su propietario pueda abrir la aplicación. El servidor rechaza esa ruta. El control `mode: 0o600` no demuestra exclusividad de acceso en Windows: las distinciones Unix entre propietario, grupo y otros no se implementan del mismo modo. La protección del archivo depende de los permisos y de la sincronización del directorio del usuario. Véase la [documentación de permisos del sistema de archivos de Node.js](https://nodejs.org/api/fs.html#file-access-constants).

2. **Resolución de enlaces simbólicos: corregida durante la integración.** La revisión inicial detectó que la comprobación del directorio era exclusivamente léxica. El servidor ahora resuelve con `realpath` tanto el directorio permitido como el archivo solicitado y rechaza destinos externos. Se revisó esta corrección en el código y se repitieron las pruebas de rutas. No se introdujo un enlace simbólico como prueba específica en Windows; además, la guardia de `dist` rechaza enlaces en el artefacto público.

3. **Orden de actualización del archivo de acceso: corregido.** El empaquetador conserva el archivo de acceso anterior mientras cifra los documentos; escribe el manifiesto temporal, lo sustituye al terminar y sólo después actualiza el archivo de acceso. No elimina copias antiguas descargadas ni revoca sus contraseñas.

4. **Contraseña compartida y cliente autorizado.** La protección permite descifrar a quien posee la contraseña. No identifica a cada persona ni impide que un usuario autorizado conserve una copia del contenido ya abierto. Una clave no exportable tampoco impide que el código de la aplicación la utilice para descifrar; la integridad del código servido sigue siendo necesaria.

5. **Alcance de la revisión.** No se examinaron en esta tarea la política de borrado de sesión, el lector PDF, el service worker completo, las dependencias de terceros, la seguridad del sistema operativo ni una futura publicación en GitHub Pages. Tampoco se promete borrado físico de datos en memoria mediante JavaScript.

Los hallazgos operativos se comunicaron al integrador para corregirlos sin modificar concurrentemente sus archivos. El resultado de una revisión posterior o de las comprobaciones de publicación debe registrarse con su evidencia y fecha.
