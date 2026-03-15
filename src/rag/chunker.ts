/**
 * Split document text into overlapping chunks for RAG retrieval.
 * Chunk size and overlap are configurable.
 */

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_OVERLAP = 64;

export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = Math.min(options.overlap ?? DEFAULT_OVERLAP, chunkSize - 1);
  const chunks: string[] = [];
  let start = 0;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  while (start < normalized.length) {
    let end = start + chunkSize;
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(normalized.slice(start, end).trim());
    start = end - overlap;
    if (start >= normalized.length) break;
  }

  return chunks.filter((c) => c.length > 0);
}
