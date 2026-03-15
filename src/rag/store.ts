/**
 * In-memory store for RAG chunks and document metadata.
 * Separate from main chat; used only by the RAG / Add documents flow.
 */

import type { RAGChunk, RAGDocument } from './types';
import { chunkText } from './chunker';

const chunks = new Map<string, RAGChunk>();
const documents = new Map<string, RAGDocument>();

function generateId(): string {
  return `rag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addDocument(fullText: string, documentName: string): RAGDocument {
  const docId = generateId();
  const textChunks = chunkText(fullText);
  const chunkIds: string[] = [];

  textChunks.forEach((text, index) => {
    const chunkId = `${docId}_chunk_${index}`;
    chunks.set(chunkId, {
      id: chunkId,
      documentId: docId,
      documentName,
      text,
      index,
    });
    chunkIds.push(chunkId);
  });

  const doc: RAGDocument = {
    id: docId,
    name: documentName,
    chunkIds,
    addedAt: Date.now(),
  };
  documents.set(docId, doc);
  return doc;
}

export function listDocuments(): RAGDocument[] {
  return Array.from(documents.values()).sort((a, b) => a.addedAt - b.addedAt);
}

export function getChunk(chunkId: string): RAGChunk | undefined {
  return chunks.get(chunkId);
}

export function getAllChunks(): RAGChunk[] {
  return Array.from(chunks.values());
}

export function removeDocument(docId: string): void {
  const doc = documents.get(docId);
  if (doc) {
    doc.chunkIds.forEach((id) => chunks.delete(id));
    documents.delete(docId);
  }
}

export function clearAll(): void {
  chunks.clear();
  documents.clear();
}
