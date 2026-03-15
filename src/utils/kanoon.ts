import { getTopicFromQuery } from './legalTopics';

const API_BASE_URL = 'https://api.indiankanoon.org/search/';
const API_TOKEN = import.meta.env.VITE_KANOON_TOKEN;

export interface KanoonResult {
  title: string;
  headline: string;
  tid: string;
  docsource: string;
  docsize?: number;
}

/** Demo-only: mock citations so Source card shows when real API is unavailable (CORS / no token) */
function getMockKanoonResults(query: string): KanoonResult[] {
  const topicId = getTopicFromQuery(query);
  if (!topicId) return [];
  const mocks: Record<string, KanoonResult[]> = {
    fir: [
      { title: 'Section 154 CrPC – FIR Registration', headline: 'First Information Report to be recorded by officer in charge of police station.', tid: 'demo-154-crpc', docsource: 'Code of Criminal Procedure, 1973' },
    ],
    'domestic violence': [
      { title: 'Section 498A IPC – Cruelty by husband or relatives', headline: 'Whoever, being the husband or relative of the husband of a woman, subjects such woman to cruelty.', tid: 'demo-498a', docsource: 'Indian Penal Code' },
    ],
    'land dispute': [
      { title: 'Section 447 IPC – Criminal trespass', headline: 'Whoever enters into or upon property in possession of another with intent to commit an offence.', tid: 'demo-447-ipc', docsource: 'Indian Penal Code' },
    ],
    'dowry harassment': [
      { title: 'Section 498A IPC – Dowry harassment', headline: 'Cruelty for dowry demand; Dowry Prohibition Act, 1961.', tid: 'demo-498a-dowry', docsource: 'Indian Penal Code' },
    ],
    dowry: [
      { title: 'Dowry Prohibition Act, 1961', headline: 'Demanding and giving dowry are both illegal.', tid: 'demo-dowry-act', docsource: 'Central Act' },
    ],
    wages: [
      { title: 'Payment of Wages Act, 1936', headline: 'Regulates payment of wages to certain classes of employed persons.', tid: 'demo-wages-act', docsource: 'Central Act' },
    ],
    theft: [
      { title: 'Section 379 IPC – Theft', headline: 'Whoever, with intent to take dishonestly any movable property out of the possession of any person.', tid: 'demo-379-ipc', docsource: 'Indian Penal Code' },
    ],
  };
  const results = mocks[topicId];
  if (results) console.log('📎 Using mock Kanoon citation (demo) for topic:', topicId);
  return results || [];
}

export interface KanoonResponse {
  found?: number;
  docs?: KanoonResult[];
}

/**
 * Search Indian Kanoon API for legal cases and acts
 */
export const searchKanoon = async (
  query: string,
  page: number = 0,
  limit: number = 2
): Promise<KanoonResult[]> => {
  console.log('📚 Indian Kanoon API called');
  console.log('  - Query:', query);
  
  // If no token, use mock results so demo still shows Source card
  if (!API_TOKEN) {
    console.warn('⚠️ Kanoon API token not found - using mock citations for demo');
    return getMockKanoonResults(query).slice(0, limit);
  }

  console.log('✅ Kanoon API token found, making request...');

  try {
    // Convert query to English if needed (simple transliteration for common terms)
    const englishQuery = transliterateToEnglish(query);
    console.log('  - Translated query:', englishQuery);

    // Build URL with query params
    const url = `${API_BASE_URL}?formInput=${encodeURIComponent(englishQuery)}&pagenum=${page}`;
    console.log('  - Request URL:', url.replace(API_TOKEN, 'TOKEN_HIDDEN'));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${API_TOKEN}`,
          'Accept': 'application/json',
        },
      });
    } catch (fetchError) {
      // CORS error - API doesn't allow browser requests (expected for demo)
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        console.warn('⚠️ Kanoon API CORS blocked - using mock citations for demo');
        return getMockKanoonResults(query).slice(0, limit);
      }
      throw fetchError;
    }

    console.log('  - Response status:', response.status);

    if (!response.ok) {
      console.warn('⚠️ Kanoon API error', response.status, '- using mock citations for demo');
      return getMockKanoonResults(query).slice(0, limit);
    }

    const data: KanoonResponse = await response.json();
    console.log('  - Full response data:', JSON.stringify(data, null, 2));
    
    if (data.docs && data.docs.length > 0) {
      const results = data.docs.slice(0, limit);
      console.log(`✅ Kanoon API success: Found ${data.found || results.length} total, returning ${results.length} results`);
      results.forEach((result, idx) => {
        console.log(`  - Result ${idx + 1}:`, {
          title: result.title,
          headline: result.headline?.substring(0, 100),
          tid: result.tid,
          docsource: result.docsource,
        });
      });
      return results;
    }

    console.log('⚠️ Kanoon API returned no results - using mock citations for demo');
    return getMockKanoonResults(query).slice(0, limit);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('⚠️ Kanoon API network error - using mock citations for demo');
      return getMockKanoonResults(query).slice(0, limit);
    }
    console.error('❌ Kanoon API unexpected error:', error);
    return getMockKanoonResults(query).slice(0, limit);
  }
};

/**
 * Simple transliteration helper for common Hindi/regional terms to English
 * This helps Kanoon API find relevant results
 */
const transliterateToEnglish = (text: string): string => {
  // Common legal term mappings
  const mappings: Record<string, string> = {
    'fir': 'FIR',
    'दहेज': 'dowry',
    'हिंसा': 'violence',
    'मार': 'assault',
    'जमीन': 'land',
    'भूमि': 'land',
    'मजदूरी': 'wages',
    'कूली': 'wages',
    'चोरी': 'theft',
    'धोखाधड़ी': 'fraud',
    '498a': '498A',
    '498A': '498A',
    'ipc': 'IPC',
    'crpc': 'CrPC',
    'दहेज उत्पीड़न': 'dowry harassment',
    'domestic violence': 'domestic violence',
  };

  let result = text.toLowerCase();
  
  // Replace common terms
  for (const [hindi, english] of Object.entries(mappings)) {
    result = result.replace(new RegExp(hindi, 'gi'), english);
  }

  // If text contains Devanagari or other scripts, try to extract English legal terms
  // Otherwise return as-is (might already be in English)
  return result.trim() || text;
};

/**
 * Format Kanoon results for Gemini prompt
 */
export const formatKanoonResults = (results: KanoonResult[]): string => {
  if (results.length === 0) {
    return '';
  }

  let formatted = '\n\nReal Indian laws/judgments from IndianKanoon.org:\n';
  
  results.forEach((result, index) => {
    formatted += `\n[${index + 1}] `;
    
    if (result.title) {
      formatted += `Case: ${result.title}\n`;
    }
    
    if (result.headline) {
      formatted += `Summary: ${result.headline.substring(0, 300)}\n`;
    }
    
    if (result.docsource) {
      formatted += `Court: ${result.docsource}\n`;
    }
    
    if (result.tid) {
      formatted += `Document ID: ${result.tid}\n`;
    }
  });

  return formatted;
};

/**
 * Extract source information from Kanoon result for display
 */
export const extractSourceInfo = (result: KanoonResult): string => {
  const parts: string[] = [];
  
  if (result.title) {
    parts.push(`Case: ${result.title}`);
  }
  
  if (result.docsource) {
    parts.push(`Court: ${result.docsource}`);
  }
  
  return parts.filter(Boolean).join(' | ') || 'IndianKanoon.org';
};
