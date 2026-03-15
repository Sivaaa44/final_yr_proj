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

export default function LandingPage({
  language,
  onLanguageChange,
  onStartChat,
  onOpenRag,
  darkMode,
  onToggleDarkMode,
}: LandingPageProps) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 transition-colors duration-300 ${
      darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900'
    }`}>
      {/* Header with Language Selector and Dark Mode */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-full transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 shadow-md'
          }`}
          aria-label={getTranslation(language, darkMode ? 'lightMode' : 'darkMode')}
        >
          {darkMode ? (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:border-primary cursor-pointer text-sm font-medium`}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="text-center max-w-3xl w-full space-y-10">
        <div className="space-y-6">
          <div className="inline-block">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-50'
            }`}>
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className={`text-5xl md:text-7xl font-bold leading-tight ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <span className="block">{getTranslation(language, 'appName')}</span>
          </h1>
          <p className={`text-xl md:text-2xl font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {getTranslation(language, 'tagline')}
          </p>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onStartChat}
            className="bg-primary hover:bg-blue-600 text-white text-lg font-semibold px-10 py-4 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 w-full md:w-auto min-w-[200px]"
          >
            {getTranslation(language, 'startChat')}
          </button>
          <button
            onClick={onOpenRag}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold px-10 py-4 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 w-full md:w-auto min-w-[200px] border-0"
          >
            Add documents (RAG)
          </button>
        </div>

        {/* Features */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <div className={`p-6 rounded-2xl transition-all hover:scale-105 ${
            darkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-white hover:bg-gray-50 shadow-md hover:shadow-lg'
          }`}>
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-50'
            }`}>
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Legal Consultation</h3>
            <p className="text-sm">Professional legal guidance</p>
          </div>
          <div className={`p-6 rounded-2xl transition-all hover:scale-105 ${
            darkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-white hover:bg-gray-50 shadow-md hover:shadow-lg'
          }`}>
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-50'
            }`}>
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Multi-Language Support</h3>
            <p className="text-sm">Available in 9 languages</p>
          </div>
          <div className={`p-6 rounded-2xl transition-all hover:scale-105 ${
            darkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-white hover:bg-gray-50 shadow-md hover:shadow-lg'
          }`}>
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-50'
            }`}>
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Document Analysis</h3>
            <p className="text-sm">Review and consultation</p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className={`text-sm pt-8 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {getTranslation(language, 'disclaimer')}
        </p>
      </div>
    </div>
  );
}

