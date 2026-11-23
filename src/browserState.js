import { useSyncExternalStore } from "react";

function subscribeOnline(listener) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

const getOnline = () => navigator.onLine;

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, getOnline);
}

// Keep this breakpoint aligned with the wide layout in navigation.css.
const wideLayout = window.matchMedia("(min-width: 900px)");
const getWideLayout = () => wideLayout.matches;

function subscribeWideLayout(listener) {
  wideLayout.addEventListener("change", listener);
  return () => wideLayout.removeEventListener("change", listener);
}

export function useWideLayout() {
  return useSyncExternalStore(subscribeWideLayout, getWideLayout);
}
