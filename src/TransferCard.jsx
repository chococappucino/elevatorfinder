import { selectDirectionalElevators } from "./elevatorDirection.js";
import { elevatorLocationParts, isGroundExitFacility } from "./elevatorPresentation.js";
import { stopKey } from "./routeModel.js";
import FacilityRow from "./FacilityRow.jsx";

function position(selected) {
  if (selected.status !== "matched") return "승강장 엘리베이터 위치 미확인";
  return selected.facilities.map((facility) => {
    const { label, door } = elevatorLocationParts(facility.location, facility.name);
    return `${label}${door ? ` ${door}` : ""}`;
  }).join(" · ");
}

function TransferSide({ title, line, selected }) {
  return <div className="transfer-side">
    <div className="transfer-side-heading"><span className="transfer-line-badge">{line}호선</span><strong>{title}</strong></div>
    {selected.status === "matched" && selected.facilities.length > 0
      ? <><p>{selected.direction} 방면 승강장 엘리베이터</p>{selected.facilities.map((facility, index) => <FacilityRow key={`${line}-${index}`} facility={facility} />)}</>
      : <p className="transfer-unverified">이 방향의 승강장 엘리베이터 위치를 확인하지 못했어요.</p>}
  </div>;
}

export default function TransferCard({ transfer, elevatorData, movement, demo }) {
  const from = elevatorData[stopKey(transfer.station, transfer.fromLine)]?.facilities || [];
  const to = elevatorData[stopKey(transfer.station, transfer.toLine)]?.facilities || [];
  const fromSelected = selectDirectionalElevators(from.filter((facility) => !isGroundExitFacility(facility)), { previousStation: transfer.previousStation });
  const toSelected = selectDirectionalElevators(to.filter((facility) => !isGroundExitFacility(facility)), { nextStation: transfer.nextStation });
  const paths = movement?.paths || [];
  return <article className="transfer-card" aria-label={`${transfer.station}역 환승 안내`}>
    <div className="transfer-card-heading"><span className="transfer-icon" aria-hidden="true">↔</span><div><small>환승</small><h3>{transfer.station}역</h3><p>{transfer.fromLine}호선에서 {transfer.toLine}호선으로</p></div></div>
    <ol className="transfer-steps">
      <li><strong>{transfer.fromLine}호선에서 내리기</strong><span>{position(fromSelected)}</span></li>
      <li><strong>환승 통로 이동</strong><span>{paths.length ? "아래 상세 이동 안내를 확인하세요." : "계단 없는 연결 동선은 확인되지 않았어요. 역 안내나 역무원에게 확인해 주세요."}</span></li>
      <li><strong>{transfer.toLine}호선 {transfer.nextStation} 방면 타기</strong><span>{position(toSelected)}</span></li>
    </ol>
    <div className="transfer-sides">
      <TransferSide title="내리는 승강장" line={transfer.fromLine} selected={fromSelected} />
      <TransferSide title="다음에 탈 승강장" line={transfer.toLine} selected={toSelected} />
    </div>
    {paths.length > 0 ? <div className="transfer-path"><strong>상세 환승 이동 안내</strong>{paths[0].from && <p>{paths[0].from} → {paths[0].to}</p>}<ol>{paths[0].steps.map((step, index) => <li key={index}>{step}</li>)}</ol><small>철도산업정보센터 교통약자 환승 이동 안내. 현장 안내도 확인해 주세요.</small></div>
      : demo ? <p className="transfer-caution">가상 환승 예시입니다. 실제 이동에 사용하지 마세요.</p> : null}
  </article>;
}
