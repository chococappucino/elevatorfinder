import assert from "node:assert/strict";
import test from "node:test";
import { chooseStationTrip } from "./stationTripModel.js";

test("chooses a subway trip with a same-station transfer instead of a bus route", () => {
  const rail = { totalTime: 1080, legs: [
    { mode: "SUBWAY", start: { name: "혜화" }, end: { name: "동대문역사문화공원(DDP)" } },
    { mode: "WALK", start: { name: "동대문역사문화공원(DDP)" }, end: { name: "동대문역사문화공원(DDP)" } },
    { mode: "SUBWAY", start: { name: "동대문역사문화공원(DDP)" }, end: { name: "성수" } },
  ] };
  const bus = { totalTime: 600, legs: [{ mode: "BUS", start: { name: "혜화" }, end: { name: "성수" } }] };
  assert.equal(chooseStationTrip([bus, rail], "혜화역", "성수역"), rail);
  assert.equal(chooseStationTrip([rail], "혜화역", "잠실역"), null);
});
