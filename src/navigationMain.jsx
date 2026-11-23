import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { hasKakaoMapKey, loadKakaoMaps } from "./api/kakaoMaps.js";
import { findElevatorMovement, findPlace, findTransitRoutes, findTransferMovement } from "./api/routeApi.js";
import { selectDirectionalElevators } from "./elevatorDirection.js";
import { isGroundExitFacility } from "./elevatorPresentation.js";
import { elevatorCoverage, elevatorStops, legPoints, minutes, normalizeStationName, routeTransfers, stopKey, subwayLine, transferKey } from "./routeModel.js";
import { demoElevatorData, demoPoints, demoRoutes, demoStationName } from "./demoRoute.js";
import { LanguageProvider, useLanguage } from "./i18n/LanguageProvider.jsx";
import { languages, suggestionName } from "./i18n/messages.js";
import { useOnline, useWideLayout } from "./browserState.js";
import InstallApp from "./InstallApp.jsx";
import SuggestionInput from "./SuggestionInput.jsx";
import StationSearch from "./StationSearch.jsx";
import StationTrip from "./StationTrip.jsx";
import FacilityRow from "./FacilityRow.jsx";
import TransferCard from "./TransferCard.jsx";
import setupGuideUrl from "../SETUP.md?url";
import "./navigation.css";

function routeSummary(route) {
  const legs = route.legs || [];
  const walkSeconds = legs.filter((leg) => leg.mode === "WALK").reduce((sum, leg) => sum + (Number(leg.sectionTime) || 0), 0);
  return {
    transfers: Number.isFinite(Number(route.transferCount)) ? Number(route.transferCount) : Math.max(0, legs.filter((leg) => leg.mode !== "WALK").length - 1),
    walk: walkSeconds ? minutes(walkSeconds) : 0,
  };
}

function Header() {
  const { language, setLanguage, t } = useLanguage();
  return <header className="site-header">
    <div className="header-content">
      <div className="brand-mark" aria-hidden="true">↥</div>
      <div className="brand-name">{t("app.brand")}<span aria-hidden="true">.</span></div>
      <div className="header-tools">
        <InstallApp />
        <select className="language-select" aria-label={t("app.language")} value={language} onChange={(event) => setLanguage(event.target.value)}>
          {Object.entries(languages).map(([code, { label }]) => <option key={code} value={code} lang={code}>{label}</option>)}
        </select>
      </div>
    </div>
  </header>;
}

function DemoMap({ route }) {
  const { t } = useLanguage();
  const stations = (route.legs || []).filter((leg) => leg.mode === "SUBWAY");
  return <div className="demo-map" role="img" aria-label={t("demo.mapLabel")}>
    <span className="demo-map-label">{t("demo.mapBadge")}</span>
    <div className="demo-map-path">
      <div className="demo-map-stop"><i className="start-dot" /><span>{t("demo.origin")}</span></div>
      {stations.map((leg, index) => <div className="demo-map-stop" key={`${index}-${leg.route}`}>
        <i className="rail-dot" />
        <span>
          {t("station.title", { station: demoStationName(leg.start.name, t) })}
          <small>{t("demo.mapLine", { line: t("line.title", { line: subwayLine(leg) }) })}</small>
        </span>
      </div>)}
      <div className="demo-map-stop"><i className="end-dot" /><span>{t("demo.destination")}</span></div>
    </div>
  </div>;
}

