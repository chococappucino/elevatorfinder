// Fictional stations and equipment: UI preview only, never travel directions.
const start = { name: "가상 A역", lat: 37.55, lon: 126.98 };
const middle = { name: "가상 B역", lat: 37.56, lon: 126.99 };
const transfer = { name: "가상 C역", lat: 37.57, lon: 127.0 };
const origin = { name: "샘플 출발지", lat: 37.548, lon: 126.978 };
const destination = { name: "샘플 도착지", lat: 37.562, lon: 126.992 };

export const demoRoutes = [
  {
    totalTime: 1740, transferCount: 0,
    legs: [
      { mode: "WALK", sectionTime: 300, start: origin, end: start },
      { mode: "SUBWAY", route: "2호선", sectionTime: 1080, start, end: middle },
      { mode: "WALK", sectionTime: 360, start: middle, end: destination },
    ],
  },
  {
    totalTime: 2160, transferCount: 1,
    legs: [
      { mode: "WALK", sectionTime: 300, start: origin, end: start },
      { mode: "SUBWAY", route: "2호선", sectionTime: 720, start, end: middle },
      { mode: "SUBWAY", route: "3호선", sectionTime: 780, start: middle, end: transfer },
      { mode: "WALK", sectionTime: 360, start: transfer, end: destination },
    ],
  },
];

export const demoElevatorData = {
  "가상 A|2": {
    status: "available",
    facilities: [
      { name: "샘플 엘리베이터 A", location: "가상 승강장 중앙", section: "B2–B1", statusText: "사용가능", operating: true },
      { name: "샘플 엘리베이터 B", location: "가상 2번 출입구", section: "B1–1F", statusText: "사용불가", operating: false },
    ],
    paths: [{ label: "가상 승강장 → 출구", steps: ["승강장 중앙의 샘플 엘리베이터로 이동", "B1층에서 샘플 출구 안내를 따라 이동"] }],
  },
  "가상 B|2": {
    status: "available",
    facilities: [{ name: "샘플 엘리베이터 C", location: "가상 환승 통로", section: "B2–B1", statusText: "사용가능", operating: true }],
    paths: [],
  },
  "가상 B|3": { status: "missing", facilities: [], paths: [] },
  "가상 C|3": { status: "missing", facilities: [], paths: [] },
};

export const demoPoints = {
  start: { lat: origin.lat, lng: origin.lon },
  end: { lat: destination.lat, lng: destination.lon },
};
