import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { hasKakaoMapKey, loadKakaoMaps } from "./api/kakaoMaps.js";
import { findElevatorMovement, findPlace, findTransitRoutes, findTransferMovement } from "./api/routeApi.js";
import { selectDirectionalElevators } from "./elevatorDirection.js";
import { isGroundExitFacility } from "./elevatorPresentation.js";
import { elevatorCoverage, elevatorStops, legPoints, minutes, normalizeStationName, routeTransfers, stopKey, subwayLine, transferKey } from "./routeModel.js";
import { demoElevatorData, demoPoints, demoRoutes } from "./demoRoute.js";
import StationSearch from "./StationSearch.jsx";
import FacilityRow from "./FacilityRow.jsx";
import TransferCard from "./TransferCard.jsx";
import "./navigation.css";

function routeSummary(route) {
  const legs = route.legs || [];
  const walkSeconds = legs.filter((leg) => leg.mode === "WALK").reduce((sum, leg) => sum + (Number(leg.sectionTime) || 0), 0);
  return {
    transfers: Number.isFinite(Number(route.transferCount)) ? Number(route.transferCount) : Math.max(0, legs.filter((leg) => leg.mode !== "WALK").length - 1),
    walk: walkSeconds ? minutes(walkSeconds) : 0,
  };
}

async function resolvePlace(value) {
  const name = value.trim();
  if (!name) throw new Error("출발지와 도착지를 입력해 주세요.");
  return findPlace(name);
}

function DemoMap({ route }) {
  const stations = (route.legs || []).filter((leg) => leg.mode === "SUBWAY");
  return <div className="demo-map" role="img" aria-label="가상 경로의 화면 예시. 실제 지도나 길 안내가 아닙니다.">
    <span className="demo-map-label">화면 예시 · 실제 지도 아님</span>
    <div className="demo-map-path">
      <div className="demo-map-stop"><i className="start-dot" /><span>샘플 출발지</span></div>
      {stations.map((leg, index) => <div className="demo-map-stop" key={`${index}-${leg.route}`}><i className="rail-dot" /><span>{leg.start.name}<small>{leg.route} 이용</small></span></div>)}
      <div className="demo-map-stop"><i className="end-dot" /><span>샘플 도착지</span></div>
    </div>
  </div>;
}

function RouteMap({ route, start, end, demo }) {
  const element = useRef(null);
  const [mapError, setMapError] = useState("");
  useEffect(() => {
    if (!route || demo || !hasKakaoMapKey()) return undefined;
    let cancelled = false;
    let overlays = [];
    loadKakaoMaps().then((maps) => {
      if (cancelled || !element.current) return;
      const map = new maps.Map(element.current, { center: new maps.LatLng(start.lat, start.lng), level: 6 });
      const bounds = new maps.LatLngBounds();
      for (const leg of route.legs || []) {
        const path = legPoints(leg).map((point) => new maps.LatLng(point.lat, point.lng));
        if (path.length < 2) continue;
        path.forEach((point) => bounds.extend(point));
        overlays.push(new maps.Polyline({ map, path, strokeColor: leg.mode === "WALK" ? "#e18a56" : leg.mode === "BUS" ? "#426ca9" : "#16896f", strokeWeight: leg.mode === "WALK" ? 4 : 6, strokeOpacity: 0.9, strokeStyle: leg.mode === "WALK" ? "shortdash" : "solid" }));
      }
      for (const [point, label, color] of [[start, "출발", "#263f35"], [end, "도착", "#e27d49"]]) {
        const position = new maps.LatLng(point.lat, point.lng);
        bounds.extend(position);
        overlays.push(new maps.CustomOverlay({ map, position, content: `<div class="map-pin" style="--pin:${color}">${label}</div>`, yAnchor: 1 }));
      }
      map.setBounds(bounds);
    }).catch((error) => { if (!cancelled) setMapError(error.message); });
    return () => { cancelled = true; overlays.forEach((item) => item.setMap(null)); overlays = []; };
  }, [route, start, end, demo]);
  if (!route) return null;
  if (demo) return <DemoMap route={route} />;
  if (!hasKakaoMapKey() || mapError) return <div className="map-unavailable">{mapError || "카카오 지도 JavaScript 키를 연결하면 이곳에 지도가 표시돼요. 경로 검색은 REST API 키만으로도 가능합니다."}</div>;
  return <div className="route-map" ref={element} role="img" aria-label="선택한 대중교통 경로 지도" />;
}

