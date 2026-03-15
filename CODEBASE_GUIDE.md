# Codebase Guide – For Mentor Review & Explanation

Use this when your mentor asks you to walk through the code or explain where things happen.

---

## 1. Project structure

```
src/
├── main.tsx                 # Entry point: mounts React app
├── App.tsx                  # Root: toggles LandingPage | ChatInterface | RagView
├── index.css                # Global + Tailwind
├── vite-env.d.ts            # TypeScript: Vite env, pdfmake, SpeechRecognition
├── types/
│   └── index.ts             # Language, Message, Document
├── components/
│   ├── LandingPage.tsx      # Language picker, "Start Chat", "Add documents (RAG)"
│   ├── ChatInterface.tsx    # Chat UI, message flow, RTI wizard, voice, upload
│   ├── RagView.tsx          # RAG-only UI: add docs, query, retrieve, optional generate
│   └── SourceCard.tsx       # Expandable "View Source" for citations
├── rag/                     # RAG module – separate from main chat, not integrated
│   ├── types.ts             # RAGChunk, RAGDocument, RAGRetrievalResult
│   ├── chunker.ts           # Split text into overlapping chunks
│   ├── store.ts             # In-memory chunk + document store
│   ├── retriever.ts         # Keyword-overlap retrieval (no embeddings)
│   └── index.ts             # Public API: addDocument, listDocuments, retrieve
└── utils/
    ├── gemini.ts            # Gemini API + fallback responses
    ├── kanoon.ts            # Indian Kanoon API + mock citations
    ├── legalTopics.ts       # Topic config (fir, dowry, etc.) + sample question keys
    ├── languageDetection.ts # Script-based language detection (no API)
    ├── translations.ts      # All UI strings in 9 languages
    ├── documentExtractor.ts # PDF/OCR/DOCX text extraction (client-side, no API)
    ├── rtiWizard.ts         # RTI application steps + questions (9 languages)
    └── rtiPDFGenerator.ts   # Generate RTI application PDF (pdfmake, client-side)
```

**No backend.** Everything runs in the browser (Vite + React). Only external calls are: **Gemini API** and **Indian Kanoon API** (and browser APIs: Speech Recognition, Speech Synthesis).

---

## 2. Entry point and app flow

| File | What it does |
|------|----------------|
| **index.html** | Root `<div id="root">`; script loads `main.tsx` |
| **main.tsx** | `ReactDOM.createRoot(...).render(<App />)` |
| **App.tsx** | Holds `view` ('landing' | 'chat' | 'rag'), `language`, `darkMode`. Renders **LandingPage**, **ChatInterface**, or **RagView**. Toggles dark class on `<html>`. |

So: **main.tsx → App → LandingPage | ChatInterface | RagView.**

**RAG is separate:** The main chat does not use the RAG module. Only the "Add documents (RAG)" flow (Landing → RagView) uses `src/rag/` and `RagView.tsx`.

---

## 3. Where API / external calls happen

### 3.1 Gemini (Google AI) – **only place we call an LLM**

| Where | File | When | What |
|-------|------|------|------|
| **Call** | `src/utils/gemini.ts` | When user sends a chat message (and we’re not in RTI wizard) | `model.generateContent(systemPrompt)` from `@google/generative-ai` |

- **Env:** `VITE_GEMINI_API_KEY` (from `.env`).
- **If no key or API errors:** We don’t call the API; we use **fallback responses** from `gemini.ts` (topic-based, 9 languages) and prefix them with “Based on common legal guidance:”.
- **Inputs to Gemini:** User query, detected language, Kanoon results (if any), and optional uploaded-document text. No other server is involved.

### 3.2 Indian Kanoon API – **only HTTP fetch in the app**

| Where | File | When | What |
|-------|------|------|------|
| **Call** | `src/utils/kanoon.ts` | Same user message that triggers the chat reply | `fetch(API_BASE_URL + "?formInput=...&pagenum=...")` with `Authorization: Token <VITE_KANOON_TOKEN>` |

