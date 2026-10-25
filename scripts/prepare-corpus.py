#!/usr/bin/env python3
"""Prepare a personal, lossless PDF library and page-addressed search corpus.

The output belongs outside the application repository. This script never sends
the source, transcription, search corpus or PDF files to any remote service.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter


PAGE_ANCHOR = re.compile(r'<a id="pagina-original-(\d+)"></a>\s*\n## Página original \d+ \| Página de sección \d+\s*\n')
PAGE_LINK = re.compile(r'^\s*\[Ver página en el PDF\]\([^\n]*\)\s*\n')
OCR_NOTE = re.compile(r'^\s*\*\*Texto obtenido mediante OCR;[^\n]*\*\*\s*\n')
WORD = re.compile(r'\S+')
UPPER_LETTERS = re.compile(r'[A-ZÁÉÍÓÚÜÑ]')


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def clean_title(value: str) -> str:
    """Repair only obvious split initial glyphs in the existing title manifest."""
    value = re.sub(r'^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]) ([a-záéíóúüñ]{2,})', r'\1\2', value.strip())
    return value[:1].upper() + value[1:]


def read_pages(path: Path) -> dict[int, str]:
    markdown = path.read_text(encoding='utf-8-sig')
    anchors = list(PAGE_ANCHOR.finditer(markdown))
    pages = {}
    for index, anchor in enumerate(anchors):
        end = anchors[index + 1].start() if index + 1 < len(anchors) else len(markdown)
        text = markdown[anchor.end():end]
        text = PAGE_LINK.sub('', text, count=1)
        text = OCR_NOTE.sub('', text, count=1)
        pages[int(anchor.group(1))] = text.strip()
    return pages


def candidate_heading(text: str, start: int, end: int) -> str | None:
    """Headings are navigation suggestions, deliberately never verified regions."""
    before = text[:min(end, start + 240)]
    candidates = []
    offset = 0
    for line in before.splitlines(keepends=True):
        stripped = line.strip()
        letters = [c for c in stripped if c.isalpha()]
        if (5 <= len(stripped) <= 100 and len(letters) >= 4
                and len(UPPER_LETTERS.findall(stripped)) / len(letters) >= 0.90
                and not re.match(r'^(ISBN|ELSEVIER|SECCIÓN|CAPÍTULO)\b', stripped)):
            candidates.append((offset, stripped))
        offset += len(line)
    preceding = [heading for position, heading in candidates if position <= start]
    if preceding:
        return preceding[-1]
    return candidates[0][1] if candidates else None


def fragment_page(text: str, document: dict, original_page: int, source: str) -> list[dict]:
    words = list(WORD.finditer(text))
    ranges = []
    # A blank printed page still has a searchable/navigation representation.
    if not words:
        ranges.append((0, len(text)))
    else:
        word_start = 0
        while word_start < len(words):
            word_end = min(word_start + 225, len(words))
            char_start = 0 if word_start == 0 else words[word_start].start()
            char_end = len(text) if word_end == len(words) else words[word_end].start()
            ranges.append((char_start, char_end))
            if word_end == len(words):
                break
            word_start = word_end - 30
    fragments = []
    for index, (start, end) in enumerate(ranges, start=1):
        heading = candidate_heading(text, start, end)
        fragment = {
            'id': f'{document["id"]}-p{original_page:04d}-f{index:03d}',
            'documentId': document['id'],
            'sectionId': document['sectionId'],
            'title': document['title'],
            'text': text[start:end],
            'originalPage': original_page,
            'localPage': original_page - document['originalStart'] + 1,
            'source': source,
            'anchorPrecision': 'page_only',
            'subsectionVerification': 'unverified',
            'pageTextStart': start,
            'pageTextEnd': end,
        }
        if heading:
            fragment['subsectionTitle'] = heading
        fragments.append(fragment)
    # Assert continuous coverage, despite overlap, without dropping source text.
    last_end = 0
    for start, end in ranges:
        if start > last_end:
            raise AssertionError(f'Uncovered text at page {original_page}: {last_end}:{start}')
        last_end = max(last_end, end)
    if last_end != len(text):
        raise AssertionError(f'Truncated text on page {original_page}')
    return fragments


def prepare(source: Path, output: Path, rebuild: bool) -> dict:
    source = source.resolve()
    output = output.resolve()
    repository = source / 'repositorio-app'
    if output == source or output == repository or repository in output.parents:
        raise ValueError('Personal library output must be outside repositorio-app and cannot be the source directory.')
    manifest = json.loads((source / 'Libro dividido' / 'manifiesto.json').read_text(encoding='utf-8-sig'))
    source_pdf = source / manifest['archivo_original']
    original_sha = hashlib.file_digest(source_pdf.open('rb'), 'sha256').hexdigest()
    if original_sha != manifest['sha256_original']:
        raise ValueError('Original PDF checksum does not match the verified source manifest.')
    output.mkdir(parents=True, exist_ok=True)
    (output / 'pdf').mkdir(exist_ok=True)
    original = PdfReader(source_pdf)
    if len(original.pages) != manifest['total_paginas']:
        raise ValueError('Original page count mismatch.')
    documents, fragments, sections = [], [], []
    coverage = []
    all_pages = {}
    for section in manifest['secciones']:
        section_id = f's{section["numero"]:02d}'
        sections.append({'id': section_id, 'title': section['titulo'], 'number': section['numero']})
        pages = read_pages(source / 'Libro dividido' / section['carpeta'] / 'contenido.md')
        expected_pages = set(range(section['inicio_original'], section['fin_original'] + 1))
        if set(pages) != expected_pages:
            raise ValueError(f'Markdown page coverage mismatch in {section["carpeta"]}: {sorted(expected_pages - set(pages))}')
        all_pages.update(pages)
        chapter_list = section['capitulos'] or [{'numero': 0, 'titulo': section['titulo'], 'pagina_original': section['inicio_original']}]
        if chapter_list[0]['pagina_original'] != section['inicio_original']:
            raise ValueError(f'Unmapped section introduction in {section_id}')
        for chapter_index, chapter in enumerate(chapter_list):
            original_start = chapter['pagina_original']
            original_end = (chapter_list[chapter_index + 1]['pagina_original'] - 1
                            if chapter_index + 1 < len(chapter_list) else section['fin_original'])
            if original_start > original_end:
                raise ValueError(f'Invalid chapter range: {chapter}')
            document_id = f'd{len(documents) + 1:03d}'
            kind = 'preliminary' if section['numero'] == 0 else ('case' if section['numero'] == 24 else 'chapter')
            document = {
                'id': document_id,
                'title': clean_title(chapter['titulo']),
                'kind': kind,
                'sectionId': section_id,
                'number': chapter['numero'],
                'originalStart': original_start,
                'originalEnd': original_end,
                'pageCount': original_end - original_start + 1,
                'fileName': f'pdf/{document_id}.pdf',
            }
            pdf_path = output / document['fileName']
            if rebuild or not pdf_path.exists():
                writer = PdfWriter()
                for page in range(original_start - 1, original_end):
                    writer.add_page(original.pages[page])
                writer.add_metadata({'/Title': document['title'], '/Subject': f'Original pages {original_start}-{original_end}; personal local library'})
                with pdf_path.open('wb') as stream:
                    writer.write(stream)
                writer.close()
            extracted = PdfReader(pdf_path)
            if len(extracted.pages) != document['pageCount']:
                raise ValueError(f'Written page count mismatch: {pdf_path.name}; rerun with --rebuild')
            document['bytes'] = pdf_path.stat().st_size
            document['sha256'] = hashlib.file_digest(pdf_path.open('rb'), 'sha256').hexdigest()
            documents.append(document)
            for original_page in range(original_start, original_end + 1):
                coverage.append(original_page)
                fragments.extend(fragment_page(pages[original_page], document, original_page,
                                               'ocr' if original_page in manifest['paginas_ocr'] else 'native'))
            print(f'Prepared {document_id}: original {original_start}-{original_end}, {document["bytes"]} bytes', flush=True)
    if coverage != list(range(1, manifest['total_paginas'] + 1)):
        raise AssertionError('Page coverage must be complete and sequential, without duplicates.')
    corpus = {
        'schemaVersion': 1,
        'title': 'Medicina de urgencias y emergencias · Jiménez Murillo / Montero Pérez',
        'edition': '2018',
        'sourcePageCount': manifest['total_paginas'],
        'sourceSha256': original_sha,
        'ocrPages': manifest['paginas_ocr'],
        'sections': sections,
        'documents': documents,
        'fragments': fragments,
    }
    dump_json(output / 'corpus.json', corpus)
    report = {
        'schemaVersion': 1,
        'preparedAt': datetime.now(timezone.utc).isoformat(),
        'sourceSha256': original_sha,
        'sourcePageCount': len(original.pages),
        'documentCount': len(documents),
        'chapterCount': sum(d['kind'] == 'chapter' for d in documents),
        'caseCount': sum(d['kind'] == 'case' for d in documents),
        'preliminaryCount': sum(d['kind'] == 'preliminary' for d in documents),
        'fragmentCount': len(fragments),
        'textPageCount': len(all_pages),
        'ocrPageCount': len(manifest['paginas_ocr']),
        'outputPdfBytes': sum(d['bytes'] for d in documents),
        'largestPdfBytes': max(d['bytes'] for d in documents),
        'documentsOver12MiB': [
            {'id': d['id'], 'title': d['title'], 'bytes': d['bytes'],
             'reason': 'Complete chapter retained to preserve reading order and original image quality'}
            for d in documents if d['bytes'] > 12 * 1024 * 1024
        ],
        'pagesCoveredExactlyOnce': True,
        'transcriptionCoverageComplete': True,
        'pdfVerification': 'Pending separate verify-pdfs.py run',
    }
    dump_json(output / 'preparacion.json', report)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Workspace containing Libro dividido and the original PDF')
    parser.add_argument('--output', type=Path, required=True, help='Private output folder outside repositorio-app')
    parser.add_argument('--rebuild', action='store_true', help='Replace existing generated chapter PDFs')
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.output, args.rebuild), ensure_ascii=False, indent=2))
