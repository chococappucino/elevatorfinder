import assert from "node:assert/strict";
import test from "node:test";
import { findPlace } from "./api/routeApi.js";
import { createTranslator, DEFAULT_LANGUAGE, languages, supportedLanguage } from "./i18n/messages.js";

function placeholders(template) {
  return [...new Set(Array.from(template.matchAll(/\{(\w+)\}/g), ([, name]) => name))].sort();
}

test("every language has the same messages and placeholders", () => {
  const base = languages[DEFAULT_LANGUAGE].messages;
  for (const [locale, { messages }] of Object.entries(languages)) {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(base).sort(), locale);
    for (const [key, message] of Object.entries(messages)) {
      const baseMessage = base[key];
      const expected = placeholders(typeof baseMessage === "string" ? baseMessage : baseMessage.other);
      if (typeof message !== "string") assert.equal(typeof message.other, "string", `${locale} ${key} plural fallback`);
      for (const variant of typeof message === "string" ? [message] : Object.values(message)) {
        assert.deepEqual(placeholders(variant), expected, `${locale} ${key}`);
      }
    }
  }
});

test("unsupported language preferences fall back to Korean", () => {
  assert.equal(supportedLanguage("en"), "en");
  for (const value of [null, "", "fr", "constructor"]) assert.equal(supportedLanguage(value), "ko");
  assert.equal(createTranslator("fr")("app.language"), "언어");
});

test("formats counts, preserves provider names, and translates status labels", () => {
  const english = createTranslator("en");
  const korean = createTranslator("ko");

  assert.equal(english("station.facilityCount", { count: 0 }), "0 facilities");
  assert.equal(english("station.facilityCount", { count: 1 }), "1 facility");
  assert.equal(english("station.facilityCount", { count: 1200 }), "1,200 facilities");
  assert.equal(korean("station.facilityCount", { count: 1 }), "1개 시설");
  assert.equal(english("route.optionDetails", { transfers: 1, walk: 5 }, 1), "1 transfer · 5 min walking");
  assert.equal(english("station.title", { station: "시청" }), "시청 Station");
  assert.equal(english("elevator.unknown"), "Status unknown");
  assert.equal(korean("elevator.outage"), "사용 불가");
});

test("route API errors expose a message key independent of the backend text", async ({ mock }) => {
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ code: "place_not_found", error: "장소를 찾지 못했어요." }), { status: 404 }));
  await assert.rejects(findPlace("시청"), { messageKey: "error.placeNotFound" });

  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ code: "unexpected", error: "Details" }), { status: 502 }));
  await assert.rejects(findPlace("시청"), (error) => error.messageKey === undefined);
});
