import { useState, useSyncExternalStore } from "react";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

const changes = new EventTarget();
let installPrompt = null;

function setInstallPrompt(prompt) {
  installPrompt = prompt;
  changes.dispatchEvent(new Event("change"));
}

if (import.meta.env.PROD) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    setInstallPrompt(event);
  });
  window.addEventListener("appinstalled", () => setInstallPrompt(null));
}

function subscribe(listener) {
  changes.addEventListener("change", listener);
  return () => changes.removeEventListener("change", listener);
}

function getInstallPrompt() {
  return installPrompt;
}

function canShowAppleInstructions() {
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  return appleMobile && safari;
}

export default function InstallApp() {
  const { t } = useLanguage();
  const prompt = useSyncExternalStore(subscribe, getInstallPrompt);
  const [prompting, setPrompting] = useState(false);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!import.meta.env.PROD || standalone) return null;

  async function install() {
    setPrompting(true);
    try {
      await prompt.prompt();
    } catch {
      // The browser may withdraw the prompt before the rider opens it.
    } finally {
      if (installPrompt === prompt) setInstallPrompt(null);
      setPrompting(false);
    }
  }

  const label = <><span aria-hidden="true">↓</span><span className="install-label">{t("install.action")}</span></>;
  if (prompt) {
    return <button type="button" className="install-action" title={t("install.action")} disabled={prompting} onClick={install}>{label}</button>;
  }
  if (canShowAppleInstructions()) {
    return <details className="install-help">
      <summary className="install-action" title={t("install.action")}>{label}</summary>
      <p>{t("install.ios")}</p>
    </details>;
  }
  return null;
}
