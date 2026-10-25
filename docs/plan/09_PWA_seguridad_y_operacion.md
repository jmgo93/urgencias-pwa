# 09. PWA, seguridad y operación

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

Versión de planificación: 1.1 · 25/10/2026 · Estado: alcance ajustado a las respuestas del usuario. Describe requisitos de implementación y verificación, no prestaciones ya disponibles.

## 1. Qué significa instalar esta aplicación

La aplicación será una web adaptable e instalable mediante un manifiesto PWA, HTTPS y un service worker propio en `public/sw.js`. La instalación permite abrirla desde un icono y usar una ventana independiente cuando el navegador lo soporte. No implica una app nativa, publicación en tiendas ni igualdad de funciones entre todos los móviles.

El valor sin conexión confirmado es lectura de contenido seleccionado y tests formativos, con buscador local limitado al material descargado. Los casos secuenciales y los algoritmos interactivos necesitan conexión en el primer alcance; un diagrama revisado puede consultarse como documento estático. No se promete disponer de las 1.101 páginas en cada dispositivo ni mantener disponible indefinidamente un archivo guardado por el navegador. La base se estructura en entidades y relaciones; no se impone el PDF como formato de consulta principal.

| Función | Con conexión | Sin conexión, si se descargó el paquete |
| --- | --- | --- |
| Leer fichas y diagramas estáticos publicados | Sí, con estado actual | Sí, revisión descargada y fecha visibles |
| Recorrer algoritmos interactivos | Sí, cuando estén revisados | No en el primer alcance |
| Consultar fuentes PDF y figuras | Acceso privado según permiso; carga bajo demanda | Solo archivos permitidos, incluidos y verificados; no redistribuir el libro |
| Buscar | Catálogo completo autorizado | Subconjunto descargado; etiqueta «En este dispositivo» |
| Test formativo de práctica | Sí | Sí, motor local y contenido descargado |
| Casos clínicos secuenciales simulados | Sí, con casos ficticios o adaptados revisados | No en el primer alcance |
| Examen evaluable o de acreditación | Según configuración docente | No en el alcance inicial; la calificación oficial necesita servidor |
| Repaso y favoritos | Guardados en servidor | Cambios locales pendientes y sincronización al volver |
| Editar, revisar o publicar | Sí, según permiso | No |
| Gestionar usuarios, permisos o informes docentes | Sí | No |
| Verificar retirada o actualización | Inmediato al consultar el servidor | Solo la última información conocida; no se puede garantizar revocación remota |

