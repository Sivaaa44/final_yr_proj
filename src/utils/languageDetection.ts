import { Language } from '../types';

// Simple language detection based on character patterns (script-based)

// Character range checks for Indian languages
const languagePatterns: Array<{ pattern: RegExp; lang: Language }> = [
  { pattern: /[\u0900-\u097F]/, lang: 'hi' }, // Devanagari (Hindi, Marathi)
  { pattern: /[\u0B80-\u0BFF]/, lang: 'ta' }, // Tamil
  { pattern: /[\u0C00-\u0C7F]/, lang: 'te' }, // Telugu
  { pattern: /[\u0980-\u09FF]/, lang: 'bn' }, // Bengali
  { pattern: /[\u0A80-\u0AFF]/, lang: 'gu' }, // Gujarati
  { pattern: /[\u0C80-\u0CFF]/, lang: 'kn' }, // Kannada
  { pattern: /[\u0D00-\u0D7F]/, lang: 'ml' }, // Malayalam
];

/**
 * Detects the language of the input text
 * Falls back to provided defaultLanguage if detection fails
 */
export const detectLanguage = (text: string, defaultLanguage: Language = 'en'): Language => {
  if (!text || text.trim().length === 0) {
    return defaultLanguage;
  }

  // Check for Indian language scripts first
  for (const { pattern, lang } of languagePatterns) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  // If no Indian script found, check if it's English
  // More comprehensive English detection
  const hasOnlyEnglishChars = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text);
  const englishWords = /\b(the|is|are|and|or|but|how|what|when|where|why|can|will|should|file|fir|law|legal|land|dispute|theft|dowry|violence|wages|help|problem)\b/i;
  
  if (hasOnlyEnglishChars && (englishWords.test(text) || text.length > 0)) {
    console.log('🔍 Language detected: English');
    return 'en';
  }

  // Fallback to default
  console.log(`🔍 Language detection: Using default (${defaultLanguage})`);
  return defaultLanguage;
};

