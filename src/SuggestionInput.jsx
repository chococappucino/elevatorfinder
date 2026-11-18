import { useEffect, useState } from "react";
import { findSuggestions } from "./api/routeApi.js";
import { useLanguage } from "./i18n/LanguageProvider.jsx";
import { suggestionName } from "./i18n/messages.js";

const debounceMs = 300;

export default function SuggestionInput({
  id, value, onChange, onSelect, enabled, type = "place", placeholder, enterKeyHint,
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = value.trim();
  const canSuggest = enabled && open && !composing && query.length >= 2;
  const current = canSuggest && result?.query === query ? result : null;
  const suggestions = current?.items ?? [];
  const listId = `${id}-suggestions`;
  const activeId = suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (!canSuggest) return;
    const request = new AbortController();
    const { signal } = request;
    const timer = window.setTimeout(async () => {
      setResult({ query, status: "loading" });
      try {
        const items = await findSuggestions(query, type, signal);
        if (!signal.aborted) setResult({ query, items, status: items.length ? "ready" : "empty" });
      } catch {
        if (!signal.aborted) setResult({ query, status: "unavailable" });
      }
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [canSuggest, query, type]);

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function close() {
    setOpen(false);
    setResult(null);
    setActiveIndex(-1);
  }

  function select(suggestion) {
    close();
    onSelect(suggestion);
  }

  function handleKeyDown(event) {
    if (composing || event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
    if (event.key === "Enter") {
      if (activeId) {
        event.preventDefault();
        select(suggestions[activeIndex]);
      } else {
        close();
      }
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? Math.min(activeIndex + 1, suggestions.length - 1)
        : activeIndex < 0 ? suggestions.length - 1 : Math.max(activeIndex - 1, 0);
      setActiveIndex(next);
    }
  }

  return <div className="suggestion-field">
    <input
      id={id}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={suggestions.length > 0}
      aria-controls={suggestions.length > 0 ? listId : undefined}
      aria-activedescendant={activeId}
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      maxLength={type === "station" ? 30 : 80}
      enterKeyHint={enterKeyHint}
      onFocus={() => setOpen(true)}
      onBlur={close}
      onChange={(event) => {
        setResult(null);
        setOpen(true);
        setActiveIndex(-1);
        onChange(event.target.value);
      }}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)}
      onKeyDown={handleKeyDown}
    />
    <div role="status" className={current && current.status !== "ready" ? "suggestion-panel suggestion-status" : "visually-hidden"}>
      {current && t(`suggestions.${current.status}`, { count: suggestions.length })}
    </div>
    {suggestions.length > 0 && <ul id={listId} className="suggestion-panel suggestion-list" role="listbox" aria-label={t("suggestions.label")}>
      {suggestions.map((suggestion, index) => {
        const optionId = `${listId}-${index}`;
        const label = suggestionName(suggestion, language);
        const localized = label !== suggestion.name;
        return <li
          id={optionId}
          key={optionId}
          role="option"
          aria-selected={optionId === activeId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => select(suggestion)}
        >
          <strong lang={localized ? language : /[가-힣]/u.test(label) ? "ko" : undefined}>{label}</strong>
          {localized && <small lang="ko">{suggestion.name}</small>}
          {suggestion.type === "tollgate" && !localized && <small>{t("suggestions.tollgate")}</small>}
          {suggestion.detail && <small lang="ko">{suggestion.detail}</small>}
        </li>;
      })}
    </ul>}
  </div>;
}
