import { createSearchEngine } from './search-engine.js';

let engine;
let generation = 0;
let newestSearch = 0;

self.addEventListener('message', async ({ data }) => {
  const { type, requestId } = data ?? {};
  try {
    if (type === 'init') {
      const currentGeneration = ++generation;
      engine = undefined;
      newestSearch = 0;
      const created = await createSearchEngine(data.corpus, {
        onProgress: (progress) => {
          if (generation === currentGeneration) self.postMessage({ type: 'progress', requestId, ...progress });
        },
      });
      if (generation !== currentGeneration) return;
      engine = created;
      self.postMessage({ type: 'ready', requestId, documentCount: engine.documentCount, fragmentCount: engine.fragmentCount });
      return;
    }
    if (type === 'search') {
      if (!engine) throw new Error('La biblioteca todavía se está preparando.');
      newestSearch = requestId;
      const currentEngine = engine;
      // Yield once so a queued, newer query can supersede this one before work starts.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (newestSearch !== requestId || currentEngine !== engine) return;
      const result = currentEngine.search(data.query, data.filters);
      if (newestSearch !== requestId || currentEngine !== engine) return;
      self.postMessage({ type: 'results', requestId, ...result });
      return;
    }
    if (type === 'clear') {
      generation += 1;
      newestSearch = 0;
      engine = undefined;
      self.postMessage({ type: 'cleared', requestId });
    }
  } catch {
    self.postMessage({ type: 'error', requestId, message: type === 'init'
      ? 'No se ha podido preparar el índice de la biblioteca.'
      : 'No se ha podido completar la búsqueda. Inténtalo de nuevo.' });
  }
});
