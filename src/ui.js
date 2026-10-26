const paths = {
  search: '<circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 3H20v19H6.5A2.5 2.5 0 0 1 4 19.5v-14A2.5 2.5 0 0 1 6.5 3Z"/><path d="M8 7h8M8 11h6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 15v2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
  page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
  zoomIn: '<circle cx="10" cy="10" r="7"/><path d="m21 21-6-6M7 10h6M10 7v6"/>',
  zoomOut: '<circle cx="10" cy="10" r="7"/><path d="m21 21-6-6M7 10h6"/>',
  external: '<path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M15 3h6v6m0-6L10 14"/>',
  text: '<path d="M4 5h16M4 10h16M4 15h10M4 20h12"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.page}</svg>`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function firstValue(...values) { return values.find((value) => value !== undefined && value !== null && value !== ''); }

export function renderResults(results = [], sections = [], { compact = false } = {}) {
  return results.map((result, index) => {
    const fragment = result.fragment || result;
    const span = fragment.spans?.[0] || {};
    const page = firstValue(result.originalPage, fragment.originalPage, span.originalPage, result.page);
    const localPage = firstValue(result.localPage, fragment.localPage, span.localPage);
    const section = Array.isArray(sections) ? sections.find((entry) => String(entry.id) === String(result.sectionId ?? fragment.sectionId)) : sections?.[result.sectionId ?? fragment.sectionId];
    const title = firstValue(result.title, result.chapterTitle, fragment.title, fragment.chapterTitle, 'Página del libro');
    const sectionTitle = firstValue(result.sectionTitle, fragment.sectionTitle, section?.title, section?.titulo, 'Biblioteca de urgencias');
    const snippet = String(firstValue(result.snippet, result.excerpt, fragment.snippet, fragment.text, '')).replace(/\s+/g, ' ').trim();
    const terms = result.matchedTerms || result.matches || fragment.matchedTerms || [];
    const matchedTerms = [...new Set(terms.map((term) => typeof term === 'string' ? term : term.term || term.text || term.label).filter(Boolean))].slice(0, 7);
    const missingTerms = Array.isArray(result.missingTerms) ? result.missingTerms.map((term) => typeof term === 'string' ? term : term.label || term.term || term.text).filter(Boolean) : [];
    const subsectionTitle = String(firstValue(result.subsectionTitle, fragment.subsectionTitle) ?? '').trim();
    const showSubsection = subsectionTitle && subsectionTitle.length <= 180 && subsectionTitle.toLocaleLowerCase('es') !== String(title).toLocaleLowerCase('es');
    const isOcr = result.isOcr || result.ocr || result.source === 'ocr' || fragment.source === 'ocr' || span.source === 'ocr';
    const id = firstValue(result.id, fragment.id, index);
    const precision = firstValue(result.anchorPrecision, fragment.anchorPrecision, 'page_only');
    const sourceLabel = precision === 'verified_region' ? 'Zona verificada' : precision === 'text_match' ? 'Texto localizado' : 'Página original';
    const meta = [page ? `Pág. ${page} del libro` : '', localPage ? `pág. ${localPage} del PDF` : ''].filter(Boolean).join(' · ');
    const bytes = Number(result.bytes ?? fragment.bytes);
    const pageCount = Number(result.pageCount ?? fragment.pageCount);
    const fileMeta = [Number.isFinite(bytes) && bytes > 0 ? `${(bytes / 1048576).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MiB` : '', Number.isFinite(pageCount) && pageCount > 0 ? `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}` : ''].filter(Boolean).join(' · ');
    const eyebrow = `<div class="result-eyebrow">${icon('layers')}<span>${escapeHtml(sectionTitle)}</span>${isOcr ? '<span class="badge badge-warning">OCR pendiente de revisión</span>' : ''}</div>`;
    const content = `${showSubsection ? `<p class="subsection-reference">Referencia de texto: ${escapeHtml(subsectionTitle)}</p>` : ''}
        <p class="result-snippet">${escapeHtml(snippet.length > 320 ? `${snippet.slice(0, 317)}…` : snippet)}</p>
        ${matchedTerms.length ? `<div class="match-list" aria-label="Términos encontrados">${matchedTerms.map((term) => `<span class="match-chip">${icon('check')}${escapeHtml(term)}</span>`).join('')}</div>` : ''}
        ${missingTerms.length ? `<p class="missing-terms">Sin coincidencia en este fragmento: ${escapeHtml(missingTerms.join(', '))}.</p>` : ''}
        <div class="result-bottom"><div class="result-location">${icon('page')}<span>${escapeHtml(meta || sourceLabel)}</span>${fileMeta ? `<span class="file-meta">${escapeHtml(fileMeta)}</span>` : ''}<span class="source-edition">Libro · 2018</span></div><button class="open-result-button" type="button" data-open-result="${escapeHtml(id)}">Abrir página ${icon('arrow')}</button></div>`;
    if (compact) return `<details class="result-card result-card-compact" data-result-id="${escapeHtml(id)}">
      <summary class="result-summary"><h2><span>${escapeHtml(title)}</span>${icon('chevronRight', 'result-chevron')}</h2></summary>
      <div class="result-details">${eyebrow}${content}</div>
    </details>`;
    return `<article class="result-card" data-result-id="${escapeHtml(id)}">
      <div class="result-rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <div class="result-main">
        ${eyebrow}
        <h2><button type="button" class="result-title-button" data-open-result="${escapeHtml(id)}">${escapeHtml(title)}</button></h2>
        ${content}
      </div>
    </article>`;
  }).join('');
}

const exampleQueries = ['Disnea y dolor torácico', 'Gasometría y acidosis', 'Fiebre y rigidez de nuca', 'Síncope y palpitaciones'];
const historyDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function renderHistoryEntries(entries) {
  return entries.map((entry) => {
    const date = new Date(['number', 'string'].includes(typeof entry.lastUsedAt) ? entry.lastUsedAt : NaN);
    const dateLabel = Number.isFinite(date.getTime()) ? historyDate.format(date) : '';
    return `<li><button type="button" class="history-query-button" data-history-query="${escapeHtml(entry.query)}" data-history-section="${escapeHtml(entry.sectionId ?? '')}" data-history-kind="${escapeHtml(entry.kind ?? '')}" aria-label="Buscar de nuevo: ${escapeHtml(entry.query)}">${icon('search')}<span class="history-query-content"><span class="history-query-text">${escapeHtml(entry.query)}</span>${dateLabel ? `<time class="history-query-date" datetime="${escapeHtml(date.toISOString())}">${escapeHtml(dateLabel)}</time>` : ''}</span>${icon('arrow')}</button></li>`;
  }).join('');
}

export function mountUI(root) {
  root.innerHTML = `
    <header class="app-header">
      <div class="brand"><span class="brand-symbol">${icon('book')}</span><div><span class="brand-name">urgencias<span class="brand-dot">.</span></span><span class="brand-caption">TU BIBLIOTECA PERSONAL</span></div></div>
      <div class="header-right"><span class="local-badge"><span class="status-dot"></span>Versión local</span><button id="install-button" class="button button-tonal button-compact" type="button" aria-haspopup="dialog">Instalar app</button><div id="session-actions" class="session-actions" hidden><button id="offline-button" class="button button-text button-compact" type="button">Guardar sin conexión</button><button id="remove-offline-button" class="button button-text button-compact" type="button" hidden>Eliminar descargas</button><button id="lock-button" class="button button-tonal button-compact" type="button">${icon('lock')}<span>Bloquear</span></button></div></div>
    </header>
    <p id="device-access-status" class="device-access-status" role="status" aria-live="polite"></p>
    <main id="main-content" class="main-content">
      <section id="lock-view" class="lock-view" aria-labelledby="lock-title">
        <div class="lock-intro">
          <div class="eyebrow"><span class="eyebrow-line"></span> MENOS TIEMPO BUSCANDO</div>
          <h1 id="lock-title">Tu biblioteca de urgencias, <br><span>a una búsqueda.</span></h1>
          <p class="intro-copy">Conecta síntomas, diagnósticos y conceptos. Encuentra el contenido que necesitas y abre directamente su página original.</p>
          <div class="library-preview" aria-label="Cómo funciona la biblioteca"><div class="preview-search">${icon('search')}<span>Disnea y dolor torácico</span><span class="preview-key">↵</span></div><div class="preview-result"><span class="preview-result-icon">${icon('page')}</span><div><strong>El contenido, en su contexto</strong><span>Secciones · capítulos · páginas originales</span></div>${icon('arrow')}</div></div>
          <div class="intro-features"><span>${icon('check')} Consulta por conceptos</span><span>${icon('check')} Documentos pequeños</span><span>${icon('check')} Lectura sin perder el contexto</span></div>
        </div>
        <div class="unlock-card">
          <div class="unlock-icon">${icon('lock')}</div><span class="eyebrow">ACCESO PERSONAL</span>
          <h2>Abre tu biblioteca</h2>
          <p>Introduce la contraseña para desbloquear los documentos y el buscador en este dispositivo.</p>
          <form id="unlock-form"><label for="password">Contraseña de la biblioteca</label><div class="password-field">${icon('lock')}<input id="password" type="password" name="password" autocomplete="current-password" required placeholder="Tu contraseña" aria-describedby="unlock-status" /></div><div class="remember-device-option"><label class="remember-device" for="remember-device"><input id="remember-device" type="checkbox" name="rememberDevice" checked aria-describedby="remember-device-help" /><span>Recordar este dispositivo</span></label><p id="remember-device-help">La biblioteca se abrirá sin pedir la contraseña. Actívalo sólo en un dispositivo personal.</p></div><button id="unlock-button" class="button button-primary unlock-button" type="submit">Desbloquear biblioteca ${icon('arrow')}</button></form>
          <p id="unlock-status" class="form-status" role="status" aria-live="polite"></p>
          <p class="access-file-note">Para la primera prueba, consulta el archivo <strong>ACCESO_LOCAL.txt</strong> de la carpeta <strong>biblioteca-local</strong>.</p>
          <div class="privacy-note">${icon('info')}<p>Los documentos se descifran en este navegador. La contraseña no se guarda. Si recuerdas este dispositivo, se conserva una clave de acceso local.</p></div>
        </div>
      </section>
      <section id="search-view" class="search-view" hidden aria-labelledby="search-title">
        <div class="search-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> BIBLIOTECA DE CONSULTA</div><h1 id="search-title">¿Qué necesitas encontrar?</h1><p>Escribe una frase. Sigue las conexiones. Ve a la fuente.</p></div><div class="library-summary">${icon('book')}<div><strong id="library-title">Medicina de urgencias y emergencias</strong><span>Edición 2018 · consulta documental</span></div></div></div>
        <div class="search-panel"><form id="search-form" class="search-form" role="search"><label class="sr-only" for="query">Síntomas, diagnósticos o conceptos que quieres buscar</label><div class="query-field">${icon('search')}<input id="query" name="query" type="search" autocomplete="off" spellcheck="false" placeholder="Por ejemplo: disnea, dolor torácico y taquicardia" enterkeyhint="search" /><button id="clear-query" class="icon-button clear-query" type="button" aria-label="Borrar búsqueda" title="Borrar búsqueda">${icon('close')}</button><button id="search-button" type="submit" class="button button-primary">Buscar ${icon('arrow')}</button></div><div class="filter-row"><span class="filter-label">Acotar la búsqueda</span><div class="select-wrap"><label for="section-filter">Sección</label><select id="section-filter"><option value="">Todas las secciones</option></select></div><div class="select-wrap"><label for="kind-filter">Contenido</label><select id="kind-filter"><option value="">Todo el contenido</option><option value="chapter">Capítulos</option><option value="case">Casos clínicos</option></select></div><span class="search-hint">Añade conceptos para acotar los resultados</span></div></form></div>
        <p id="startup-status" class="startup-status" role="status" aria-live="polite"></p>
        <p id="offline-status" class="offline-status" role="status" aria-live="polite"></p>
        <div id="interpretation" class="interpretation" hidden></div><p id="search-status" class="search-status" role="status" aria-live="polite"></p>
        <section id="search-history" class="search-history" aria-labelledby="search-history-title" aria-describedby="search-history-note" hidden><div class="history-heading"><h2 id="search-history-title">Últimas búsquedas</h2><button id="clear-history-button" type="button" class="button button-text button-compact">Borrar historial</button></div><p id="search-history-note">Guardado sólo en este dispositivo. Toca una búsqueda para repetirla.</p><ul id="search-history-list" class="search-history-list"></ul></section>
        <div id="empty-state" class="empty-state"><div class="empty-heading"><span class="soft-icon">${icon('spark')}</span><div><h2>Empieza por lo que tienes en mente</h2><p>Una palabra, una pregunta o una combinación de conceptos.</p></div></div><div class="example-grid">${exampleQueries.map((query, index) => `<button type="button" class="example-card" data-query="${escapeHtml(query)}"><span class="example-number">0${index + 1}</span><span>${escapeHtml(query)}</span>${icon('arrow')}</button>`).join('')}</div><div class="how-it-works"><div><span class="step-number">1</span><div><strong>Describe lo que buscas</strong><p>Busca todos los conceptos y admite sus sinónimos.</p></div></div><div><span class="step-number">2</span><div><strong>Explora las conexiones</strong><p>Compara los fragmentos y sus coincidencias.</p></div></div><div><span class="step-number">3</span><div><strong>Abre la página exacta</strong><p>Lee el capítulo y vuelve a tus resultados.</p></div></div></div></div>
        <div id="search-summary" class="search-summary" hidden><div><h2 id="result-count">Resultados</h2><p>Todos los conceptos · mejores coincidencias primero</p></div><label class="results-display-switch"><input id="compact-results" type="checkbox" role="switch" aria-controls="results" /><span class="results-switch-track" aria-hidden="true"><span></span></span><span>Sólo títulos</span></label><span class="source-note">${icon('info')}Relevancia documental, no probabilidad diagnóstica</span></div>
        <div id="results" class="results" aria-label="Resultados de la búsqueda"></div>
      </section>
      <section id="reader-view" class="reader-view" hidden aria-labelledby="reader-title">
        <div class="reader-heading"><button id="reader-back" class="button button-text" type="button">${icon('back')}Volver a resultados</button><div class="suggestion-nav"><button id="reader-result-prev" class="icon-button" type="button" aria-label="Abrir sugerencia anterior" title="Sugerencia anterior">${icon('chevronLeft')}</button><span>Otras sugerencias</span><button id="reader-result-next" class="icon-button" type="button" aria-label="Abrir sugerencia siguiente" title="Sugerencia siguiente">${icon('chevronRight')}</button></div></div>
        <div class="reader-title-row"><div><h1 id="reader-title">Documento</h1><p id="reader-location"></p></div><span class="badge">Fuente original · 2018</span></div>
        <p id="reader-evidence" class="reader-evidence"></p>
        <div class="reader-toolbar"><div class="reader-paging"><button id="page-prev" class="icon-button" type="button" aria-label="Página anterior" title="Página anterior">${icon('chevronLeft')}</button><label for="page-number">Página</label><input id="page-number" type="number" min="1" value="1" inputmode="numeric" /><span>de <span id="page-total">1</span></span><button id="page-next" class="icon-button" type="button" aria-label="Página siguiente" title="Página siguiente">${icon('chevronRight')}</button></div><div class="reader-tools"><button id="zoom-out" class="icon-button" type="button" aria-label="Reducir tamaño" title="Reducir tamaño">${icon('zoomOut')}</button><button id="zoom-in" class="icon-button" type="button" aria-label="Ampliar tamaño" title="Ampliar tamaño">${icon('zoomIn')}</button><span class="toolbar-divider"></span><button id="reader-text-toggle" class="button button-text button-compact" type="button" aria-expanded="false" aria-controls="reader-text">${icon('text')}<span>Ver texto</span></button><button id="reader-ai-share" class="button button-tonal button-compact" type="button" aria-haspopup="dialog" disabled>${icon('spark')}<span>Consultar con IA</span></button><button id="reader-native-open" class="icon-button" type="button" aria-label="Abrir PDF en otra pestaña" title="Abrir PDF en otra pestaña">${icon('external')}</button></div></div>
        <p id="reader-status" class="reader-status" role="status" aria-live="polite"></p><div class="reader-stage"><canvas id="reader-canvas" aria-label="Página del documento original"></canvas></div><div id="reader-text" class="reader-text" hidden></div>
      </section>
    </main>
    <footer class="app-footer"><span>Un acceso más directo al conocimiento.</span><span>Biblioteca personal · Documentación de 2018</span></footer>`;
  const elements = Object.fromEntries([...root.querySelectorAll('[id]')].map((element) => [element.id, element]));
  for (const [id, element] of Object.entries(elements)) {
    elements[id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = element;
  }
  const showView = (name) => {
    for (const view of ['lock', 'search', 'reader']) elements[`${view}-view`].hidden = view !== name;
    document.body.dataset.view = name;
  };
  return {
    elements,
    showView,
    setLocked(locked) { elements['session-actions'].hidden = locked; showView(locked ? 'lock' : 'search'); },
    renderHistory(entries = []) {
      const visible = (Array.isArray(entries) ? entries : []).filter((entry) => entry && typeof entry.query === 'string' && entry.query.trim()).slice(0, 20);
      elements['search-history-list'].innerHTML = renderHistoryEntries(visible);
      elements['search-history'].hidden = visible.length === 0;
    },
    renderResults(results, sections, options) {
      elements.results.innerHTML = renderResults(results, sections, options);
      elements['empty-state'].hidden = true;
      elements['search-summary'].hidden = false;
      elements['result-count'].textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;
      if (!results.length) elements.results.innerHTML = `<div class="no-results">${icon('search')}<h3>Ningún fragmento reúne lo que buscas</h3><p>Quita algún concepto, prueba un sinónimo o cambia los filtros. No se incluyen coincidencias parciales.</p></div>`;
    },
    setSearchBusy(busy) { elements['search-button'].disabled = busy; elements.results.setAttribute('aria-busy', String(busy)); elements['search-view'].classList.toggle('is-searching', busy); },
    renderInterpretation(items) {
      const values = Array.isArray(items) ? items : items?.concepts || [];
      elements.interpretation.hidden = !values.length;
      elements.interpretation.innerHTML = `<span class="interpretation-label">Conexiones de la búsqueda</span>${values.map((item) => `<span class="concept-chip">${escapeHtml(typeof item === 'string' ? item : item.label || item.term || item.text || '')}</span>`).join('')}${!Array.isArray(items) && items?.negated?.length ? `<span class="interpretation-context">También se conserva el contexto de negación.</span>` : ''}`;
    },
  };
}