- **Env:** `VITE_KANOON_TOKEN`.
- **URL:** `https://api.indiankanoon.org/search/`.
- **If no token, CORS error, or non-OK response:** We return **mock citations** from `getMockKanoonResults(query)` so the demo still shows a “Source” card (e.g. “Section 154 CrPC – FIR Registration”). So in the browser, you often see mock data because of CORS.
- **No other `fetch` or HTTP client** is used elsewhere in the app.

### 3.3 Web Speech API (browser, not our server)

| Where | File | When | What |
|-------|------|------|------|
| **Voice input** | `ChatInterface.tsx` | User clicks mic; we call `recognitionRef.current.start()` | Browser **SpeechRecognition** (e.g. `webkitSpeechRecognition`) turns speech → text; we set that as the chat input. |
| **Voice output** | `ChatInterface.tsx` | After we get a bot reply and TTS is on | `speechSynthesis.speak(utterance)` – browser TTS reads the reply. |

No backend and no extra API keys for voice; it’s all browser APIs.

### 3.4 Document processing (no network)

| Where | File | When | What |
|-------|------|------|------|
| **PDF** | `documentExtractor.ts` | User uploads a file and we detect PDF | `pdfjs-dist` reads the file in memory → text. |
| **Images** | `documentExtractor.ts` | User uploads an image | `tesseract.js` OCR (e.g. `eng+hin`) in the browser. |
| **DOCX** | `documentExtractor.ts` | User uploads .docx | `mammoth.extractRawText()` in the browser. |

All of this is **client-side**; the file never goes to our server or Gemini until we send the **extracted text** in the Gemini prompt.

### 3.5 PDF generation (RTI form)

| Where | File | When | What |
|-------|------|------|------|
| **RTI PDF** | `rtiPDFGenerator.ts` | User finishes the RTI wizard | `pdfMake.createPdf(docDefinition).download(...)` – runs in the browser, no server. |

So: **only two “API” calls that hit the network are Gemini and Kanoon.** Everything else is either browser APIs or client-side libraries.

---

## 4. Environment variables

| Variable | Used in | Purpose |
|----------|---------|--------|
| **VITE_GEMINI_API_KEY** | `src/utils/gemini.ts` | Google Gemini; if missing, we use fallback responses only. |
| **VITE_KANOON_TOKEN** | `src/utils/kanoon.ts` | Indian Kanoon API auth; if missing or request fails, we use mock citations. |

Defined in `.env` (not committed). See `.env.example` for placeholders.

---

## 5. What happens when the user sends a message

Use this to explain the flow step by step:

1. **ChatInterface.sendMessage(text)** is called (e.g. from input or sample question).
2. **Language:** `detectLanguage(text, language)` in `languageDetection.ts` – script-based (Devanagari → Hindi, etc.), no API.
3. **Kanoon:** `searchKanoon(text, 1, 2)` in `kanoon.ts`. Either:
   - `fetch` to Indian Kanoon (if token and no CORS), or
   - mock results from `getMockKanoonResults(query)`.
4. **RTI wizard:** If we’re in the RTI flow, we don’t call Gemini; we call `handleRTIWizardResponse(text, detectedLang)` and ask the next RTI question or generate the RTI PDF.
5. **Gemini:** If not in RTI wizard, we call `getGeminiResponse(query, detectedLang, kanoonResults, extractedDocument?.text)` in `gemini.ts`:
   - If no `VITE_GEMINI_API_KEY`: return fallback (topic from `getTopicFromQuery` in `legalTopics.ts` + “Based on common legal guidance:” + text from `fallbackResponses`).
   - Else: `model.generateContent(systemPrompt)` with prompt that includes query, language, Kanoon snippets, and optional document text.
6. **Reply:** We append the bot message; if there were Kanoon/mock results, we set `message.source` so **SourceCard** shows “View Source”.
7. **TTS:** If TTS is on, we call `speechSynthesis.speak(utterance)` with the reply text and `speechLangCodes[detectedLang]`.