function ElevatorNote({ stop, data, role }) {
  const details = data[stopKey(stop.name, stop.line)];
  const facilities = details?.facilities || [];
  const groundExits = facilities.filter(isGroundExitFacility);
  const selected = selectDirectionalElevators(facilities.filter((facility) => !isGroundExitFacility(facility)), stop);
  const visibleFacilities = selected.facilities;
  const summary = selected.status === "matched" ? `${selected.direction} 방면 승강장 · 엘리베이터 ${visibleFacilities.length}곳`
    : selected.status === "unverified" ? "이 방향의 승강장 위치 확인 필요"
      : visibleFacilities.length ? `엘리베이터 위치 ${visibleFacilities.length}곳 · 방향 정보 없음`
        : "엘리베이터 정보 확인 필요";
  const groundContent = groundExits.length > 0 && <div className="ground-elevator"><strong>지상 엘리베이터 위치</strong><p>엘리베이터가 연결된 출입구예요. 정확한 지도 좌표와 현재 위치에서의 보행거리는 확인되지 않았어요.</p>{groundExits.map((facility, index) => <FacilityRow facility={facility} key={`${index}-${facility.name}`} />)}</div>;
  const platformContent = <div className="platform-elevator"><strong className="platform-label">{role === "entry" ? "승강장으로 내려가기" : "승강장에서 올라가기"}</strong>
    {visibleFacilities.length > 0 && <div className="seoul-facilities"><p className="source-label">서울교통공사 승강기 가동현황 · {selected.status === "matched" ? `${selected.direction} 방면만 표시 · ` : "방향 정보 없음 · "}확인 시점에 따라 바뀔 수 있어요</p>{visibleFacilities.map((facility, index) => <FacilityRow facility={facility} key={`${index}-${facility.name}`} />)}</div>}
    {selected.status === "unverified" && <p>이 이동 방향에 맞는 승강장 엘리베이터 위치를 확인하지 못했어요. 반대 방향 위치는 숨겼습니다. 역 안내 표지나 역무원에게 확인해 주세요.</p>}
    {!visibleFacilities.length && selected.status !== "unverified" && <p>이 역의 승강장 엘리베이터 위치를 확인하지 못했어요. 역 안내 표지나 역무원에게 확인해 주세요.</p>}
    {details?.sources?.seoul === "rejected" && <p className="source-warning">서울시 승강기 상태를 불러오지 못했어요.</p>}
  </div>;
  return <div className={`elevator-note ${visibleFacilities.length || groundExits.length ? "has-data" : ""}`}>
    <div className="elevator-heading">
      <span className="lift-glyph" aria-hidden="true">↥</span><span><strong>{stop.name}역에서 {role === "entry" ? "타기" : "내리기"}</strong><small>{summary}</small></span>
    </div>
    <div className="elevator-detail">
      {role === "entry" && groundContent}
      {platformContent}
      {role === "exit" && groundContent}
    </div>
  </div>;
}

