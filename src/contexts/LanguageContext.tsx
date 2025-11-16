import { createContext, useState, useEffect, ReactNode } from 'react';

type Language = 'el' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get language from localStorage first
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage === 'el' || savedLanguage === 'en') {
      return savedLanguage;
    }
    
    // Auto-detect browser language
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('el')) {
      return 'el';
    }
    
    // Default to English
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    // Save to localStorage whenever language changes
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
