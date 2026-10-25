# Pruebas de búsqueda local

Medición: 2026-10-25T20:23:22.706Z. Motor ejecutado con v24.16.0; biblioteca personal de 244 documentos y 4074 fragmentos. No se incorpora texto del libro a este informe.

La primera construcción del índice tardó **2811.02 ms**. Después de 10 rondas de calentamiento se midieron 50 rondas de cada consulta (500 búsquedas): mediana **10.23 ms**, percentil 95 **23.65 ms** y máximo **42.23 ms**. Son medidas del motor local; no incluyen descifrado, red, pintado de interfaz ni carga del PDF y no garantizan el mismo resultado en otro dispositivo.

| Consulta | Documentos encontrados | Primera ejecución (ms) | Mediana (ms) | p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| disnea dolor torácico | 83 | 44.39 | 21.16 | 29.03 |
| gasometría acidosis | 113 | 12.58 | 10.63 | 15.64 |
| sin fiebre disnea | 73 | 25.19 | 19.01 | 24.52 |
| menigitis | 35 | 8.75 | 3.84 | 6.9 |
| tromboembolismo | 41 | 3.1 | 3.13 | 5.16 |
| hiponatremia convulsiones | 84 | 10.37 | 8.91 | 17.86 |
| "edema agudo de pulmón" | 33 | 20.14 | 16.46 | 32.17 |
| ECG síncope | 106 | 11.12 | 5.84 | 11.14 |
| anamnesis dolor abdominal vómitos | 131 | 13.63 | 12.25 | 18.67 |
| qwertyxyz | 0 | 0.78 | 0.18 | 0.38 |

Se verificó la correspondencia de página original y página local en todos los resultados de las 500 consultas. Las pruebas unitarias cubren conceptos distintos, equivalencias documentales español/inglés, acentos conservando ñ, palabras cortadas entre líneas, negaciones, frases entre comillas, siglas ambiguas, erratas, términos nuevos, filtros, agrupación y ciclo de vida del worker.

Las equivalencias amplían vocabulario; la clasificación indica relevancia documental. Una errata sólo se aproxima si no hay resultados literales ni por prefijo, admite una edición en palabras de seis o más caracteres y se señala con «≈». Las frases entre comillas siempre exigen secuencia literal. Las páginas con OCR mantienen su procedencia y no se presentan como transcripción revisada.

Resultados numéricos reproducibles: [search-benchmark.json](../tests/search-benchmark.json). Ejecutar desde la carpeta de la aplicación: `node scripts/benchmark-search.mjs`; admite `--corpus ruta/al/corpus.json` para una biblioteca local compatible.