function LegCard({ leg, elevatorData, hideEntry = false, hideExit = false }) {
  const isRail = leg.mode === "SUBWAY";
  const line = isRail ? subwayLine(leg) : "";
  const title = isRail ? (leg.route || `${line}호선`) : leg.mode === "BUS" ? (leg.route || "버스") : "걸어서 이동";
  const rideStops = leg.stops || [];
  const stops = isRail ? [leg.start, leg.end].map((point, index) => ({
    name: normalizeStationName(point?.name), line,
    nextStation: index === 0 ? rideStops[1] : "",
    previousStation: index === 1 ? rideStops.at(-2) : "",
  })).filter((point) => point.name) : [];
  const detail = leg.mode === "BUS" ? `${leg.start?.name || "승차"} → ${leg.end?.name || "하차"}` : `${leg.start?.name || "출발지"}에서 ${leg.end?.name || "다음 지점"}까지`;
  return <article className={`leg-card mode-${(leg.mode || "other").toLowerCase()}`}>
    <div className="leg-icon" aria-hidden="true">{{ WALK: "↗", SUBWAY: "▰", BUS: "▣" }[leg.mode] || "→"}</div>
    <div className="leg-body"><div className="leg-top"><strong>{title}</strong><span>{minutes(leg.sectionTime)}분</span></div>{!isRail && <p>{detail}</p>}
      {isRail && stops[0] && !hideEntry && <ElevatorNote stop={stops[0]} data={elevatorData} role="entry" />}
      {isRail && <div className="train-ride"><span aria-hidden="true">→</span><span>지하철 타고 이동</span></div>}
      {isRail && stops[1] && !hideExit && <ElevatorNote stop={stops[1]} data={elevatorData} role="exit" />}
    </div>
  </article>;
}

