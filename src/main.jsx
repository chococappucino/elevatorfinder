import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPlatformElevators } from "./api/elevatorApi";
import { pilotStations } from "./pilotData";
import "./styles.css";

function PlatformDiagram({ best, car, door }) {
  return <div className="platform" role="img" aria-label={`${car} ${door} 근처에 타고 엘리베이터로 가는 플랫폼 그림`}><span className="platform-label">승강장</span><div className="train">{[0, 1, 2, 3, 4].map((index) => <div className={`car ${index === best ? "best" : ""}`} key={index}>{index === best && <span className="best-tag">여기서 타세요</span>}<div className="door" /></div>)}</div><div className="track" /><div className="elevator" aria-label="Elevator">↕</div></div>;
}

function App() {
  const [selected, setSelected] = useState("서울");
  const [direction, setDirection] = useState("city");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("naeriljari-favorites")) || []; }
    catch { return []; }
  });
  const station = pilotStations[selected];
  const info = station[direction];

  useEffect(() => {
    localStorage.setItem("naeriljari-favorites", JSON.stringify(favorites));
  }, [favorites]);

  function chooseStation(name) { setSelected(name); setMessage(""); }
  function toggleFavorite(name) {
    setFavorites((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]);
  }
  async function search(event) {
    event.preventDefault();
    const stationName = query.trim().replace("역", "");
    if (pilotStations[stationName]) { chooseStation(stationName); return; }
    try {
      const apiResult = await getPlatformElevators(stationName);
      setMessage(apiResult ? "API 데이터를 받았어요. 이제 응답 형식에 맞춰 표시를 연결하면 됩니다." : "현재는 서울역, 잠실역, 강남역만 준비되어 있어요.");
    } catch (error) { setMessage(error.message); }
  }
  const flipDirection = () => setDirection((current) => current === "city" ? "outer" : "city");

  return (
    <div className="app">
      <header>
        <div className="top"><div className="brand">내릴자리</div><button className="help" type="button" onClick={() => alert("1. 역과 방향을 고르세요.\n2. 안내된 호차와 문 근처에서 타세요.\n3. 내린 뒤 노란 엘리베이터 표시를 따라가세요.")}>이용 방법</button></div>
        <div className="hero">아이와 함께, 더 편한 지하철길<small>내리기 편한 문을 미리 알려드려요</small></div>
      </header>
      <main>
        <form className="search" onSubmit={search}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="역 이름을 입력하세요" aria-label="Search subway station" /><button aria-label="Search" type="submit">⌕</button></form>
        <div className="notice"><b>첫 버전 안내</b>엘리베이터 위치는 공식 API로 연결하고, 가장 가까운 탑승 문은 역별 검증 데이터로 제공합니다.</div>
        {message && <p className="message" role="status">{message}</p>}
        {favorites.length > 0 && <section className="field"><span className="label">자주 가는 역</span><div className="station-grid">{favorites.map((name) => { const item = pilotStations[name]; return <button className={`station ${name === selected ? "active" : ""}`} type="button" onClick={() => chooseStation(name)} key={name}><span className="line"><i className="dot" style={{ background: item.color }}>{item.line[0]}</i>{item.line}</span><span className="station-name">★ {name}역</span></button>; })}</div></section>}
        <section className="field"><span className="label">출발 방향</span><div className="segment">{[["city", "도심 방면"], ["outer", "외곽 방면"]].map(([key, label]) => <button className={direction === key ? "active" : ""} type="button" onClick={() => setDirection(key)} key={key}>{label}</button>)}</div></section>
        <section className="field"><span className="label">역을 선택하세요</span><div className="station-grid">{Object.entries(pilotStations).map(([name, item]) => <button className={`station ${name === selected ? "active" : ""}`} type="button" onClick={() => chooseStation(name)} key={name}><span className="line"><i className="dot" style={{ background: item.color }}>{item.line[0]}</i>{item.line}</span><span className="station-name">{name}역</span></button>)}</div></section>
        <div className="result-head"><h2>{selected}역에서 내리세요</h2><div><button className={`favorite-toggle ${favorites.includes(selected) ? "saved" : ""}`} type="button" aria-pressed={favorites.includes(selected)} onClick={() => toggleFavorite(selected)}>{favorites.includes(selected) ? "★ 저장됨" : "☆ 자주 가는 역"}</button><button type="button" onClick={flipDirection}>방향 바꾸기</button></div></div>
        <article className="card" aria-live="polite"><span className="badge">{station.line} · {direction === "city" ? "도심 방면" : "외곽 방면"}</span><div className="instruction">{info.car} {info.door} 근처</div><p className="subinstruction">이 문에서 내리면 엘리베이터가 가장 가까워요</p><PlatformDiagram {...info} /><div className="walk"><span className="walk-icon">💛</span><span>{info.walk}</span></div><div className="source"><span>출처: {station.source}<br />마지막 확인: {station.updated}</span><button type="button" onClick={() => setMessage("공식 API 원문 또는 역 안내도 링크를 여기에 연결하세요.")}>출처 보기</button></div></article>
      </main>
      <footer>정보가 달라졌거나 엘리베이터가 고장 났다면, 역내 안내판과 역무원을 먼저 확인해 주세요.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