Livewire aporta indicadores de desconexión, pero no convierte las acciones PHP del servidor en funciones locales. El lector y el motor de tests formativos offline serán módulos JavaScript delimitados, integrados con Alpine y compilados por Vite. Tendrán pruebas de equivalencia de puntuación con el servidor. El cliente no incorpora un evaluador local de casos o algoritmos interactivos en esta fase. [Estados offline de Livewire 3](https://livewire.laravel.com/docs/3.x/offline).

## 2. Política de caché del service worker

Se usa una lista explícita de recursos permitidos. Ningún comportamiento global de «guardar todas las respuestas».

| Recurso | Política propuesta |
| --- | --- |
| JS/CSS/font/iconos de build con hash | Precaché limitado por versión; cache first; retirar builds antiguos tras migrar |
| Página offline estática y estructura pública mínima | Precaché; sin nombre, correo, rol, organización ni estado de sesión incrustado |
| Navegación autenticada normal | Red; si falla, abrir el lector offline estático y su selección local, nunca una copia HTML privada de otra sesión |
| `/login`, logout, callbacks Google/WebAuthn, CSRF y sesiones | Exclusión completa de caché |
| `/admin`, paneles Filament y peticiones Livewire | Red y `no-store`; una pantalla de desconexión explica la indisponibilidad |
| API de progreso, informes, usuarios o permisos | Red y `no-store`; sin caché genérica de respuestas privadas |
| POST/PUT/PATCH/DELETE | No se cachean ni se repiten automáticamente desde `fetch`; solo se sincronizan eventos permitidos mediante el protocolo específico |
| Paquetes de contenido y medios | Descarga explícita autorizada; almacén local separado por usuario/organización/paquete/revisión |
| PDF bajo demanda | No precargar el libro; permitir descarga consciente si los derechos lo permiten |

Cache API contiene activos públicos y, en un espacio separado, blobs de paquetes autorizados. IndexedDB guarda manifiestos, índice local y eventos educativos pendientes. Los endpoints privados llevan `Cache-Control: private, no-store` y se excluyen también en CDN/proxy. Las estrategias varían según el recurso; cachear introduce un compromiso de actualidad y las escrituras HTTP no son respuestas apropiadas para cachear. [Guía de caché PWA de MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching).

El SW se sirve sin hash en su ruta estable, con cabeceras para comprobar actualizaciones; sus recursos internos sí están versionados. No se fuerza una recarga en mitad de un test. Una versión nueva espera hasta un punto seguro, guarda el estado local, migra su esquema y muestra «Actualizar». La versión nueva admite al menos el formato anterior durante la ventana de despliegue acordada.

## 3. Paquetes offline e integridad

Unidad recomendada: un tema o itinerario corto con fichas, preguntas formativas y recursos de lectura autorizados; una sección completa es una opción explícita con su tamaño mostrado. El PDF original permanece en el repositorio documental privado y no se exige subirlo íntegro al servidor. Un paquete no suprime la fuente ni la trazabilidad. La conversión del libro a base de datos no acredita derechos de distribución: los bloques derivados conservan su fuente y permiso. El primer uso personal no habilita paquetes para terceros; al ampliar acceso se revisará el ámbito de cada recurso y su licencia.

Manifiesto mínimo:

| Campo | Finalidad |
| --- | --- |
| `pack_public_id`, `pack_revision_public_id` | Identidad y versión inmutable del paquete |
| `schema_version`, `min_reader_version` | Compatibilidad con el lector instalado |
| `locale`, `audience`, `organization_public_id` si aplica | Alcance autorizado y separación de datos |
| `created_at`, `reviewed_at`, `check_after`, `expires_at` | Información temporal y control de uso |
| `items[]` con `item_public_id` y `revision_public_id` | Contenido exacto que se ofrece y se evaluará |
| `assets[]` con nombre relativo, MIME, bytes y SHA-256 | Verificación de integridad por archivo; rutas sin traversal |
| `manifest_sha256`, `signature`, `key_id` | Integridad del manifiesto y verificación con clave pública de distribución |
| `rights_scope`, referencias a fuentes y sus versiones; `source_edition_public_id` cuando corresponda al libro | Permiso por audiencia, trazabilidad a guías principales y edición del libro secundario; una fuente sin páginas usa su localizador verificable |
| `withdrawal_catalog_version` | Última lista de retiradas conocida al generar el paquete |

Protocolo:

1. Usuario elige descarga y ve tamaño, fecha, temas, alcance sin red y uso del almacenamiento.
2. Servidor comprueba sesión, organización, permiso y derechos. Genera un manifiesto de bytes UTF-8 exactos y una firma separada; los hashes se calculan sobre los archivos finales. No incluye credenciales en el paquete.
3. Se descarga a un área temporal. Se comprueban tipos, tamaños, número de archivos, firma y cada hash antes de marcarlo disponible.
4. Se activa de forma atómica: un cierre de navegador o una cuota agotada deja la versión anterior íntegra y el paquete incompleto identificado.
5. En la apertura, el lector verifica disponibilidad local y compatibilidad; al recuperar la red consulta actualizaciones y retiradas. Nunca cambia las revisiones de un intento en curso.
6. Se ofrece reemplazar, borrar o volver a descargar; muestra tamaño usado, última comprobación y revisiones disponibles.

El hash y la firma del manifiesto se guardan en un sobre separado del payload que cubren: no se calcula un hash sobre un documento que contiene ese mismo hash. El payload serializado tiene bytes y reglas de codificación fijos; `key_id` identifica la clave de verificación. El lector verifica el sobre y después los archivos incluidos.

La implementación fijará un algoritmo de firma interoperable y su codificación mediante un ADR y vectores de prueba PHP/navegador; candidato Ed25519 con extensión Sodium y Web Crypto, solo si toda la matriz objetivo lo soporta. Una combinación no soportada no puede omitir la verificación silenciosamente: no habilita ese modo hasta resolverlo. La clave privada de distribución permanece fuera del repositorio, y `key_id` permite rotación. La verificación de firma acredita integridad de distribución, **no valida la corrección médica**. [Verificación con Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify).

El almacenamiento web tiene cuotas y políticas de eliminación que dependen del navegador. Se consulta `navigator.storage.estimate()` y se solicita persistencia cuando proceda, comprobando el resultado; ello no equivale a una garantía de conservación. Se capturan errores de cuota y se explica cómo recuperar la descarga. No se usa `localStorage` para los contenidos o la cola educativa. [Cuotas y eliminación de almacenamiento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## 4. Actualidad clínica y retirada sin red

Toda ficha, diagrama y explicación muestra guía o documento fuente, revisión, fecha de revisión y referencia comprobable; si cita el libro, conserva edición y página real del PDF original. Las guías actuales constituyen la base clínica; la edición del libro es secundaria e histórica cuando proceda. El lector offline añade el estado «Sin conexión · última comprobación ...». El contenido con `withdrawn` conocido deja de ser seleccionable para nuevas prácticas y consulta rápida; su rastro se conserva para auditoría e historial educativo con la explicación de la retirada.

Para la finalidad educativa y documental confirmada: al superar `check_after`, advertencia de revisión pendiente; al superar `expires_at`, se suspende la consulta rápida estructurada hasta reconectar y verificar. La biblioteca documental puede conservarse como fuente histórica claramente identificada si los derechos y la política editorial lo permiten. Los plazos se fijan por tipo y riesgo de contenido, no con un único periodo inventado para todo el libro. Ninguna función introduce datos de pacientes reales; una futura orientación individualizada exige un alcance y validación específicos.

Una PWA completamente desconectada no puede enterarse de una retirada emitida después ni impedir de forma fiable manipular el reloj local. Tampoco puede borrar remotamente una copia exportada o extraída del dispositivo. Esos límites condicionan los derechos de descarga y el alcance del producto. Si se requiere revocación inmediata o decisión clínica actualizada, esa función exige conexión y verificación del servidor.

## 5. Sincronización de actividad educativa

El cliente conserva únicamente eventos definidos: respuesta de práctica, cierre de sesión educativa, marcador de repaso y favorito. No replica tablas ni envía estados finales de calificación para que el servidor los acepte.

Ejemplo de sobre de evento, sin datos clínicos de pacientes:

```json
{
  "event_public_id": "01JZ0000000000000000000003",
  "device_public_id": "01JZ0000000000000000000004",
  "attempt_public_id": "01JZ0000000000000000000005",
  "sequence": 2,
  "event_type": "practice_answered",
  "occurred_at_client": "2026-10-25T09:05:00Z",
  "item_public_id": "01JZ0000000000000000000001",
  "revision_public_id": "01JZ0000000000000000000002",
  "answer_option_public_ids": ["01JZ0000000000000000000006"],
  "pack_revision_public_id": "01JZ0000000000000000000007",
  "schema_version": "1.0"
}
```

La organización activa se valida al recibir el lote; el servidor no la acepta solo porque figure en la cola. El ULID `event_public_id` se persiste como `client_operation_public_id`, con `UNIQUE(user_id, client_operation_public_id)` según el modelo de datos. Su hash incluye la organización validada y el contenido de la operación: reutilizar la misma clave en otra organización es un conflicto, no otra operación. Un segundo envío con el mismo identificador y el mismo hash devuelve el recibo anterior. Si cambia el payload, devuelve conflicto y no modifica el evento ya aceptado. Inserción, puntuación y recibo se guardan transaccionalmente.

| Situación | Resolución |
| --- | --- |
| Sin sesión o CSRF vencido | Pausar, pedir acceso en la UI y conservar pendientes hasta reautenticación; no generar tokens duraderos |
| Evento duplicado | Devolver el recibo; no duplicar puntos ni repasos |
| Revisión sustituida | Evaluar contra la revisión original y registrar que es histórica |
| Revisión retirada | Aceptar historial como práctica histórica no vigente; excluir de métricas de competencia cuando corresponda y mostrar incidencia; no reasignar otra respuesta correcta |
| Opción que no pertenece a la revisión | Rechazar ese evento con error de validación; conservarlo para revisión del usuario |
| Membresía revocada | Rechazar sincronización para ese ámbito; no reasignarla a otra organización |
| Mismo intento abierto en dos dispositivos | Un intento tiene un dispositivo propietario al crearse; la reanudación en otro necesita un traspaso conectado y nueva versión de estado |
| Eventos fuera de orden o intento cerrado | Validar secuencia/versión y responder conflicto; no sobrescribir un cierre aceptado |
| Fallo parcial del lote | Respuesta por evento con recibo, error o conflicto; reintentar solo pendientes |
| Reloj local incorrecto | Conservar fecha declarada y recepción de servidor; no certificar duración o plazos a partir del móvil |

Estados locales visibles: `pending`, `syncing`, `accepted`, `conflict`, `rejected`. El servidor es autoridad para calificación, permisos y programación del siguiente repaso. El cliente aplica provisionalmente la misma regla versionada para ofrecer feedback de práctica. No se borra el pendiente hasta recibir un recibo persistido. Reintentos con espera creciente y botón «Sincronizar»; el modo en segundo plano es una mejora, no una garantía de entrega.

## 6. Identidad y permisos

El acceso se decide en middleware y políticas de Laravel, además de la visibilidad del menú. Se comprueban acciones de Livewire/Filament, rutas, API, exportaciones y archivos. Ocultar un botón no autoriza una operación.

- Fase privada: una única cuenta propietaria activa, registro externo desactivado mediante bandera de configuración y rutas de alta de terceros no disponibles. La autenticación no concede por sí misma permisos editoriales o de revisión clínica.
- Fase de acceso ampliado: registro abierto con aprobación administrativa, correo verificado y estado `pending` hasta aprobación. Ni registro ni inicio con Google activan una cuenta o permiten descargar contenido antes de aprobarla. La habilitación requiere revisión expresa del ámbito de derechos y de las condiciones operativas; no se activa ahora.
- Google con Socialite y `state` validado. Vincular un proveedor a una cuenta ya existente exige reautenticación; no se fusionan cuentas automáticamente por un correo no verificado. Passkeys y Google son opciones de acceso según integración validada, sin alterar el estado de aprobación.
- Passkeys con `laragear/webauthn` y `@laragear/webpass`: comprobar RP ID, origen HTTPS, challenge de un solo uso y user verification según política. La app no recibe huellas o imágenes faciales; el autenticador realiza esa verificación.
- Administración con segundo factor/refuerzo obligatorio y elevación reciente para roles, acceso global, publicación crítica y exportaciones. La configuración exacta de passkey más factor independiente y recuperación se valida en la integración Laragear: una sesión ya abierta o el mero registro de una passkey no cuentan como dos verificaciones.
- Recuperación con códigos de un solo uso almacenados mediante hash, revocación de sesiones y revisión de operaciones sensibles. No se desactiva el segundo factor mediante una simple solicitud por correo sin verificación.
- Roles nuevos mediante migraciones y permisos específicos; el acceso editorial global requiere una concesión explícita. El administrador de una organización no obtiene facultad para aprobar contenido global por administrar alumnos.
- `memberships` determina acceso; la organización activa se resuelve y verifica en cada petición. Cambiar de organización invalida cachés y cambia los datos visibles. Pruebas de acceso cruzado obligatorias.
- Sesiones con cookies `Secure`, `HttpOnly`, `SameSite` apropiado y protección CSRF. Rate limiting para acceso, búsqueda costosa, importaciones y sincronización. Revocación por dispositivo y registro de accesos privilegiados.

Los detalles de roles de negocio se mantienen en el documento de perfiles; este documento define su aplicación técnica.

## 7. Datos locales, dispositivos compartidos y cierre de sesión

Los almacenes locales se separan lógicamente por `user_public_id` y `organization_public_id`; toda apertura exige el contexto local correcto. Un cambio de cuenta nunca muestra automáticamente el progreso o paquetes privados anteriores. Esta separación reduce errores de interfaz, pero no proporciona aislamiento frente a alguien que controla el navegador o el dispositivo.

En logout o cambio de cuenta: advertir si hay actividad pendiente, ofrecer sincronizar y, si se decide salir, confirmar su descarte; cerrar la sesión del servidor, eliminar la asociación push, limpiar datos personales/paquetes privados locales y notificar a las otras pestañas. El contenido público de interfaz puede seguir cacheado. El logout offline solo elimina el estado local: la revocación de la sesión del servidor se completa al volver a conectar o desde otro dispositivo.

En equipos compartidos se desactiva por defecto la descarga persistente de actividad personal. Se admiten exclusivamente casos ficticios o adaptados sin datos personales; no se guardan pacientes ni historias clínicas reales. Los apuntes personales son exportables dentro del ámbito privado y su interfaz indica que no se introduzcan datos identificables. Aportar casos por terceros requerirá un flujo editorial posterior. No se promete cifrado seguro con una clave guardada junto a los datos en JavaScript; una passkey tampoco cifra por sí sola IndexedDB.

## 8. Protección de contenidos, archivos y trazabilidad

- HTML/Markdown se sanea en servidor con lista permitida; se rechazan scripts, atributos peligrosos, enlaces y medios no permitidos. CSP se ensaya con Livewire/Alpine y el visor antes de imponerla; no se afirma compatibilidad con una política estricta sin probar su build.
- PDF y adjuntos privados fuera de la raíz pública, acceso mediante controlador/política o URL temporal autorizada, MIME/tamaño comprobados y escaneo según la infraestructura. Los enlaces a páginas conservan documento y número real; un enlace no otorga permiso de lectura por sí mismo.
- SVG/QR generados por el servidor; SVG subidos por usuarios se rechazan o sanean. Los QR apuntan a rutas autorizadas y no incluyen respuestas de examen o tokens.
- Importaciones con vista previa, validación de filas, idempotencia y errores descargables. Exportaciones evitan fórmulas activas en campos de texto CSV/Excel y exigen permiso de alcance.
- Auditoría registra actor, organización, acción, revisión, motivo y fecha del servidor. Se minimizan secretos y datos personales; los cambios masivos y acciones de publicación generan eventos explícitos aunque el ORM no dispare auditoría de fila.
- Los logs operativos no incluyen contraseñas, cookies, tokens, contenido íntegro de test reservado ni datos de pacientes. Auditoría con acceso restringido y política de retención; para resistencia a alteraciones, exportación a un destino con permisos separados.
- Derechos de uso y vigencia editorial se comprueban al publicar, exportar y generar paquetes; un contenido existente en disco no se considera automáticamente distribuible.

## 9. Avisos y funciones del dispositivo

Campana en base de datos como registro principal. Se confirman recordatorios de repaso y cambios relevantes configurables; tareas y plazos se incorporan en la fase posterior de grupos/docencia. Correo y Web Push son canales opcionales, con preferencia por categoría, frecuencia y horario de silencio. Los mensajes de pantalla bloqueada son discretos y no revelan resultados personales. La apertura por notificación comprueba autorización otra vez. No hay avisos docentes vacíos ni pantallas de tareas en el primer uso individual.

Push solo se solicita tras una acción clara del usuario. Se detectan APIs y se ofrece campana/correo si no están disponibles. En iOS/iPadOS el soporte documentado desde 16.4 se aplica a web apps añadidas a la pantalla de inicio y la solicitud depende de interacción del usuario; se probará la versión real objetivo. La entrega y la ejecución en segundo plano dependen del sistema. [WebKit: Web Push en iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

`public/sw.js` gestiona conjuntamente caché y push; no se registran workers competidores. Suscripciones caducadas se eliminan, payloads tienen tamaño limitado y los reintentos no duplican avisos. Se prioriza exportar apuntes y progreso. Cámara QR y calendario `.ics` se posponen hasta contar con un uso concreto; al habilitar cámara se pide permiso al entrar en esa función y se ofrece introducir el enlace manualmente. La exportación `.ics` será optativa con eventos mínimos y zona horaria definida.

## 10. Entornos y despliegue

Tres entornos separados: desarrollo, preproducción y producción, con bases de datos, discos, dominios, credenciales Google/WebAuthn y claves push distintos. Los datos de pruebas serán sintéticos. No se copia actividad identificable de producción para desarrollar.

El alojamiento está pendiente y la escala futura es desconocida. No se contrata ni dimensiona un servidor por suposición; se elaborará una ficha de necesidades medibles y coste para el uso privado individual. Los entornos pueden provisionarse por hitos, manteniendo separación efectiva al desplegar. Con dedicación personal de pocas horas semanales, se priorizan soluciones operables por una persona antes de añadir servicios. La prueba de dependencias de H1 y la resolución de incompatibilidades del stack estricto preceden a cualquier despliegue; estas condiciones no autorizan cambiar de versiones.

| Área | Requisito de operación |
| --- | --- |
| Web | PHP 8.5 y servidor configurado para servir solo `public/`; HTTPS; `APP_DEBUG=false`; límites de carga |
| Consola, cron y workers | Rutas explícitas al binario 8.3 solicitado, extensiones y variables verificadas; mismo release y lockfile que la web |
| Base de datos | MariaDB con minor fijado, `utf8mb4`, modo SQL estricto, migraciones ensayadas y usuario de mínimos privilegios |
| Colas | Procesos supervisados, reintentos/timeouts definidos, trabajos fallidos visibles y reinicio controlado tras cada release |
| Scheduler | Un planificador activo o bloqueo distribuido documentado; comprobación de que realmente se ejecuta |
| Tiempo | Persistencia UTC; presentación Europe/Madrid; pruebas del cambio de hora y recurrencias |
| Almacenamiento | Fuentes y medios privados, permisos separados, límites de cuota y monitorización de espacio |
| Secretos | Fuera de Git, distintos por entorno, rotación documentada; no cambiar `APP_KEY` sin plan para los datos cifrados |

El desajuste CLI 8.3/web 8.5 es una condición de compatibilidad que se prueba, no una ventaja asumida. Si el hosting no permite fijar y verificar ambos binarios, se registra el bloqueo antes del despliegue. El manual de Laravel destaca la raíz pública, permisos de `storage`/`bootstrap/cache`, modo de depuración y recarga de servicios como puntos del despliegue. [Despliegue Laravel 12](https://laravel.com/docs/12.x/deployment).

Secuencia de entrega manual mediante GitHub Actions:

1. Seleccionar un commit/release con CI verde y registrar quién inicia la operación. Un solo despliegue por entorno a la vez.
2. Verificar dependencias, salud y copia previa; preparar el artefacto reproducible con activos compilados y lockfiles.
3. Ejecutar migraciones compatibles hacia delante, ensayadas con volumen representativo; evitar DDL que bloquee sin conocer su coste.
4. Activar el release, reconstruir cachés de Laravel/Filament, reiniciar o recargar workers de manera controlada y verificar cron.
5. Comprobar acceso, búsqueda, lectura de fuente, publicación de prueba controlada y sincronización; observar errores.
6. Ante fallo, volver al código anterior si el esquema sigue siendo compatible. Un `migrate:rollback` automático de datos publicados no es estrategia de recuperación.

Migraciones por expansión/contracción: añadir estructura compatible, desplegar lectores/escritores, rellenar por lotes, verificar y retirar la estructura antigua en otro release. Los entornos de GitHub y reglas de protección se usan si el plan del repositorio los soporta; sus capacidades varían por plan y visibilidad. [Entornos de despliegue de GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## 11. Copias, recuperación y observabilidad

Se incluyen base de datos, archivos fuente, figuras, revisiones y claves/configuración necesarias para restaurar. Copia cifrada y separada del servidor de aplicación; no depender únicamente de una carpeta sincronizada. Índices y paquetes se pueden regenerar, pero sus manifiestos y retiradas deben conservar trazabilidad.

Propuesta inicial a confirmar con presupuesto: objetivo RPO de 24 horas y RTO de 4 horas para un piloto. Son metas por validar mediante un simulacro, no garantías del hosting. Si los datos educativos requieren menos pérdida, combinar copia completa con binlogs y restauración a un punto temporal. La retención y ubicación final se acuerdan con el responsable.

Antes del piloto se restaura una copia en un entorno aislado y se comprueban recuentos, hashes de fuente, autenticación, permisos, revisiones e intentos. Se registra duración y resultado; se repite después de cambios relevantes y con la periodicidad acordada.

Métricas mínimas: latencia y errores de búsqueda/lectura, cola más antigua y fallos, notificaciones fallidas, fallos de sincronización, espacio libre, éxito/edad de copias, tareas programadas, contenidos pendientes/vencidos/retirados y versión de paquetes servidos. Alertas solo cuando hay una acción concreta. Los informes de actividad no se publican como métricas operativas identificables.

Procedimientos escritos: retirada clínica urgente, caída de búsqueda, cola bloqueada, pérdida de datos locales, cuenta comprometida, exposición de contenido privado, restauración y revocación de credenciales. Cada procedimiento identifica responsable, pasos, evidencia y comunicación al usuario afectado. El alcance legal y editorial se desarrolla en el documento de gobernanza.

## 12. Pruebas de aceptación específicas

- Abrir offline un paquete verificado; buscar solo su subconjunto; preservar figuras y la referencia real a la fuente.
- Confirmar que sin conexión se habilitan lectura y tests formativos; casos secuenciales, algoritmos interactivos y evaluación oficial muestran su requisito de red, sin simular éxito.
- Cortar red a mitad de descarga, agotar cuota y cerrar la PWA: no mostrar un paquete incompleto como listo.
- Actualizar app o paquete durante un test: conservar revisión, respuestas y recuperación posterior.
- Repetir el mismo lote de sincronización y enviarlo en paralelo: una sola puntuación y recibos estables.
- Expirar sesión, cambiar organización y retirar una membresía con pendientes: ninguna actividad entra en un ámbito incorrecto.
- Retirar una revisión: bloquearla online inmediatamente, invalidar paquetes conocidos al conectar y mostrar el límite sin red.
- Entrar con otra cuenta tras logout en móvil compartido: ausencia de progreso, fuentes privadas y notificaciones del usuario anterior.
- En fase privada, comprobar que una petición de registro externo no crea acceso activo. En fase ampliada, una cuenta pendiente no ve contenido ni paquetes hasta aprobación, incluso si inicia con Google.
- Un recurso sin derecho acreditado para terceros no entra en un paquete exportable por estar convertido a texto, tabla o JSON.
- Probar Chrome/Android y Safari/iOS reales para instalación, cuota, firma, PDF y push; Chrome sin ventana no sustituye esa validación.
- Ejecutar restauración y vuelta al release anterior con migración expandida: resultado verificable y tiempo medido.
