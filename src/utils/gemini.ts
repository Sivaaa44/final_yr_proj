import { GoogleGenerativeAI } from '@google/generative-ai';
import { Language } from '../types';
import { KanoonResult, formatKanoonResults } from './kanoon';
import { getTopicFromQuery } from './legalTopics';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Intentional prefix when showing fallback (no raw "technical error")
const FALLBACK_PREFIX: Record<Language, string> = {
  en: 'Based on common legal guidance:\n\n',
  hi: 'सामान्य कानूनी मार्गदर्शन के आधार पर:\n\n',
  ta: 'பொதுவான சட்ட வழிகாட்டுதலின் அடிப்படையில்:\n\n',
  te: 'సాధారణ చట్ట మార్గదర్శకం ఆధారంగా:\n\n',
  bn: 'সাধারণ আইনি নির্দেশনার ভিত্তিতে:\n\n',
  mr: 'सामान्य कायदेशीर मार्गदर्शनावर आधारित:\n\n',
  gu: 'સામાન્ય કાનૂની માર્ગદર્શનના આધારે:\n\n',
  kn: 'ಸಾಮಾನ್ಯ ಕಾನೂನು ಮಾರ್ಗದರ್ಶನದ ಆಧಾರದ ಮೇಲೆ:\n\n',
  ml: 'സാധാരണ നിയമ മാർഗ്ഗനിർദ്ദേശത്തിന്റെ അടിസ്ഥാനത്തിൽ:\n\n',
};

