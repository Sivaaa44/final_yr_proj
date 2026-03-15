/**
 * Single source of truth for legal topics: used for fallback responses,
 * sample questions, and mock Kanoon citation mapping.
 */
export const LEGAL_TOPIC_IDS = [
  'fir',
  'domestic violence',
  'land dispute',
  'dowry harassment',
  'dowry',
  'wages',
  'theft',
] as const;

export type LegalTopicId = (typeof LEGAL_TOPIC_IDS)[number];

export interface LegalTopicConfig {
  id: LegalTopicId;
  /** Keywords/phrases to match in user query (case-insensitive where string) */
  keywords: string[];
  /** Translation key for sample question label (e.g. firHowTo, domesticViolence) */
  labelKey: string;
}

export const LEGAL_TOPICS: LegalTopicConfig[] = [
  {
    id: 'fir',
    keywords: ['fir', 'first information report'],
    labelKey: 'firHowTo',
  },
  {
    id: 'domestic violence',
    keywords: ['मार', 'हिंसा', 'beat', 'violence', 'domestic'],
    labelKey: 'domesticViolence',
  },
  {
    id: 'land dispute',
    keywords: ['जमीन', 'land', 'भूमि', 'property', 'dispute'],
    labelKey: 'landDispute',
  },
  {
    id: 'dowry harassment',
    keywords: ['harassment', 'उत्पीड़न', '498', 'dowry harassment'],
    labelKey: 'dowryDemand',
  },
  {
    id: 'dowry',
    keywords: ['दहेज', 'dowry'],
    labelKey: 'dowryDemand',
  },
  {
    id: 'wages',
    keywords: ['मजदूरी', 'wage', 'कूली', 'wages', 'unpaid'],
    labelKey: 'unpaidWages',
  },
  {
    id: 'theft',
    keywords: ['चोरी', 'theft', 'stolen'],
    labelKey: 'unpaidWages', // re-use; we have no separate theft chip, use unpaidWages or add theftQuestion
  },
];

/** Map topic id to sample question key (for chips we use firHowTo, domesticViolence, landDispute, dowryDemand, unpaidWages) */
export const TOPIC_TO_SAMPLE_LABEL_KEY: Record<LegalTopicId, string> = {
  fir: 'firHowTo',
  'domestic violence': 'domesticViolence',
  'land dispute': 'landDispute',
  'dowry harassment': 'dowryDemand',
  dowry: 'dowryDemand',
  wages: 'unpaidWages',
  theft: 'unpaidWages',
};

/**
 * Translation keys used for the 5 sample question chips in chat.
 */
export const SAMPLE_QUESTION_KEYS = [
  'firHowTo',
  'domesticViolence',
  'landDispute',
  'dowryDemand',
  'unpaidWages',
] as const;

/**
 * Returns the first matching topic id for the query, or null.
 * Order of LEGAL_TOPICS matters (e.g. dowry harassment before dowry).
 */
export function getTopicFromQuery(query: string): LegalTopicId | null {
  const lower = query.toLowerCase();
  for (const topic of LEGAL_TOPICS) {
    const matches = topic.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    if (matches) return topic.id;
  }
  return null;
}
