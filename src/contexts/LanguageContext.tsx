import { createContext, useState, useEffect, ReactNode } from 'react';
import { safeLocalStorage } from '@/lib/browserStorage';

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
    const savedLanguage = safeLocalStorage.getItem('language') as Language;
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
    safeLocalStorage.setItem('language', lang);
  };

  useEffect(() => {
    safeLocalStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
