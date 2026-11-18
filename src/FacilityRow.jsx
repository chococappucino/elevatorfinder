import { elevatorLocationParts, isTransferFacility } from "./elevatorPresentation.js";

export default function FacilityRow({ facility }) {
  const { label, door } = elevatorLocationParts(facility.location, facility.name);
  const status = facility.operating === true ? "사용 가능" : facility.operating === false ? "사용 불가" : facility.statusText || "상태 미확인";
  const statusClass = facility.operating === true ? "working" : facility.operating === false ? "outage" : "unknown";
  return <div className="readable-facility">
    <div className="readable-facility-main"><div className="readable-facility-place"><strong>{label}</strong>{door && <span className="readable-door" aria-label={`열차 위치 ${door}`}>{door}</span>}</div><span className={`readable-status ${statusClass}`}>{status}</span></div>
    <div className="readable-facility-meta">{facility.section && <small>이동 층: {facility.section}</small>}{isTransferFacility(facility) && <small className="transfer-tag">환승 통로 표시</small>}</div>
  </div>;
}
