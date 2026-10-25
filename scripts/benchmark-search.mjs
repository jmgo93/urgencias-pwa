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
  'disnea dolor torácico',
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
const percentile = (values, percentileValue) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * percentileValue) - 1];
const round = (value) => Math.round(value * 100) / 100;
const report = {
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  scope: 'Motor documental en Node local. No mide red, desbloqueo, interfaz ni renderizado PDF.',
  corpus: { documents: engine.documentCount, fragments: engine.fragmentCount, indexMs: round(indexMs) },
  methodology: { warmupRounds: 10, measuredRounds: 50, queriesPerRound: queries.length },
  aggregate: {
    p50Ms: percentile(records.flatMap((record) => record.samples), 0.5),
    p95Ms: percentile(records.flatMap((record) => record.samples), 0.95),
    maxMs: Math.max(...records.flatMap((record) => record.samples)),
  },
  queries: records.map(({ samples, ...record }) => ({ ...record, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), maxMs: Math.max(...samples) })),
  checks: ['Referencias originales y locales coherentes en todos los resultados medidos.', 'Negación como contexto.', 'Errata de una edición señalada explícitamente.', 'Término inexistente sin coincidencias.'],
};
await writeFile(resolve(project, 'tests/search-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = report.queries.map((row) => `| ${row.query.replaceAll('|', '\\|')} | ${row.totalDocuments} | ${row.coldMs} | ${row.p50Ms} | ${row.p95Ms} |`).join('\n');
await writeFile(resolve(project, 'docs/PRUEBAS_BUSQUEDA.md'), `# Pruebas de búsqueda local\n\nMedición: ${report.measuredAt}. Motor ejecutado con ${report.runtime}; biblioteca personal de ${engine.documentCount} documentos y ${engine.fragmentCount} fragmentos. No se incorpora texto del libro a este informe.\n\nLa primera construcción del índice tardó **${report.corpus.indexMs} ms**. Después de 10 rondas de calentamiento se midieron 50 rondas de cada consulta (500 búsquedas): mediana **${report.aggregate.p50Ms} ms**, percentil 95 **${report.aggregate.p95Ms} ms** y máximo **${report.aggregate.maxMs} ms**. Son medidas del motor local; no incluyen descifrado, red, pintado de interfaz ni carga del PDF y no garantizan el mismo resultado en otro dispositivo.\n\n| Consulta | Documentos encontrados | Primera ejecución (ms) | Mediana (ms) | p95 (ms) |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\nSe verificó la correspondencia de página original y página local en todos los resultados de las 500 consultas. Las pruebas unitarias cubren conceptos distintos, equivalencias documentales español/inglés, acentos conservando ñ, palabras cortadas entre líneas, negaciones, frases entre comillas, siglas ambiguas, erratas, términos nuevos, filtros, agrupación y ciclo de vida del worker.\n\nLas equivalencias amplían vocabulario; la clasificación indica relevancia documental. Una errata sólo se aproxima si no hay resultados literales ni por prefijo, admite una edición en palabras de seis o más caracteres y se señala con «≈». Las frases entre comillas siempre exigen secuencia literal. Las páginas con OCR mantienen su procedencia y no se presentan como transcripción revisada.\n\nResultados numéricos reproducibles: [search-benchmark.json](../tests/search-benchmark.json). Ejecutar desde la carpeta de la aplicación: \`node scripts/benchmark-search.mjs\`; admite \`--corpus ruta/al/corpus.json\` para una biblioteca local compatible.\n`);
console.log(JSON.stringify({ corpus: report.corpus, aggregate: report.aggregate, queries: report.queries.map((row) => ({ query: row.query, totalDocuments: row.totalDocuments, p95Ms: row.p95Ms })) }, null, 2));
