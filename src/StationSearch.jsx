import { useState } from "react";
import { findElevatorMovement } from "./api/routeApi.js";
import { normalizeStationName } from "./routeModel.js";
import { isGroundExitFacility } from "./elevatorPresentation.js";
import FacilityRow from "./FacilityRow.jsx";

function groupByLine(facilities) {
  const groups = new Map();
  for (const facility of facilities) {
    const line = facility.line || "노선 미확인";
    if (!groups.has(line)) groups.set(line, []);
    groups.get(line).push(facility);
  }
  return [...groups].sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b, "ko"));
}

export default function StationSearch() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(event) {
    event.preventDefault();
    const station = normalizeStationName(query);
    if (!station) { setError("역 이름을 입력해 주세요."); return; }
    setBusy(true);
    setError("");
    setResult(null);
    setSearched(station);
    try {
      setResult(await findElevatorMovement(station, ""));
    } catch (cause) {
      setError(cause.message || "엘리베이터 정보를 가져오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const facilities = result?.facilities || [];
  const platform = facilities.filter((facility) => !isGroundExitFacility(facility));
  const exits = facilities.filter(isGroundExitFacility);

  return <section className="station-search" aria-label="역 엘리베이터 검색">
    <form className="station-search-card" onSubmit={search}>
      <label htmlFor="station-name">역 이름</label>
      <div className="station-search-input">
        <input id="station-name" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 시청, 잠실, 종각" autoComplete="off" maxLength={30} />
        <button className="search-button" type="submit" disabled={busy}>{busy ? "찾는 중…" : "엘리베이터 찾기"}</button>
      </div>
      <p>서울 지하철역 이름으로 검색해 주세요. 노선을 고르지 않아도 해당 역의 정보를 보여드려요.</p>
    </form>
    {error && <div className="error-box" role="alert">{error}</div>}
    {result && <div className="station-results" aria-live="polite">
      <div className="station-results-heading"><div><span className="section-kicker">역 엘리베이터</span><h2>{searched}역</h2></div><span>{facilities.length}개 시설</span></div>
      {facilities.length > 0 ? <>
        <p className="station-results-help">이동 방향을 선택하지 않았으므로 모든 방향의 엘리베이터를 보여드려요.</p>
        {groupByLine(platform).map(([line, items]) => <section className="station-line" key={line} aria-label={line === "노선 미확인" ? line : `${line}호선`}>
          <h3>{line === "노선 미확인" ? line : `${line}호선 승강장`} <span>{items.length}개</span></h3>
          {items.map((facility, index) => <FacilityRow facility={facility} key={`${line}-${facility.name}-${facility.location}-${index}`} />)}
        </section>)}
        <p className="station-source">서울교통공사 승강기 가동현황 · 상태는 변할 수 있으니 현장 안내도 확인해 주세요.</p>
      </> : <div className="station-no-data">{result.status === "not_configured" ? "엘리베이터 데이터 연결이 아직 설정되지 않았어요." : result.sources?.seoul === "rejected" ? "서울교통공사 데이터를 지금 가져오지 못했어요. 잠시 후 다시 시도해 주세요." : "이 역의 승강기 가동 정보를 찾지 못했어요. 역 이름을 확인해 주세요."}</div>}
      {exits.length > 0 && <section className="station-ground"><h3>지상 엘리베이터 위치 <span>{exits.length}곳</span></h3><p>서울교통공사가 엘리베이터로 확인한 출입구예요. 정확한 지도 좌표는 확인되지 않아 표시하지 않았어요.</p>{groupByLine(exits).map(([line, items]) => <div className="station-ground-line" key={line}><strong>{line}호선</strong>{items.map((facility, index) => <FacilityRow facility={facility} key={`${line}-${index}`} />)}</div>)}</section>}
    </div>}
  </section>;
}