So in one sentence: **“We detect language locally, optionally call Kanoon (or use mocks), then call Gemini with that context and any uploaded document text, and show the reply with an optional source card and TTS.”**

---

## 6. Key files – one-line summary

| File | One-line role |
|------|----------------|
| **App.tsx** | Switches between landing and chat; manages language and dark mode. |
| **ChatInterface.tsx** | Chat UI, sendMessage flow, RTI wizard, voice in/out, document upload, sample questions from `legalTopics`. |
| **gemini.ts** | Calls Gemini API or returns topic-based fallback in 9 languages. |
| **kanoon.ts** | Calls Indian Kanoon API or returns mock citations for demo. |
| **legalTopics.ts** | Single source of legal topics (fir, dowry, etc.) and sample question keys. |
| **languageDetection.ts** | Detects language from script/patterns (no API). |
| **translations.ts** | All UI strings per language. |
| **documentExtractor.ts** | Extracts text from PDF/image/DOCX in the browser. |
| **rtiWizard.ts** | RTI application steps and questions in 9 languages. |
| **rtiPDFGenerator.ts** | Builds and downloads the RTI application PDF. |
| **SourceCard.tsx** | Shows “View Source” / “Hide Source” and the citation text. |

---

## 7. RAG module (separate from main chat)

- **Location:** `src/rag/` and `src/components/RagView.tsx`.
- **Entry:** Landing page button **"Add documents (RAG)"** → RagView.
- **Flow:** Upload file → extract text → `rag.addDocument(text, name)` → chunk & store. Query → `rag.retrieve(query)` → top-k chunks. Optional "Generate answer" calls Gemini with retrieved context only in this screen.
- **Not integrated:** Main chat does not use RAG.

---

## 8. Quick answers for “Where does X happen?”

- **“Where is the Gemini API called?”**  
  In `src/utils/gemini.ts`, inside `getGeminiResponse`, with `model.generateContent(systemPrompt)`. It’s the only LLM call.

- **“Where is the Kanoon API called?”**  
  In `src/utils/kanoon.ts`, inside `searchKanoon`, with `fetch(API_BASE_URL + ...)`. It’s the only HTTP `fetch` to an external API.

- **“Where is language detected?”**  
  In `src/utils/languageDetection.ts`, function `detectLanguage(text, defaultLanguage)` – script/pattern based, no API.

- **“Where are the sample questions defined?”**  
  Keys in `src/utils/legalTopics.ts` (`SAMPLE_QUESTION_KEYS`); labels in `src/utils/translations.ts`. ChatInterface uses those keys + `getTranslation(language, key)`.

- **“Where is the RTI PDF generated?”**  
  In `src/utils/rtiPDFGenerator.ts`, `generateRTIPDF(data, lang)`; triggered from ChatInterface when the RTI wizard finishes.

- **“Where is document text extracted?”**  
  In `src/utils/documentExtractor.ts`, `extractDocumentText(file)` – PDF (pdfjs), images (Tesseract), DOCX (mammoth). All client-side.

- **“Is there a backend?”**  
  No. Only external network calls are Gemini and Kanoon. Everything else is client-side (React, browser APIs, local libs).

---

## 9. Data flow diagram (main chat; for talking through)

```
User types/speaks
       ↓
ChatInterface.sendMessage(text)
       ↓
detectLanguage(text)     [languageDetection.ts – no API]
       ↓
searchKanoon(text)        [kanoon.ts – fetch to Indian Kanoon or mock]
       ↓
If RTI wizard active → handleRTIWizardResponse → next step or generate RTI PDF
Else →
       ↓
getGeminiResponse(query, lang, kanoonResults, documentText?)  [gemini.ts]
       ↓
If no API key or error → fallback response (legalTopics + fallbackResponses)
Else → model.generateContent(systemPrompt)  [Gemini API]
       ↓
Append bot message + optional source (SourceCard)
       ↓
Optional: speechSynthesis.speak(reply)  [browser TTS]
```

You can use this guide to walk your mentor through structure, APIs, and the message flow without touching the code.
