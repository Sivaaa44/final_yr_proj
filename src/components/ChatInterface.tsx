import { useState, useRef, useEffect } from 'react';
import { Message, Language, Document, DetectedIntent } from '../types';
import { getTranslation } from '../utils/translations';
import { SAMPLE_QUESTION_KEYS, getTopicFromQuery } from '../utils/legalTopics';
import { getGeminiResponse } from '../utils/gemini';
import { detectLanguage } from '../utils/languageDetection';
import { searchKanoon, extractSourceInfo, KanoonResult } from '../utils/kanoon';
import { extractDocumentText, ExtractedDocument } from '../utils/documentExtractor';
import { RTI_STEPS, RTIStep, RTIData, getRTIQuestion } from '../utils/rtiWizard';
import { generateRTIPDF } from '../utils/rtiPDFGenerator';
import { COMPLAINT_STEPS, ComplaintStep, ComplaintData, getComplaintQuestion } from '../utils/complaintWizard';
import { generateComplaintPDF } from '../utils/complaintPDFGenerator';
import { getEvidenceForQuery } from '../utils/legalEvidence';
import SourceCard from './SourceCard';

interface ChatInterfaceProps {
  language: Language;
  darkMode: boolean;
  onBack: () => void;
  onToggleDarkMode: () => void;
}

