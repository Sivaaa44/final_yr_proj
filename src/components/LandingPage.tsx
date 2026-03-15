import { Language } from '../types';
import { languages, getTranslation } from '../utils/translations';

interface LandingPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onStartChat: () => void;
  onOpenRag: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
    label: 'Clause-Level Evidence',
    desc: 'Retrieves specific legal clauses — not whole documents — as grounding for every response.',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    label: 'Multilingual AI',
    desc: 'Handles queries in 9 Indian regional languages with automatic detection.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Document Drafting',
    desc: 'Generate RTI applications and complaint letters from guided templates with one click.',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    label: 'Voice Input',
    desc: 'Speak your query in any Indian language. Confidence-aware — asks to confirm if unclear.',
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Transparency Log',
    desc: 'Every response shows retrieval method, evidence units used, and ASR confidence score.',
    color: 'from-cyan-500 to-sky-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    label: 'Hybrid Retrieval',
    desc: 'Combines BM25 lexical search with semantic embeddings for maximum coverage.',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
];

const pipeline = ['Intent', 'Retrieval', 'Evidence', 'Response', 'Draft'];

export default function LandingPage({
  language,
  onLanguageChange,
  onStartChat,
  onOpenRag,
  darkMode,
  onToggleDarkMode,
}: LandingPageProps) {
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      darkMode
        ? 'bg-gray-950 text-white'
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900'
    }`}>
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 border-b backdrop-blur-md ${
        darkMode
          ? 'bg-gray-950/80 border-gray-800'
          : 'bg-white/70 border-gray-200/60'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className={`font-bold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            CLiVER-RAG
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16 text-center">
        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 border ${
          darkMode
            ? 'bg-blue-900/30 border-blue-700 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Multilingual Legal Assistance · Gemini AI · Indian Law
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-none tracking-tight mb-4">
          <span className={`bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600`}>
            CLiVER-RAG
          </span>
        </h1>

        <p className={`text-xl md:text-2xl font-medium mb-3 max-w-2xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {getTranslation(language, 'tagline')}
        </p>
        <p className={`text-sm mb-10 max-w-xl ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Clause-Level Evidence · Verified by Indian statute · 9 regional languages
        </p>

        {/* Pipeline visualization */}
        <div className={`flex items-center gap-0 mb-10 px-4 py-2.5 rounded-2xl border overflow-x-auto ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          {pipeline.map((step, i) => (
            <div key={step} className="flex items-center">
              <span className={`text-xs font-semibold px-3 py-1 rounded-lg whitespace-nowrap ${
                darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-700'
              }`}>
                {step}
              </span>
              {i < pipeline.length - 1 && (
                <svg className={`w-4 h-4 mx-1 flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md">
          <button
            onClick={onStartChat}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {getTranslation(language, 'startChat')}
          </button>
          <button
            onClick={onOpenRag}
            className={`flex items-center justify-center gap-2 text-base font-semibold px-8 py-4 rounded-xl border-2 transform hover:-translate-y-0.5 transition-all duration-200 ${
              darkMode
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add Documents (RAG)
          </button>
        </div>
      </main>

      {/* ── Feature Grid ─────────────────────────────────────────────── */}
      <section className="px-6 pb-16 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.label}
              className={`group p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default ${
                darkMode
                  ? 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-gray-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br ${f.color} text-white shadow-sm`}>
                {f.icon}
              </div>
              <h3 className={`font-bold text-sm mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {f.label}
              </h3>
              <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className={`text-center px-6 py-6 border-t text-[11px] ${
        darkMode ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'
      }`}>
        {getTranslation(language, 'disclaimer')}
        <span className="mx-2">·</span>
        Built with Gemini AI · Indian Kanoon · CLiVER-RAG Architecture
      </footer>
    </div>
  );
}
