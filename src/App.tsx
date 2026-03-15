import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import RagView from './components/RagView';
import { Language } from './types';

type View = 'landing' | 'chat' | 'rag';

function App() {
  const [view, setView] = useState<View>('landing');
  const [language, setLanguage] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          language={language}
          onLanguageChange={setLanguage}
          onStartChat={() => setView('chat')}
          onOpenRag={() => setView('rag')}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}
      {view === 'chat' && (
        <ChatInterface
          language={language}
          darkMode={darkMode}
          onBack={() => setView('landing')}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}
      {view === 'rag' && (
        <RagView darkMode={darkMode} onBack={() => setView('landing')} />
      )}
    </>
  );
}

export default App;

