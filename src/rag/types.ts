/**
 * RAG module types – separate from main chat flow.
 * Used for "Add documents" / RAG retrieval only.
 */

export interface RAGChunk {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  index: number;
}

export interface RAGDocument {
  id: string;
  name: string;
  chunkIds: string[];
  addedAt: number;
}

export interface RAGRetrievalResult {
  chunk: RAGChunk;
  score: number;
}
