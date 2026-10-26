import MiniSearch from 'minisearch';
import { AMBIGUOUS_ACRONYMS, CONCEPTS } from './concepts.js';

const STOP_WORDS = new Set(`a al algo alguna algunas alguno algunos ante antes como con contra cual cuales cuando de del desde donde durante e el ella ellas ellos en entre era es esa esas ese esos esta estas este estos esto ha hacia hasta hay la las le les lo los me mi mis muy ni o para pero por porque que qué quien se ser si sobre su sus te tiene tienen todo todos tu un una unas uno unos y ya paciente pacientes presenta presentan presentar datos evidencia signos quiero necesito buscar busca encontrar información acerca consulta diagnóstico diagnósticos síntomas síntoma anamnesis the a an and nor of in with for to is are patient presenting find please about`.split(/\s+/).map(normalize));
const NEGATORS = new Set(['no', 'sin', 'niega', 'niegan', 'without', 'denies']);
const SCOPE_STOPS = new Set(['pero', 'aunque', 'excepto', 'however', 'but', 'con', 'with']);
const NEGATION_CONTINUATIONS = new Set(['ni', 'y', 'o', 'and', 'or', 'nor']);
const tokenPattern = /[\p{L}\p{N}]+(?:[.,][\p{N}]+)?/gu;
const now = () => globalThis.performance?.now() ?? Date.now();
const PREPARED_SCHEMA = 1;
const ENGINE_VERSION = 'urgencias-search-2:minisearch-7.2.0';
const encoder = new TextEncoder();

/** Lowercase and remove accents while keeping ñ distinct from n. */
export function normalize(value) {
  return String(value ?? '').replace(/\u00AD/gu, '').replace(/([\p{L}])\s*-\s*\r?\n\s*(?=[\p{L}])/gu, '$1')
    .normalize('NFKC').toLowerCase().replace(/ñ/g, '\uE000')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/\uE000/g, 'ñ');
}

function tokens(value) {
  return [...normalize(value).matchAll(tokenPattern)].map((match) => match[0]);
}

function tokenized(value) {
  return ` ${tokens(value).join(' ')} `;
}

const definitions = CONCEPTS.map((concept) => ({
  ...concept,
  aliases: [...new Set(concept.variants.map((variant) => tokens(variant).join(' ')))],
}));
const aliases = definitions.flatMap((concept) => concept.aliases.map((alias) => ({
  concept,
  words: alias.split(' '),
}))).sort((a, b) => b.words.length - a.words.length || b.words.join(' ').length - a.words.join(' ').length);

