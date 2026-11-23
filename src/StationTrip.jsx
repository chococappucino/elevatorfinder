import { Fragment, useEffect, useId, useRef, useState } from "react";
import { findElevatorMovement, findPlace, findTransitRoutes, findTransferMovement } from "./api/routeApi.js";
import { selectDirectionalElevators } from "./elevatorDirection.js";
import { isGroundExitFacility } from "./elevatorPresentation.js";
import { useLanguage } from "./i18n/LanguageProvider.jsx";
import { suggestionName } from "./i18n/messages.js";
import { elevatorStops, minutes, normalizeStationName, routeTransfers, stopKey, subwayLine, transferKey } from "./routeModel.js";
import { chooseStationTrip, groundElevators } from "./stationTripModel.js";
import FacilityRow from "./FacilityRow.jsx";
import SuggestionInput from "./SuggestionInput.jsx";

const initialFrom = "혜화역";
const initialTo = "성수역";
const unavailable = { status: "unavailable", facilities: [], paths: [] };
const stationMaps = {
  "혜화|4": "/station-maps/hyehwa-line4.jpg",
  "동대문역사문화공원|4": "/station-maps/ddp-line4.jpg",
  "동대문역사문화공원|2": "/station-maps/ddp-line2.jpg",
  "성수|2": "/station-maps/seongsu-line2.jpg",
};

function stationTitle(name, t) {
  return t("station.title", { station: normalizeStationName(name) });
}

function StationMap({ station, line }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(100);
  const image = stationMaps[`${normalizeStationName(station)}|${line}`];
  if (!image) return null;
  const title = t("stationTrip.mapTitle", { station: stationTitle(station, t), line });
  function openMap() {
    setZoom(window.matchMedia("(max-width: 600px)").matches ? 200 : 100);
    dialogRef.current?.showModal();
  }
  return <div className="trip-map">
    <button type="button" className="trip-map-open" onClick={openMap} aria-label={t("stationTrip.mapOpenLabel", { title })}>
      <img src={image} alt="" loading="lazy" />
      <span><strong>{title}</strong><small>{t("stationTrip.mapOpen")}</small></span>
    </button>
    <dialog ref={dialogRef} className="trip-map-dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}>
      <div className="trip-map-dialog-head">
        <strong id={titleId}>{title}</strong>
        <div className="trip-map-controls">
          <button type="button" aria-label={t("stationTrip.mapZoomOut")} disabled={zoom <= 100} onClick={() => setZoom((value) => value - 50)}>−</button>
          <span aria-live="polite">{zoom}%</span>
          <button type="button" aria-label={t("stationTrip.mapZoomIn")} disabled={zoom >= 300} onClick={() => setZoom((value) => value + 50)}>+</button>
          <button type="button" className="trip-map-close" aria-label={t("stationTrip.mapClose")} onClick={() => dialogRef.current?.close()}>×</button>
        </div>
      </div>
      <div className="trip-map-viewer"><img src={image} alt={title} style={{ width: `${zoom}%` }} /></div>
      <p>{t("stationTrip.mapNote")}</p>
    </dialog>
  </div>;
}

function SignCue({ label, detail }) {
  const { t } = useLanguage();
  return <div className="trip-sign-cue">
    <svg viewBox="0 0 48 48" role="img" aria-label={t("stationTrip.elevatorSymbol")}>
      <rect x="1" y="1" width="46" height="46" rx="7" fill="#165747" />
      <path d="M13 12V6m0 0-3 3m3-3 3 3M35 6v6m0 0-3-3m3 3 3-3" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="17" width="30" height="23" rx="2" fill="none" stroke="white" strokeWidth="2" />
      <path d="M24 18v21" stroke="white" strokeWidth="1.5" />
      <circle cx="17" cy="24" r="2.4" fill="white" /><path d="M17 28v8m-4-5h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="31" cy="24" r="2.4" fill="white" /><path d="M31 28v8m-4-5h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <div><small>{t("stationTrip.signLookFor")}</small><strong>{label}</strong>{detail && <span>{detail}</span>}</div>
  </div>;
}

function GroundLocations({ station, result }) {
  const { t } = useLanguage();
  const facilities = groundElevators(result);
  return <div className="trip-ground">
    <h4>{t("stationTrip.groundAt", { station: stationTitle(station, t) })}</h4>
    {facilities.length ? <div className="trip-ground-list">
        {facilities.map((facility, index) => <div className="trip-ground-option" key={`${facility.line}-${facility.location}-${index}`}>
          {facility.line && <small className="trip-line-label">{t("line.title", { line: facility.line })}</small>}
          <FacilityRow facility={facility} />
        </div>)}
      </div> : <p className="trip-caution">{t(result?.status === "unavailable" ? "stationTrip.dataUnavailable" : "stationTrip.groundUnknown")}</p>}
  </div>;
}

