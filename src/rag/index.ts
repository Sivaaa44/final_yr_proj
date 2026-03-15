/**
 * RAG module – public API.
 * Separate from main chat; used only by "Add documents" / RAG UI.
 *
 * - addDocument(text, name): chunk and store
 * - listDocuments(): list stored docs
 * - retrieve(query, topK): get relevant chunks
 * - removeDocument(id), clearAll(): maintenance
 */

export type { RAGChunk, RAGDocument, RAGRetrievalResult } from './types';
export { chunkText } from './chunker';
export {
  addDocument,
  listDocuments,
  getChunk,
  getAllChunks,
  removeDocument,
  clearAll,
} from './store';
export { retrieve } from './retriever';