function RouteMap({ route, start, end, demo }) {
  const { t } = useLanguage();
  const element = useRef(null);
  const pins = useRef(new Map());
  const pinLabels = useRef({});
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    pinLabels.current = { origin: t("route.origin"), destination: t("route.destination") };
    for (const [key, pin] of pins.current) pin.textContent = pinLabels.current[key];
  }, [t]);

  useEffect(() => {
    if (!route || demo || !hasKakaoMapKey()) return undefined;
    let cancelled = false;
    let resizeObserver;
    const overlays = [];
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
      for (const [point, key, color] of [[start, "origin", "#263f35"], [end, "destination", "#e27d49"]]) {
        const position = new maps.LatLng(point.lat, point.lng);
        const pin = document.createElement("div");
        pin.className = "map-pin";
        pin.style.setProperty("--pin", color);
        pin.textContent = pinLabels.current[key];
        pins.current.set(key, pin);
        bounds.extend(position);
        overlays.push(new maps.CustomOverlay({ map, position, content: pin, yAnchor: 1 }));
      }
      map.setBounds(bounds);
      resizeObserver = new ResizeObserver(() => {
        map.relayout();
        map.setBounds(bounds);
      });
      resizeObserver.observe(element.current);
    }).catch(() => { if (!cancelled) setMapError(true); });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      overlays.forEach((item) => item.setMap(null));
      pins.current.clear();
    };
  }, [route, start, end, demo]);
  if (!route) return null;
  if (demo) return <DemoMap route={route} />;
  if (!hasKakaoMapKey() || mapError) {
    const from = `${encodeURIComponent(start.name || t("route.origin"))},${start.lat},${start.lng}`;
    const to = `${encodeURIComponent(end.name || t("route.destination"))},${end.lat},${end.lng}`;
    return <div className="map-unavailable">
      <div>
        <p>{t(mapError ? "route.mapError" : "route.mapNeedsKey", { origin: window.location.origin })}</p>
        <a href={`https://map.kakao.com/link/by/traffic/${from}/${to}`} target="_blank" rel="noreferrer">{t("route.openKakaoMap")}</a>
      </div>
    </div>;
  }
  return <>
    <div className="route-map" ref={element} role="img" aria-label={t("route.mapLabel")} />
    <div className="map-legend">
      <span><i className="rail-key" /> {t("route.subway")}</span>
      <span><i className="bus-key" /> {t("route.bus")}</span>
      <span><i className="walk-key" /> {t("route.walk")}</span>
    </div>
  </>;
}

function ElevatorNote({ stop, data, role, demo }) {
  const { t } = useLanguage();
  const details = data[stopKey(stop.name, stop.line)];
  const facilities = details?.facilities || [];
  const groundExits = facilities.filter(isGroundExitFacility);
  const selected = selectDirectionalElevators(facilities.filter((facility) => !isGroundExitFacility(facility)), stop);
  const visibleFacilities = selected.facilities;
  const station = demo ? demoStationName(stop.name, t) : stop.name;
  const direction = selected.direction;
  const matched = selected.status === "matched";
  const unverified = selected.status === "unverified";
  const summary = matched ? "elevator.directionCount" : unverified ? "elevator.checkDirection"
    : visibleFacilities.length ? "elevator.undirectedCount" : "elevator.checkInfo";
  const groundContent = groundExits.length > 0 && <div className="ground-elevator">
    <strong>{t("elevator.ground")}</strong>
    <p>{t("elevator.groundHelp")}</p>
    {groundExits.map((facility, index) => <FacilityRow facility={facility} key={`${index}-${facility.name}`} />)}
  </div>;
  const platformContent = <div className="platform-elevator">
    <strong className="platform-label">{t(role === "entry" ? "elevator.enterPlatform" : "elevator.leavePlatform")}</strong>
    {visibleFacilities.length > 0 && <div className="seoul-facilities">
      {!demo && <p className="source-label">{t(matched ? "elevator.directionSource" : "elevator.undirectedSource", { direction })}</p>}
      {visibleFacilities.map((facility, index) => <FacilityRow facility={facility} key={`${index}-${facility.name}`} />)}
    </div>}
    {unverified && <p>{t("elevator.directionUnverified")}</p>}
    {!visibleFacilities.length && !unverified && <p>{t("elevator.stationUnverified")}</p>}
    {details?.sources?.seoul === "rejected" && <p className="source-warning">{t("elevator.sourceUnavailable")}</p>}
  </div>;
  return <div className={`elevator-note ${visibleFacilities.length || groundExits.length ? "has-data" : ""}`}>
    <div className="elevator-heading">
      <span className="lift-glyph" aria-hidden="true">↥</span>
      <span>
        <strong>{t(role === "entry" ? "elevator.boardAt" : "elevator.exitAt", { station })}</strong>
        <small>{t(summary, { direction, count: visibleFacilities.length })}</small>
      </span>
    </div>
    <div className="elevator-detail">
      {role === "entry" && groundContent}
      {platformContent}
      {role === "exit" && groundContent}
    </div>
  </div>;
}

