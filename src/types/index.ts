export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu' | 'kn' | 'ml';

export type DetectedIntent = 'legal_query' | 'document_generation';

export interface MessageEvidenceSnippet {
  id: string;
  act: string;
  section: string;
  clause: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
  isAiResponse?: boolean; // true for structured AI responses with evidence panel
  source?: string; // Kanoon source info (e.g., "Section 498A IPC – Dowry Harassment")
  intent?: DetectedIntent;
  evidence?: MessageEvidenceSnippet[];
  detectedLanguage?: Language;
  asrConfidence?: number;
  isFromVoice?: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnail?: string;
}

