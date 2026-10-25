/** PDF.js 6 releases the document through its loading task, including workers. */
export async function disposePDFTask(task) {
  if (task) await task.destroy();
}