function PlatformLocations({ station, line, result, nextStation, previousStation, arrivingTransfer = false }) {
  const { t } = useLanguage();
  const facilities = (result?.facilities || []).filter((facility) => !isGroundExitFacility(facility));
  const selected = arrivingTransfer ? null : selectDirectionalElevators(facilities, { nextStation, previousStation });
  const shown = arrivingTransfer ? facilities : selected.facilities;
  return <div className="trip-platform">
    <h4>{t("stationTrip.platformAt", { station: stationTitle(station, t), line })}</h4>
    {arrivingTransfer && <p className="trip-caution">{t("stationTrip.arrivalUnverified")}</p>}
    {selected?.status === "unverified" && <p className="trip-caution">{t("stationTrip.directionUnverified")}</p>}
    {shown.length ? shown.map((facility, index) => <FacilityRow facility={facility} key={`${facility.location}-${index}`} />)
      : selected?.status !== "unverified" && <p className="trip-caution">{t("stationTrip.platformUnknown")}</p>}
  </div>;
}

function TransferGuide({ transfer, elevatorData, groundData, movement }) {
  const { t } = useLanguage();
  const arriving = elevatorData[stopKey(transfer.station, transfer.fromLine)];
  const departing = elevatorData[stopKey(transfer.station, transfer.toLine)];
  const paths = movement?.paths || [];
  return <li className="trip-step">
    <span className="trip-step-type">{t("transfer.title")}</span>
    <h3>{t("stationTrip.transferAt", { station: stationTitle(transfer.station, t), from: transfer.fromLine, to: transfer.toLine })}</h3>
    <SignCue label={t("stationTrip.signTransfer", { line: transfer.toLine })} detail={t("stationTrip.signDirection", { station: stationTitle(transfer.nextStation, t) })} />
    <p>{t("stationTrip.transferIntro", { from: transfer.fromLine, to: transfer.toLine, direction: stationTitle(transfer.nextStation, t) })}</p>
    <div className="trip-map-pair"><StationMap station={transfer.station} line={transfer.fromLine} /><StationMap station={transfer.station} line={transfer.toLine} /></div>
    <PlatformLocations station={transfer.station} line={transfer.fromLine} result={arriving} arrivingTransfer />
    {paths.length ? <div className="trip-transfer-path">
      <strong>{t("transfer.details")}</strong>
      {paths.map((path, index) => <div key={index}><small>{path.from} → {path.to}</small><ol>{path.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol></div>)}
      <small>{t("transfer.source")}</small>
    </div> : <p className="trip-caution">{t("stationTrip.transferUnverified")}</p>}
    <PlatformLocations station={transfer.station} line={transfer.toLine} result={departing} nextStation={transfer.nextStation} />
    <GroundLocations station={transfer.station} result={groundData[transfer.station]} />
  </li>;
}

function TripGuide({ trip }) {
  const { t } = useLanguage();
  const { route, elevatorData, groundData, transferData, from, to } = trip;
  const rail = route.legs.filter((leg) => leg.mode === "SUBWAY");
  const transfers = routeTransfers(route);
  const first = rail[0];
  const last = rail.at(-1);
  const firstLine = subwayLine(first);
  const lastLine = subwayLine(last);

  return <section className="station-trip-results" aria-live="polite">
    <div className="station-results-heading">
      <div><span className="section-kicker">{t("stationTrip.guide")}</span><h2>{stationTitle(from, t)} → {stationTitle(to, t)}</h2></div>
      <span>{t("route.estimate", { minutes: minutes(route.totalTime) })}</span>
    </div>
    <p className="trip-summary">{t("stationTrip.summary", { transfers: transfers.length })}</p>
    <ol className="trip-guide-list">
      <li className="trip-step">
        <span className="trip-step-type">{t("stationTrip.start")}</span>
        <h3>{t("stationTrip.startAt", { station: stationTitle(from, t) })}</h3>
        <SignCue label={t("stationTrip.signTrain", { line: firstLine })} detail={t("stationTrip.signDirection", { station: stationTitle(first.stops?.[1] || first.end?.name, t) })} />
        <StationMap station={from} line={firstLine} />
        <GroundLocations station={from} result={groundData[from]} />
        <p>{t("stationTrip.followSigns", { line: firstLine })}</p>
        <PlatformLocations station={from} line={firstLine} result={elevatorData[stopKey(from, firstLine)]} nextStation={first.stops?.[1] || first.end?.name} />
      </li>
      {rail.map((leg, index) => {
        const stops = leg.stops || [];
        const line = subwayLine(leg);
        const transfer = transfers.find((item) => item.fromLine === line && item.toLine === subwayLine(rail[index + 1] || {}) && item.station === normalizeStationName(leg.end?.name));
        return <Fragment key={`${line}-${index}`}>
          <li className="trip-step">
            <span className="trip-step-type">{t("stationTrip.ride")}</span>
            <h3>{t("stationTrip.rideLine", { line, direction: stationTitle(stops[1] || leg.end?.name, t) })}</h3>
            <p>{t("stationTrip.rideFromTo", { from: stationTitle(leg.start?.name, t), to: stationTitle(leg.end?.name, t), minutes: minutes(leg.sectionTime) })}</p>
            {stops.length > 1 && <p className="trip-stops">{stops.map((stop) => stationTitle(stop, t)).join(" → ")}</p>}
          </li>
          {transfer && <TransferGuide transfer={transfer} elevatorData={elevatorData} groundData={groundData} movement={transferData[transferKey(transfer)]} />}
        </Fragment>;
      })}
      <li className="trip-step">
        <span className="trip-step-type">{t("stationTrip.arrive")}</span>
        <h3>{t("stationTrip.arriveAt", { station: stationTitle(to, t) })}</h3>
        <SignCue label={t("stationTrip.signExit")} />
        <StationMap station={to} line={lastLine} />
        <PlatformLocations station={to} line={lastLine} result={elevatorData[stopKey(to, lastLine)]} previousStation={last.stops?.at(-2)} />
        <p>{t("stationTrip.exitSigns")}</p>
        <GroundLocations station={to} result={groundData[to]} />
      </li>
    </ol>
    <p className="trip-map-credit"><a href="https://www.data.go.kr/data/15004974/fileData.do" target="_blank" rel="noreferrer">{t("stationTrip.mapCredit")}</a></p>
    <p className="trip-safety">{t("stationTrip.safety")}</p>
  </section>;
}

export default function StationTrip({ online }) {
  const { language, t } = useLanguage();
  const requestRef = useRef(null);
  const [fromInput, setFromInput] = useState(initialFrom);
  const [toInput, setToInput] = useState(initialTo);
  const [fromSelected, setFromSelected] = useState(null);
  const [toSelected, setToSelected] = useState(null);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (online) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    setTrip(null);
  }, [online]);

  async function search(event) {
    event.preventDefault();
    if (!online || requestRef.current) return;
    const from = normalizeStationName(fromSelected?.name || fromInput);
    const to = normalizeStationName(toSelected?.name || toInput);
    if (!from || !to || from === to) { setError("stationTrip.invalidPair"); return; }
    const request = new AbortController();
    const { signal } = request;
    requestRef.current = request;
    setError("");
    setTrip(null);
    setBusy(true);
    try {
      const [start, end] = await Promise.all([findPlace(`${from}역`, signal), findPlace(`${to}역`, signal)]);
      const found = await findTransitRoutes(start, end, signal);
      const route = chooseStationTrip(found, from, to);
      if (!route) { setError("stationTrip.noSubway"); return; }
      const stops = elevatorStops(route);
      const stationNames = [...new Set(stops.map((stop) => stop.name))];
      const transfers = routeTransfers(route);
      const [lineEntries, groundEntries, transferEntries] = await Promise.all([
        Promise.all(stops.map(async (stop) => {
          try { return [stopKey(stop.name, stop.line), await findElevatorMovement(stop.name, stop.line, signal)]; }
          catch { return [stopKey(stop.name, stop.line), unavailable]; }
        })),
        Promise.all(stationNames.map(async (name) => {
          try { return [name, await findElevatorMovement(name, "", signal)]; }
          catch { return [name, unavailable]; }
        })),
        Promise.all(transfers.map(async (transfer) => {
          try { return [transferKey(transfer), await findTransferMovement(transfer, signal)]; }
          catch { return [transferKey(transfer), unavailable]; }
        })),
      ]);
      if (signal.aborted || !navigator.onLine) return;
      setTrip({ route, from, to, elevatorData: Object.fromEntries(lineEntries), groundData: Object.fromEntries(groundEntries), transferData: Object.fromEntries(transferEntries) });
    } catch (cause) {
      if (!signal.aborted && navigator.onLine) setError(cause?.messageKey || "error.routeSearch");
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  return <section className="station-trip">
    <form className="station-trip-form" onSubmit={search}>
      <h1>{t("stationTrip.tab")}</h1>
      <p>{t("stationTrip.intro")}</p>
      <div className="station-trip-inputs">
        <div><label htmlFor="trip-from">{t("stationTrip.from")}</label><SuggestionInput id="trip-from" type="station" value={fromSelected ? suggestionName(fromSelected, language) : fromInput} onChange={(value) => { setFromSelected(null); setFromInput(value); }} onSelect={(station) => { setFromSelected(station); setFromInput(station.name); }} enabled={online && !fromSelected} placeholder={t("stationTrip.stationPlaceholder")} enterKeyHint="next" /></div>
        <div><label htmlFor="trip-to">{t("stationTrip.to")}</label><SuggestionInput id="trip-to" type="station" value={toSelected ? suggestionName(toSelected, language) : toInput} onChange={(value) => { setToSelected(null); setToInput(value); }} onSelect={(station) => { setToSelected(station); setToInput(station.name); }} enabled={online && !toSelected} placeholder={t("stationTrip.stationPlaceholder")} enterKeyHint="search" /></div>
      </div>
      <button className="search-button" type="submit" disabled={busy || !online}>{t(busy ? "stationTrip.searching" : "stationTrip.search")}</button>
      <small>{t("stationTrip.example")}</small>
    </form>
    {error && online && <div className="error-box" role="alert">{t(error)}</div>}
    {trip && online && <TripGuide trip={trip} />}
  </section>;
}
