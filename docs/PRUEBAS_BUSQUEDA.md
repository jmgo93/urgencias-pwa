# Pruebas de búsqueda local

Medición: 2026-10-26T16:02:32.779Z. Motor ejecutado con v24.16.0; biblioteca personal de 244 documentos y 4074 fragmentos. No se incorpora texto del libro a este informe.

La primera construcción del índice tardó **5193.99 ms**. Después de 10 rondas de calentamiento se midieron 50 rondas de cada consulta (600 búsquedas): mediana **30.56 ms**, percentil 95 **49.96 ms** y máximo **71.77 ms**. Son medidas del motor local; no incluyen descifrado, red, pintado de interfaz ni carga del PDF y no garantizan el mismo resultado en otro dispositivo.

| Consulta | Documentos encontrados | Primera ejecución (ms) | Mediana (ms) | p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| disnea | 73 | 90.13 | 33.48 | 41.82 |
| disnea dolor torácico | 26 | 54.09 | 41.22 | 50.99 |
| disnea dolor torácico taquicardia | 8 | 48.6 | 44.06 | 53.12 |
| gasometría acidosis | 45 | 32.1 | 22.5 | 31.54 |
| sin fiebre disnea | 73 | 63.82 | 48.94 | 58.51 |
| menigitis | 35 | 23.43 | 17.99 | 24.72 |
| tromboembolismo | 41 | 18.58 | 18.86 | 23.93 |
| hiponatremia convulsiones | 6 | 14.01 | 12.23 | 16.27 |
| "edema agudo de pulmón" | 33 | 70.29 | 40.08 | 57.49 |
| ECG síncope | 6 | 9.18 | 7.22 | 14.48 |
| anamnesis dolor abdominal vómitos | 33 | 40.87 | 32.27 | 40.06 |
| qwertyxyz | 0 | 1.29 | 0.29 | 0.4 |

Se verificó la correspondencia de página original y página local en todos los resultados de las 600 consultas. Las pruebas unitarias cubren coincidencia conjunta de grupos positivos, reducción progresiva, equivalencias documentales español/inglés, acentos conservando ñ, palabras cortadas entre líneas, negaciones, frases entre comillas, siglas ambiguas, erratas, términos nuevos, filtros, agrupación por PDF, todas las páginas y varias ocurrencias en una misma página, restauración del índice y ciclo de vida del worker.

Reducción comprobada al añadir grupos: «disnea»: 172 fragmentos en 73 documentos → «disnea dolor torácico»: 41 fragmentos en 26 documentos → «disnea dolor torácico taquicardia»: 11 fragmentos en 8 documentos. Se seleccionan inicialmente hasta 30 PDF por su mejor coincidencia y se devuelven todas las ocurrencias de cada PDF seleccionado, sin límite de tres páginas ni deduplicación que elimine fragmentos distintos de una página. El parámetro limit cuenta PDF (entre 1 y 1.000, por defecto 30) y permite ampliar la lista hasta cubrir la biblioteca. Dentro del PDF se ordenan por página y posición de lectura. Los contadores globales de documentos, páginas y fragmentos incluyen también los PDF que queden fuera del límite.

Cada resultado requiere todos los grupos positivos en el mismo fragmento y su contexto de título. Los sinónimos de un grupo son alternativas; no se incorporan coincidencias parciales cuando falta otro grupo. Dentro del conjunto válido, se prioriza evidencia en el cuerpo, coincidencia literal, títulos y proximidad. La clasificación indica relevancia documental.

La recuperación de escritura se resuelve por término en todo el índice y no depende de que la consulta conjunta quede vacía: se usa coincidencia literal si existe; si no, prefijo para palabras de cuatro o más caracteres; si tampoco existe, una edición para palabras de seis o más caracteres. Se señala con «…» o «≈». Las frases entre comillas siempre exigen secuencia literal y desactivan la recuperación de erratas. Las negaciones son contexto y no exclusiones clínicas. Las páginas con OCR mantienen su procedencia y no se presentan como transcripción revisada.

Resultados numéricos reproducibles: [search-benchmark.json](../tests/search-benchmark.json). Ejecutar desde la carpeta de la aplicación: `node scripts/benchmark-search.mjs`; admite `--corpus ruta/al/corpus.json` para una biblioteca local compatible.