function parseQuery(query) {
  const value = String(query ?? '').trim().slice(0, 1000);
  const queryTokens = [...value.matchAll(tokenPattern)].map((match) => ({
    word: normalize(match[0]), start: match.index, end: match.index + match[0].length, negated: false,
  }));
  let negationActive = false;
  for (let index = 0; index < queryTokens.length; index += 1) {
    const token = queryTokens[index];
    const previous = queryTokens[index - 1];
    if (previous && /[.;:!?\n]/u.test(value.slice(previous.end, token.start))) negationActive = false;
    if (SCOPE_STOPS.has(token.word)) negationActive = false;
    if (NEGATORS.has(token.word)) {
      negationActive = true;
      continue;
    }
    if (token.word === 'ausencia' && queryTokens[index + 1]?.word === 'de') {
      negationActive = true;
      continue;
    }
    if (!negationActive || STOP_WORDS.has(token.word)) continue;
    const phrase = aliases.find(({ words }) => words.every((word, offset) => queryTokens[index + offset]?.word === word));
    const span = phrase?.words.length ?? 1;
    for (let offset = 0; offset < span; offset += 1) queryTokens[index + offset].negated = true;
    const finalToken = queryTokens[index + span - 1];
    const next = queryTokens[index + span];
    // A negator applies to the next concept. Explicit lists retain the scope;
    // whitespace-separated search keywords do not silently become negative.
    negationActive = Boolean(next && (NEGATION_CONTINUATIONS.has(next.word) || /,/u.test(value.slice(finalToken.end, next.start))));
    index += span - 1;
  }

  const occupied = new Set();
  const groups = [];
  const concepts = [];
  for (let index = 0; index < queryTokens.length; index += 1) {
    if (occupied.has(index)) continue;
    const found = aliases.find(({ words }) => words.every((word, offset) => (
      queryTokens[index + offset]?.word === word && !occupied.has(index + offset)
      && queryTokens[index + offset].negated === queryTokens[index].negated
    )));
    if (!found) continue;
    found.words.forEach((_, offset) => occupied.add(index + offset));
    const matched = value.slice(queryTokens[index].start, queryTokens[index + found.words.length - 1].end);
    const group = {
      id: found.concept.id,
      label: found.concept.label,
      matched,
      variants: found.concept.aliases,
      negated: queryTokens[index].negated,
      literal: tokens(matched).join(' '),
      isConcept: true,
    };
    if (!groups.some((existing) => existing.id === group.id && existing.negated === group.negated)) groups.push(group);
    if (!concepts.some((concept) => concept.id === group.id)) concepts.push({
      id: group.id, label: group.label, matched, variants: found.concept.variants, negated: group.negated,
    });
  }
  for (let index = 0; index < queryTokens.length; index += 1) {
    const token = queryTokens[index];
    if (occupied.has(index) || STOP_WORDS.has(token.word) || NEGATORS.has(token.word) || token.word.length < 2) continue;
    if (token.word === 'ausencia' || token.word === 'denies') continue;
    if (groups.some((group) => group.id === `term:${token.word}` && group.negated === token.negated)) continue;
    groups.push({
      id: `term:${token.word}`, label: value.slice(token.start, token.end), matched: value.slice(token.start, token.end),
      variants: [token.word], literal: token.word, negated: token.negated, isConcept: false,
    });
  }
  const quoted = [...value.matchAll(/["“]([^"”]+)["”]/gu)].map((match) => tokens(match[1]).join(' ')).filter(Boolean);
  return {
    value,
    groups: groups.slice(0, 40),
    quoted,
    interpretation: {
      concepts,
      negated: groups.filter((group) => group.negated).map((group) => group.label),
      ambiguous: [...new Set(queryTokens.map((token) => AMBIGUOUS_ACRONYMS[token.word]).filter(Boolean))],
    },
  };
}

function withinOneEdit(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let edits = 0;
  let a = 0;
  let b = 0;
  while (a < left.length && b < right.length) {
    if (left[a] === right[b]) { a += 1; b += 1; continue; }
    if (++edits > 1) return false;
    if (left.length <= right.length) b += 1;
    if (left.length >= right.length) a += 1;
  }
  return edits + (a < left.length || b < right.length ? 1 : 0) <= 1;
}

function matchGroup(haystack, group, allowPrefix = false, approximateWords = []) {
  // Prefer the user's wording when several aliases coexist in the same text.
  const variants = [group.literal, ...group.variants.filter((variant) => variant !== group.literal)];
  for (const variant of variants) {
    const position = haystack.indexOf(` ${variant} `);
    if (position !== -1) return { position, variant, literal: variant === group.literal, prefix: false };
  }
  if (allowPrefix && !group.isConcept && group.literal.length >= 4) {
    const expression = new RegExp(` ${group.literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}[\\p{L}\\p{N}]* `, 'u');
    const match = haystack.match(expression);
    if (match) return { position: match.index, variant: match[0].trim(), literal: false, prefix: true };
  }
  if (!group.isConcept && group.literal.length >= 6) {
    for (const word of approximateWords) {
      if (!withinOneEdit(group.literal, word)) continue;
      const position = haystack.indexOf(` ${word} `);
      if (position !== -1) return { position, variant: word, literal: false, prefix: false, approximate: true };
    }
  }
  return null;
}

function negatedContext(haystack, group) {
  group.negationExpressions ??= new Map();
  for (const variant of group.variants) {
    if (!haystack.includes(` ${variant} `)) continue;
    const target = variant.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    if (!group.negationExpressions.has(variant)) group.negationExpressions.set(variant,
      new RegExp(` (?:sin|no|niega|without|denies|ausencia de)(?: [\\p{L}\\p{N}]+){0,2} ${target} `, 'u'));
    if (group.negationExpressions.get(variant).test(haystack)) return true;
  }
  return false;
}

function makeExcerpt(text, matched) {
  const clean = String(text ?? '').replace(/\s+/gu, ' ').trim();
  if (clean.length <= 340) return clean;
  const normalized = normalize(clean);
  let center = Infinity;
  for (const match of matched) {
    const position = normalized.indexOf(match.variant);
    if (position !== -1) center = Math.min(center, position);
  }
  const target = Number.isFinite(center) ? Math.max(0, center - 80) : 0;
  const start = target === 0 ? 0 : (clean.lastIndexOf(' ', target) + 1 || target);
  const end = Math.min(clean.length, start + 340);
  const lastSpace = clean.lastIndexOf(' ', end);
  const stop = end < clean.length && lastSpace > start + 200 ? lastSpace : end;
  return `${start ? '…' : ''}${clean.slice(start, stop)}${stop < clean.length ? '…' : ''}`;
}

function indexOptions() {
  return {
    fields: ['heading', 'body'], idField: 'id',
    tokenize: tokens, processTerm: (term) => term,
    searchOptions: { boost: { heading: 3, body: 1 }, combineWith: 'OR' },
  };
}

async function corpusFingerprint(corpus) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(corpus)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function restorePrepared(prepared, fingerprint, sourceFragments) {
  try {
    if (prepared?.schemaVersion !== PREPARED_SCHEMA || prepared.engineVersion !== ENGINE_VERSION
      || prepared.corpusFingerprint !== fingerprint || !Array.isArray(prepared.normalizedFragments)
      || prepared.normalizedFragments.length !== sourceFragments.length) return null;
    const fragments = new Map();
    for (let offset = 0; offset < sourceFragments.length; offset += 1) {
      const fragment = sourceFragments[offset];
      const row = prepared.normalizedFragments[offset];
      if (!Array.isArray(row) || row.length !== 3 || row[0] !== fragment.id
        || typeof row[1] !== 'string' || typeof row[2] !== 'string' || fragments.has(fragment.id)) return null;
      fragments.set(fragment.id, { ...fragment, headingSearch: row[1], bodySearch: row[2] });
    }
    const index = MiniSearch.loadJS(prepared.index, indexOptions());
    if (index.documentCount !== fragments.size || [...fragments.keys()].some((id) => !index.has(id))) return null;
    return { index, fragments };
  } catch { return null; }
}

/** Prepared payloads contain book text and must only be persisted encrypted by the caller. */
export async function createSearchEngine(corpus, { onProgress, preparedSearch } = {}) {
  if (!corpus || !Array.isArray(corpus.fragments) || !Array.isArray(corpus.documents)) {
    throw new Error('La biblioteca no tiene un índice de búsqueda válido.');
  }
  const documents = new Map(corpus.documents.map((document) => [document.id, document]));
  const sections = new Map((corpus.sections ?? []).map((section) => [section.id, section]));
  const sourceFragments = corpus.fragments.filter((fragment) => documents.has(fragment.documentId));
  const fingerprint = await corpusFingerprint(corpus);
  const prepared = restorePrepared(preparedSearch, fingerprint, sourceFragments);
  const fragments = prepared?.fragments ?? new Map();
  const index = prepared?.index ?? new MiniSearch(indexOptions());
  const batchSize = 250;
  for (let offset = 0; !prepared && offset < corpus.fragments.length; offset += batchSize) {
    const batch = corpus.fragments.slice(offset, offset + batchSize).filter((fragment) => documents.has(fragment.documentId));
    for (const fragment of batch) {
      const document = documents.get(fragment.documentId);
      const heading = `${document.title} ${fragment.subsectionTitle ?? ''} ${fragment.title ?? ''}`;
      fragments.set(fragment.id, {
        ...fragment, headingSearch: tokenized(heading), bodySearch: tokenized(fragment.text),
      });
      index.add({ id: fragment.id, heading, body: fragment.text });
    }
    onProgress?.({ completed: Math.min(offset + batchSize, corpus.fragments.length), total: corpus.fragments.length });
    if (offset + batchSize < corpus.fragments.length) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return {
    documentCount: documents.size,
    fragmentCount: fragments.size,
    restored: Boolean(prepared),
    exportPreparedSearch() {
      return {
        schemaVersion: PREPARED_SCHEMA, engineVersion: ENGINE_VERSION, corpusFingerprint: fingerprint,
        normalizedFragments: [...fragments.values()].map((fragment) => [fragment.id, fragment.headingSearch, fragment.bodySearch]),
        index: index.toJSON(),
      };
    },
    search(query, { sectionId = '', kind = '', limit = 30 } = {}) {
      const started = now();
      const parsed = parseQuery(query);
      const positive = parsed.groups.filter((group) => !group.negated);
      const negative = parsed.groups.filter((group) => group.negated);
      const response = (results = [], total = 0, totalDocuments = 0) => ({
        query: parsed.value, total, totalDocuments, results,
        interpretation: parsed.interpretation, durationMs: Math.round((now() - started) * 100) / 100,
      });
      if (!parsed.groups.length && !parsed.quoted.length) return response();
      const searchWords = [...new Set(parsed.groups.flatMap((group) => group.variants.flatMap(tokens)).concat(parsed.quoted.flatMap(tokens)))];
      if (!searchWords.length) return response();
      const candidates = new Map(index.search(searchWords.join(' ')).map((candidate) => [candidate.id, candidate]));
      const recovery = new Map();
      for (const group of positive) {
        if (group.isConcept || group.literal.length < 4 || index.search(group.literal).length) continue;
        // Resolve fallback independently for each term. Adding another concept must
        // never broaden the accepted spelling of terms already in the query.
        let recovered = index.search(group.literal, { prefix: true });
        let mode = { prefix: true, approximate: false };
        if (!recovered.length && group.literal.length >= 6 && !parsed.quoted.length) {
          recovered = index.search(group.literal, { fuzzy: 1 });
          mode = { prefix: false, approximate: true };
        }
        if (!recovered.length) continue;
        recovery.set(group.id, mode);
        for (const candidate of recovered) {
          const existing = candidates.get(candidate.id);
          candidates.set(candidate.id, existing ? {
            ...existing, score: Math.max(existing.score, candidate.score),
            terms: [...new Set([...existing.terms, ...candidate.terms])],
          } : candidate);
        }
      }
      const ranked = [];
      for (const candidate of candidates.values()) {
        const fragment = fragments.get(candidate.id);
        const document = documents.get(fragment.documentId);
        if (sectionId && fragment.sectionId !== sectionId) continue;
        if (kind && document.kind !== kind) continue;
        if (parsed.quoted.some((phrase) => !fragment.bodySearch.includes(` ${phrase} `) && !fragment.headingSearch.includes(` ${phrase} `))) continue;
        const matches = positive.map((group) => {
          const mode = recovery.get(group.id);
          const body = matchGroup(fragment.bodySearch, group, mode?.prefix, mode?.approximate ? candidate.terms : []);
          const heading = matchGroup(fragment.headingSearch, group, mode?.prefix, mode?.approximate ? candidate.terms : []);
          return { group, body, heading, found: body ?? heading };
        });
        const found = matches.filter((match) => match.found);
        const contextualNegatives = negative.filter((group) => negatedContext(fragment.bodySearch, group));
        if (found.length !== positive.length) continue;
        if (!positive.length && negative.length && !contextualNegatives.length) continue;
        const positions = found.map((match) => match.body?.position).filter((position) => position !== undefined);
        const proximity = positions.length > 1 ? 100 / (1 + (Math.max(...positions) - Math.min(...positions)) / 100) : 0;
        const headingCount = found.filter((match) => match.heading).length;
        const bodyCount = found.filter((match) => match.body).length;
        const literalCount = found.filter((match) => match.found.literal).length;
        const score = found.length * 10000 + bodyCount * 150 + headingCount * 75 + literalCount * 30
          + contextualNegatives.length * 60 + proximity + Math.min(candidate.score, 100);
        ranked.push({ fragment, document, found, missing: matches.filter((match) => !match.found), contextualNegatives, score });
      }
      ranked.sort((a, b) => b.score - a.score || a.document.originalStart - b.document.originalStart
        || a.fragment.originalPage - b.fragment.originalPage || a.fragment.id.localeCompare(b.fragment.id));
      const perDocument = new Map();
      ranked.forEach(({ document }) => perDocument.set(document.id, (perDocument.get(document.id) ?? 0) + 1));
      const chosen = [];
      const emitted = new Map();
      const destinations = new Set();
      const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 30));
      for (const row of ranked) {
        const destination = `${row.document.id}:${row.fragment.localPage}`;
        if (destinations.has(destination)) continue;
        const count = emitted.get(row.document.id) ?? 0;
        if (count >= 3) continue;
        destinations.add(destination);
        emitted.set(row.document.id, count + 1);
        const { fragment, document } = row;
        chosen.push({
          id: fragment.id, documentId: document.id, title: document.title,
          sectionId: fragment.sectionId, sectionTitle: sections.get(fragment.sectionId)?.title ?? '',
          kind: document.kind, originalPage: fragment.originalPage, localPage: fragment.localPage,
          source: fragment.source, anchorPrecision: fragment.anchorPrecision ?? 'page_only',
          excerpt: makeExcerpt(fragment.text, row.found.map((match) => match.body).filter(Boolean)),
          matchedTerms: row.found.map((match) => match.found.approximate ? `${match.group.label} ≈ ${match.found.variant}`
            : match.found.prefix ? `${match.group.label}…` : match.group.label)
            .concat(row.contextualNegatives.map((group) => `Sin ${group.label.toLocaleLowerCase('es')}`)),
          missingTerms: row.missing.map((match) => match.group.label),
          score: Math.round(row.score * 100) / 100,
          relatedCount: perDocument.get(document.id) - 1,
          subsectionTitle: fragment.subsectionTitle,
          subsectionVerification: fragment.subsectionVerification ?? 'unverified',
          bytes: document.bytes, pageCount: document.pageCount,
        });
        if (chosen.length >= boundedLimit) break;
      }
      return response(chosen, ranked.length, perDocument.size);
    },
  };
}