function routePointName(point, fallback, t, demo) {
  if (point?.nameKey) return t(point.nameKey);
  if (point?.nameRole) return t(`route.${point.nameRole}`);
  if (!point?.name) return t(fallback);
  return demo ? t("station.title", { station: demoStationName(point.name, t) }) : point.name;
}

function LegCard({ leg, elevatorData, demo, hideEntry = false, hideExit = false }) {
  const { t } = useLanguage();
  const isRail = leg.mode === "SUBWAY";
  const isBus = leg.mode === "BUS";
  const line = isRail ? subwayLine(leg) : "";
  const numberedLine = line && (!leg.route || /^\d+호선$/.test(leg.route));
  const title = isRail ? (numberedLine ? t("line.title", { line }) : leg.route || t("route.subway"))
    : isBus ? leg.route || t("route.bus") : t("route.walking");
  const rideStops = leg.stops || [];
  const stops = isRail ? [leg.start, leg.end].map((point, index) => ({
    name: normalizeStationName(point?.name), line,
    nextStation: index === 0 ? rideStops[1] : "",
    previousStation: index === 1 ? rideStops.at(-2) : "",
  })).filter((point) => point.name) : [];
  const start = routePointName(leg.start, isBus ? "route.boardBus" : "route.startPoint", t, demo);
  const end = routePointName(leg.end, isBus ? "route.exitBus" : "route.nextPoint", t, demo);
  const detail = isBus ? `${start} → ${end}` : t("route.walkBetween", { start, end });
  return <article className={`leg-card mode-${(leg.mode || "other").toLowerCase()}`}>
    <div className="leg-body"><div className="leg-top"><strong>{title}</strong><span>{t("route.duration", { minutes: minutes(leg.sectionTime) })}</span></div>{!isRail && <p>{detail}</p>}
      {isRail && stops[0] && !hideEntry && <ElevatorNote stop={stops[0]} data={elevatorData} role="entry" demo={demo} />}
      {isRail && <div className="train-ride"><span aria-hidden="true">→</span><span>{t("route.rideSubway")}</span></div>}
      {isRail && stops[1] && !hideExit && <ElevatorNote stop={stops[1]} data={elevatorData} role="exit" demo={demo} />}
    </div>
  </article>;
}

