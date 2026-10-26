import assert from 'node:assert/strict';
import test from 'node:test';
import { Worker } from 'node:worker_threads';
import { createSearchEngine, normalize } from '../src/search-engine.js';

const corpus = {
  sections: [{ id: 'cardio', title: 'Urgencias cardiovasculares' }, { id: 'resp', title: 'Urgencias respiratorias' }],
  documents: [
    { id: 'chest', title: 'Dolor torácico', kind: 'chapter', sectionId: 'cardio', originalStart: 100, pageCount: 5, bytes: 1000 },
    { id: 'breath', title: 'Disnea', kind: 'chapter', sectionId: 'resp', originalStart: 200, pageCount: 3, bytes: 2000 },
    { id: 'case', title: 'Caso clínico', kind: 'case', sectionId: 'resp', originalStart: 300, pageCount: 2, bytes: 500 },
  ],
  fragments: [
    { id: 'both', documentId: 'chest', sectionId: 'cardio', title: '', text: 'Dolor torácico y disnea. Anamnesis y exploración. Paciente sin fiebre.', originalPage: 101, localPage: 2, source: 'native' },
    { id: 'chest-only', documentId: 'chest', sectionId: 'cardio', title: '', text: 'Dolor torácico, dolor torácico, dolor torácico. Evaluación del dolor torácico.', originalPage: 100, localPage: 1, source: 'native' },
    { id: 'with-fever', documentId: 'breath', sectionId: 'resp', title: '', text: 'Dolor torácico y disnea con fiebre.', originalPage: 200, localPage: 1, source: 'ocr' },
    { id: 'english-map', documentId: 'breath', sectionId: 'resp', title: '', text: 'Insuficiencia cardíaca y edema pulmonar. Gasometría arterial y electrocardiograma.', originalPage: 201, localPage: 2, source: 'native' },
    { id: 'unknown', documentId: 'case', sectionId: 'resp', title: '', text: 'Hiponatremia. La niña presenta síncope. PCR elevada. Meningitis.', originalPage: 300, localPage: 1, source: 'native' },
    ...Array.from({ length: 4 }, (_, index) => ({ id: `repeat-${index}`, documentId: 'case', sectionId: 'resp', title: '', text: 'Disnea y dolor torácico en el caso.', originalPage: 300 + index, localPage: 1 + index, source: 'native' })),
  ],
};

const engine = await createSearchEngine(corpus);

test('normalization removes accents but preserves ñ, decimal numbers and literal terms', () => {
  assert.equal(normalize('NIÑA, SÍNCOPE'), 'niña, sincope');
  assert.equal(engine.search('sincope').results[0].id, 'unknown');
  assert.equal(engine.search('hiponatremia').results[0].id, 'unknown');
  assert.equal(engine.search('nina').results.length, 0);
  assert.equal(normalize('dolor torá-\ncico'), 'dolor toracico');
  assert.equal(normalize('res -\nponsabilidad'), 'responsabilidad');
  assert.equal(normalize('hipo\u00ADnatremia'), 'hiponatremia');
  assert.equal(normalize('2,5 mg/dl'), '2,5 mg/dl');
});

test('all distinct positive query concepts are required instead of returning partial matches', () => {
  const result = engine.search('dolor torácico y dificultad respiratoria');
  assert.equal(result.results[0].id, 'both');
  assert.deepEqual(result.results[0].matchedTerms, ['Dolor torácico', 'Disnea']);
  assert.deepEqual(result.results[0].missingTerms, []);
  assert.ok(!result.results.some((item) => item.id === 'chest-only'));
  assert.ok(result.results.every((item) => item.missingTerms.length === 0));
});

const separatePages = (texts, titles = []) => ({
  sections: [],
  documents: texts.map((_, index) => ({ id: `doc-${index}`, title: titles[index] ?? 'Referencia', kind: 'chapter', originalStart: index + 1, pageCount: 1 })),
  fragments: texts.map((text, index) => ({ id: `fragment-${index}`, documentId: `doc-${index}`, text, originalPage: index + 1, localPage: 1, source: 'native' })),
});

