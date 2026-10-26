import assert from 'node:assert/strict';
import test from 'node:test';
import { Worker } from 'node:worker_threads';
import { createSearchEngine } from '../src/search-engine.js';

const corpus = {
  schemaVersion: 1,
  sections: [{ id: 'a', title: 'Sección A' }, { id: 'b', title: 'Sección B' }],
  documents: [
    { id: 'doc-a', title: 'Dolor torácico', sectionId: 'a', kind: 'chapter', originalStart: 10, pageCount: 3 },
    { id: 'doc-b', title: 'Caso de disnea', sectionId: 'b', kind: 'case', originalStart: 20, pageCount: 2 },
  ],
  fragments: [
    { id: 'one', documentId: 'doc-a', sectionId: 'a', localPage: 1, originalPage: 10, text: 'Disnea y dolor torácico. Paciente sin fiebre.' },
    { id: 'two', documentId: 'doc-a', sectionId: 'a', localPage: 1, originalPage: 10, text: 'Disnea y dolor torácico. Gasometría arterial.' },
    { id: 'three', documentId: 'doc-a', sectionId: 'a', localPage: 2, originalPage: 11, text: 'Meningitis e hiponatremia. La niña presenta síncope.' },
    { id: 'four', documentId: 'doc-b', sectionId: 'b', localPage: 1, originalPage: 20, text: 'Insuficiencia cardíaca y edema pulmonar. Electrocardiograma.' },
    { id: 'five', documentId: 'doc-b', sectionId: 'b', localPage: 2, originalPage: 21, text: 'Disnea con fiebre. Dolor torácico.' },
    { id: 'orphan', documentId: 'absent', text: 'Un fragmento sin documento no se incorpora.' },
  ],
};
const comparable = ({ durationMs, ...result }) => result;
const serialized = (value) => JSON.parse(JSON.stringify(value));

test('restoring a serialized prepared engine skips indexing and preserves retrieval and page grouping', async () => {
  const fresh = await createSearchEngine(corpus);
  const progress = [];
  const restored = await createSearchEngine(corpus, {
    preparedSearch: serialized(fresh.exportPreparedSearch()), onProgress: (row) => progress.push(row),
  });
  assert.equal(fresh.restored, false);
  assert.equal(restored.restored, true);
  assert.equal(restored.fragmentCount, 5);
  assert.deepEqual(progress, [], 'A valid prepared index must not rebuild any text batches.');
  const grouped = restored.search('dolor torácico', { limit: 1 });
  assert.deepEqual(grouped.results.map((row) => row.id), ['one', 'two', 'three']);
  assert.equal(grouped.total, 4);
  assert.equal(grouped.totalDocuments, 2);
  assert.equal(grouped.totalPages, 3);
  assert.equal(new Set(grouped.results.map((row) => row.documentId)).size, 1);
  assert.deepEqual(comparable(grouped), comparable(fresh.search('dolor torácico', { limit: 1 })));
  for (const query of ['disnea dolor torácico', 'sin fiebre disnea', 'blood gas ECG', 'menigitis',
    'hiponatr', 'menigitis hiponatr', 'hiponatr síncope', 'disnea hiponatr',
    'disnea dolor torácico qwertyxyz', 'niña', 'nina', 'PCR', '"disnea y dolor torácico"', 'qwertyxyz', '']) {
    for (const filters of [{}, { sectionId: 'a', limit: 1 }, { kind: 'case', sectionId: 'b' }]) {
      assert.deepEqual(comparable(restored.search(query, filters)), comparable(fresh.search(query, filters)));
    }
  }
});

test('outdated, mismatched and malformed prepared indices rebuild safely from the current corpus', async () => {
  const fresh = await createSearchEngine(corpus);
  const valid = serialized(fresh.exportPreparedSearch());
  const wrongRecords = serialized(valid);
  wrongRecords.normalizedFragments[0][0] = 'wrong-id';
  const wrongText = serialized(valid);
  wrongText.normalizedFragments[0][2] = null;
  const wrongIndex = serialized(valid);
  wrongIndex.index = {};
  const incomplete = serialized(valid);
  incomplete.normalizedFragments.pop();
  for (const preparedSearch of [null, {}, { ...valid, schemaVersion: 0 }, { ...valid, engineVersion: 'old' },
    { ...valid, corpusFingerprint: '0'.repeat(64) }, wrongRecords, wrongText, wrongIndex, incomplete]) {
    const progress = [];
    const rebuilt = await createSearchEngine(corpus, { preparedSearch, onProgress: (row) => progress.push(row) });
    assert.equal(rebuilt.restored, false);
    assert.ok(progress.length);
    assert.deepEqual(comparable(rebuilt.search('disnea')), comparable(fresh.search('disnea')));
  }
  for (const changed of [
    { ...corpus, sections: [{ id: 'a', title: 'Sección actualizada' }] },
    { ...corpus, documents: corpus.documents.map((row) => ({ ...row, title: `${row.title} revisado` })) },
    { ...corpus, fragments: corpus.fragments.map((row) => ({ ...row, text: `${row.text} añadido` })) },
  ]) {
    const rebuilt = await createSearchEngine(changed, { preparedSearch: valid });
    assert.equal(rebuilt.restored, false);
  }
});

test('worker emits a reusable prepared index once and restores it on subsequent initialization', async (context) => {
  const workerURL = new URL('../src/search-worker.js', import.meta.url).href;
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    let listener;
    const pending = [];
    globalThis.self = {
      addEventListener(type, callback) { listener = callback; pending.splice(0).forEach(data => listener({ data })); },
      postMessage(data) { parentPort.postMessage(data); }
    };
    parentPort.on('message', data => listener ? listener({ data }) : pending.push(data));
    import(${JSON.stringify(workerURL)}).catch(error => { throw error; });
  `, { eval: true });
  context.after(() => worker.terminate());
  const request = (data, type) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { worker.off('message', receive); reject(new Error('Worker timeout')); }, 5000);
    const receive = (message) => {
      if (message.requestId !== data.requestId || ![type, 'error'].includes(message.type)) return;
      clearTimeout(timer); worker.off('message', receive);
      if (message.type === 'error') reject(new Error(message.message)); else resolve(message);
    };
    worker.on('message', receive);
    worker.postMessage(data);
  });
  const built = await request({ type: 'init', requestId: 1, corpus }, 'ready');
  assert.equal(built.restored, false);
  assert.equal(built.preparedSearch.schemaVersion, 1);
  assert.ok(Number.isFinite(built.durationMs));
  const before = await request({ type: 'search', requestId: 2, query: 'disnea sin fiebre' }, 'results');
  await request({ type: 'clear', requestId: 3 }, 'cleared');
  const restored = await request({ type: 'init', requestId: 4, corpus, preparedSearch: built.preparedSearch }, 'ready');
  assert.equal(restored.restored, true);
  assert.equal(restored.preparedSearch, undefined, 'Do not clone a large prepared payload again on a cache hit.');
  const after = await request({ type: 'search', requestId: 5, query: 'disnea sin fiebre' }, 'results');
  assert.deepEqual(after.results, before.results);
});
