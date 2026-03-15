/**
 * RAG (Retrieval Augmented Generation) UI – separate from main chat.
 * Add documents → chunk & store → query → retrieve chunks (optional: generate answer with Gemini).
 */
import { useState, useRef } from 'react';
import * as rag from '../rag';
import type { RAGDocument, RAGRetrievalResult } from '../rag';
import { extractDocumentText } from '../utils/documentExtractor';
import { getGeminiResponse } from '../utils/gemini';

interface RagViewProps {
  darkMode: boolean;
  onBack: () => void;
}

export default function RagView({ darkMode, onBack }: RagViewProps) {
  const [documents, setDocuments] = useState<RAGDocument[]>(rag.listDocuments());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAGRetrievalResult[]>([]);
  const [generatedAnswer, setGeneratedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDocs = () => setDocuments(rag.listDocuments());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const extracted = await extractDocumentText(file);
      rag.addDocument(extracted.text, extracted.fileName);
      refreshDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read document');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveDoc = (docId: string) => {
    rag.removeDocument(docId);
    refreshDocs();
    setResults([]);
    setGeneratedAnswer(null);
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setError(null);
    setGeneratedAnswer(null);
    const retrieved = rag.retrieve(query.trim(), 5);
    setResults(retrieved);
  };

  const handleGenerateAnswer = async () => {
    if (!query.trim() || results.length === 0) return;
    setError(null);
    setLoading(true);
    setGeneratedAnswer(null);
    try {
      const context = results.map((r) => r.chunk.text).join('\n\n---\n\n');
      const answer = await getGeminiResponse(
        query.trim(),
        'en',
        [],
        context
      );
      setGeneratedAnswer(answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate answer');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    rag.clearAll();
    refreshDocs();
    setResults([]);
    setQuery('');
    setGeneratedAnswer(null);
    setError(null);
  };

  const base = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const input = darkMode
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen flex flex-col ${base}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={onBack}
          className="p-2 hover:opacity-80 rounded-lg transition-colors"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">RAG – Add Documents</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full space-y-6">
        {/* Add documents */}
        <section className={`rounded-xl border p-4 ${card}`}>
          <h2 className="font-semibold mb-3">Add documents to RAG index</h2>
          <p className={`text-sm mb-3 ${muted}`}>
            Upload PDF, image, or DOCX. Text is extracted in the browser, chunked, and stored for retrieval. Not sent to the main chat.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {loading ? 'Processing…' : 'Choose file & add to RAG'}
          </button>
        </section>

        {/* List of documents */}
        <section className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Indexed documents ({documents.length})</h2>
            {documents.length > 0 && (
              <button
                onClick={handleClearAll}
                className={`text-sm ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
              >
                Clear all
              </button>
            )}
          </div>
          {documents.length === 0 ? (
            <p className={`text-sm ${muted}`}>No documents yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}
                >
                  <span className="text-sm truncate flex-1 mr-2">{doc.name}</span>
                  <span className={`text-xs ${muted}`}>{doc.chunkIds.length} chunks</span>
                  <button
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="ml-2 text-red-500 hover:text-red-400 text-sm"
                    aria-label="Remove"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Query & retrieve */}
        <section className={`rounded-xl border p-4 ${card}`}>
          <h2 className="font-semibold mb-3">Query your documents (RAG retrieval)</h2>
          <p className={`text-sm mb-3 ${muted}`}>
            Search by keywords. Retrieval uses stored chunks only (no main chat).
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask about your documents…"
              className={`flex-1 px-3 py-2 rounded-lg border ${input}`}
            />
            <button
              onClick={handleSearch}
              disabled={documents.length === 0}
              className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Search
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          {/* Retrieved chunks */}
          {results.length > 0 && (
            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-medium">Retrieved chunks</h3>
              {results.map((r) => (
                <div
                  key={r.chunk.id}
                  className={`text-sm p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}
                >
                  <span className={`text-xs ${muted}`}>
                    {r.chunk.documentName} (chunk {r.chunk.index + 1}, score: {r.score.toFixed(2)})
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{r.chunk.text.slice(0, 400)}{r.chunk.text.length > 400 ? '…' : ''}</p>
                </div>
              ))}
              <button
                onClick={handleGenerateAnswer}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {loading ? 'Generating…' : 'Generate answer (Gemini + retrieved context)'}
              </button>
            </div>
          )}

          {generatedAnswer && (
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}>
              <h3 className="text-sm font-medium mb-2">Generated answer (RAG + Gemini)</h3>
              <p className="text-sm whitespace-pre-wrap">{generatedAnswer}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
