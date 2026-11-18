import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, LANGUAGE_STORAGE_KEY, readLanguage, supportedLanguage } from "./messages.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readLanguage);
  const value = useMemo(() => ({
    language,
    t: createTranslator(language),
    setLanguage: (next) => setLanguage(supportedLanguage(next)),
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = value.t("app.title");
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The selected language still applies for this session.
    }
  }, [language, value]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
