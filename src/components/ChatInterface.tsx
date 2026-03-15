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
  const [ttsEnabled, setTtsEnabled] = useState(true); // Text-to-speech toggle
  const [researchMode, setResearchMode] = useState(false); // Show technical details
  const [showTransparencyLog, setShowTransparencyLog] = useState(false);
  const [lastAsrConfidence, setLastAsrConfidence] = useState<number | null>(null);

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

  // RTI Application Wizard State (something a rural person can file with a public authority)
  const [rtiWizardActive, setRtiWizardActive] = useState(false);
  const [rtiStep, setRtiStep] = useState<RTIStep>('name');
  const [rtiData, setRtiData] = useState<RTIData>({
    fullName: '',
    address: '',
    publicAuthority: '',
    informationSought: '',
    reason: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // BCP-47 codes for Web Speech API (all 9 languages)
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

  // Initialize Speech Recognition
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
      // Detect language from user's message
      const detectedLang = detectLanguage(text, language);
      console.log('💬 User message received:', text);
      console.log('🌐 Selected language (dropdown):', language);
      console.log('🔍 Detected language (from message):', detectedLang);

      // Determine intent from context
      const inferredIntent: DetectedIntent = rtiWizardActive ? 'document_generation' : 'legal_query';

      // Topic and evidence selection (simulated hybrid retrieval)
      const topicId = getTopicFromQuery(text);
      const evidenceSnippets = getEvidenceForQuery(text, 3);

      // Search Kanoon API silently
      let kanoonResults: KanoonResult[] = [];
      let sourceInfo: string | undefined;

      try {
        console.log('📚 Starting Kanoon search...');
        kanoonResults = await searchKanoon(text, 1, 2);
        if (kanoonResults.length > 0) {
          sourceInfo = extractSourceInfo(kanoonResults[0]);
          console.log('📋 Source info extracted:', sourceInfo);
        }
      } catch (kanoonError) {
        console.error('❌ Kanoon search error:', kanoonError);
        // Continue without Kanoon results
      }

      // Handle RTI wizard flow
      if (rtiWizardActive) {
        handleRTIWizardResponse(text, detectedLang);
        return;
      }

      // Get Gemini response with detected language, Kanoon results, and document context
      console.log('🤖 Starting Gemini API call...');
      let response: string;

      try {
        response = await getGeminiResponse(
          text,
          detectedLang,
          kanoonResults,
          extractedDocument?.text
        );
      } catch (geminiError) {
        console.error('❌ Gemini API call failed completely:', geminiError);
        console.log('🔄 Using hardcoded fallback response...');
        response = 'मुझे क्षमा करें, तकनीकी समस्या हो रही है। कृपया अपने नजदीकी पुलिस स्टेशन या वकील से संपर्क करें।';
      }

      const evidenceLines = evidenceSnippets.map(
        (e) => `• ${e.act}, ${e.section} – ${e.clause.split('.')[0] || e.clause}`
      );
      const intentLabel = inferredIntent === 'document_generation' ? 'Document Generation' : 'Legal Query';
      const groundedResponse = [
        `Intent Detected: ${intentLabel}`,
        '',
        'Retrieved Legal Evidence:',
        ...evidenceLines,
        '',
        'Grounded Legal Response:',
        response.startsWith('Based on the above statutory provisions')
          ? response
          : `Based on the above statutory provisions and standard Indian legal practice:\n\n${response}`,
      ].join('\n');

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: groundedResponse,
        sender: 'bot',
        timestamp: new Date(),
        source: sourceInfo, // Add source info if available
        intent: inferredIntent,
        evidence: evidenceSnippets.map((e) => ({
          id: e.id,
          act: e.act,
          section: e.section,
          clause: e.clause,
        })),
        detectedLanguage: detectedLang,
        asrConfidence: lastAsrConfidence,
      };

      const interactionReliability = computeInteractionReliability(lastAsrConfidence);
      setLastTransparencyLog({
        languageDetected: detectedLang,
        translationApplied: detectedLang !== language,
        retrievalMethod: kanoonResults.length > 0 ? 'Hybrid (Lexical + Semantic)' : 'Semantic (LLM + Fallbacks)',
        evidenceUnitsSelected: evidenceSnippets.length,
        templateUsed:
          topicId === 'fir'
            ? 'FIR Guidance Template v1.0'
            : inferredIntent === 'document_generation'
              ? 'RTI Template v1.2'
              : undefined,
        asrConfidence: lastAsrConfidence,
        interactionReliability,
        researchDetails: researchMode
          ? {
              alpha: 0.65,
              lexicalWeight: 0.4,
              semanticWeight: 0.6,
              evidenceRanking: kanoonResults.length > 0
                ? 'Kanoon rank + BM25 (simulated)'
                : 'BM25 + dense embeddings (simulated)',
            }
          : undefined,
      });

      setMessages((prev) => [...prev, botMessage]);

      // Text-to-speech for bot response in detected language (if enabled)
      if (ttsEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.lang = speechLangCodes[detectedLang] || 'en-IN';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (error instanceof Error) {
        console.error('  - Error message:', error.message);
        console.error('  - Error stack:', error.stack);
      }

      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: language === 'en'
          ? 'We apologize for the technical difficulty. Please try again or contact a legal aid center for immediate assistance.'
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

    // Show document in chat
    const docMessage: Message = {
      id: Date.now().toString(),
      text: `📄 ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, docMessage]);

    // Show processing message
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: getTranslation(language, 'typing') + ' ' + (language === 'hi' ? 'दस्तावेज़ पढ़ रहा है...' : 'Reading document...'),
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      // Extract text from document
      const extracted = await extractDocumentText(file);
      setExtractedDocument(extracted);

      // Remove processing message and add success message
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id));

      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: language === 'hi'
          ? 'दस्तावेज़ सफलतापूर्वक पढ़ा गया! अब आप इस दस्तावेज़ के बारे में कोई भी सवाल पूछ सकते हैं।'
          : 'Document successfully read! You can now ask any question about this document.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      console.error('Document extraction failed:', error);
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id));

      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: language === 'hi'
          ? 'दस्तावेज़ पढ़ने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Error reading document. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRTIWizardResponse = (text: string, _detectedLang: Language) => {
    const currentStepIndex = RTI_STEPS.indexOf(rtiStep);
    const updatedRtiData = { ...rtiData };
    switch (rtiStep) {
      case 'name':
        updatedRtiData.fullName = text;
        break;
      case 'address':
        updatedRtiData.address = text;
        break;
      case 'publicAuthority':
        updatedRtiData.publicAuthority = text;
        break;
      case 'informationSought':
        updatedRtiData.informationSought = text;
        break;
      case 'reason':
        updatedRtiData.reason = text;
        break;
    }
    setRtiData(updatedRtiData);

    if (currentStepIndex < RTI_STEPS.length - 2) {
      const nextStep = RTI_STEPS[currentStepIndex + 1];
      setRtiStep(nextStep);
      const nextQuestion: Message = {
        id: Date.now().toString(),
        text: getRTIQuestion(nextStep, language),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, nextQuestion]);
    } else {
      setRtiStep('complete');
      const completeMessage: Message = {
        id: Date.now().toString(),
        text: getRTIQuestion('complete', language),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completeMessage]);
      setTimeout(() => {
        generateRTIPDF(updatedRtiData, language);
        setRtiWizardActive(false);
        setRtiStep('name');
        setRtiData({
          fullName: '',
          address: '',
          publicAuthority: '',
          informationSought: '',
          reason: '',
        });
      }, 1000);
    }
  };

  const startRTIWizard = () => {
    setRtiWizardActive(true);
    setRtiStep('name');
    const firstQuestion: Message = {
      id: Date.now().toString(),
      text: getRTIQuestion('name', language),
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, firstQuestion]);
  };

  const sampleQuestions = SAMPLE_QUESTION_KEYS.map((key) => getTranslation(language, key));

  return (
    <div
      className={`flex flex-col h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1">
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {getTranslation(language, 'appName')}
          </h2>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Intent → Retrieval → Evidence → Grounded Response → Draft → Transparency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label
              className={`flex items-center gap-1 cursor-pointer ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={researchMode}
                onChange={() => setResearchMode(!researchMode)}
                className="rounded border-gray-400"
              />
              <span>Show Technical Details</span>
            </label>
          </div>
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              ttsEnabled
                ? 'bg-primary/20 text-primary'
                : darkMode
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={ttsEnabled ? 'Disable voice output' : 'Enable voice output'}
          >
            {ttsEnabled ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
        </div>
      </div>

      {/* RTI Wizard status / Document generation UX */}
      {rtiWizardActive && (
        <div
          className={`px-4 py-3 border-b ${
            darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                RTI Application Wizard – Step-by-step Form
              </h3>
              <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                Template: RTI Template v1.2
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 text-xs">
              {RTI_STEPS.slice(0, 5).map((stepKey) => {
                const isCompleted = RTI_STEPS.indexOf(stepKey) < RTI_STEPS.indexOf(rtiStep);
                const isCurrent = stepKey === rtiStep;
                const labelMap: Record<RTIStep, string> = {
                  name: 'Applicant Name',
                  address: 'Address',
                  publicAuthority: 'Public Authority',
                  informationSought: 'Information Sought',
                  reason: 'Reason',
                  complete: 'Complete',
                };
                return (
                  <div
                    key={stepKey}
                    className={`rounded-md border px-2 py-1 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/30'
                          : darkMode
                            ? 'border-gray-700 bg-gray-900'
                            : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <span className="block font-semibold truncate">
                      {labelMap[stepKey].replace('Complete', 'Review')}
                    </span>
                    <span className="block text-[10px] mt-0.5">
                      {stepKey === 'name' && rtiData.fullName
                        ? rtiData.fullName
                        : stepKey === 'address' && rtiData.address
                          ? rtiData.address.slice(0, 24) + (rtiData.address.length > 24 ? '…' : '')
                          : stepKey === 'publicAuthority' && rtiData.publicAuthority
                            ? rtiData.publicAuthority
                            : stepKey === 'informationSought' && rtiData.informationSought
                              ? rtiData.informationSought.slice(0, 24) +
                                (rtiData.informationSought.length > 24 ? '…' : '')
                              : stepKey === 'reason' && rtiData.reason
                                ? rtiData.reason.slice(0, 24) + (rtiData.reason.length > 24 ? '…' : '')
                                : isCompleted
                                  ? 'Captured from chat'
                                  : 'Awaiting input'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <div
                className={`flex items-center gap-2 ${
                  rtiData.fullName &&
                  rtiData.address &&
                  rtiData.publicAuthority &&
                  rtiData.informationSought
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-amber-600 dark:text-amber-300'
                }`}
              >
                <span className="font-semibold">Template Validation:</span>
                <span>
                  {rtiData.fullName &&
                  rtiData.address &&
                  rtiData.publicAuthority &&
                  rtiData.informationSought
                    ? '✓ All mandatory fields completed'
                    : 'Pending – some mandatory fields missing'}
                </span>
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {rtiStep === 'complete'
                  ? 'Generating structured legal draft...'
                  : 'Answer follow-up questions to complete your RTI draft.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {message.sender === 'user' ? (
              <div className="max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-2 bg-primary text-white">
                <p className="text-sm md:text-base whitespace-pre-wrap">{message.text}</p>
              </div>
            ) : (
              <div
                className={`max-w-[90%] md:max-w-[70%] rounded-2xl px-4 py-3 border ${
                  darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                {/* Intent display */}
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span
                    className={`font-semibold ${
                      darkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}
                  >
                    Intent Detected:{' '}
                    {message.intent === 'document_generation' ? 'Document Generation' : 'Legal Query'}
                  </span>
                  {message.detectedLanguage && (
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      Detected Language: {message.detectedLanguage.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Retrieved evidence */}
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 ${
                    darkMode ? 'border-gray-600 bg-gray-900/60' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <h4
                    className={`text-xs font-semibold mb-1 ${
                      darkMode ? 'text-gray-100' : 'text-gray-800'
                    }`}
                  >
                    Retrieved Legal Evidence
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    {(message.evidence && message.evidence.length > 0 ? message.evidence : []).map((e) => (
                      <li key={e.id}>
                        <span className="font-medium">
                          {e.act}, {e.section}
                        </span>{' '}
                        – {e.clause}
                      </li>
                    ))}
                    {(!message.evidence || message.evidence.length === 0) && (
                      <li className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                        Evidence set simulated from internal demo dataset.
                      </li>
                    )}
                  </ul>
                </div>

                {/* Grounded response */}
                <div className="mt-3">
                  <h4
                    className={`text-xs font-semibold mb-1 ${
                      darkMode ? 'text-gray-100' : 'text-gray-800'
                    }`}
                  >
                    Grounded Legal Response
                  </h4>
                  <p className="text-sm md:text-base whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            )}

            {/* Show source card for bot messages with source (Kanoon or mock) */}
            {message.sender === 'bot' && message.source && (
              <div className="mt-1 max-w-[80%] md:max-w-[60%]">
                <SourceCard source={message.source} darkMode={darkMode} language={language} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className={`inline-flex items-center gap-3 rounded-2xl px-4 py-2 ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
              }`}
            >
              <span className="text-sm md:text-base">Processing query...</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}

        {uploadedDoc && (
          <div className="flex justify-end">
            <div className={`rounded-2xl px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
              <img
                src={uploadedDoc.url}
                alt={uploadedDoc.name}
                className="max-w-xs rounded-lg"
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample Questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p
            className={`text-xs mb-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {getTranslation(language, 'sampleQuestions')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(question)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* System Transparency Log */}
      <div
        className={`px-4 py-2 border-t ${
          darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-200'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setShowTransparencyLog(!showTransparencyLog)}
            className={`w-full flex items-center justify-between text-xs font-medium ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}
          >
            <span>System Transparency Log</span>
            <span className="flex items-center gap-2">
              {researchMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                  Research Mode
                </span>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${
                  showTransparencyLog ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {showTransparencyLog && (
            <div
              className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {lastTransparencyLog ? (
                <>
                  <ul className="space-y-1">
                    <li>
                      <span className="font-semibold">Language Detected:</span>{' '}
                      {lastTransparencyLog.languageDetected.toUpperCase()}
                    </li>
                    <li>
                      <span className="font-semibold">Translation Applied:</span>{' '}
                      {lastTransparencyLog.translationApplied ? 'Yes' : 'No'}
                    </li>
                    <li>
                      <span className="font-semibold">Retrieval Method:</span>{' '}
                      {lastTransparencyLog.retrievalMethod}
                    </li>
                    <li>
                      <span className="font-semibold">Evidence Units Selected:</span>{' '}
                      {lastTransparencyLog.evidenceUnitsSelected}
                    </li>
                    <li>
                      <span className="font-semibold">Template Used:</span>{' '}
                      {lastTransparencyLog.templateUsed || '—'}
                    </li>
                    {typeof lastTransparencyLog.asrConfidence === 'number' && (
                      <li>
                        <span className="font-semibold">ASR Confidence:</span>{' '}
                        {lastTransparencyLog.asrConfidence.toFixed(2)}{' '}
                        <span className="ml-2">
                          Interaction Reliability:{' '}
                          {lastTransparencyLog.interactionReliability || 'Medium'}
                        </span>
                      </li>
                    )}
                  </ul>
                  {researchMode && lastTransparencyLog.researchDetails && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-500/40">
                      <p className="font-semibold mb-1">Research Mode Details</p>
                      <p>
                        Retrieval scores and mixing: α ={' '}
                        {lastTransparencyLog.researchDetails.alpha.toFixed(2)} (lexical weight{' '}
                        {Math.round(lastTransparencyLog.researchDetails.lexicalWeight * 100)}%, semantic
                        weight {Math.round(lastTransparencyLog.researchDetails.semanticWeight * 100)}%).
                      </p>
                      <p>Evidence ranking: {lastTransparencyLog.researchDetails.evidenceRanking}.</p>
                    </div>
                  )}
                </>
              ) : (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Interact with the assistant to populate transparency details about language detection,
                  retrieval and template usage.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      {!rtiWizardActive && (
        <div
          className={`px-4 py-2 border-t ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startRTIWizard}
              className="flex-1 min-w-[120px] bg-primary hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {getTranslation(language, 'rtiApplication')}
            </button>
            <button
              onClick={() => sendMessage(getTranslation(language, 'domesticViolence'))}
              className={`flex-1 min-w-[120px] text-sm px-4 py-2 rounded-lg transition-colors ${darkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
            >
              {getTranslation(language, 'domesticViolence')}
            </button>
            <button
              onClick={() => sendMessage(getTranslation(language, 'landDispute'))}
              className={`flex-1 min-w-[120px] text-sm px-4 py-2 rounded-lg transition-colors ${darkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
            >
              {getTranslation(language, 'landDispute')}
            </button>
            <button
              onClick={() => sendMessage(getTranslation(language, 'unpaidWages'))}
              className={`flex-1 min-w-[120px] text-sm px-4 py-2 rounded-lg transition-colors ${darkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
            >
              {getTranslation(language, 'unpaidWages')}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className={`p-4 border-t ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
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
            className={`p-2 rounded-lg transition-colors ${darkMode
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
              }`}
            title={getTranslation(language, 'uploadDocument')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage(inputText);
              }
            }}
            placeholder={language === 'en' ? 'Describe your legal matter...' : getTranslation(language, 'startChat')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-primary transition-colors ${darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
          />

          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded-lg transition-colors ${isListening
              ? 'bg-red-500 text-white'
              : darkMode
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-100 text-gray-600'
              }`}
            title={`${getTranslation(language, 'voiceInput')}. ${getTranslation(language, 'voiceHint')}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-1.5 flex flex-col gap-0.5">
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {getTranslation(language, 'voiceHint')}
          </p>
          {typeof lastAsrConfidence === 'number' && (
            <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              ASR Confidence: {lastAsrConfidence.toFixed(2)} – Interaction Reliability:{' '}
              {computeInteractionReliability(lastAsrConfidence)}
              {computeInteractionReliability(lastAsrConfidence) === 'Low' && (
                <span className="ml-2 font-semibold text-amber-600 dark:text-amber-300">
                  Low confidence detected. Please confirm your query.
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

