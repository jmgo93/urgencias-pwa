# Acceso mediante contraseña en la PWA estática

Estado: requisito incorporado, pendiente de implementación. No se ha establecido ninguna contraseña ni publicado la aplicación. Complementa los documentos 14–16; la biblioteca personal continúa siendo local por defecto.

## 1. Qué se protegerá

Antes de usar la biblioteca habrá una pantalla de desbloqueo por contraseña. La garantía buscada es que quien no la conozca no pueda leer el contenido protegido. Una contraseña compartida acredita conocimiento de un secreto, no identidad: quien la sepa podrá compartirla.

GitHub Pages sirve archivos estáticos; su control privado oficial depende del plan y de permisos de GitHub. No proporciona este formulario de contraseña compartida como autorización del servidor. [Qué es Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [visibilidad de Pages](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

## 2. Solución propuesta

Mantener la PWA sin backend ni base de datos y proteger la biblioteca mediante **cifrado y desbloqueo local**. La página de entrada y el código genérico pueden ser públicos; los datos privados deben seguir siendo ilegibles aunque alguien quite el formulario o abra directamente los archivos.

| Elemento | Tratamiento |
| --- | --- |
| Pantalla inicial, código genérico, fuentes e iconos | Públicos; sin secretos ni texto clínico privado |
| Catálogo, términos, índice y fragmentos | Cifrados antes de formar el paquete protegido |
| PDF, figuras, miniaturas y mapas privados | Cifrados también; sin copias equivalentes en claro accesibles por otra ruta |
| Contraseña y clave derivada | Fuera de repositorio, URLs, manifiestos públicos y almacenamiento persistente del navegador |
| Libro y derivados actuales | Permanecen locales; añadir contraseña no autoriza subirlos a Pages |

El código de una app pública puede copiarse o reconstruirse. El criterio de seguridad será la confidencialidad de la biblioteca cifrada, no impedir que alguien reutilice un buscador genérico vacío.

No sirven un booleano `loggedIn`, una contraseña escrita en JavaScript, una ruta difícil de adivinar ni un hash usado sólo para ocultar la interfaz. StatiCrypt ilustra el cifrado de HTML estático, pero su documentación indica que copia sin cifrar los archivos de otros formatos: proteger sólo `index.html` no protege PDF ni JSON. [StatiCrypt](https://github.com/robinmoisson/staticrypt).

## 3. Formato criptográfico a validar

Usar primitivas estándar y una implementación revisada con pruebas, no un cifrado inventado. Candidato: derivación mediante PBKDF2 con salt aleatorio y parámetros versionados, y cifrado autenticado AES-GCM con Web Crypto. Los parámetros finales se fijarán tras revisión y medición en móvil. [Derivación de claves](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey), [cifrado autenticado](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

Cada operación AES-GCM requiere IV único para su clave. Asociar versión de paquete e identidad de activo mediante datos autenticados evita intercambiar archivos de contextos distintos. Se registran algoritmo, versión, salt, parámetros e IV, nunca la contraseña. Rechazar cualquier alteración, versión incompatible o descifrado fallido antes de mostrar contenido. [Parámetros AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams).

La preparación local generará paquete cifrado y vectores de prueba para comprobar compatibilidad entre herramienta y navegador. Las fuentes originales que queden en claro en el ordenador siguen bajo la protección del dispositivo: el bloqueo de la app no las cifra retroactivamente.

## 4. Apertura y bloqueo

1. Mostrar formulario accesible sin títulos, fragmentos o PDF privados en claro.
2. Derivar la clave y comprobar un recurso pequeño autenticado. No transmitir la contraseña.
3. Mantener clave y datos descifrados sólo en memoria de sesión; sin «recordarme» persistente por defecto.
4. Descifrar índice y catálogo una vez y consultar en un worker. No derivar de nuevo la clave en cada búsqueda.
5. Descifrar únicamente el PDF pequeño elegido y entregarlo al visor en memoria.
6. Mantener sugerencias y retorno mientras siga desbloqueado.
7. «Bloquear» cierra visor, termina workers, revoca URLs de objeto y elimina referencias a datos, consultas y claves. La limpieza es de mejor esfuerzo: JavaScript no garantiza borrado físico verificable de toda la memoria.

Una nueva sesión o recarga exige desbloqueo. Se probarán suspensión, restauración y Atrás en móviles para que no reaparezca contenido tras bloquear. No se promete impedir copias después de un desbloqueo legítimo ni proteger un dispositivo controlado por un tercero.

## 5. PWA y rapidez

La caché persistente guardará interfaz pública y archivos cifrados, no índices, fragmentos o PDF descifrados ni claves. Cache Storage seguirá siendo opcional; no se añade IndexedDB ni servidor.

Un PDF cifrado completo debe descargarse o leerse y autenticarse antes de abrirlo. No se prometerán rangos HTTP del PDF original sobre ese objeto cifrado. Empezar con un archivo cifrado por capítulo pequeño; un transporte cifrado por bloques sería una ampliación independiente si las mediciones lo justifican.

Medir desbloqueo, descifrado del índice, búsqueda caliente y apertura/descifrado/render de capítulo por separado. Los presupuestos de los documentos 14–16 deben revalidarse con este coste incluido.

## 6. Límites y cambios de contraseña

- Con un paquete estático descargado se pueden probar contraseñas sin conexión. Un contador o retraso de pantalla se puede eludir: se necesita una contraseña larga y no reutilizada.
- Cambiar contraseña exige regenerar los recursos protegidos según el formato elegido. No revoca copias antiguas ni recupera contenido exportado.
- No hay cuentas, revocación individual, segundo factor ni registro fiable de quién accedió en este modo.
- Si se necesitan esas capacidades, se incorporará control real delante de todos los recursos o un backend, evitando un origen accesible que permita saltarse la protección.
- La contraseña y el cifrado no modifican los usos permitidos del libro. La modalidad inicial sigue siendo biblioteca local; alojarla remotamente requiere una decisión y comprobación de usos aparte.

## 7. Pruebas de aceptación

| Comprobación | Resultado exigido |
| --- | --- |
| Quitar formulario o modificar estado de interfaz | No permite descifrar biblioteca sin clave |
| Abrir directamente PDF, índice o evidencias protegidos | No existe copia privada en claro accesible |
| Contraseña errónea o archivo alterado | Sin contenido parcial ni continuación como válido |
| Inspeccionar artefacto, historial público, mapas de código y logs | Sin contraseña, claves ni contenido privado en claro |
| Examinar caché después de usar la app | Sólo datos públicos o cifrados; no claves ni contenido privado descifrado persistente |
| Bloquear y volver con Atrás o pestaña restaurada | No reaparece la biblioteca sin el desbloqueo correspondiente |
| Usar sin red o actualizar el corpus | Integridad y versiones coherentes; sin mezcla de activos |
| Medir rendimiento | Desbloqueo separado de búsqueda; coste documentado y apertura móvil probada |

La contraseña se configurará localmente cuando se implemente. No se guardará como texto en estos documentos ni se ha solicitado todavía.