test('adding positive groups successively narrows the complete result set without a partial fallback', async () => {
  const narrowing = await createSearchEngine(separatePages([
    'Disnea, dolor torácico e hiponatremia.', 'Disnea y dolor torácico.',
    'Disnea e hiponatremia.', 'Dolor torácico.', 'Hiponatremia.',
  ]));
  const queries = ['disnea', 'disnea dolor torácico', 'disnea dolor torácico hiponatremia'];
  const sets = queries.map((query) => narrowing.search(query));
  assert.deepEqual(sets.map((result) => result.total), [3, 2, 1]);
  assert.deepEqual(sets.map((result) => result.totalDocuments), [3, 2, 1]);
  for (let index = 1; index < sets.length; index += 1) {
    const previous = new Set(sets[index - 1].results.map((result) => result.id));
    assert.ok(sets[index].results.every((result) => previous.has(result.id)));
  }
  assert.deepEqual(narrowing.search('disnea dolor torácico qwertyxyz').results, []);
  const filtered = narrowing.search('disnea dolor torácico', { kind: 'case' });
  assert.equal(filtered.total, 0);
});

test('equivalent aliases form one group and require complete phrases in the source', async () => {
  const aliases = await createSearchEngine(separatePages([
    'Dificultad respiratoria y dolor precordial.', 'Dificultad para valorar la respiratoria.', 'Disnea.',
  ]));
  const single = aliases.search('disnea');
  const duplicate = aliases.search('disnea dificultad respiratoria');
  assert.deepEqual(duplicate.results.map((row) => row.id), single.results.map((row) => row.id));
  assert.ok(!single.results.some((row) => row.id === 'fragment-1'));
  assert.deepEqual(aliases.search('disnea dolor torácico').results.map((row) => row.id), ['fragment-0']);
});

test('prefixes and spelling recovery work per group beside another exact concept', async () => {
  const recovered = await createSearchEngine(separatePages([
    'Disnea, meningitis e hiponatremia.', 'Disnea.', 'Meningitis e hiponatremia.',
  ]));
  for (const term of ['hiponatr', 'menigitis']) {
    const broad = recovered.search(term);
    const narrow = recovered.search(`${term} disnea`);
    assert.equal(broad.total, 2);
    assert.equal(narrow.total, 1);
    assert.equal(narrow.results[0].id, 'fragment-0');
    assert.ok(narrow.results[0].matchedTerms.some((match) => match.includes(term === 'hiponatr' ? '…' : '≈ meningitis')));
    assert.equal(recovered.search(`${term} disnea qwertyxyz`).total, 0);
  }
  assert.equal(recovered.search('"menigitis" disnea').total, 0);
});

test('adding a group never enables prefix or fuzzy broadening of an existing literal term', async () => {
  const literal = await createSearchEngine(separatePages([
    'Disnea, meningitis e hiponatremia.', 'Hiponatr menigitis.',
  ]));
  for (const term of ['hiponatr', 'menigitis']) {
    assert.deepEqual(literal.search(term).results.map((row) => row.id), ['fragment-1']);
    assert.deepEqual(literal.search(`${term} disnea`).results, []);
  }
});

test('conjunctive matches keep chapter title context and rank body evidence above title-only context', async () => {
  const context = await createSearchEngine(separatePages([
    'Disnea en el estudio inicial.', 'Disnea y dolor torácico.',
  ], ['Dolor torácico', 'Referencia']));
  const result = context.search('disnea dolor torácico');
  assert.equal(result.total, 2);
  assert.deepEqual(result.results.map((row) => row.id), ['fragment-1', 'fragment-0']);
});

test('literal wording receives ranking credit even when an earlier catalog alias also appears', async () => {
  const literal = await createSearchEngine(separatePages([
    'Disnea.', 'Disnea y dificultad respiratoria.',
  ]));
  const result = literal.search('dificultad respiratoria');
  assert.equal(result.results[0].id, 'fragment-1');
  assert.ok(result.results[0].score - result.results[1].score >= 30);
});

