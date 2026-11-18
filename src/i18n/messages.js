import en from "./en.js";
import ko from "./ko.js";

export const DEFAULT_LANGUAGE = "ko";
export const LANGUAGE_STORAGE_KEY = "naeriljari-language";

export const languages = {
  ko: { label: "한국어", messages: ko },
  en: { label: "English", messages: en },
};

export function supportedLanguage(value) {
  return typeof value === "string" && Object.hasOwn(languages, value) ? value : DEFAULT_LANGUAGE;
}

export function suggestionName(place, language) {
  return language === "en" && place.englishName ? place.englishName : place.name;
}

export function readLanguage() {
  try {
    return supportedLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function createTranslator(language) {
  const locale = supportedLanguage(language);
  const { messages } = languages[locale];
  const fallback = languages[DEFAULT_LANGUAGE].messages;
  const numbers = new Intl.NumberFormat(locale);
  const plurals = new Intl.PluralRules(locale);

  return (key, values = {}, count = values.count) => {
    const message = Object.hasOwn(messages, key) ? messages[key] : Object.hasOwn(fallback, key) ? fallback[key] : key;
    const template = typeof message === "string" ? message : message[plurals.select(count)] ?? message.other;
    return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
      const value = values[name];
      return typeof value === "number" ? numbers.format(value) : value ?? placeholder;
    });
  };
}
