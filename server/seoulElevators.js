import { englishStationLabel, englishStationSearchNames, normalizeEnglishStation } from "./stationLabels.js";

const SEOUL_API_BASE = "http://openapi.seoul.go.kr:8088";
const SERVICE = "SeoulMetroFaciInfo";
const PAGE_SIZE = 1000;
const CACHE_MS = 5 * 60 * 1000;

export function normalizeSeoulStation(value) {
  return String(value || "")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/^지하철\s*\d+호선/, "")
    .trim()
    .replace(/역$/, "");
}

export function selectSeoulElevators(rows, name, line) {
  const station = normalizeSeoulStation(name);
  const wantedLine = String(line || "");
  // SeoulMetroFaciInfo marks elevators as EV and escalators as ES.
  const selected = rows.filter((row) => {
    const recordedLine = String(row.STN_NM || "").match(/\((\d+)\)\s*$/)?.[1] || "";
    return normalizeSeoulStation(row.STN_NM) === station
      && (!wantedLine || !recordedLine || recordedLine === wantedLine)
      && /^EV$/i.test(String(row.ELVTR_SE || "").trim());
  });

  return [...new Map(selected.map((row) => {
    const nameText = String(row.ELVTR_NM || "").trim().slice(0, 120);
    const location = String(row.INSTL_PSTN || "").trim().slice(0, 160);
    const section = String(row.OPR_SEC || "").trim().slice(0, 60);
    const statusText = String(row.USE_YN || "").trim().slice(0, 50);
    const operating = statusText === "사용가능" ? true
      : /사용불가|고장|중지|운행중단|보수|점검/.test(statusText) ? false : null;
    return [String(row.STN_CD || "") + nameText + location, {
      name: nameText || "엘리베이터", ...(!nameText && { unnamed: true }),
      location, section, statusText, operating, line: String(row.STN_NM || "").match(/\((\d+)\)\s*$/)?.[1] || "",
    }];
  })).values()].slice(0, 80);
}

function suggestStations(rows, query) {
  const search = normalizeSeoulStation(query).toLowerCase();
  const englishSearch = normalizeEnglishStation(query);
  const stations = new Set();
  for (const row of rows) {
    if (!/^EV$/i.test(String(row.ELVTR_SE || "").trim())) continue;
    const station = normalizeSeoulStation(row.STN_NM);
    if (station && station.length <= 29) stations.add(station);
  }

  const exact = [];
  const prefixes = [];
  const matches = [];
  for (const station of stations) {
    const name = station.toLowerCase();
    const aliases = englishSearch ? englishStationSearchNames(station) : [];
    if (name === search || aliases.includes(englishSearch)) exact.push(station);
    else if (name.startsWith(search) || aliases.some(alias => alias.startsWith(englishSearch))) prefixes.push(station);
    else if (name.includes(search) || aliases.some(alias => alias.includes(englishSearch))) matches.push(station);
  }
  return [...exact, ...prefixes, ...matches].slice(0, 6).map(station => {
    const englishName = englishStationLabel(station);
    return { name: `${station}역`, ...(englishName && { englishName }) };
  });
}

export function createSeoulElevatorClient(key, fetchImpl = fetch) {
  let cached = null;
  let pending = null;

  async function page(start, end) {
    const url = `${SEOUL_API_BASE}/${encodeURIComponent(key)}/json/${SERVICE}/${start}/${end}/`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("서울시 승강기 데이터를 가져오지 못했어요.");
    const payload = await response.json().catch(() => null);
    const result = payload?.[SERVICE];
    if (!result || result.RESULT?.CODE !== "INFO-000") {
      throw new Error("서울시 승강기 데이터 응답을 확인해 주세요.");
    }
    return result;
  }

  async function load() {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.rows;
    if (!pending) {
      pending = (async () => {
        const first = await page(1, PAGE_SIZE);
        const total = Math.min(Number(first.list_total_count) || 0, 10000);
        const starts = [];
        for (let start = PAGE_SIZE + 1; start <= total; start += PAGE_SIZE) starts.push(start);
        const rest = await Promise.all(starts.map((start) => page(start, Math.min(start + PAGE_SIZE - 1, total))));
        const rows = [first, ...rest].flatMap((part) => part.row || []);
        cached = { at: Date.now(), rows };
        return rows;
      })().finally(() => { pending = null; });
    }
    return pending;
  }

  return {
    find: async (name, line) => selectSeoulElevators(await load(), name, line),
    suggest: async (query) => suggestStations(await load(), query),
  };
}