test('curated English aliases recover the Spanish source without translating evidence', () => {
  const result = engine.search('heart failure blood gas ECG');
  assert.equal(result.results[0].id, 'english-map');
  assert.ok(result.results[0].excerpt.includes('Insuficiencia cardíaca'));
  assert.equal(result.interpretation.concepts.length, 3);
});

test('negated symptoms are context and never receive positive symptom credit', () => {
  const result = engine.search('dolor torácico sin fiebre');
  assert.equal(result.results[0].id, 'both');
  assert.deepEqual(result.interpretation.negated, ['Fiebre']);
  assert.ok(result.results[0].matchedTerms.includes('Sin fiebre'));
  const feverResult = result.results.find((item) => item.id === 'with-fever');
  assert.ok(feverResult);
  assert.ok(!feverResult.matchedTerms.includes('Fiebre'));
  assert.ok(!feverResult.missingTerms.includes('Fiebre'));
  const onlyNegation = engine.search('sin fiebre');
  assert.deepEqual(onlyNegation.results.map((item) => item.id), ['both']);
  const keywords = engine.search('sin fiebre disnea');
  assert.deepEqual(keywords.interpretation.negated, ['Fiebre']);
  assert.ok(keywords.results[0].matchedTerms.includes('Disnea'));
  assert.deepEqual(engine.search('sin fiebre ni disnea').interpretation.negated, ['Fiebre', 'Disnea']);
  assert.deepEqual(engine.search('sin datos de fiebre con disnea').interpretation.negated, ['Fiebre']);
});

test('quoted phrases require the complete literal sequence, not synonyms or scattered words', () => {
  const exact = engine.search('"dolor torácico y disnea"');
  assert.ok(exact.results.length > 0);
  assert.ok(!exact.results.some((item) => item.id === 'chest-only'));
  assert.equal(engine.search('"dolor torácico disnea"').results.length, 0);
  assert.equal(engine.search('"heart failure"').results.length, 0);
});

test('ambiguous acronyms remain literal and visibly ask for precision', () => {
  const result = engine.search('PCR');
  assert.equal(result.results[0].id, 'unknown');
  assert.equal(result.interpretation.concepts.length, 0);
  assert.equal(result.interpretation.ambiguous.length, 1);
});

test('filters, grouping and page references are stable', () => {
  const result = engine.search('disnea', { sectionId: 'resp', kind: 'case', limit: 20 });
  assert.equal(result.results.length, 3);
  assert.equal(result.total, 4);
  assert.equal(result.totalDocuments, 1);
  assert.ok(result.results.every((item) => item.kind === 'case' && item.sectionId === 'resp'));
  assert.ok(result.results.every((item) => item.relatedCount === 3));
  const mapped = engine.search('hiponatremia').results[0];
  assert.equal(mapped.originalPage, 300);
  assert.equal(mapped.localPage, 1);
  assert.equal(mapped.anchorPrecision, 'page_only');
});

test('empty, unknown and stopword-only inputs are safe; prefixes are a fallback', () => {
  for (const query of ['', '   ', 'quiero buscar información', 'qwertyxyz']) {
    assert.deepEqual(engine.search(query).results, []);
  }
  assert.equal(engine.search('hiponatr').results[0].id, 'unknown');
  assert.deepEqual(engine.search('hiponatr').results[0].matchedTerms, ['hiponatr…']);
  assert.deepEqual(engine.search('menigitis').results[0].matchedTerms, ['menigitis ≈ meningitis']);
  assert.equal(engine.search('"menigitis"').results.length, 0);
});

test('initialization reports progress and rejects malformed libraries', async () => {
  const progress = [];
  const indexed = await createSearchEngine(corpus, { onProgress: (value) => progress.push(value) });
  assert.equal(indexed.documentCount, 3);
  assert.equal(indexed.fragmentCount, corpus.fragments.length);
  assert.equal(progress.at(-1).completed, corpus.fragments.length);
  await assert.rejects(createSearchEngine({ documents: [] }), /índice/u);
});