// Fallback responses for common legal queries (language-aware)
const fallbackResponses: Record<string, Record<Language, string>> = {
  'fir': {
    'en': '**FIR Filing Procedure**\n\n**Legal Provision:** Section 154 of the Code of Criminal Procedure (CrPC)\n\n**Action Steps:**\n1. Visit your nearest police station\n2. Provide details of the incident (date, time, place, description)\n3. The officer will record your statement\n4. Request a copy of the FIR immediately (it is free)\n5. Verify all details are correctly recorded\n\n**Important:** FIR must be filed within a reasonable time. Delays may require explanation.',
    'hi': 'FIR दर्ज करने के लिए, आपको अपने नजदीकी पुलिस स्टेशन जाना होगा। वहाँ आप अपनी शिकायत लिखवा सकते हैं। याद रखें: FIR मुफ्त है और आपको तुरंत एक कॉपी मिलनी चाहिए।',
    'ta': 'FIR தாக்கல் செய்ய, உங்கள் அருகிலுள்ள காவல் நிலையத்திற்குச் செல்ல வேண்டும். அங்கு நீங்கள் உங்கள் புகாரை பதிவு செய்யலாம்.',
    'te': 'FIR దాఖలు చేయడానికి, మీరు మీ సమీప పోలీస్ స్టేషన్కు వెళ్లాలి. అక్కడ మీరు మీ ఫిర్యాదును నమోదు చేయవచ్చు.',
    'bn': 'FIR দায়ের করতে, আপনাকে আপনার নিকটতম পুলিশ স্টেশন যেতে হবে। সেখানে আপনি আপনার অভিযোগ নিবন্ধন করতে পারেন।',
    'mr': 'FIR दाखल करण्यासाठी, तुम्हाला तुमच्या जवळच्या पोलिस स्टेशनला जावे लागेल. तेथे तुम्ही तुमची तक्रार नोंदवू शकता.',
    'gu': 'FIR દાખલ કરવા માટે, તમારે તમારા નજીકના પોલીસ સ્ટેશન પર જવાની જરૂર છે. ત્યાં તમે તમારી ફરિયાદ નોંધાવી શકો છો.',
    'kn': 'FIR ದಾಖಲಿಸಲು, ನೀವು ನಿಮ್ಮ ಹತ್ತಿರದ ಪೊಲೀಸ್ ಸ್ಟೇಷನ್ಗೆ ಹೋಗಬೇಕು. ಅಲ್ಲಿ ನೀವು ನಿಮ್ಮ ದೂರನ್ನು ನೋಂದಾಯಿಸಬಹುದು.',
    'ml': 'FIR ഫയൽ ചെയ്യാൻ, നിങ്ങൾ നിങ്ങളുടെ അടുത്തുള്ള പോലീസ് സ്റ്റേഷനിലേക്ക് പോകേണ്ടതുണ്ട്. അവിടെ നിങ്ങൾക്ക് നിങ്ങളുടെ പരാതി രജിസ്റ്റർ ചെയ്യാം.',
  },
  'domestic violence': {
    'en': '**Domestic Violence - Legal Protection**\n\n**Relevant Legal Provisions:**\n- Section 498A IPC: Cruelty by husband or relatives\n- Protection of Women from Domestic Violence Act, 2005\n- Section 354 IPC: Assault on women\n\n**Immediate Action Steps:**\n1. Call Women Helpline: 181 (24/7)\n2. File FIR at nearest police station under Section 498A IPC\n3. Contact District Protection Officer for protection order\n4. Seek medical examination if injured (preserve evidence)\n5. Contact local women\'s shelter if immediate safety needed\n\n**Important:** This is a cognizable offense. Police must register your complaint.',
    'hi': 'घरेलू हिंसा एक गंभीर अपराध है। आप तुरंत महिला हेल्पलाइन (181) पर कॉल कर सकती हैं। आप पुलिस में शिकायत भी दर्ज करा सकती हैं। कानून आपकी रक्षा करता है।',
    'ta': 'வீட்டு வன்முறை ஒரு கடுமையான குற்றம். நீங்கள் உடனடியாக பெண்கள் உதவி எண்ணை (181) அழைக்கலாம்.',
    'te': 'గృహహింస తీవ్రమైన నేరం. మీరు వెంటనే మహిళా హెల్ప్‌లైన్ (181) కి కాల్ చేయవచ్చు.',
    'bn': 'গার্হস্থ্য সহিংসতা একটি গুরুতর অপরাধ। আপনি অবিলম্বে মহিলা হেল্পলাইন (181) এ কল করতে পারেন।',
    'mr': 'घरगुती हिंसा हा एक गंभीर गुन्हा आहे. तुम्ही ताबडतोब महिला हेल्पलाइन (181) वर कॉल करू शकता.',
    'gu': 'ઘરેલુ હિંસા એક ગંભીર ગુનો છે. તમે તરત જ મહિલા હેલ્પલાઇન (181) પર કૉલ કરી શકો છો.',
    'kn': 'ಕುಟುಂಬದ ಹಿಂಸೆ ಒಂದು ಗಂಭೀರ ಅಪರಾಧ. ನೀವು ತಕ್ಷಣ ಮಹಿಳಾ ಹೆಲ್ಪ್‌ಲೈನ್ (181) ಗೆ ಕರೆ ಮಾಡಬಹುದು.',
    'ml': 'വീട്ടുപകരണം ഒരു ഗുരുതരമായ കുറ്റമാണ്. നിങ്ങൾക്ക് ഉടനടി വനിതാ ഹെൽപ്‌ലൈൻ (181) എന്ന നമ്പറിൽ വിളിക്കാം.',
  },
  'land dispute': {
    'en': '**Property/Land Dispute - Legal Process**\n\n**Relevant Legal Provisions:**\n- Section 447 IPC: Criminal trespass\n- Section 420 IPC: Cheating (if fraud involved)\n- Land Revenue Act (state-specific)\n\n**Action Steps:**\n1. Gather all land documents (patta, survey records, sale deeds)\n2. Contact Tehsildar or Sub-Divisional Magistrate (SDM)\n3. File complaint with Revenue Department\n4. If criminal trespass, file FIR under Section 447 IPC\n5. Consult a property lawyer for civil remedies\n\n**Important:** Keep all original documents safe. Land disputes often require both civil and criminal proceedings.',
    'hi': 'जमीन विवाद के लिए, आपको सबसे पहले जमीन के कागजात इकट्ठे करने होंगे। फिर तहसीलदार या SDM से संपर्क करें। अगर जरूरत हो तो वकील की सलाह लें।',
    'ta': 'நிலம் வழக்குக்கு, நீங்கள் முதலில் நில ஆவணங்களை சேகரிக்க வேண்டும். பின்னர் தாசில்தார் அல்லது SDM உடன் தொடர்பு கொள்ளுங்கள்.',
    'te': 'భూమి వివాదం కోసం, మీరు మొదట భూమి పత్రాలను సేకరించాలి. తరువాత తహసీల్దార్ లేదా SDM ని సంప్రదించండి.',
    'bn': 'জমি বিরোধের জন্য, আপনাকে প্রথমে জমির কাগজপত্র সংগ্রহ করতে হবে। তারপর তহসিলদার বা SDM এর সাথে যোগাযোগ করুন।',
    'mr': 'जमीन विवादासाठी, तुम्हाला प्रथम जमीन कागदपत्रे गोळा करावी लागतील. नंतर तहसीलदार किंवा SDM शी संपर्क साधा.',
    'gu': 'જમીન વિવાદ માટે, તમારે પહેલા જમીનના દસ્તાવેજો એકત્રિત કરવા પડશે. પછી તહસીલદાર અથવા SDM નો સંપર્ક કરો.',
    'kn': 'ಭೂಮಿ ವಿವಾದಕ್ಕಾಗಿ, ನೀವು ಮೊದಲು ಭೂಮಿಯ ದಾಖಲೆಗಳನ್ನು ಸಂಗ್ರಹಿಸಬೇಕು. ನಂತರ ತಹಸೀಲ್ದಾರ್ ಅಥವಾ SDM ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    'ml': 'ഭൂമി വിവാദത്തിന്, നിങ്ങൾ ആദ്യം ഭൂമിയുടെ രേഖകൾ ശേഖരിക്കേണ്ടതുണ്ട്. പിന്നീട് തഹസീൽദാർ അല്ലെങ്കിൽ SDM നെ സമീപിക്കുക.',
  },
  'dowry': {
    'en': 'Demanding and giving dowry are both illegal. You can file a complaint with the police. The Dowry Prohibition Act helps you. Take immediate action.',
    'hi': 'दहेज मांगना और देना दोनों गैरकानूनी है। आप पुलिस में शिकायत दर्ज करा सकते हैं। दहेज निषेध अधिनियम आपकी मदद करता है। तुरंत कार्रवाई करें।',
    'ta': 'வரதட்சணை கோருவதும் கொடுப்பதும் சட்டவிரோதமானது. நீங்கள் காவல்துறையில் புகார் செய்யலாம்.',
    'te': 'వరదక్షిణ కోరడం మరియు ఇవ్వడం రెండూ చట్టవిరుద్ధం. మీరు పోలీసులకు ఫిర్యాదు చేయవచ్చు.',
    'bn': 'দাবি করা এবং দেওয়া উভয়ই অবৈধ। আপনি পুলিশে অভিযোগ দায়ের করতে পারেন।',
    'mr': 'दहेज मागणे आणि देणे दोन्ही गैरकायदेशीर आहे. तुम्ही पोलिसांकडे तक्रार करू शकता.',
    'gu': 'દહેજ માંગવું અને આપવું બંને ગેરકાયદેસર છે. તમે પોલીસ પર ફરિયાદ કરી શકો છો.',
    'kn': 'ದಾಯಾದಿ ಬೇಡುವುದು ಮತ್ತು ನೀಡುವುದು ಎರಡೂ ಕಾನೂನುಬಾಹಿರ. ನೀವು ಪೊಲೀಸರಿಗೆ ದೂರು ನೀಡಬಹುದು.',
    'ml': 'വരദക്ഷിണ ആവശ്യപ്പെടുകയും നൽകുകയും ചെയ്യുന്നത് നിയമവിരുദ്ധമാണ്. നിങ്ങൾക്ക് പോലീസിൽ പരാതി നൽകാം.',
  },
  'wages': {
    'en': '**Unpaid Wages - Legal Remedy**\n\n**Relevant Legal Provisions:**\n- Payment of Wages Act, 1936\n- Minimum Wages Act, 1948\n- Section 406 IPC: Criminal breach of trust\n\n**Action Steps:**\n1. Gather evidence (work photos, attendance records, witness statements)\n2. File complaint with Labor Department/Labor Commissioner\n3. Contact Labor Helpline: 1800-11-4646\n4. If amount exceeds threshold, file FIR under Section 406 IPC\n5. Approach Labor Court for recovery\n\n**Important:** File complaint within 1 year. Keep all payment receipts and work evidence.',
    'hi': 'मजदूरी न मिलने पर, आप श्रम विभाग में शिकायत कर सकते हैं। आपको अपने काम के सबूत (फोटो, गवाह) रखने चाहिए। कानून आपकी मदद करेगा।',
    'ta': 'கூலி கிடைக்கவில்லை என்றால், நீங்கள் தொழிலாளர் துறையில் புகார் செய்யலாம்.',
    'te': 'వేతనం రాలేదు అయితే, మీరు కార్మిక శాఖకు ఫిర్యాదు చేయవచ్చు.',
    'bn': 'মজুরি না পেলে, আপনি শ্রম বিভাগে অভিযোগ দায়ের করতে পারেন।',
    'mr': 'मजुरी मिळाली नसल्यास, तुम्ही कामगार विभागात तक्रार करू शकता.',
    'gu': 'મજૂરી મળી નથી તો, તમે મજૂર વિભાગમાં ફરિયાદ કરી શકો છો.',
    'kn': 'ಕೂಲಿ ಸಿಗದಿದ್ದರೆ, ನೀವು ಕಾರ್ಮಿಕ ಇಲಾಖೆಗೆ ದೂರು ನೀಡಬಹುದು.',
    'ml': 'കൂലി ലഭിക്കാത്ത പക്ഷം, നിങ്ങൾക്ക് തൊഴിൽ വകുപ്പിൽ പരാതി നൽകാം.',
  },
  'dowry harassment': {
    'en': '**Dowry Harassment - Legal Remedies**\n\n**Relevant Legal Provisions:**\n- Section 498A IPC: Cruelty for dowry demand\n- Section 304B IPC: Dowry death\n- Dowry Prohibition Act, 1961\n\n**Action Steps:**\n1. File FIR at police station under Section 498A IPC\n2. Contact Women Helpline: 181\n3. Preserve evidence (messages, witnesses, medical reports)\n4. File complaint with Dowry Prohibition Officer\n5. Seek protection order from court if needed\n\n**Important:** Both demanding and giving dowry are illegal. The offense is non-bailable.',
    'hi': 'दहेज उत्पीड़न IPC की धारा 498A के तहत गैरकानूनी है। आप थाने में FIR दर्ज करा सकती हैं। कानून आपकी रक्षा करता है। तुरंत महिला हेल्पलाइन 181 पर संपर्क करें।',
    'ta': 'வரதட்சணை துன்புறுத்தல் IPC பிரிவு 498A கீழ் சட்டவிரோதமானது. நீங்கள் காவல் நிலையத்தில் FIR தாக்கல் செய்யலாம்.',
    'te': 'వరదక్షిణ హింస IPC సెక్షన్ 498A కింద చట్టవిరుద్ధం. మీరు పోలీస్ స్టేషన్‌లో FIR దాఖలు చేయవచ్చు.',
    'bn': 'দাবি হয়রানি IPC এর ধারা 498A এর অধীনে অবৈধ। আপনি পুলিশ স্টেশনে FIR দায়ের করতে পারেন।',
    'mr': 'दहेज छळ IPC च्या कलम 498A अंतर्गत गैरकायदेशीर आहे. तुम्ही पोलिस स्टेशनवर FIR दाखल करू शकता.',
    'gu': 'દહેજ હેરાસમેન્ટ IPC ના સેક્શન 498A હેઠળ ગેરકાયદેસર છે. તમે પોલીસ સ્ટેશન પર FIR દાખલ કરી શકો છો.',
    'kn': 'ದಾಯಾದಿ ಕಿರುಕುಳ IPC ನ ವಿಭಾಗ 498A ಅಡಿಯಲ್ಲಿ ಕಾನೂನುಬಾಹಿರ. ನೀವು ಪೊಲೀಸ್ ಸ್ಟೇಷನ್‌ನಲ್ಲಿ FIR ದಾಖಲಿಸಬಹುದು.',
    'ml': 'വരദക്ഷിണ ഉപദ്രവം IPC സെക്ഷൻ 498A പ്രകാരം നിയമവിരുദ്ധമാണ്. നിങ്ങൾക്ക് പോലീസ് സ്റ്റേഷനിൽ FIR ഫയൽ ചെയ്യാം.',
  },
  'theft': {
    'en': '**Theft - FIR Filing**\n\n**Relevant Legal Provision:**\n- Section 379 IPC: Theft (punishable with imprisonment up to 3 years)\n\n**Action Steps:**\n1. File FIR immediately at nearest police station under Section 154 CrPC\n2. Provide detailed list of stolen items with approximate values\n3. Mention exact time, date, and place of incident\n4. Provide names/details of suspects if known\n5. Keep copy of FIR and follow up with investigation officer\n\n**Important:** File FIR promptly. Delays may affect investigation. Preserve any evidence (broken locks, footprints, etc.)',
    'hi': 'चोरी के लिए, तुरंत अपने नजदीकी थाने में FIR दर्ज कराएं। चोरी की वस्तुओं, समय और स्थान की जानकारी दें। सभी दस्तावेजों की प्रतियां रखें।',
    'ta': 'திருட்டுக்கு, உடனடியாக உங்கள் அருகிலுள்ள காவல் நிலையத்தில் FIR தாக்கல் செய்யுங்கள்.',
    'te': 'దొంగతనం కోసం, వెంటనే మీ సమీప పోలీస్ స్టేషన్‌లో FIR దాఖలు చేయండి.',
    'bn': 'চুরির জন্য, অবিলম্বে আপনার নিকটতম পুলিশ স্টেশনে FIR দায়ের করুন।',
    'mr': 'चोरीसाठी, ताबडतोब तुमच्या जवळच्या पोलिस स्टेशनवर FIR दाखल करा.',
    'gu': 'ચોરી માટે, તરત જ તમારા નજીકના પોલીસ સ્ટેશન પર FIR દાખલ કરો.',
    'kn': 'ಕಳ್ಳತನಕ್ಕಾಗಿ, ತಕ್ಷಣ ನಿಮ್ಮ ಹತ್ತಿರದ ಪೊಲೀಸ್ ಸ್ಟೇಷನ್‌ನಲ್ಲಿ FIR ದಾಖಲಿಸಿ.',
    'ml': 'മോഷണത്തിന്, ഉടനടി നിങ്ങളുടെ അടുത്തുള്ള പോലീസ് സ്റ്റേഷനിൽ FIR ഫയൽ ചെയ്യുക.',
  },
};

