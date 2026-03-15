/**
 * Retrieve relevant chunks for a query using keyword overlap scoring.
 * No embeddings or external API; suitable for demo RAG module.
 */

import type { RAGChunk, RAGRetrievalResult } from './types';
import { getAllChunks } from './store';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u0DFF]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreChunk(chunk: RAGChunk, queryTokens: string[]): number {
  const chunkTokens = tokenize(chunk.text);
  const chunkSet = new Set(chunkTokens);
  let score = 0;
  for (const q of queryTokens) {
    if (chunkSet.has(q)) score += 1;
  }
  if (queryTokens.length > 0) {
    score = score / queryTokens.length;
  }
  return score;
}

/**
 * Retrieve top-k chunks most relevant to the query.
 */
export function retrieve(query: string, topK: number = 5): RAGRetrievalResult[] {
  const allChunks = getAllChunks();
  if (allChunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = allChunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTokens),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
