# Pruebas de búsqueda local

Medición: 2026-10-26T15:45:32.862Z. Motor ejecutado con v24.16.0; biblioteca personal de 244 documentos y 4074 fragmentos. No se incorpora texto del libro a este informe.

La primera construcción del índice tardó **5298.23 ms**. Después de 10 rondas de calentamiento se midieron 50 rondas de cada consulta (600 búsquedas): mediana **17.47 ms**, percentil 95 **42.71 ms** y máximo **94.22 ms**. Son medidas del motor local; no incluyen descifrado, red, pintado de interfaz ni carga del PDF y no garantizan el mismo resultado en otro dispositivo.

| Consulta | Documentos encontrados | Primera ejecución (ms) | Mediana (ms) | p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| disnea | 73 | 150.77 | 16.07 | 32.78 |
| disnea dolor torácico | 26 | 40.33 | 34.39 | 48.42 |
| disnea dolor torácico taquicardia | 8 | 40.24 | 39.37 | 50.53 |
| gasometría acidosis | 45 | 21.46 | 17.61 | 32.36 |
| sin fiebre disnea | 73 | 48.15 | 31.33 | 55.23 |
| menigitis | 35 | 21.53 | 6.18 | 13.01 |
| tromboembolismo | 41 | 13.44 | 5.44 | 13.27 |
| hiponatremia convulsiones | 6 | 19.95 | 10.7 | 15.68 |
| "edema agudo de pulmón" | 33 | 42.34 | 29.54 | 48.86 |
| ECG síncope | 6 | 7.72 | 6.6 | 9.83 |
| anamnesis dolor abdominal vómitos | 33 | 21.68 | 19.3 | 29.6 |
| qwertyxyz | 0 | 1.23 | 0.27 | 0.49 |

Se verificó la correspondencia de página original y página local en todos los resultados de las 600 consultas. Las pruebas unitarias cubren coincidencia conjunta de grupos positivos, reducción progresiva, equivalencias documentales español/inglés, acentos conservando ñ, palabras cortadas entre líneas, negaciones, frases entre comillas, siglas ambiguas, erratas, términos nuevos, filtros, agrupación, restauración del índice y ciclo de vida del worker.

Reducción comprobada al añadir grupos: «disnea»: 172 fragmentos en 73 documentos → «disnea dolor torácico»: 41 fragmentos en 26 documentos → «disnea dolor torácico taquicardia»: 11 fragmentos en 8 documentos. Los destinos mostrados tienen un límite de 30 y de tres páginas por documento; esos límites pueden cambiar qué destinos aparecen aunque el conjunto completo se reduzca.

Cada resultado requiere todos los grupos positivos en el mismo fragmento y su contexto de título. Los sinónimos de un grupo son alternativas; no se incorporan coincidencias parciales cuando falta otro grupo. Dentro del conjunto válido, se prioriza evidencia en el cuerpo, coincidencia literal, títulos y proximidad. La clasificación indica relevancia documental.

La recuperación de escritura se resuelve por término en todo el índice y no depende de que la consulta conjunta quede vacía: se usa coincidencia literal si existe; si no, prefijo para palabras de cuatro o más caracteres; si tampoco existe, una edición para palabras de seis o más caracteres. Se señala con «…» o «≈». Las frases entre comillas siempre exigen secuencia literal y desactivan la recuperación de erratas. Las negaciones son contexto y no exclusiones clínicas. Las páginas con OCR mantienen su procedencia y no se presentan como transcripción revisada.

Resultados numéricos reproducibles: [search-benchmark.json](../tests/search-benchmark.json). Ejecutar desde la carpeta de la aplicación: `node scripts/benchmark-search.mjs`; admite `--corpus ruta/al/corpus.json` para una biblioteca local compatible.
