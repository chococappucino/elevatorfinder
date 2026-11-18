import { selectDirectionalElevators } from "./elevatorDirection.js";
import { facilityPosition, isGroundExitFacility } from "./elevatorPresentation.js";
import { demoStationName } from "./demoRoute.js";
import { useLanguage } from "./i18n/LanguageProvider.jsx";
import { stopKey } from "./routeModel.js";
import FacilityRow from "./FacilityRow.jsx";

function position(selected, t) {
  if (selected.status !== "matched") return t("transfer.platformUnknown");
  return selected.facilities.map((facility) => {
    const { label, door } = facilityPosition(facility, t);
    return `${label}${door ? ` ${door}` : ""}`;
  }).join(" · ");
}

function TransferSide({ title, line, selected }) {
  const { t } = useLanguage();
  return <div className="transfer-side">
    <div className="transfer-side-heading"><span className="transfer-line-badge">{t("line.title", { line })}</span><strong>{title}</strong></div>
    {selected.status === "matched" && selected.facilities.length > 0
      ? <><p>{t("transfer.platformDirection", { direction: selected.direction })}</p>{selected.facilities.map((facility, index) => <FacilityRow key={`${line}-${index}`} facility={facility} />)}</>
      : <p className="transfer-unverified">{t("transfer.platformUnverified")}</p>}
  </div>;
}

export default function TransferCard({ transfer, elevatorData, movement, demo }) {
  const { t } = useLanguage();
  const from = elevatorData[stopKey(transfer.station, transfer.fromLine)]?.facilities || [];
  const to = elevatorData[stopKey(transfer.station, transfer.toLine)]?.facilities || [];
  const fromSelected = selectDirectionalElevators(from.filter((facility) => !isGroundExitFacility(facility)), { previousStation: transfer.previousStation });
  const toSelected = selectDirectionalElevators(to.filter((facility) => !isGroundExitFacility(facility)), { nextStation: transfer.nextStation });
  const path = movement?.paths?.[0];
  const station = demo ? demoStationName(transfer.station, t) : transfer.station;
  const nextStation = demo ? demoStationName(transfer.nextStation, t) : transfer.nextStation;
  return <article className="transfer-card" aria-label={t("transfer.label", { station })}>
    <div className="transfer-card-heading">
      <span className="transfer-icon" aria-hidden="true">↔</span>
      <div><small>{t("transfer.title")}</small><h3>{t("station.title", { station })}</h3><p>{t("transfer.lines", { from: transfer.fromLine, to: transfer.toLine })}</p></div>
    </div>
    <ol className="transfer-steps">
      <li><strong>{t("transfer.getOff", { line: transfer.fromLine })}</strong><span>{position(fromSelected, t)}</span></li>
      <li><strong>{t("transfer.corridor")}</strong><span>{t(path ? "transfer.seeDetails" : "transfer.stepFreeUnverified")}</span></li>
      <li><strong>{t("transfer.board", { line: transfer.toLine, station: nextStation })}</strong><span>{position(toSelected, t)}</span></li>
    </ol>
    <div className="transfer-sides">
      <TransferSide title={t("transfer.arrivingPlatform")} line={transfer.fromLine} selected={fromSelected} />
      <TransferSide title={t("transfer.departingPlatform")} line={transfer.toLine} selected={toSelected} />
    </div>
    {path ? <div className="transfer-path">
      <strong>{t("transfer.details")}</strong>
      {path.from && <p lang="ko">{path.from} → {path.to}</p>}
      <ol lang="ko">{path.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      <small>{t("transfer.source")}</small>
    </div> : demo && <p className="transfer-caution">{t("demo.transferWarning")}</p>}
  </article>;
}
