import { useEffect, useRef, useState } from "react";
import { findElevatorMovement } from "./api/routeApi.js";
import { normalizeStationName } from "./routeModel.js";
import { isGroundExitFacility } from "./elevatorPresentation.js";
import { useLanguage } from "./i18n/LanguageProvider.jsx";
import { suggestionName } from "./i18n/messages.js";
import FacilityRow from "./FacilityRow.jsx";
import SuggestionInput from "./SuggestionInput.jsx";

function groupByLine(facilities) {
  const groups = new Map();
  for (const facility of facilities) {
    const line = facility.line || "";
    if (!groups.has(line)) groups.set(line, []);
    groups.get(line).push(facility);
  }
  return [...groups].sort(([a], [b]) => (Number(a) || Infinity) - (Number(b) || Infinity));
}

export default function StationSearch({ online }) {
  const { language, t } = useLanguage();
  const requestRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [searched, setSearched] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (online) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setResult(null);
    setError("");
    setBusy(false);
  }, [online]);

  async function search(event) {
    event.preventDefault();
    if (!navigator.onLine || requestRef.current) return;
    const station = normalizeStationName(query);
    if (!station) { setError("error.stationInput"); return; }
    const request = new AbortController();
    const { signal } = request;
    requestRef.current = request;
    setBusy(true);
    setError("");
    setResult(null);
    setSearched({ name: station, englishName: selectedStation?.englishName });
    try {
      const details = await findElevatorMovement(station, "", signal);
      if (!signal.aborted && navigator.onLine) setResult(details);
    } catch (cause) {
      if (!signal.aborted && navigator.onLine) setError(cause?.messageKey || "error.stationSearch");
    } finally {
      if (requestRef.current === request && !signal.aborted) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  const facilities = result?.facilities || [];
  const platform = facilities.filter((facility) => !isGroundExitFacility(facility));
  const exits = facilities.filter(isGroundExitFacility);
  const emptyMessage = result?.status === "not_configured" ? "station.notConfigured"
    : result?.sources?.seoul === "rejected" ? "station.sourceUnavailable" : "station.noData";

  return <section className="station-search" aria-label={t("station.searchLabel")}>
    <form className="station-search-card" onSubmit={search}>
      <h1>{t("station.searchMode")}</h1>
      <label htmlFor="station-name">{t("station.nameLabel")}</label>
      <div className="station-search-input">
        <SuggestionInput
          id="station-name"
          type="station"
          value={selectedStation ? suggestionName(selectedStation, language) : query}
          onChange={(value) => { setSelectedStation(null); setQuery(value); }}
          onSelect={(station) => { setSelectedStation(station); setQuery(station.name); }}
          enabled={online && !selectedStation}
          placeholder={t("station.example")}
          enterKeyHint="search"
        />
        <button className="search-button" type="submit" disabled={busy || !online}>{t(busy ? "station.searching" : "station.search")}</button>
      </div>
      <p>{t("station.searchHelp")}</p>
    </form>
    {error && online && <div className="error-box" role="alert">{t(error)}</div>}
    {result && online && <div className="station-results" aria-live="polite">
      <div className="station-results-heading">
        <div><span className="section-kicker">{t("station.searchMode")}</span><h2>{language === "en" && searched.englishName || t("station.title", { station: searched.name })}</h2></div>
        <span>{t("station.facilityCount", { count: facilities.length })}</span>
      </div>
      {facilities.length > 0 ? <>
        <p className="station-results-help">{t("station.directionsHelp")}</p>
        {groupByLine(platform).map(([line, items]) => <section className="station-line" key={line} aria-label={t(line ? "line.title" : "line.unknown", { line })}>
          <h3>{t(line ? "line.platform" : "line.unknown", { line })} <span>{t("station.platformCount", { count: items.length })}</span></h3>
          {items.map((facility, index) => <FacilityRow facility={facility} key={`${line}-${facility.name}-${facility.location}-${index}`} />)}
        </section>)}
        <p className="station-source">{t("station.source")}</p>
      </> : <div className="station-no-data">{t(emptyMessage)}</div>}
      {exits.length > 0 && <section className="station-ground">
        <h3>{t("elevator.ground")} <span>{t("station.exitCount", { count: exits.length })}</span></h3>
        <p>{t("station.groundHelp")}</p>
        {groupByLine(exits).map(([line, items]) => <div className="station-ground-line" key={line}>
          <strong>{t(line ? "line.title" : "line.unknown", { line })}</strong>
          {items.map((facility, index) => <FacilityRow facility={facility} key={`${line}-${index}`} />)}
        </div>)}
      </section>}
    </div>}
  </section>;
}
