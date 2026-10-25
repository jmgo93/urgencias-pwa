import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { disposePDFTask } from '../src/pdf-lifecycle.js';

// A synthetic blank page built in memory; no personal PDF or fixture file required.
function blankPDF() {
  let text = '%PDF-1.7\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>'];
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(text.length);
    text += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = text.length;
  text += `xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(text);
}
test('real PDF.js can close a document, open another, and release both loading tasks', { timeout: 15000 }, async () => {
  for (let i = 0; i < 2; i++) {
    const task = getDocument({ data: blankPDF(), isEvalSupported: false });
    const document = await task.promise;
    assert.equal(document.numPages, 1);
    const page = await document.getPage(1);
    assert.equal(page.pageNumber, 1);
    assert.equal(document.loadingTask, task);
    await disposePDFTask(task);
    assert.equal(task.destroyed, true);
  }
  await disposePDFTask(undefined);
});
