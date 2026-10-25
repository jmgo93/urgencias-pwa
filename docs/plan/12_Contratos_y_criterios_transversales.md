# Contratos y criterios transversales

> Alcance actualizado: este documento describe el producto completo. La primera implementación es el [buscador PWA estático](14_Plan_PWA_estatica.md), sin backend ni base de datos. Para esa entrega prevalecen los documentos 14-16; se conservan aquí las especificaciones compatibles y la evolución posterior.

Versión 1.1, conforme a [decisiones confirmadas](13_Decisiones_confirmadas.md). Este documento fija las convenciones comunes que deben conservarse cuando el plan se convierta en migraciones, pantallas y tareas. Si una implementación necesita cambiarlas, registrar la decisión y actualizar los documentos afectados antes de integrar el cambio.

## 1. Identidad y versiones

| Concepto | Contrato |
| --- | --- |
| Clave interna | `BIGINT UNSIGNED` en MariaDB; equivalente compatible en SQLite para pruebas ordinarias |
| Identificador público | `public_id`, ULID de 26 caracteres, único; opaco para el cliente |
| Foreign key | `*_id` interna, con integridad referencial y mismo tipo que su destino |
| Campo de contrato JSON | Preferir `item_public_id`, `revision_public_id`, `organization_public_id`; no presentar PK internas como IDs públicos |
| Identidad de contenido | `content_items`, estable aunque cambie el texto |
| Versión | `content_revisions`, semántica congelada al enviar a revisión e inmutable al publicarse; conserva autoría, estado y fuentes. Una devolución genera una revisión corregida, sin reutilizar la aprobación anterior |
| Histórico | Intentos, casos y recorridos fijan revisiones exactas; no resolverlos por «última versión» |
| Numeración de páginas | Ordinal real desde 1 en original y sección, más etiqueta impresa opcional |

ULID no constituye un mecanismo de autorización ni oculta la fecha de creación de forma criptográfica. El servidor debe comprobar acceso en cada recurso, incluidos los documentos descargables.

## 2. Estados separados

No utilizar un único booleano `validado` para todo el proceso:

- Estado editorial: `draft`, `in_review`, `approved`, `published`, `superseded`, `withdrawn`.
- Calidad de extracción: pendiente/cotejada y método original/OCR.
- Revisión clínica: pendiente/aprobada/rechazada, revisor, ámbito y fechas.
- Traducción: idioma/alfabeto, revisión fuente, estado y revisor.
- Distribución: derechos comprobados, audiencia y tipos de uso permitidos.
- Paquete offline: preparando/listo/descargando/verificado/obsoleto/retirado/error.

Los valores finales de los enums y sus nombres SQL se fijarán al generar las migraciones; su semántica no puede colapsarse en «activo».

## 3. Qué contiene una entrega de contenido

```json
{
  "schema_version": "1.0",
  "item_public_id": "<ULID>",
  "revision_public_id": "<ULID>",
  "content_type": "test_information",
  "locale": "es",
  "audience": "professional_education",
  "editorial_status": "published",
  "reviewed_at": "<ISO 8601>",
  "review_due_at": "<ISO 8601 o null>",
  "citations": [
    {
      "source_public_id": "<ULID>",
      "source_version": "<versión de guía>",
      "locator_public_id": "<ULID>",
      "locator_kind": "web",
      "url": "https://example.org/guia",
      "section_label": "<sección o recomendación>",
      "retrieved_at": "<ISO 8601>"
    },
    {
      "source_public_id": "<ULID>",
      "source_version": "<edición del documento>",
      "locator_public_id": "<ULID>",
      "locator_kind": "pdf",
      "document_public_id": "<ULID>",
      "original_page_start": 1,
      "original_page_end": 1
    }
  ],
  "payload": {},
  "dependencies": [{"item_public_id": "<ULID>", "revision_public_id": "<ULID>"}]
}
```

La URL `example.org`, las páginas `1` y los campos entre ángulos son ejemplos de estructura, no fuentes clínicas. `locator_kind` discrimina el esquema: `pdf` exige documento y páginas reales; `web` exige URL/localizador de sección y versión identificada, sin inventar páginas PDF. Ambos resuelven a `source_locators` y a una versión de `sources`. Cada cita se valida contra el registro correspondiente; una fuente puede ofrecer ambos tipos de localizador. La edición del libro es un metadato opcional de su fuente, no un atributo obligatorio de toda ficha.

Las guías actuales tienen prioridad clínica; el libro de 2018 es secundario. No enviar drafts ni documentos sin usos comprobados dentro de un payload de publicación o descarga. Un cambio de formato no cambia el estado de derechos.

## 4. Organización y autorización

MVP con una organización activa por usuario y pertenencias explícitas. El contenido editorial puede ser global, pero la actividad de aprendizaje, los grupos y las asignaciones pertenecen a una organización. Acceso basado en permisos globales Spatie más Policies de ámbito; roles por centro requieren decisión posterior.

Despliegue inicial de uso exclusivo del propietario, sin registro externo activo. La política futura es solicitud de alta con aprobación previa; el estado pendiente no concede lectura, descargas ni actividad. Preparar los seis perfiles no acredita revisión independiente ni habilita usuarios externos.

