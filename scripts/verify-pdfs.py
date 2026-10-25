#!/usr/bin/env python3
"""Verify every split PDF page and visually compare chapter boundary pages."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw


def content_hash(page) -> str:
    contents = page.get_contents()
    return hashlib.sha256(contents.get_data() if contents else b'').hexdigest()


def geometry(page) -> tuple:
    return tuple(float(v) for box in (page.mediabox, page.cropbox) for v in box) + (int(page.rotation or 0),)


def rendered_image(pdf, index: int):
    page = pdf[index]
    bitmap = page.render(scale=0.35, rotation=0)
    image = bitmap.to_pil().convert('RGB').copy()
    bitmap.close()
    page.close()
    return image


def verify(source: Path, output: Path, render_all: bool = False) -> dict:
    source, output = source.resolve(), output.resolve()
    corpus = json.loads((output / 'corpus.json').read_text(encoding='utf-8'))
    manifest = json.loads((source / 'Libro dividido' / 'manifiesto.json').read_text(encoding='utf-8-sig'))
    original_path = source / manifest['archivo_original']
    source_pdf = PdfReader(original_path)
    source_render = pdfium.PdfDocument(original_path)
    covered, checked, rendered, samples = [], 0, 0, []
    failures = []
    for document in corpus['documents']:
        path = output / document['fileName']
        split_pdf = PdfReader(path)
        split_render = pdfium.PdfDocument(path)
        if len(split_pdf.pages) != document['pageCount']:
            failures.append({'documentId': document['id'], 'error': 'page_count'})
        render_indices = set(range(len(split_pdf.pages))) if render_all else {0, len(split_pdf.pages) - 1}
        for local_index, page in enumerate(split_pdf.pages):
            original_page = document['originalStart'] + local_index
            covered.append(original_page)
            source_page = source_pdf.pages[original_page - 1]
            if geometry(source_page) != geometry(page):
                failures.append({'documentId': document['id'], 'originalPage': original_page, 'error': 'geometry'})
            if content_hash(source_page) != content_hash(page):
                failures.append({'documentId': document['id'], 'originalPage': original_page, 'error': 'content_stream'})
            checked += 1
            if local_index in render_indices:
                original_image = rendered_image(source_render, original_page - 1)
                split_image = rendered_image(split_render, local_index)
                identical = original_image.size == split_image.size and original_image.tobytes() == split_image.tobytes()
                if not identical:
                    failures.append({'documentId': document['id'], 'originalPage': original_page, 'error': 'visual_pixels'})
                if document['id'] in {'d001', 'd009', 'd019', 'd026', 'd037', 'd064', 'd100', 'd150', 'd199', 'd200', 'd243', 'd244'} and local_index == 0:
                    samples.append((document['id'], original_page, original_image, split_image))
                rendered += 1
        split_render.close()
        print(f'Verified {document["id"]}: {len(split_pdf.pages)} pages', flush=True)
    source_render.close()
    expected = list(range(1, corpus['sourcePageCount'] + 1))
    if covered != expected:
        failures.append({'error': 'coverage', 'actualPages': len(covered)})
    sheet = Image.new('RGB', (980, max(1, len(samples)) * 180), '#f0f1f3')
    draw = ImageDraw.Draw(sheet)
    for row, (document_id, original_page, original_image, split_image) in enumerate(samples):
        y = row * 180
        draw.text((10, y + 5), f'{document_id} / original page {original_page}: source | extracted', fill='#111111')
        for col, image in enumerate((original_image, split_image)):
            image.thumbnail((450, 150))
            sheet.paste(image, (10 + col * 480, y + 25))
    sheet.save(output / 'verificacion-visual.jpg', quality=88)
    report = {
        'schemaVersion': 1,
        'verifiedAt': datetime.now(timezone.utc).isoformat(),
        'documentCount': len(corpus['documents']),
        'outputPdfBytes': sum(document['bytes'] for document in corpus['documents']),
        'largestPdfBytes': max(document['bytes'] for document in corpus['documents']),
        'documentsOver12MiB': [
            {'id': document['id'], 'title': document['title'], 'bytes': document['bytes'],
             'reason': 'Complete chapter retained to preserve reading order and original image quality'}
            for document in corpus['documents'] if document['bytes'] > 12 * 1024 * 1024
        ],
        'pagesChecked': checked,
        'geometryAndContentStreamsIdentical': not any(f.get('error') in {'geometry', 'content_stream'} for f in failures),
        'renderedPagePairs': rendered,
        'renderMode': 'all pages' if render_all else 'first and last page of every document',
        'renderedPixelsIdentical': not any(f.get('error') == 'visual_pixels' for f in failures),
        'pagesCoveredExactlyOnce': covered == expected,
        'failures': failures,
        'passed': not failures,
    }
    (output / 'verificacion.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if failures:
        raise AssertionError(json.dumps(report, ensure_ascii=False, indent=2))
    preparation_path = output / 'preparacion.json'
    if preparation_path.exists():
        preparation = json.loads(preparation_path.read_text(encoding='utf-8'))
        preparation.update({
            'pdfVerification': 'Passed: complete page coverage, geometry, content streams and rendered pixels',
            'documentsOver12MiB': report['documentsOver12MiB'],
        })
        preparation_path.write_text(json.dumps(preparation, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--render-all', action='store_true', help='Compare rendered pixels of every page, rather than every chapter boundary')
    args = parser.parse_args()
    print(json.dumps(verify(args.source, args.output, args.render_all), ensure_ascii=False, indent=2))
