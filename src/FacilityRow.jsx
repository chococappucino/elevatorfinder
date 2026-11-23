import { facilityPosition, isTransferFacility } from "./elevatorPresentation.js";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

export default function FacilityRow({ facility }) {
  const { t } = useLanguage();
  const { label, door } = facilityPosition(facility, t);
  const statusClass = facility.operating === true ? "working" : facility.operating === false ? "outage" : "unknown";
  const reportedStatus = facility.statusText?.trim();
  const standardStatus = facility.operating === true ? "사용가능" : facility.operating === false ? "사용불가" : "";
  const statusDetail = reportedStatus && reportedStatus.replace(/\s/g, "") !== standardStatus;

  return <div className="readable-facility">
    <div className="readable-facility-main">
      <div className="readable-facility-place">
        <strong>{label}</strong>
        {door && <span className="readable-door" aria-label={t("elevator.door", { door })}>{door}</span>}
      </div>
      <span className={`readable-status ${statusClass}`}>{t(`elevator.${statusClass}`)}</span>
    </div>
    <div className="readable-facility-meta">
      {facility.section && <small>{t("elevator.floors", { floors: facility.section })}</small>}
      {isTransferFacility(facility) && <small className="transfer-tag">{t("elevator.transferTag")}</small>}
      {statusDetail && <small lang="ko">{reportedStatus}</small>}
    </div>
  </div>;
}