Un docente ve actividad de tareas que ha asignado a sus grupos y los datos necesarios para acompañar a ese alumnado; no obtiene las notas privadas. Un usuario que cambia de organización no transfiere descargas o actividad a otra automáticamente. El proceso de cambio define visibilidad y retención.

## 5. Consultas y respuestas previsibles

- Resultados de búsqueda paginados con identificador, tipo, título, snippet autorizado, revisión, idioma y estado; la puntuación representa relevancia documental.
- Una sigla ambigua requiere elección o resultados agrupados; no se expande silenciosamente a una única enfermedad.
- Las relaciones prueba/enfermedad incluyen contexto, evidencia y limitaciones; un resultado aislado no se serializa como diagnóstico confirmado.
- Respuestas de API usan errores estructurados: validación de campos, sin permiso, revisión retirada, conflicto de sincronización, paquete no disponible o servicio temporalmente inaccesible.
- No devolver excepciones internas, rutas del servidor o datos de otros usuarios en errores.

## 6. Tiempo, números e idiomas

Guardar instantes en UTC y mostrar en la zona del usuario; fecha por defecto del proyecto Europe/Madrid. Los plazos requieren zona explícita y pruebas de cambio de hora. Guardar fechas clínicas de una simulación sólo como datos de ficción identificados.

Números y unidades tienen tipos explícitos. Analizar coma decimal mediante reglas de locale y validar antes de convertir; no almacenar una cantidad como cadena que mezcle número y unidad. Los rangos de referencia no son reglas diagnósticas y no comparten tabla de significado con umbrales de decisión sin distinguir su tipo.

Idiomas de interfaz y de contenido son decisiones distintas. Español e inglés clínicos se incluyen desde el piloto; árabe y darija en alfabetos árabe y latino se preparan técnicamente y se publican posteriormente. Una traducción no aprobada no se presenta como traducción clínica revisada mediante fallback. Mostrar el idioma disponible y conservar números y códigos con aislamiento bidireccional apropiado.

## 7. Publicación, caché y consistencia

La transacción de publicación actualiza el puntero de revisión publicada y registra un evento pendiente. Un proceso reintentable actualiza búsqueda, cachés y paquetes. Si falla, el recurso sigue marcado como pendiente de distribución; no se declara todo actualizado por el commit de una tabla.

Cada índice o paquete conserva versión del esquema y del catálogo. Los lectores sólo abren paquetes descargados y comprobados completos. Un lote incompleto no se activa por tener ya algunos archivos locales.

El diseño detallado del documento 09 es el contrato de sincronización. En el primer alcance sólo lectura y tests formativos están habilitados offline; casos y algoritmos interactivos offline se posponen. Un reenvío idéntico devuelve el mismo resultado; un payload diferente con la misma clave idempotente devuelve conflicto. El servidor recalifica la práctica sincronizada con la revisión que recibió el usuario y comprueba su política de retirada.

## 8. Criterios comunes de aceptación

| ID | Evidencia exigida |
| --- | --- |
| CT-01 | Reimportar inventario no duplica páginas y confirma 1.101 originales |
| CT-02 | Toda ficha publicada tiene citas y versión revisada; bloquear publicación incompleta |
| CT-03 | Cambiar una fuente identifica las preguntas, casos, algoritmos y paquetes dependientes |
| CT-04 | Una persona con dos roles no aprueba su propia edición crítica |
| CT-05 | Un usuario no puede leer intentos o paquetes de otra organización mediante URL directa |
| CT-06 | Búsqueda de siglas cortas funciona con ruta alternativa a FULLTEXT y pruebas MariaDB |
| CT-07 | Reanudar un intento conserva versión y orden de opciones |
| CT-08 | Datos desconocidos y unidades incompatibles no toman una rama clínica por defecto |
| CT-09 | Móvil, teclado, lector de pantalla, RTL y tema oscuro tienen recorridos comprobados |
| CT-10 | Sin red se puede leer un paquete disponible y practicar sólo los modos habilitados |
| CT-11 | Cerrar sesión limpia datos locales conforme a política, mostrando límites de un dispositivo perdido |
| CT-12 | Corrección o retirada se refleja en nuevos intentos y paquetes; se conserva historial |
| CT-13 | CI prueba dependencias exactas en PHP de consola y de web; MariaDB cubre diferencias SQLite |
| CT-14 | Las cifras de rendimiento y aprendizaje se publican como mediciones sólo tras recoger evidencia |

## 9. Artefactos de implementación posteriores

El cuestionario está respondido. Los siguientes artefactos son decisiones de arquitectura, migraciones y seeds de permisos, esquema de payloads validable, contratos API, fixtures sintéticos, selección de identidad visual, backlog por hitos y guías de revisión editorial. El stack permanece estricto; las incompatibilidades no resueltas impiden el despliegue afectado. La IA está fuera de las primeras versiones. El presente trabajo actualiza documentos, no entrega una aplicación ya operativa ni una base clínica ya cargada.