test('PDF line-end hyphenation is repaired for retrieval while source evidence stays intact', async () => {
  const text = 'Dolor torá-\ncico con hipona-\ntremia.';
  const splitEngine = await createSearchEngine({
    sections: corpus.sections,
    documents: [corpus.documents[0]],
    fragments: [{ ...corpus.fragments[0], id: 'split', title: '', text }],
  });
  const result = splitEngine.search('hiponatremia');
  assert.equal(result.results[0].id, 'split');
  assert.ok(result.results[0].excerpt.includes('hipona- tremia'));
  assert.deepEqual(result.results[0].matchedTerms, ['hiponatremia']);
});

test('overlapping fragments on one PDF page produce a single destination', async () => {
  const duplicated = await createSearchEngine({
    ...corpus,
    fragments: [corpus.fragments[0], { ...corpus.fragments[0], id: 'overlap' }],
  });
  const result = duplicated.search('disnea');
  assert.equal(result.total, 2);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].relatedCount, 1);
});

test('generic thromboembolism does not acquire a pulmonary qualifier', async () => {
  const generic = await createSearchEngine({
    ...corpus,
    fragments: [{ ...corpus.fragments[0], text: 'Tromboembolia venosa.', title: '' }],
  });
  const result = generic.search('tromboembolismo');
  assert.equal(result.results.length, 1);
  assert.equal(result.interpretation.concepts[0].id, 'thromboembolism');
  assert.deepEqual(result.results[0].matchedTerms, ['Tromboembolia']);
});

test('worker echoes request IDs, discards superseded initialization and clears its library', async (context) => {
  const workerUrl = new URL('../src/search-worker.js', import.meta.url).href;
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    let listener;
    const pending = [];
    globalThis.self = {
      addEventListener(type, callback) {
        listener = callback;
        pending.splice(0).forEach(data => listener({ data }));
      },
      postMessage(data) { parentPort.postMessage(data); }
    };
    parentPort.on('message', data => listener ? listener({ data }) : pending.push(data));
    import(${JSON.stringify(workerUrl)}).catch(error => { throw error; });
  `, { eval: true });
  context.after(() => worker.terminate());
  const received = [];
  worker.on('message', (message) => received.push(message));
  const until = (predicate) => new Promise((resolve, reject) => {
    const existing = received.find(predicate);
    if (existing) { resolve(existing); return; }
    const timer = setTimeout(() => { worker.off('message', onMessage); reject(new Error('El worker no respondió.')); }, 5000);
    const onMessage = (message) => {
      if (!predicate(message)) return;
      clearTimeout(timer);
      worker.off('message', onMessage);
      resolve(message);
    };
    worker.on('message', onMessage);
  });
  const superseded = {
    ...corpus,
    fragments: Array.from({ length: 1000 }, (_, index) => ({ ...corpus.fragments[0], id: `old-${index}` })),
  };
  worker.postMessage({ type: 'init', requestId: 1, corpus: superseded });
  worker.postMessage({ type: 'init', requestId: 2, corpus });
  const ready = await until((message) => message.type === 'ready' && message.requestId === 2);
  assert.equal(ready.fragmentCount, corpus.fragments.length);
  worker.postMessage({ type: 'search', requestId: 3, query: 'hiponatremia' });
  const result = await until((message) => message.type === 'results' && message.requestId === 3);
  assert.equal(result.results[0].id, 'unknown');
  assert.ok(!received.some((message) => message.type === 'ready' && message.requestId === 1));
  worker.postMessage({ type: 'clear', requestId: 4 });
  await until((message) => message.type === 'cleared' && message.requestId === 4);
  worker.postMessage({ type: 'search', requestId: 5, query: 'disnea' });
  const error = await until((message) => message.type === 'error' && message.requestId === 5);
  assert.match(error.message, /búsqueda/u);
  assert.ok(!JSON.stringify(error).includes('hiponatremia'));
});
