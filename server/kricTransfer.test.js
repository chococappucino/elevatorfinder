import assert from "node:assert/strict";
import test from "node:test";
import { parseKricTransferRows } from "./api.js";

test("keeps transfer movement steps ordered and separate by path", () => {
  const payload = { data: [
    { mvPathMgNo: "A", stMovePath: "2호선 승강장", edMovePath: "8호선 승강장", chtnMvTpOrdr: "2", mvContDtl: "엘리베이터 이용" },
    { mvPathMgNo: "A", chtnMvTpOrdr: "1", mvContDtl: "환승 통로로 이동" },
    { mvPathMgNo: "B", chtnMvTpOrdr: "1", mvContDtl: "다른 경로" },
  ] };
  assert.deepEqual(parseKricTransferRows(payload), [
    { from: "2호선 승강장", to: "8호선 승강장", steps: ["환승 통로로 이동", "엘리베이터 이용"] },
    { from: "", to: "", steps: ["다른 경로"] },
  ]);
});