export default function ChatInterface({
  language,
  darkMode,
  onBack,
  onToggleDarkMode,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: getTranslation(language, 'greeting'),
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null);
  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocument | null>(null);
  const [, setIsExtracting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showTransparencyLog, setShowTransparencyLog] = useState(false);
  const [lastAsrConfidence, setLastAsrConfidence] = useState<number | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [lastTransparencyLog, setLastTransparencyLog] = useState<{
    languageDetected: Language;
    translationApplied: boolean;
    retrievalMethod: string;
    evidenceUnitsSelected: number;
    templateUsed?: string;
    asrConfidence?: number | null;
    interactionReliability?: 'High' | 'Medium' | 'Low';
    researchDetails?: {
      alpha: number;
      lexicalWeight: number;
      semanticWeight: number;
      evidenceRanking: string;
    };
  } | null>(null);

  // RTI Application Wizard
  const [rtiWizardActive, setRtiWizardActive] = useState(false);
  const [rtiStep, setRtiStep] = useState<RTIStep>('name');
  const [rtiData, setRtiData] = useState<RTIData>({
    fullName: '',
    address: '',
    publicAuthority: '',
    informationSought: '',
    reason: '',
  });

  // Complaint Letter Wizard
  const [complaintWizardActive, setComplaintWizardActive] = useState(false);
  const [complaintStep, setComplaintStep] = useState<ComplaintStep>('name');
  const [complaintData, setComplaintData] = useState<ComplaintData>({
    fullName: '',
    address: '',
    authority: '',
    incident: '',
    reliefSought: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const speechLangCodes: Record<Language, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = speechLangCodes[language] || 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence =
          typeof event.results[0][0].confidence === 'number' ? event.results[0][0].confidence : 0.87;
        setInputText(transcript || '');
        setLastAsrConfidence(confidence);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, [language]);

  const computeInteractionReliability = (confidence: number | null): 'High' | 'Medium' | 'Low' => {
    if (confidence === null || Number.isNaN(confidence)) return 'Medium';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const toggleEvidenceExpanded = (messageId: string) => {
    setExpandedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const detectedLang = detectLanguage(text, language);

      // Handle RTI wizard flow
      if (rtiWizardActive) {
        setIsTyping(false);
        handleRTIWizardResponse(text, detectedLang);
        return;
      }

      // Handle Complaint wizard flow
      if (complaintWizardActive) {
        setIsTyping(false);
        handleComplaintWizardResponse(text, detectedLang);
        return;
      }

      const inferredIntent: DetectedIntent = 'legal_query';
      const topicId = getTopicFromQuery(text);
      const evidenceSnippets = getEvidenceForQuery(text, 3);

      // Search Kanoon API silently
      let kanoonResults: KanoonResult[] = [];
      let sourceInfo: string | undefined;

      try {
        kanoonResults = await searchKanoon(text, 1, 2);
        if (kanoonResults.length > 0) {
          sourceInfo = extractSourceInfo(kanoonResults[0]);
        }
      } catch (kanoonError) {
        console.error('Kanoon search error:', kanoonError);
      }

      // Get Gemini response — only the AI answer, no formatting wrapper
      let responseText: string;
      try {
        responseText = await getGeminiResponse(
          text,
          detectedLang,
          kanoonResults,
          extractedDocument?.text
        );
      } catch (geminiError) {
        console.error('Gemini API call failed:', geminiError);
        responseText = language === 'en'
          ? 'We apologize for the technical difficulty. Please try again or contact a legal aid center.'
          : getTranslation(language, 'disclaimer');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,           // ← clean AI response only
        isAiResponse: true,           // ← flag for structured rendering
        sender: 'bot',
        timestamp: new Date(),
        source: sourceInfo,
        intent: inferredIntent,
        evidence: evidenceSnippets.map((e) => ({
          id: e.id,
          act: e.act,
          section: e.section,
          clause: e.clause,
        })),
        detectedLanguage: detectedLang,
        asrConfidence: lastAsrConfidence ?? undefined,
      };

      const interactionReliability = computeInteractionReliability(lastAsrConfidence);
      setLastTransparencyLog({
        languageDetected: detectedLang,
        translationApplied: detectedLang !== language,
        retrievalMethod: kanoonResults.length > 0 ? 'Hybrid (Lexical + Semantic + Kanoon)' : 'Semantic (Evidence DB + LLM)',
        evidenceUnitsSelected: evidenceSnippets.length,
        templateUsed:
          topicId === 'fir'
            ? 'FIR Guidance Template v1.0'
            : undefined,
        asrConfidence: lastAsrConfidence,
        interactionReliability,
      });

      setMessages((prev) => [...prev, botMessage]);

      if (ttsEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.lang = speechLangCodes[detectedLang] || 'en-IN';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: language === 'en'
          ? 'We apologize for the technical difficulty. Please try again or contact a legal aid center.'
          : getTranslation(language, 'disclaimer'),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert(getTranslation(language, 'voiceInput') + ' – ' + (language === 'en' ? 'Not supported in your browser' : 'आपके ब्राउज़र में समर्थित नहीं'));
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const doc: Document = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    };

    setUploadedDoc(doc);
    setIsExtracting(true);

    const docMessage: Message = {
      id: Date.now().toString(),
      text: `📄 ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, docMessage]);

    const processingId = (Date.now() + 1).toString();
    const processingMessage: Message = {
      id: processingId,
      text: language === 'hi' ? '📖 दस्तावेज़ पढ़ रहा है...' : '📖 Reading document...',
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      const extracted = await extractDocumentText(file);
      setExtractedDocument(extracted);
      setMessages((prev) => prev.filter(m => m.id !== processingId));

      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: language === 'hi'
          ? '✅ दस्तावेज़ पढ़ा गया! अब इस दस्तावेज़ के बारे में प्रश्न पूछें।'
          : '✅ Document read! You can now ask questions about this document.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      setMessages((prev) => prev.filter(m => m.id !== processingId));
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: language === 'hi' ? '❌ दस्तावेज़ पढ़ने में त्रुटि।' : '❌ Error reading document. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsExtracting(false);
    }
  };

  // ─── RTI Wizard ───────────────────────────────────────────────────────────
  const handleRTIWizardResponse = (text: string, _detectedLang: Language) => {
    const currentStepIndex = RTI_STEPS.indexOf(rtiStep);
    const updatedRtiData = { ...rtiData };
    switch (rtiStep) {
      case 'name': updatedRtiData.fullName = text; break;
      case 'address': updatedRtiData.address = text; break;
      case 'publicAuthority': updatedRtiData.publicAuthority = text; break;
      case 'informationSought': updatedRtiData.informationSought = text; break;
      case 'reason': updatedRtiData.reason = text; break;
    }
    setRtiData(updatedRtiData);

    if (currentStepIndex < RTI_STEPS.length - 2) {
      const nextStep = RTI_STEPS[currentStepIndex + 1];
      setRtiStep(nextStep);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: getRTIQuestion(nextStep, language),
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } else {
      setRtiStep('complete');
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: getRTIQuestion('complete', language),
        sender: 'bot',
        timestamp: new Date(),
      }]);
      setTimeout(() => {
        generateRTIPDF(updatedRtiData, language);
        setRtiWizardActive(false);
        setRtiStep('name');
        setRtiData({ fullName: '', address: '', publicAuthority: '', informationSought: '', reason: '' });
      }, 1000);
    }
  };

  const startRTIWizard = () => {
    setRtiWizardActive(true);
    setRtiStep('name');
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: getRTIQuestion('name', language),
      sender: 'bot',
      timestamp: new Date(),
    }]);
  };

  // ─── Complaint Wizard ─────────────────────────────────────────────────────
  const handleComplaintWizardResponse = (text: string, _detectedLang: Language) => {
    const currentStepIndex = COMPLAINT_STEPS.indexOf(complaintStep);
    const updatedData = { ...complaintData };
    switch (complaintStep) {
      case 'name': updatedData.fullName = text; break;
      case 'address': updatedData.address = text; break;
      case 'authority': updatedData.authority = text; break;
      case 'incident': updatedData.incident = text; break;
      case 'relief': updatedData.reliefSought = text; break;
    }
    setComplaintData(updatedData);

    if (currentStepIndex < COMPLAINT_STEPS.length - 2) {
      const nextStep = COMPLAINT_STEPS[currentStepIndex + 1];
      setComplaintStep(nextStep);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: getComplaintQuestion(nextStep, language),
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } else {
      setComplaintStep('complete');
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: getComplaintQuestion('complete', language),
        sender: 'bot',
        timestamp: new Date(),
      }]);
      setTimeout(() => {
        generateComplaintPDF(updatedData, language);
        setComplaintWizardActive(false);
        setComplaintStep('name');
        setComplaintData({ fullName: '', address: '', authority: '', incident: '', reliefSought: '' });
      }, 1000);
    }
  };

  const startComplaintWizard = () => {
    setComplaintWizardActive(true);
    setComplaintStep('name');
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: getComplaintQuestion('name', language),
      sender: 'bot',
      timestamp: new Date(),
    }]);
  };

  const sampleQuestions = SAMPLE_QUESTION_KEYS.map((key) => getTranslation(language, key));
  const activeWizard = rtiWizardActive ? 'rti' : complaintWizardActive ? 'complaint' : null;

  // Wizard step labels
  const rtiStepLabels: Record<RTIStep, string> = {
    name: 'Name', address: 'Address', publicAuthority: 'Authority',
    informationSought: 'Information', reason: 'Reason', complete: 'Done',
  };
  const complaintStepLabels: Record<ComplaintStep, string> = {
    name: 'Name', address: 'Address', authority: 'Authority',
    incident: 'Incident', relief: 'Relief', complete: 'Done',
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button onClick={onBack} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {getTranslation(language, 'appName')}
            </h2>
          </div>
          <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Intent → Retrieval → Evidence → Response → Draft
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS mute/unmute — clearly labelled */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              ttsEnabled
                ? darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-700'
                : darkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
            }`}
            title={ttsEnabled ? 'Mute voice output' : 'Unmute voice output'}
          >
            {ttsEnabled ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
            <span>{ttsEnabled ? 'Mute' : 'Unmuted'}</span>
          </button>
          <button onClick={onToggleDarkMode} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Active Wizard Progress Bar ──────────────────────────────── */}
      {activeWizard && (
        <div className={`px-4 py-3 border-b ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-blue-50 border-blue-100'}`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                {activeWizard === 'rti' ? '📋 RTI Application Wizard' : '📝 Complaint Letter Wizard'}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                {activeWizard === 'rti' ? 'Template: RTI Act, 2005' : 'Template: Complaint Letter v1.0'}
              </span>
            </div>

            {/* Step indicators */}
            <div className={`flex gap-1 ${activeWizard === 'rti' ? '' : ''}`}>
              {(activeWizard === 'rti' ? RTI_STEPS.slice(0, 5) : COMPLAINT_STEPS.slice(0, 5)).map((stepKey, idx) => {
                const currentIdx = activeWizard === 'rti'
                  ? RTI_STEPS.indexOf(rtiStep)
                  : COMPLAINT_STEPS.indexOf(complaintStep);
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const label = activeWizard === 'rti'
                  ? rtiStepLabels[stepKey as RTIStep]
                  : complaintStepLabels[stepKey as ComplaintStep];

                return (
                  <div key={stepKey} className={`flex-1 rounded px-1.5 py-1 text-center text-[10px] border transition-colors ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-500 text-white font-semibold'
                      : isCompleted
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : darkMode
                      ? 'border-gray-600 bg-gray-900 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {message.sender === 'user' ? (
              <div className="max-w-[80%] md:max-w-[65%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
            ) : message.isAiResponse ? (
              /* ── Structured AI response card ── */
              <div className={`max-w-[92%] md:max-w-[75%] rounded-2xl rounded-tl-sm border shadow-sm overflow-hidden ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                {/* Card header: intent + language badge */}
                <div className={`flex items-center justify-between px-4 py-2 border-b text-[11px] ${darkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <span className={`font-semibold flex items-center gap-1.5 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    Legal Query
                  </span>
                  {message.detectedLanguage && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                      Lang: {message.detectedLanguage.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Retrieved Legal Evidence (collapsible) */}
                {message.evidence && message.evidence.length > 0 && (
                  <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button
                      onClick={() => toggleEvidenceExpanded(message.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-semibold transition-colors ${
                        darkMode ? 'text-amber-300 hover:bg-gray-700/50' : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Retrieved Evidence ({message.evidence.length} clause{message.evidence.length !== 1 ? 's' : ''})
                      </span>
                      <svg className={`w-3.5 h-3.5 transition-transform ${expandedEvidence.has(message.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedEvidence.has(message.id) && (
                      <div className={`px-4 pb-3 space-y-2 ${darkMode ? 'bg-gray-900/40' : 'bg-amber-50/60'}`}>
                        {message.evidence.map((e) => (
                          <div key={e.id} className={`rounded-lg px-3 py-2 border-l-2 border-amber-400 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <p className={`text-[11px] font-semibold mb-0.5 ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                              {e.act} · {e.section}
                            </p>
                            <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              "{e.clause}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Grounded Response */}
                <div className="px-4 py-3">
                  <p className={`text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Grounded Legal Response
                  </p>
                  <div className={`text-sm whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {message.text}
                  </div>
                </div>

                {/* Card footer: copy button + source */}
                <div className={`flex items-center justify-between px-4 py-2 border-t ${darkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-100 bg-gray-50'}`}>
                  <button
                    onClick={() => copyToClipboard(message.text, message.id)}
                    className={`flex items-center gap-1 text-[11px] transition-colors ${
                      copiedMessageId === message.id
                        ? 'text-emerald-500'
                        : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {copiedMessageId === message.id ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  {message.evidence && message.evidence.length > 0 && !expandedEvidence.has(message.id) && (
                    <button
                      onClick={() => toggleEvidenceExpanded(message.id)}
                      className={`text-[11px] underline underline-offset-2 transition-colors ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-800'}`}
                    >
                      View {message.evidence.length} legal clause{message.evidence.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ── Plain bot message (greeting, wizard steps, errors) ── */
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tl-sm px-4 py-3 border ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-200 bg-white text-gray-800'}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </div>
            )}

            {/* Source card */}
            {message.sender === 'bot' && message.source && (
              <div className="mt-1 max-w-[80%] md:max-w-[60%]">
                <SourceCard source={message.source} darkMode={darkMode} language={language} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`inline-flex items-center gap-2.5 rounded-2xl rounded-tl-sm px-4 py-2.5 border ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
              <svg className="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Retrieving evidence &amp; generating response…</span>
            </div>
          </div>
        )}

        {/* Uploaded image preview */}
        {uploadedDoc && uploadedDoc.type.startsWith('image/') && (
          <div className="flex justify-end">
            <div className={`rounded-2xl p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <img src={uploadedDoc.url} alt={uploadedDoc.name} className="max-w-[200px] rounded-lg" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Sample Questions (first message only) ───────────────────── */}
      {messages.length <= 1 && (
        <div className={`px-4 pb-2 ${darkMode ? '' : ''}`}>
          <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {getTranslation(language, 'sampleQuestions')}:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sampleQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(question)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${
                  darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600'
                    : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                }`}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── How was this answered? (Transparency) ───────────────────── */}
      <div className={`px-4 py-2 border-t ${darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowTransparencyLog(!showTransparencyLog)}
            className={`w-full flex items-center justify-between text-[11px] font-medium ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How was this answered?
            </span>
            <svg className={`w-3 h-3 transition-transform ${showTransparencyLog ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTransparencyLog && (
            <div className={`mt-2 rounded-lg border px-3 py-2.5 text-[11px] ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              {lastTransparencyLog ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Language: </span>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{lastTransparencyLog.languageDetected.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Retrieval: </span>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{lastTransparencyLog.retrievalMethod}</span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Legal Clauses Used: </span>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{lastTransparencyLog.evidenceUnitsSelected}</span>
                  </div>
                  {typeof lastTransparencyLog.asrConfidence === 'number' && (
                    <div>
                      <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Voice Confidence: </span>
                      <span className={`font-semibold ${
                        lastTransparencyLog.interactionReliability === 'High' ? 'text-emerald-500' :
                        lastTransparencyLog.interactionReliability === 'Medium' ? 'text-amber-500' : 'text-red-500'
                      }`}>{lastTransparencyLog.interactionReliability}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                  Ask a legal question to see how the answer was generated.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Action Buttons ─────────────────────────────────────── */}
      {!activeWizard && (
        <div className={`px-4 py-2.5 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-[10px] mb-2 font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {/* Generate Documents — same style, distinct icon colors */}
            <button
              onClick={startRTIWizard}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {getTranslation(language, 'rtiApplication')}
            </button>
            <button
              onClick={startComplaintWizard}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Complaint Letter
            </button>
            {/* Quick legal topic queries — same style */}
            <button
              onClick={() => sendMessage(getTranslation(language, 'domesticViolence'))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {getTranslation(language, 'domesticViolence')}
            </button>
            <button
              onClick={() => sendMessage(getTranslation(language, 'landDispute'))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {getTranslation(language, 'landDispute')}
            </button>
            <button
              onClick={() => sendMessage(getTranslation(language, 'unpaidWages'))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {getTranslation(language, 'unpaidWages')}
            </button>
          </div>
        </div>
      )}

      {/* ── Input Area ───────────────────────────────────────────────── */}
      <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            title={getTranslation(language, 'uploadDocument')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
            placeholder={activeWizard
              ? (language === 'en' ? 'Type your answer…' : 'अपना उत्तर टाइप करें…')
              : (language === 'en' ? 'Describe your legal matter…' : getTranslation(language, 'startChat'))
            }
            className={`flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-blue-500 transition-colors text-sm ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />

          <button
            onClick={handleVoiceInput}
            className={`p-2.5 rounded-xl transition-colors ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={getTranslation(language, 'voiceInput')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* ASR confidence + hint */}
        <div className="mt-1.5 flex items-center justify-between">
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {getTranslation(language, 'voiceHint')}
          </p>
          {typeof lastAsrConfidence === 'number' && (
            <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ASR: {lastAsrConfidence.toFixed(2)} ·{' '}
              <span className={`font-semibold ${
                computeInteractionReliability(lastAsrConfidence) === 'High' ? 'text-emerald-500' :
                computeInteractionReliability(lastAsrConfidence) === 'Medium' ? 'text-amber-500' : 'text-red-500'
              }`}>
                {computeInteractionReliability(lastAsrConfidence)} reliability
              </span>
              {computeInteractionReliability(lastAsrConfidence) === 'Low' && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">– Please confirm your query</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