function App() {
  const { language, t } = useLanguage();
  const pagesPreview = import.meta.env.VITE_GITHUB_PAGES === "true" && !import.meta.env.VITE_API_BASE_URL;
  const online = useOnline() && !pagesPreview;
  const wideLayout = useWideLayout();
  const routeRequest = useRef(null);
  const locationRequest = useRef(null);
  const demoButton = useRef(null);
  const [searchMode, setSearchMode] = useState("route");
  const [origin, setOrigin] = useState("");
  const [originPoint, setOriginPoint] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(0);
  const [resultView, setResultView] = useState("steps");
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
  const route = demo || online ? routes[selected] : null;
  const transfers = useMemo(() => routeTransfers(route), [route]);
  const originLabel = demo ? t("demo.origin") : originPoint?.name ? suggestionName(originPoint, language)
    : origin || (originPoint ? t("route.currentLocation") : "");
  const destinationLabel = demo ? t("demo.destination") : destinationPoint ? suggestionName(destinationPoint, language) : destination;
  const focusResults = useCallback((heading) => {
    if (heading && !heading.closest("[hidden]")) heading.focus();
  }, []);

  useEffect(() => {
    if (online) return;
    routeRequest.current?.abort();
    routeRequest.current = null;
    locationRequest.current = null;
    setBusy(false);
    setLocating(false);
    setError("");
    if (!demo) {
      setRoutes([]);
      setPoints(null);
      setElevatorData({});
      setTransferData({});
    }
  }, [online, demo]);

  useEffect(() => {
    try {
      localStorage.setItem("naeriljari-places", JSON.stringify(favorites));
    } catch {
      // Favorites are still available in memory for this session.
    }
  }, [favorites]);

  function toggleFavorite() {
    if (demo) return;
    const place = destination.trim();
    if (!place) return;
    setFavorites((current) => current.includes(place) ? current.filter((item) => item !== place) : [...current, place].slice(0, 12));
  }

  function previewDemo() {
    locationRequest.current = null;
    setLocating(false);
    setError(""); setDemo(true); setOrigin(""); setDestination("");
    setDestinationPoint(null);
    setOriginPoint(null); setPoints(demoPoints); setRoutes(demoRoutes); setSelected(0); setElevatorData(demoElevatorData); setTransferData({});
    setResultView("steps");
  }

  function closeDemo() {
    setDemo(false); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({});
    setOrigin(""); setDestination(""); setSelected(0);
    requestAnimationFrame(() => demoButton.current?.focus());
  }

  function clearDemoForEdit() {
    if (!demo) return;
    setDemo(false); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({}); setSelected(0);
  }

  function changeOrigin(name, point = null) {
    clearDemoForEdit();
    locationRequest.current = null;
    setLocating(false);
    setOrigin(name);
    setOriginPoint(point);
  }

  function changeDestination(name, point = null) {
    clearDemoForEdit();
    setDestination(name);
    setDestinationPoint(point);
  }

  function useCurrentLocation() {
    if (!navigator.onLine) return;
    clearDemoForEdit();
    setError("");
    if (!navigator.geolocation) { setError("error.locationUnsupported"); return; }
    const request = Symbol();
    locationRequest.current = request;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (locationRequest.current !== request || !navigator.onLine) return;
        setOriginPoint({ lat: coords.latitude, lng: coords.longitude });
        setOrigin("");
        setLocating(false);
      },
      () => {
        if (locationRequest.current !== request || !navigator.onLine) return;
        setError("error.locationFailed");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function search(event) {
    event.preventDefault();
    if (!navigator.onLine || routeRequest.current) return;
    setError(""); setDemo(false); setRoutes([]); setPoints(null); setElevatorData({}); setTransferData({});
    if ((!originPoint && !origin.trim()) || !destination.trim()) {
      setError("error.routeInput");
      return;
    }
    const request = new AbortController();
    const { signal } = request;
    routeRequest.current = request;
    setBusy(true);
    try {
      const [start, end] = await Promise.all([
        originPoint || findPlace(origin.trim(), signal),
        destinationPoint || findPlace(destination.trim(), signal),
      ]);
      const found = await findTransitRoutes(start, end, signal);
      if (signal.aborted || !navigator.onLine) return;
      setPoints({ start, end }); setRoutes(found); setSelected(0);
      setResultView("steps");
      const stops = new Map(found.flatMap(elevatorStops).map((stop) => [stopKey(stop.name, stop.line), stop]));
      const entries = await Promise.all([...stops].map(async ([key, stop]) => {
        try { return [key, await findElevatorMovement(stop.name, stop.line, signal)]; }
        catch { return [key, { status: "unavailable", facilities: [], paths: [] }]; }
      }));
      if (signal.aborted || !navigator.onLine) return;
      setElevatorData(Object.fromEntries(entries));
      const uniqueTransfers = new Map(found.flatMap(routeTransfers).map((transfer) => [transferKey(transfer), transfer]));
      const movements = await Promise.all([...uniqueTransfers].map(async ([key, transfer]) => {
        try { return [key, await findTransferMovement(transfer, signal)]; }
        catch { return [key, { status: "unavailable", paths: [] }]; }
      }));
      if (!signal.aborted && navigator.onLine) setTransferData(Object.fromEntries(movements));
    } catch (cause) {
      if (!signal.aborted && navigator.onLine) setError(cause?.messageKey || "error.routeSearch");
    } finally {
      if (routeRequest.current === request) {
        routeRequest.current = null;
        setBusy(false);
      }
    }
  }

  return <div className="app-shell">
    <Header />
    <main>
      <nav className="search-mode" aria-label={t("search.mode")}>
        <button type="button" aria-pressed={searchMode === "route"} aria-controls="route-search-panel" onClick={() => setSearchMode("route")}>{t("route.searchMode")}</button>
        <button type="button" aria-pressed={searchMode === "station"} aria-controls="station-search-panel" onClick={() => setSearchMode("station")}>{t("station.searchMode")}</button>
        <button type="button" aria-pressed={searchMode === "station-trip"} aria-controls="station-trip-panel" onClick={() => setSearchMode("station-trip")}>{t("stationTrip.tab")}</button>
      </nav>
      <div role="status" className={online ? "visually-hidden" : "offline-notice"}>{!online && t(pagesPreview ? "app.pagesPreview" : "app.offline")}</div>
      <div id="route-search-panel" hidden={searchMode !== "route"}>
        <div className="search-workspace">
          <form className="search-card" onSubmit={search}>
            <h1>{t("route.searchMode")}</h1>
            <div className="input-stack">
              <div className="place-field">
                <label htmlFor="route-origin">{t("route.origin")}</label>
                <SuggestionInput
                  id="route-origin"
                  value={originLabel}
                  onChange={changeOrigin}
                  onSelect={(place) => changeOrigin(place.name, place)}
                  enabled={online && searchMode === "route" && !demo && !originPoint}
                  placeholder={t("route.originPlaceholder")}
                  enterKeyHint="next"
                />
              </div>
              <div className="place-field">
                <label htmlFor="route-destination">{t("route.destination")}</label>
                <SuggestionInput
                  id="route-destination"
                  value={destinationLabel}
                  onChange={changeDestination}
                  onSelect={(place) => changeDestination(place.name, place)}
                  enabled={online && searchMode === "route" && !demo && !destinationPoint}
                  placeholder={t("route.destinationPlaceholder")}
                  enterKeyHint="search"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="location-button" onClick={useCurrentLocation} disabled={locating || !online}>
                {!locating && <span aria-hidden="true">◎ </span>}{t(locating ? "route.locating" : "route.useLocation")}
              </button>
              <button className="search-button" type="submit" disabled={busy || !online}>
                {t(busy ? "route.searching" : "route.search")} {!busy && <span aria-hidden="true">↗</span>}
              </button>
            </div>
            <p className="input-hint">{t("route.addressHelp")}</p>
          </form>
          <div className="search-tools">
            <section className="favorites-row" aria-label={t("favorites.title")}>
              <div className="favorites-heading">
                <strong><span aria-hidden="true">☆ </span>{t("favorites.title")}</strong>
                <button type="button" onClick={toggleFavorite} disabled={demo || !destination.trim()}>
                  <span aria-hidden="true">{favorites.includes(destination.trim()) ? "★ " : "+ "}</span>
                  {t(favorites.includes(destination.trim()) ? "favorites.saved" : "favorites.save")}
                </button>
              </div>
              {favorites.length > 0 && <div className="favorite-chips">
                {favorites.map((place) => <button type="button" key={place} onClick={() => changeDestination(place)}>{place}</button>)}
              </div>}
            </section>
            {!route && <button ref={demoButton} className="demo-button" type="button" onClick={previewDemo} disabled={busy}>{t("demo.open")} <span aria-hidden="true">↗</span></button>}
          </div>
        </div>
        {error && online && <div className="error-box" role="alert">{t(error)}{error === "error.kakaoNotConfigured" && <> <a href={setupGuideUrl} target="_blank" rel="noreferrer">{t("route.setupLink")} ↗</a></>}</div>}
        {route && points && <section className="results" id="route-results" aria-labelledby="route-results-heading">
          {demo && <div className="demo-banner">
            <div><strong>{t("demo.banner")}</strong><span>{t("demo.description")}</span></div>
            <button type="button" onClick={closeDemo}>{t("demo.close")}</button>
          </div>}
          <div className="results-heading">
            <div>
              <span className="section-kicker">{t(demo ? "demo.route" : "route.results")}</span>
              <h2 id="route-results-heading" tabIndex={-1} ref={focusResults}>
                {demo ? originLabel : suggestionName(points.start, language) || t("route.currentLocation")} <span>→</span> {demo ? destinationLabel : suggestionName(points.end, language)}
              </h2>
            </div>
            <span className="route-count">{t("route.count", { count: routes.length })}</span>
          </div>
          <div className="route-options" role="group" aria-label={t("route.choose")}>
            {routes.map((option, index) => {
              const summary = routeSummary(option);
              const coverage = elevatorCoverage(option, elevatorData);
              const stations = routeTransfers(option).map(({ station }) => t("station.title", { station: demo ? demoStationName(station, t) : station }));
              return <button type="button" aria-pressed={index === selected} className="route-option" key={index} onClick={() => {
                if (index !== selected) setResultView("steps");
                setSelected(index);
              }}>
                <small>{t("route.option", { number: index + 1 })}</small>
                <strong>{t("route.duration", { minutes: minutes(option.totalTime) })}</strong>
                <span>{t("route.optionDetails", summary, summary.transfers)}</span>
                {stations.length > 0 && <span className="transfer-route-label">{t("route.transferStations", { stations: stations.join(" · ") })}</span>}
                <span className="coverage">{t("route.coverage", coverage)}</span>
              </button>;
            })}
          </div>
          {!wideLayout && <div className="result-views" role="group" aria-label={t("route.resultView")}>
            <button type="button" aria-pressed={resultView === "steps"} aria-controls="trip-steps" onClick={() => setResultView("steps")}>{t("route.steps")}</button>
            <button type="button" aria-pressed={resultView === "map"} aria-controls="trip-map" onClick={() => setResultView("map")}>{t("route.mapView")}</button>
          </div>}
          <div className="route-layout">
            <div id="trip-steps" className="steps-column" hidden={!wideLayout && resultView !== "steps"}>
              <div className="steps-heading"><h3>{t("route.steps")}</h3><span>{t("route.estimate", { minutes: minutes(route.totalTime) })}</span></div>
              {(route.legs || []).map((leg, index) => {
                const nextTransfer = transfers.find((transfer) => transfer.toIndex - 1 === index);
                return <div key={`${selected}-${index}`}>
                  <LegCard leg={leg} elevatorData={elevatorData} demo={demo} hideEntry={transfers.some((transfer) => transfer.toIndex === index)} hideExit={transfers.some((transfer) => transfer.fromIndex === index)} />
                  {nextTransfer && <TransferCard transfer={nextTransfer} elevatorData={elevatorData} movement={transferData[transferKey(nextTransfer)]} demo={demo} />}
                </div>;
              })}
              <div className="arrival-card"><span className="arrival-dot" /> {t("route.arrival")}</div>
            </div>
            <div id="trip-map" className="map-column" hidden={!wideLayout && resultView !== "map"}>
              {searchMode === "route" && (wideLayout || resultView === "map") &&
                <RouteMap key={selected} route={route} start={points.start} end={points.end} demo={demo} />}
            </div>
          </div>
          <div className="safety-note">
            <span aria-hidden="true">ⓘ</span>
            <p>{demo ? <strong>{t("demo.warning")}</strong> : <><strong>{t("route.safetyWarning")}</strong> {t("route.safetyDetail")}</>}</p>
          </div>
        </section>}
      </div>
      <div id="station-search-panel" hidden={searchMode !== "station"}>
        {searchMode === "station" && <StationSearch online={online} />}
      </div>
      <div id="station-trip-panel" hidden={searchMode !== "station-trip"}>
        {searchMode === "station-trip" && <StationTrip online={online} />}
      </div>
    </main>
    <footer>
      {t("app.footer")}
      <div>
        <a href="https://data.seoul.go.kr/dataList/OA-2751/F/1/datasetView.do" target="_blank" rel="noreferrer">{t("suggestions.stationSource")}</a>
        {" · "}
        <a href="https://www.data.go.kr/data/15085270/fileData.do" target="_blank" rel="noreferrer">{t("suggestions.tollgateSource")}</a>
      </div>
    </footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<LanguageProvider><App /></LanguageProvider>);

if (import.meta.env.PROD && window.isSecureContext && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" }).catch((error) => {
      console.warn("ElevatorFinder could not prepare offline access.", error);
    });
  }, { once: true });
}
