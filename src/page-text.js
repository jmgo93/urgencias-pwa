/** Import offsets count Unicode code points, as in the Python preparer. */
export function reconstructPage(fragments) {
  let text = '';
  let end = 0;
  for (const fragment of [...fragments].sort((a, b) => a.pageTextStart - b.pageTextStart)) {
    const start = fragment.pageTextStart;
    const next = fragment.pageTextEnd;
    if (!Number.isInteger(start) || !Number.isInteger(next) || start > end || next < start) {
      throw new Error('La transcripción no tiene una cobertura continua.');
    }
    const points = Array.from(fragment.text);
    if (points.length !== next - start) throw new Error('La transcripción está incompleta.');
    text += points.slice(Math.max(0, end - start)).join('');
    end = Math.max(end, next);
  }
  return text;
}