function App() {
  const [searchMode, setSearchMode] = useState("route");
  const [origin, setOrigin] = useState("");
  const [originPoint, setOriginPoint] = useState(null);
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(0);
  const [points, setPoints] = useState(null);
  const [elevatorData, setElevatorData] = useState({});
  const [transferData, setTransferData] = useState({});
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("naeriljari-places"));
      if (Array.isArray(saved)) return saved.filter((item) => typeof item === "string");
      const stations = JSON.parse(localStorage.getItem("naeriljari-favorites"));
      return Array.isArray(stations) ? stations.filter((item) => typeof item === "string").map((item) => `${item}역`) : [];
    } catch { return []; }
  });
  const route = routes[selected];
  const transfers = useMemo(() => routeTransfers(route), [route]);

  useEffect(() => { localStorage.setItem("naeriljari-places", JSON.stringify(favorites)); }, [favorites]);

  function toggleFavorite() {
    if (demo) return;
    const place = destination.trim();
    if (!place) return;
    setFavorites((current) => current.includes(place) ? current.filter((item) => item !== place) : [...current, place].slice(0, 12));
  }

  function previewDemo() {
    setError(""); setDemo(true); setOrigin("샘플 출발지"); setDestination("샘플 도착지");
    setOriginPoint(null); setPoints(demoPoints); setRoutes(demoRoutes); setSelected(0); setElevatorData(demoElevatorData); setTransferData({});
    window.setTimeout(() => document.getElementById("route-results")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function closeDemo() {
    setDemo(false); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({});
    setOrigin(""); setDestination(""); setSelected(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearDemoForEdit() {
    if (!demo) return;
    setDemo(false); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({}); setSelected(0);
  }

  function useCurrentLocation() {
    clearDemoForEdit();
    setError("");
    if (!navigator.geolocation) { setError("이 브라우저는 현재 위치를 지원하지 않아요. 주소를 직접 입력해 주세요."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setOriginPoint({ lat: coords.latitude, lng: coords.longitude }); setOrigin("현재 위치"); setLocating(false); },
      () => { setError("위치를 가져오지 못했어요. 위치 권한을 허용하거나 주소를 직접 입력해 주세요."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function search(event) {
    event.preventDefault();
    setError(""); setDemo(false); setBusy(true); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({});
    try {
      const start = originPoint || await resolvePlace(origin);
      const end = await resolvePlace(destination);
      const found = await findTransitRoutes(start, end);
      setPoints({ start, end }); setRoutes(found); setSelected(0);
      const stops = new Map(found.flatMap(elevatorStops).map((stop) => [stopKey(stop.name, stop.line), stop]));
      const entries = await Promise.all([...stops].map(async ([key, stop]) => {
        try { return [key, await findElevatorMovement(stop.name, stop.line)]; }
        catch { return [key, { status: "unavailable", facilities: [], paths: [] }]; }
      }));
      setElevatorData(Object.fromEntries(entries));
      const uniqueTransfers = new Map(found.flatMap(routeTransfers).map((transfer) => [transferKey(transfer), transfer]));
      const movements = await Promise.all([...uniqueTransfers].map(async ([key, transfer]) => {
        try { return [key, await findTransferMovement(transfer)]; }
        catch { return [key, { status: "unavailable", paths: [] }]; }
      }));
      setTransferData(Object.fromEntries(movements));
    } catch (cause) { setError(cause.message || "경로를 찾지 못했어요."); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <header className="site-header"><div className="brand-mark" aria-hidden="true">↥</div><div className="brand-name">내릴자리<span>.</span></div><span className="header-caption">엘리베이터 길찾기</span></header>
    <main>
      <section className="hero"><div className="eyebrow"><span className="eyebrow-dot" /> 아이와 함께 가는 길, 조금 더 편하게</div>{searchMode === "route" ? <><h1>어디로<br /><em>가시나요?</em></h1><p>출발부터 도착까지 대중교통 길을 찾고,<br className="desktop-break" /> 지하철역의 엘리베이터 안내를 함께 확인하세요.</p></> : <><h1>역의<br /><em>엘리베이터는?</em></h1><p>역 이름만 입력하면 엘리베이터 위치와<br className="desktop-break" /> 현재 확인되는 가동 정보를 볼 수 있어요.</p></>}</section>
      <nav className="search-mode" aria-label="검색 종류"><button type="button" aria-current={searchMode === "route" ? "page" : undefined} className={searchMode === "route" ? "active" : ""} onClick={() => setSearchMode("route")}>길찾기</button><button type="button" aria-current={searchMode === "station" ? "page" : undefined} className={searchMode === "station" ? "active" : ""} onClick={() => setSearchMode("station")}>역 엘리베이터</button></nav>
      <div hidden={searchMode !== "route"}>
      <form className="search-card" onSubmit={search}>
        <div className="journey-line" aria-hidden="true"><i /><span /><i /></div>
        <div className="input-stack"><label className="place-field"><span>출발</span><input value={origin} onChange={(event) => { clearDemoForEdit(); setOrigin(event.target.value); setOriginPoint(null); }} placeholder="현재 위치 또는 출발 주소" autoComplete="street-address" /></label><label className="place-field"><span>도착</span><input value={destination} onChange={(event) => { clearDemoForEdit(); setDestination(event.target.value); }} placeholder="도착할 주소 또는 역 이름" autoComplete="off" /></label></div>
        <div className="form-actions"><button type="button" className="location-button" onClick={useCurrentLocation} disabled={locating}>{locating ? "위치 찾는 중…" : "◎ 현재 위치로 출발"}</button><button className="search-button" type="submit" disabled={busy}>{busy ? "길 찾는 중…" : <>길찾기 <span>↗</span></>}</button></div>
        <p className="input-hint">주소는 도로명·지번 주소로 입력해 주세요. 역 이름도 입력할 수 있어요.</p>
      </form>
      <section className="favorites-row" aria-label="자주 가는 곳"><div className="favorites-heading"><strong>☆ 자주 가는 곳</strong><button type="button" onClick={toggleFavorite} disabled={demo || !destination.trim()}>{demo ? "샘플은 저장하지 않아요" : favorites.includes(destination.trim()) ? "★ 저장됨" : "+ 현재 도착지 저장"}</button></div>{favorites.length > 0 && <div className="favorite-chips">{favorites.map((place) => <button type="button" key={place} onClick={() => { clearDemoForEdit(); setDestination(place); }}>☆ {place}</button>)}</div>}</section>
      {error && <div className="error-box" role="alert">{error}</div>}
      {!routes.length && <section className="empty-state"><div className="empty-illustration" aria-hidden="true"><div className="route-squiggle"><span className="point-a" /><span className="point-b" /><span className="mini-lift">↥</span></div></div><h2>길을 찾으면,<br />엘리베이터 정보도 함께 보여드려요.</h2><p>걷기 · 지하철 · 버스를 한눈에 확인하세요.</p><button className="demo-button" type="button" onClick={previewDemo} disabled={busy}>API 없이 화면 둘러보기 <span>↗</span></button><div className="setup-note">실제 길찾기에는 카카오 REST API 키가 필요해요. <a href="/SETUP.md" target="_blank" rel="noreferrer">설정 방법 ↗</a></div></section>}
      {route && points && <section className="results" id="route-results" aria-live="polite">{demo && <div className="demo-banner"><div><strong>화면 체험 중</strong><span>역·엘리베이터·가동 상태는 모두 가상 예시예요. 실제 이동에 사용하지 마세요.</span></div><button type="button" onClick={closeDemo}>체험 끝내기</button></div>}<div className="results-heading"><div><span className="section-kicker">{demo ? "샘플 경로" : "찾은 길"}</span><h2>{origin} <span>→</span> {destination}</h2></div><span className="route-count">{routes.length}개 경로</span></div><div className="route-options" role="tablist" aria-label="경로 선택">{routes.map((option, index) => { const summary = routeSummary(option); const coverage = elevatorCoverage(option, elevatorData); return <button type="button" role="tab" aria-selected={index === selected} className={`route-option ${index === selected ? "selected" : ""}`} key={index} onClick={() => setSelected(index)}><small>경로 {index + 1}</small><strong>{minutes(option.totalTime)}분</strong><span>환승 {summary.transfers}회 · 도보 {summary.walk}분</span>{routeTransfers(option).length > 0 && <span className="transfer-route-label">환승역: {routeTransfers(option).map((transfer) => `${transfer.station}역`).join(" · ")}</span>}<span className="coverage">엘리베이터 정보 {coverage.available}/{coverage.total}역</span></button>; })}</div><div className="route-layout"><div className="map-column"><RouteMap route={route} start={points.start} end={points.end} demo={demo} /><div className="map-legend"><span><i className="rail-key" /> 지하철</span><span><i className="bus-key" /> 버스</span><span><i className="walk-key" /> 도보</span></div></div><div className="steps-column"><div className="steps-heading"><h3>이동 순서</h3><span>{minutes(route.totalTime)}분 예상</span></div>{(route.legs || []).map((leg, index) => { const nextTransfer = transfers.find((transfer) => transfer.toIndex - 1 === index); return <div key={`${selected}-${index}`}><LegCard leg={leg} elevatorData={elevatorData} hideEntry={transfers.some((transfer) => transfer.toIndex === index)} hideExit={transfers.some((transfer) => transfer.fromIndex === index)} />{nextTransfer && <TransferCard transfer={nextTransfer} elevatorData={elevatorData} movement={transferData[transferKey(nextTransfer)]} demo={demo} />}</div>; })}<div className="arrival-card"><span className="arrival-dot" /> 목적지 도착</div></div></div><div className="safety-note"><span aria-hidden="true">ⓘ</span><p>{demo ? <strong>이것은 가상 경로입니다. 실제 이동에 사용하지 마세요.</strong> : <>이 길은 <strong>계단 없는 경로로 검증된 것은 아닙니다.</strong> 서울시의 가동 상태도 바뀔 수 있으며 도보·환승 구간의 계단과 경사는 확인되지 않았어요. 현장 안내를 확인해 주세요.</>}</p></div></section>}
      </div>
      {searchMode === "station" && <StationSearch />}
    </main><footer>내릴자리 · 이동이 조금 더 쉬워지도록</footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
