import { createSeoulElevatorClient } from "./seoulElevators.js";
import { normalizeKakaoRoutes } from "./kakaoRoutes.js";
import { kakaoStationEnglishLabel } from "./stationLabels.js";
import tollgateNames from "./tollgateNames.js";

const KAKAO_BASE = "https://dapi.kakao.com/v2";
const KRIC_BASE = "https://openapi.kric.go.kr/openapi";

function configured(value) {
  return Boolean(value && !value.includes("PLACEHOLDER"));
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function sendError(response, status, code, error) {
  return sendJson(response, status, { error, code });
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 8192) throw Object.assign(new Error("요청이 너무 큽니다."), { status: 413, apiCode: "request_too_large" });
  }
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("요청 형식을 확인해 주세요."), { status: 400, apiCode: "invalid_request" });
  }
}

function validPoint(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}

function placeFromDocument(place, fallback) {
  const lat = Number(place?.y);
  const lng = Number(place?.x);
  if (!validPoint({ lat, lng })) return null;
  return { name: String(place.place_name || place.address_name || fallback), lat, lng };
}

async function kakaoGet(path, params, key) {
  const url = new URL(`${KAKAO_BASE}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw Object.assign(new Error("카카오 길찾기 서비스를 불러오지 못했어요."), { status: 502, apiCode: "kakao_unavailable" });
  return payload;
}

async function kakaoPlace(query, key) {
  const address = await kakaoGet("local/search/address.json", { query }, key);
  let place = address.documents?.[0];
  if (!place) {
    const keyword = await kakaoGet("local/search/keyword.json", { query, size: 5 }, key);
    place = keyword.documents?.[0];
  }
  return placeFromDocument(place, query);
}

async function kakaoPlaceSuggestions(query, key) {
  const results = await Promise.allSettled([
    kakaoGet("local/search/address.json", { query, size: 6, analyze_type: "similar" }, key),
    kakaoGet("local/search/keyword.json", { query, size: 6 }, key),
  ]);
  if (results.every(result => result.status === "rejected")) throw results[0].reason;

  const suggestions = new Map();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const doc of result.value.documents || []) {
      const place = placeFromDocument(doc, query);
      if (!place) continue;
      const address = doc.road_address_name || doc.address_name || "";
      const id = JSON.stringify([place.name, place.lat, place.lng]);
      if (!suggestions.has(id)) {
        const tollgate = /(?:^|>\s*)톨게이트$/.test(doc.category_name || "");
        const tollgateName = place.name.replace(/\s*(?:TG|톨게이트|요금소)$/i, "");
        const area = (doc.address_name || address).trim().split(/\s+/, 2).join(" ");
        const tollgateLabel = tollgate && Object.hasOwn(tollgateNames, tollgateName) && tollgateNames[tollgateName][area];
        const englishName = kakaoStationEnglishLabel(doc) || (tollgateLabel && `${tollgateLabel} Tollgate`);
        suggestions.set(id, {
          ...place,
          detail: address !== place.name ? address : "",
          ...(englishName && { englishName }),
          ...(tollgate && { type: "tollgate" }),
        });
      }
    }
  }
  return [...suggestions.values()].slice(0, 6);
}

function normalizedName(value) {
  return String(value || "").replace(/\([^)]*\)/g, "").replace(/^지하철\s*\d+호선/, "").trim().replace(/역$/, "");
}

function rowsMatching(value, predicate) {
  const queue = [value];
  const found = [];
  for (let scanned = 0; queue.length && scanned < 3000; scanned += 1) {
    const item = queue.shift();
    if (!item || typeof item !== "object") continue;
    if (predicate(item)) found.push(item);
    for (const child of Object.values(item)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return found;
}

async function kricRequest(path, params, key) {
  const url = new URL(`${KRIC_BASE}/${path}`);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("format", "json");
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Object.assign(new Error("철도 엘리베이터 정보를 가져오지 못했어요."), { status: 502 });
  try {
    return await response.json();
  } catch {
    throw Object.assign(new Error("철도 데이터 응답을 읽지 못했어요."), { status: 502 });
  }
}

async function lookupStation(name, line, key) {
  const payload = await kricRequest("convenientInfo/stationInfo", {
    stinNm: normalizedName(name),
    lnCd: /^\d+$/.test(line) ? line : "",
  }, key);
  const rows = rowsMatching(payload, (row) => row.stinCd && row.stinNm);
  return rows.find((row) =>
    normalizedName(row.stinNm) === normalizedName(name) &&
    (!line || String(row.lnCd) === line)
  ) || null;
}

async function kricElevatorPaths(name, line, key) {
  const station = await lookupStation(name, line, key);
  if (!station) return [];
  const payload = await kricRequest("vulnerableUserInfo/stationElevatorMovement", {
    railOprIsttCd: String(station.railOprIsttCd || ""),
    lnCd: String(station.lnCd || ""),
    stinCd: String(station.stinCd),
  }, key);
  const rows = rowsMatching(payload, (row) => typeof row.mvContDtl === "string" && row.mvContDtl.trim());
  const groups = new Map();
  for (const row of rows) {
    const id = String(row.mvPathMgNo || row.mvPathDvCd || row.mvPathDvNm || "기타");
    if (!groups.has(id)) groups.set(id, { label: String(row.mvPathDvNm || "엘리베이터 이동 경로"), steps: [] });
    const text = row.mvContDtl.trim().slice(0, 300);
    if (!groups.get(id).steps.some((step) => step.text === text)) {
      groups.get(id).steps.push({ text, order: Number(row.mvTpOrdr) || 0 });
    }
  }
  return [...groups.values()].slice(0, 8).map((group) => ({
    label: group.label,
    steps: group.steps.sort((a, b) => a.order - b.order).slice(0, 15).map(({ text }) => text),
  }));
}

export function parseKricTransferRows(payload) {
  const rows = rowsMatching(payload, (row) => typeof row.mvContDtl === "string" && row.mvContDtl.trim());
  const groups = new Map();
  for (const row of rows) {
    const id = String(row.mvPathMgNo || "기본");
    if (!groups.has(id)) groups.set(id, { from: String(row.stMovePath || "").slice(0, 100), to: String(row.edMovePath || "").slice(0, 100), steps: [] });
    const text = row.mvContDtl.trim().slice(0, 300);
    const steps = groups.get(id).steps;
    if (!steps.some((step) => step.text === text)) steps.push({ text, order: Number(row.chtnMvTpOrdr) || 0 });
  }
  return [...groups.values()].slice(0, 5).map((group) => ({
    from: group.from, to: group.to,
    steps: group.steps.sort((a, b) => a.order - b.order).slice(0, 12).map(({ text }) => text),
  }));
}

async function kricTransferPaths({ station, fromLine, toLine, previousStation, nextStation }, key) {
  const [current, previous, next] = await Promise.all([
    lookupStation(station, fromLine, key),
    lookupStation(previousStation, fromLine, key),
    lookupStation(nextStation, toLine, key),
  ]);
  if (!current || !previous || !next) return [];
  const payload = await kricRequest("vulnerableUserInfo/transferMovement", {
    railOprIsttCd: String(current.railOprIsttCd || ""),
    lnCd: String(current.lnCd || fromLine),
    stinCd: String(current.stinCd),
    prevStinCd: String(previous.stinCd),
    chthTgtLn: String(next.lnCd || toLine),
    chtnNextStinCd: String(next.stinCd),
  }, key);
  return parseKricTransferRows(payload);
}

export function createApiHandler({ kakaoRestKey, kricKey, seoulKey }) {
  const seoulElevators = configured(seoulKey) ? createSeoulElevatorClient(seoulKey) : null;
  return async (request, response, next) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (url.pathname === "/routes" && request.method === "POST") {
        if (!configured(kakaoRestKey)) return sendError(response, 503, "kakao_not_configured", "KAKAO_REST_API_KEY를 .env.local에 넣어 주세요.");
        const { start, end } = await readJson(request);
        if (!validPoint(start) || !validPoint(end)) return sendError(response, 400, "invalid_route_points", "출발지와 도착지 좌표를 확인해 주세요.");
        const payload = await kakaoGet("routing/publictraffic", {
          start_x: start.lng, start_y: start.lat,
          end_x: end.lng, end_y: end.lat,
        }, kakaoRestKey);
        const itineraries = normalizeKakaoRoutes(payload);
        if (!itineraries.length) return sendError(response, 404, "no_routes", "이 출발지와 도착지의 대중교통 경로를 찾지 못했어요.");
        return sendJson(response, 200, { itineraries });
      }

      if (url.pathname === "/place" && request.method === "GET") {
        if (!configured(kakaoRestKey)) return sendError(response, 503, "kakao_not_configured", "KAKAO_REST_API_KEY를 .env.local에 넣어 주세요.");
        const query = String(url.searchParams.get("query") || "").trim();
        if (!query || query.length > 80) return sendError(response, 400, "invalid_place", "주소 또는 장소 이름을 확인해 주세요.");
        const place = await kakaoPlace(query, kakaoRestKey);
        if (!place) return sendError(response, 404, "place_not_found", "장소를 찾지 못했어요. 주소나 가까운 역 이름을 입력해 주세요.");
        return sendJson(response, 200, place);
      }

      if (url.pathname === "/suggestions" && request.method === "GET") {
        const query = String(url.searchParams.get("query") || "").trim();
        const station = url.searchParams.get("type") === "station";
        if (query.length < 2 || query.length > (station ? 30 : 80)) {
          return sendError(response, 400, "invalid_place", "검색어를 확인해 주세요.");
        }
        if (station) return sendJson(response, 200, { suggestions: await seoulElevators?.suggest(query) || [] });
        if (!configured(kakaoRestKey)) return sendError(response, 503, "kakao_not_configured", "KAKAO_REST_API_KEY를 .env.local에 넣어 주세요.");
        return sendJson(response, 200, { suggestions: await kakaoPlaceSuggestions(query, kakaoRestKey) });
      }

      if (url.pathname === "/station" && request.method === "GET") {
        if (!configured(kricKey)) return sendJson(response, 503, { error: "KRIC_API_KEY를 .env.local에 넣어 주세요." });
        const name = normalizedName(url.searchParams.get("name"));
        if (!name || name.length > 30) return sendJson(response, 400, { error: "역 이름을 확인해 주세요." });
        const station = await lookupStation(name, url.searchParams.get("line") || "", kricKey);
        const lat = Number(station?.stinLocLat);
        const lng = Number(station?.stinLocLon);
        if (!validPoint({ lat, lng })) return sendJson(response, 404, { error: "이 역의 위치를 찾지 못했어요." });
        return sendJson(response, 200, { name: station.stinNm, lat, lng });
      }

      if (url.pathname === "/elevators" && request.method === "GET") {
        const name = normalizedName(url.searchParams.get("name"));
        const line = url.searchParams.get("line") || "";
        if (!name || name.length > 30 || (line && !/^\d+$/.test(line))) return sendError(response, 400, "invalid_station", "역 이름과 노선을 확인해 주세요.");
        const [seoulResult, kricResult] = await Promise.allSettled([
          seoulElevators ? seoulElevators.find(name, line) : Promise.resolve([]),
          configured(kricKey) ? kricElevatorPaths(name, line, kricKey) : Promise.resolve([]),
        ]);
        const facilities = seoulResult.status === "fulfilled" ? seoulResult.value : [];
        const paths = kricResult.status === "fulfilled" ? kricResult.value : [];
        const unavailable = seoulResult.status === "rejected" || kricResult.status === "rejected";
        const status = facilities.length || paths.length ? "available"
          : unavailable ? "unavailable"
          : seoulElevators || configured(kricKey) ? "missing" : "not_configured";
        return sendJson(response, 200, {
          status, facilities, ground: [], paths,
          sources: { seoul: seoulElevators ? seoulResult.status : "not_configured", ground: "unverified", kric: configured(kricKey) ? kricResult.status : "not_configured" },
        });
      }

      if (url.pathname === "/transfer" && request.method === "GET") {
        const transfer = {
          station: normalizedName(url.searchParams.get("station")),
          fromLine: url.searchParams.get("fromLine") || "",
          toLine: url.searchParams.get("toLine") || "",
          previousStation: normalizedName(url.searchParams.get("previous")),
          nextStation: normalizedName(url.searchParams.get("next")),
        };
        if (!transfer.station || !transfer.previousStation || !transfer.nextStation
          || [transfer.station, transfer.previousStation, transfer.nextStation].some((name) => name.length > 30)
          || !/^\d+$/.test(transfer.fromLine) || !/^\d+$/.test(transfer.toLine)) {
          return sendJson(response, 400, { error: "환승역과 노선을 확인해 주세요." });
        }
        if (!configured(kricKey)) return sendJson(response, 200, { status: "not_configured", paths: [] });
        const paths = await kricTransferPaths(transfer, kricKey);
        return sendJson(response, 200, { status: paths.length ? "available" : "missing", paths });
      }

      next();
    } catch (error) {
      sendJson(response, error.status || 502, { error: error.message || "경로 정보를 가져오지 못했어요.", code: error.apiCode });
    }
  };
}