// Default responses by language
const defaultResponses: Record<Language, string> = {
  'en': 'I understand your problem. Please provide a bit more detail so I can help better. You can also contact the police, a lawyer, or a nearby legal aid center.',
  'hi': 'मैं आपकी समस्या समझ गया हूँ। कृपया थोड़ा और विवरण दें ताकि मैं बेहतर मदद कर सकूं। आप पुलिस, वकील, या नजदीकी कानूनी सहायता केंद्र से भी संपर्क कर सकते हैं।',
  'ta': 'உங்கள் பிரச்சனையை நான் புரிந்துகொண்டேன். தயவுசெய்து இன்னும் கொஞ்சம் விவரங்களை வழங்கவும், அதனால் நான் சிறப்பாக உதவ முடியும்.',
  'te': 'నేను మీ సమస్యను అర్థం చేసుకున్నాను. దయచేసి కొంచెం ఎక్కువ వివరాలను అందించండి, తద్వారా నేను మంచి సహాయం చేయగలను.',
  'bn': 'আমি আপনার সমস্যা বুঝতে পেরেছি। অনুগ্রহ করে আরও কিছু বিবরণ দিন যাতে আমি আরও ভালভাবে সাহায্য করতে পারি।',
  'mr': 'मी तुमची समस्या समजलो आहे. कृपया थोडे अधिक तपशील द्या जेणेकरून मी चांगली मदत करू शकेन.',
  'gu': 'હું તમારી સમસ્યા સમજી ગયો છું. કૃપા કરીને થોડું વધુ વિગતો આપો જેથી હું વધુ સારી રીતે મદદ કરી શકું.',
  'kn': 'ನಾನು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ನೀಡಿ, ಇದರಿಂದ ನಾನು ಉತ್ತಮ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
  'ml': 'ഞാൻ നിങ്ങളുടെ പ്രശ്നം മനസ്സിലാക്കി. ദയവായി കുറച്ച് കൂടുതൽ വിശദാംശങ്ങൾ നൽകുക, അതുവഴി എനിക്ക് നന്നായി സഹായിക്കാൻ കഴിയും.',
};

