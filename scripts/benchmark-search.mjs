import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSearchEngine } from '../src/search-engine.js';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supplied = process.argv.indexOf('--corpus');
const corpusPath = supplied === -1 ? resolve(project, '../biblioteca-local/preparado/corpus.json') : resolve(process.argv[supplied + 1]);
const corpus = JSON.parse(await readFile(corpusPath, 'utf8'));
const began = performance.now();
const engine = await createSearchEngine(corpus);
const indexMs = performance.now() - began;
const queries = [
  'disnea',
  'disnea dolor torácico',
  'disnea dolor torácico taquicardia',
  'gasometría acidosis',
  'sin fiebre disnea',
  'menigitis',
  'tromboembolismo',
  'hiponatremia convulsiones',
  '"edema agudo de pulmón"',
  'ECG síncope',
  'anamnesis dolor abdominal vómitos',
  'qwertyxyz',
];
const records = queries.map((query) => ({ query, coldMs: engine.search(query).durationMs, samples: [] }));
for (let round = 0; round < 10; round += 1) for (const query of queries) engine.search(query);
const documents = new Map(corpus.documents.map((document) => [document.id, document]));
for (let round = 0; round < 50; round += 1) {
  for (const row of records) {
    const result = engine.search(row.query);
    row.samples.push(result.durationMs);
    row.totalFragments = result.total;
    row.totalDocuments = result.totalDocuments;
    row.returnedResults = result.results.length;
    row.topOriginalPages = result.results.slice(0, 3).map((item) => item.originalPage);
    for (const item of result.results) {
      const document = documents.get(item.documentId);
      assert.ok(document);
      assert.ok(item.localPage >= 1 && item.localPage <= document.pageCount);
      assert.equal(item.originalPage, document.originalStart + item.localPage - 1);
    }
  }
}
assert.ok(engine.search('menigitis').results.some((item) => item.matchedTerms.some((term) => term.includes('≈ meningitis'))));
assert.ok(engine.search('gasometría acidosis').results.length);
assert.ok(engine.search('tromboembolismo').results.length);
assert.ok(engine.search('sin fiebre disnea').interpretation.negated.includes('Fiebre'));
assert.equal(engine.search('qwertyxyz').results.length, 0);
const narrowingQueries = ['disnea', 'disnea dolor torácico', 'disnea dolor torácico taquicardia'];
const narrowing = narrowingQueries.map((query) => ({ query, result: engine.search(query) }));
for (let index = 1; index < narrowing.length; index += 1) {
  assert.ok(narrowing[index].result.total <= narrowing[index - 1].result.total);
  assert.ok(narrowing[index].result.totalDocuments <= narrowing[index - 1].result.totalDocuments);
}
assert.ok(records.every((record) => engine.search(record.query).results.every((result) => !result.missingTerms.length)));
const percentile = (values, percentileValue) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * percentileValue) - 1];
const round = (value) => Math.round(value * 100) / 100;
const report = {
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  scope: 'Motor documental en Node local. No mide red, desbloqueo, interfaz ni renderizado PDF.',
  corpus: { documents: engine.documentCount, fragments: engine.fragmentCount, indexMs: round(indexMs) },
  methodology: { warmupRounds: 10, measuredRounds: 50, queriesPerRound: queries.length },
  narrowing: narrowing.map(({ query, result }) => ({ query, totalFragments: result.total, totalDocuments: result.totalDocuments })),
  aggregate: {
    p50Ms: percentile(records.flatMap((record) => record.samples), 0.5),
    p95Ms: percentile(records.flatMap((record) => record.samples), 0.95),
    maxMs: Math.max(...records.flatMap((record) => record.samples)),
  },
  queries: records.map(({ samples, ...record }) => ({ ...record, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), maxMs: Math.max(...samples) })),
  checks: ['Referencias originales y locales coherentes en todos los resultados medidos.', 'Todos los grupos positivos requeridos; ninguna coincidencia parcial.', 'Reducción progresiva de fragmentos y documentos al añadir grupos.', 'Negación como contexto.', 'Errata de una edición señalada explícitamente.', 'Término inexistente sin coincidencias.'],
};
await writeFile(resolve(project, 'tests/search-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = report.queries.map((row) => `| ${row.query.replaceAll('|', '\\|')} | ${row.totalDocuments} | ${row.coldMs} | ${row.p50Ms} | ${row.p95Ms} |`).join('\n');
const measuredSearches = report.methodology.measuredRounds * queries.length;
await writeFile(resolve(project, 'docs/PRUEBAS_BUSQUEDA.md'), [
  '# Pruebas de búsqueda local',
  `Medición: ${report.measuredAt}. Motor ejecutado con ${report.runtime}; biblioteca personal de ${engine.documentCount} documentos y ${engine.fragmentCount} fragmentos. No se incorpora texto del libro a este informe.`,
  `La primera construcción del índice tardó **${report.corpus.indexMs} ms**. Después de 10 rondas de calentamiento se midieron 50 rondas de cada consulta (${measuredSearches} búsquedas): mediana **${report.aggregate.p50Ms} ms**, percentil 95 **${report.aggregate.p95Ms} ms** y máximo **${report.aggregate.maxMs} ms**. Son medidas del motor local; no incluyen descifrado, red, pintado de interfaz ni carga del PDF y no garantizan el mismo resultado en otro dispositivo.`,
  `| Consulta | Documentos encontrados | Primera ejecución (ms) | Mediana (ms) | p95 (ms) |\n| --- | ---: | ---: | ---: | ---: |\n${rows}`,
  `Se verificó la correspondencia de página original y página local en todos los resultados de las ${measuredSearches} consultas. Las pruebas unitarias cubren coincidencia conjunta de grupos positivos, reducción progresiva, equivalencias documentales español/inglés, acentos conservando ñ, palabras cortadas entre líneas, negaciones, frases entre comillas, siglas ambiguas, erratas, términos nuevos, filtros, agrupación, restauración del índice y ciclo de vida del worker.`,
  `Reducción comprobada al añadir grupos: ${report.narrowing.map((row) => `«${row.query}»: ${row.totalFragments} fragmentos en ${row.totalDocuments} documentos`).join(' → ')}. Los destinos mostrados tienen un límite de 30 y de tres páginas por documento; esos límites pueden cambiar qué destinos aparecen aunque el conjunto completo se reduzca.`,
  'Cada resultado requiere todos los grupos positivos en el mismo fragmento y su contexto de título. Los sinónimos de un grupo son alternativas; no se incorporan coincidencias parciales cuando falta otro grupo. Dentro del conjunto válido, se prioriza evidencia en el cuerpo, coincidencia literal, títulos y proximidad. La clasificación indica relevancia documental.',
  'La recuperación de escritura se resuelve por término en todo el índice y no depende de que la consulta conjunta quede vacía: se usa coincidencia literal si existe; si no, prefijo para palabras de cuatro o más caracteres; si tampoco existe, una edición para palabras de seis o más caracteres. Se señala con «…» o «≈». Las frases entre comillas siempre exigen secuencia literal y desactivan la recuperación de erratas. Las negaciones son contexto y no exclusiones clínicas. Las páginas con OCR mantienen su procedencia y no se presentan como transcripción revisada.',
  'Resultados numéricos reproducibles: [search-benchmark.json](../tests/search-benchmark.json). Ejecutar desde la carpeta de la aplicación: `node scripts/benchmark-search.mjs`; admite `--corpus ruta/al/corpus.json` para una biblioteca local compatible.',
].join('\n\n') + '\n');
console.log(JSON.stringify({ corpus: report.corpus, aggregate: report.aggregate, queries: report.queries.map((row) => ({ query: row.query, totalDocuments: row.totalDocuments, p95Ms: row.p95Ms })) }, null, 2));
