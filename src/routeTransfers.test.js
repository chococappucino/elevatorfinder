import assert from "node:assert/strict";
import test from "node:test";
import { routeTransfers } from "./routeModel.js";

test("finds a line change at the same station even with a walking segment", () => {
  const route = { legs: [
    { mode: "SUBWAY", route: "2호선", start: { name: "잠실나루역" }, end: { name: "잠실역" }, stops: ["잠실나루", "잠실"] },
    { mode: "WALK", start: { name: "잠실역" }, end: { name: "잠실역" } },
    { mode: "SUBWAY", route: "8호선", start: { name: "잠실역" }, end: { name: "석촌역" }, stops: ["잠실", "석촌"] },
  ] };
  assert.deepEqual(routeTransfers(route), [{ station: "잠실", fromLine: "2", toLine: "8", fromIndex: 0, toIndex: 2, previousStation: "잠실나루", nextStation: "석촌" }]);
});

test("does not invent a transfer across different stations or the same line", () => {
  assert.deepEqual(routeTransfers({ legs: [
    { mode: "SUBWAY", route: "2호선", end: { name: "잠실역" } },
    { mode: "SUBWAY", route: "8호선", start: { name: "몽촌토성역" } },
  ] }), []);
  assert.deepEqual(routeTransfers({ legs: [
    { mode: "SUBWAY", route: "2호선", end: { name: "잠실역" } },
    { mode: "SUBWAY", route: "2호선", start: { name: "잠실역" } },
  ] }), []);
});

test("recognizes the City Hall to Songpa option that changes lines at Cheonho", () => {
  const route = { legs: [
    { mode: "SUBWAY", route: "5호선", start: { name: "광화문(세종문화회관)" }, end: { name: "천호(풍납토성)" }, stops: ["광화문(세종문화회관)", "광나루(장신대)", "천호(풍납토성)"] },
    { mode: "WALK", start: { name: "천호(풍납토성)" }, end: { name: "천호(풍납토성)" } },
    { mode: "SUBWAY", route: "8호선", start: { name: "천호(풍납토성)" }, end: { name: "잠실(송파구청)" }, stops: ["천호(풍납토성)", "강동구청", "잠실(송파구청)"] },
  ] };
  assert.deepEqual(routeTransfers(route), [{ station: "천호", fromLine: "5", toLine: "8", fromIndex: 0, toIndex: 2, previousStation: "광나루(장신대)", nextStation: "강동구청" }]);
});
