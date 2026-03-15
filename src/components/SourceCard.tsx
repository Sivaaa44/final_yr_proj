import { useState } from 'react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

interface SourceCardProps {
  source: string;
  darkMode: boolean;
  language: Language;
}

export default function SourceCard({ source, darkMode, language }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`mt-2 rounded-lg border transition-all ${
      darkMode 
        ? 'border-gray-600 bg-gray-800' 
        : 'border-gray-300 bg-gray-100'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-3 py-2 flex items-center justify-between text-left ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium">
            {isExpanded ? getTranslation(language, 'hideSource') : getTranslation(language, 'viewSource')}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className={`px-3 pb-3 text-xs ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {source}
        </div>
      )}
    </div>
  );
}

