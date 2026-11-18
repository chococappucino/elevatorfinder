import assert from "node:assert/strict";
import test from "node:test";
import { createSeoulElevatorClient, selectSeoulElevators } from "./seoulElevators.js";

const sampleRows = [
  { STN_CD: "0150", STN_NM: "서울역(1)", ELVTR_NM: "엘리베이터 1호기", OPR_SEC: "B2-B1", INSTL_PSTN: "승강장 시청 방면 2-4", USE_YN: "사용가능", ELVTR_SE: "EV" },
  { STN_CD: "0150", STN_NM: "서울역(1)", ELVTR_NM: "엘리베이터 2호기", OPR_SEC: "B1-1F", INSTL_PSTN: "4번 출입구", USE_YN: "사용불가", ELVTR_SE: "EV" },
  { STN_CD: "0150", STN_NM: "서울역(1)", ELVTR_NM: "에스컬레이터", INSTL_PSTN: "4번 출입구", USE_YN: "사용가능", ELVTR_SE: "ES" },
  { STN_CD: "0426", STN_NM: "서울역(4)", ELVTR_NM: "엘리베이터 3호기", INSTL_PSTN: "4호선 승강장", USE_YN: "사용가능", ELVTR_SE: "EV" },
];

test("shows only elevators for the requested station and line", () => {
  const facilities = selectSeoulElevators(sampleRows, "서울역", "1");
  assert.equal(facilities.length, 2);
  assert.equal(facilities[0].location, "승강장 시청 방면 2-4");
  assert.equal(facilities[0].line, "1");
  assert.equal(facilities[0].operating, true);
  assert.equal(facilities[1].operating, false);
});

test("station search without a line keeps each line identifiable", () => {
  const facilities = selectSeoulElevators(sampleRows, "서울역", "");
  assert.deepEqual([...new Set(facilities.map((facility) => facility.line))], ["1", "4"]);
});

test("fetches pages once and keeps the API key out of the result", async () => {
  const calls = [];
  const client = createSeoulElevatorClient("test-secret", async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ SeoulMetroFaciInfo: { RESULT: { CODE: "INFO-000" }, list_total_count: 1, row: sampleRows.slice(0, 1) } }) };
  });
  assert.equal((await client("서울", "1")).length, 1);
  assert.equal((await client("서울", "1")).length, 1);
  assert.equal(calls.length, 1);
  assert.ok(!JSON.stringify(await client("서울", "1")).includes("test-secret"));
});
