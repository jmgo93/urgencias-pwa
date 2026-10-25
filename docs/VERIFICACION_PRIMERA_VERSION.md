# Verificación de la primera versión — 25/10/2026

## Resultado

Aplicación desplegada en https://jmgo93.github.io/urgencias-pwa/ mediante el flujo manual de Pages. Primera publicación: ejecución `40239888435`, terminada correctamente. El repositorio contiene código y documentación; el paquete personal y su contraseña permanecen fuera.

## Pruebas reproducibles

- `npm test`: 36 pruebas locales aprobadas, sin fallos ni omisiones en el entorno preparado. Incluyen búsqueda, worker, cifrado, manipulación de archivos, importación por bloques, texto solapado, escape de HTML y rutas HTTP.
- Compilación y guardia de contenido personal aprobadas. La CI de la PR y de `main` terminó correctamente; las comprobaciones que requieren la biblioteca personal se omiten cuando no está presente en GitHub.
- El corpus local cubre 244 documentos, 4074 fragmentos y 1101 páginas; sus PDF se cotejaron con el original página por página, incluidos los píxeles renderizados. El informe detallado permanece junto a la biblioteca local.
- El archivo de traslado contiene 245 activos cifrados y su manifiesto; se verificaron tamaños y SHA-256. No incluye la contraseña.

## Recorridos comprobados en navegador

1. Una contraseña incorrecta impide abrir el contenido.
2. Pantalla de 426 px de anchura: búsqueda «Gasometría y acidosis», apertura de página original 74 en página local 4 de un PDF de siete páginas, paginación y vista de texto. Primer render observado: 785 ms. Es una prueba de ventana estrecha en ordenador, no una medición de un teléfono físico.
3. Importación completa del paquete desde el selector de archivos, tanto en localhost como en el origen de Pages.
4. En Pages: desbloqueo, búsqueda «Disnea y dolor torácico», apertura de página original 208 en página local 1 de un PDF de siete páginas. Render observado: 596 ms.
5. Regreso a resultados conservando la frase y sus 30 destinos. Filtro de casos clínicos: diez destinos relacionados, términos coincidentes y ausentes visibles.
6. Servidor local apagado: recarga de la PWA desde caché, desbloqueo, búsqueda y apertura de página 74/4 de gasometría sin acceso al servidor. Render observado: 375 ms.

Los tiempos son observaciones concretas de este equipo, no garantías de rendimiento móvil. El [benchmark del motor](PRUEBAS_BUSQUEDA.md) separa búsqueda de descifrado y lectura PDF.

## Límites de esta entrega

Los destinos están verificados a nivel de página. Las referencias a subsección son candidatos de extracción; no se afirma precisión de línea ni revisión clínica. Hay 32 páginas OCR identificadas. La transcripción es auxiliar: columnas, fórmulas y tablas deben comprobarse en el PDF original. No se incorporan todavía cuestionarios interactivos ni algoritmos de diagnóstico.

La PWA solicita nuevamente la contraseña tras recargar o bloquear. Para usarla en otro dispositivo hay que importar allí el archivo personal; la publicación no transmite ni sincroniza la biblioteca.