// Check if query matches any fallback pattern (uses single source: legalTopics)
const getFallbackResponse = (query: string, lang: Language): string => {
  console.log('📝 Using fallback response (no API key or API failed)');
  const prefix = FALLBACK_PREFIX[lang] || FALLBACK_PREFIX['en'];
  const topicId = getTopicFromQuery(query);
  const body =
    topicId && fallbackResponses[topicId]
      ? fallbackResponses[topicId][lang] || fallbackResponses[topicId]['en']
      : defaultResponses[lang] || defaultResponses['en'];
  return prefix + body;
};

export const getGeminiResponse = async (
  query: string,
  detectedLang: Language,
  kanoonResults: KanoonResult[] = [],
  documentText?: string
): Promise<string> => {
  console.log('🤖 Gemini API called');
  console.log('  - Query:', query);
  console.log('  - Detected Language:', detectedLang);
  console.log('  - Kanoon Results:', kanoonResults.length > 0 ? `${kanoonResults.length} results` : 'none');

  // If no API key, use fallback
  if (!API_KEY) {
    console.warn('⚠️ Gemini API key not found - using fallback responses');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getFallbackResponse(query, detectedLang));
      }, 1000);
    });
  }

  console.log('✅ Gemini API key found, calling API...');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Use gemini-pro (stable) or gemini-1.5-pro for latest features
    // Note: gemini-1.5-flash may not be available in all regions
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Get language name for prompt
    const langNames: Record<Language, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
    };

    const langName = langNames[detectedLang] || 'the user\'s language';

    // Build enhanced prompt with document context and Kanoon results
    let systemPrompt = `You are CLiVER-RAG — a precise legal aid assistant for Indian law. Respond ONLY in ${langName}.

USER QUERY: "${query}"

${documentText ? `=== UPLOADED DOCUMENT ===\n${documentText}\n=== END ===\nAnswer ONLY from this document.` : ''}
${kanoonResults.length > 0 ? formatKanoonResults(kanoonResults) : ''}

YOUR RESPONSE MUST BE STRUCTURED EXACTLY LIKE THIS — NO EXCEPTIONS:

**Applicable Laws**
• [Exact Act name, Year] – Section [number]: [what it says in one line]
• [Add more sections if relevant]

**What you should do — Step by Step**
1. [First thing to do RIGHT NOW] — Go to: [exact office/helpline/person]
2. [Second step] — Bring: [what documents to carry]
3. [Third step] — [specific action, who to contact, what to say]
4. [Continue until all steps covered]

**Documents you will need**
• [Specific document name]
• [Another document]

**Helplines**
• [Relevant helpline name]: [number]

**Timeline**
• File within: [specific timeframe if applicable]

STRICT RULES — violating these is NOT allowed:
- NEVER say "I understand" or "I'm here to help" — go straight to the legal answer
- NEVER give vague guidance like "consult a lawyer" without giving actual steps first
- ALWAYS cite at least one specific section number (e.g., Section 154 CrPC, Section 498A IPC)
- ALWAYS give at least 3 concrete numbered action steps
- The victim must be able to read this and KNOW EXACTLY what to do next
- Respond in ${langName} — if the query is in Hindi/Tamil/etc., your ENTIRE response must be in that language
- If query is too vague, ask ONE specific clarifying question before answering`;

    console.log('🔧 Gemini called with prompt:', systemPrompt.substring(0, 200) + '...');

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const responseText = response.text();
    console.log('✅ Gemini API response received:', responseText.substring(0, 100) + '...');
    return responseText;
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    if (error instanceof Error) {
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
    }
    // Fallback on error
    console.log('🔄 Falling back to hardcoded response...');
    return getFallbackResponse(query, detectedLang);
  }
};

