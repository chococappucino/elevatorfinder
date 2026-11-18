import stationNames from "./seoulStationNames.js";

function englishNames(station) {
  return Object.hasOwn(stationNames, station) ? stationNames[station] : {};
}

export function englishStationLabel(station, line) {
  const names = englishNames(station);
  const unique = [...new Set(Object.values(names))];
  const label = line ? names[line] : unique.length === 1 ? unique[0] : undefined;
  return label && (/\bStation$/i.test(label) ? label : `${label} Station`);
}

export function normalizeEnglishStation(value) {
  return value.trim().toLowerCase().replace(/\s+station$/, "")
    .replace(/\buniversity\b/g, "univ").replace(/[\s.'‘’()-]+/g, "");
}

export function englishStationSearchNames(station) {
  return Object.values(englishNames(station)).map(normalizeEnglishStation);
}

export function kakaoStationEnglishLabel(document) {
  if (document.category_group_code !== "SW8" || !/^서울(?:\s|특별시\s)/.test(document.address_name || "")) return undefined;
  const match = document.place_name?.match(/^(.+)역\s+([1-8])호선$/);
  if (!match) return undefined;
  const [, station, line] = match;
  const label = englishStationLabel(station, line);
  return label && `${label} · Line ${line}`;
}
