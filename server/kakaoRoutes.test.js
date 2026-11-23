import assert from "node:assert/strict";
import test from "node:test";
import { normalizeKakaoRoutes } from "./kakaoRoutes.js";
import { elevatorStops, legPoints } from "../src/routeModel.js";

test("normalizes Kakao walking and subway steps for directions and elevator lookup", () => {
  const routes = normalizeKakaoRoutes({
    status: "OK",
    routes: [{
      properties: { totalTime: 1200, transfers: 0 },
      steps: [
        { properties: { type: "WALKING", time: 180 }, path: { points: [[127, 37.5], [127.001, 37.501]] } },
        { properties: { type: "SUBWAY", time: 900, stops: [{ name: "시청역" }, { name: "을지로입구역" }], vehicles: [{ name: "2호선" }] }, path: { points: [[127.001, 37.501], [127.01, 37.51]] } },
        { properties: { type: "WALKING", time: 120 }, path: { points: [[127.01, 37.51], [127.011, 37.511]] } },
      ],
    }],
  });

  assert.equal(routes.length, 1);
  assert.equal(routes[0].totalTime, 1200);
  assert.deepEqual(routes[0].legs.map((leg) => leg.mode), ["WALK", "SUBWAY", "WALK"]);
  assert.equal(routes[0].legs[1].route, "2호선");
  assert.equal(routes[0].legs[1].start.name, "시청역");
  assert.equal(routes[0].legs[1].end.name, "을지로입구역");
  assert.equal(routes[0].legs[0].start.nameRole, "startPoint");
  assert.equal(routes[0].legs[0].start.name, "출발지");
  assert.equal(routes[0].legs[0].end.nameRole, undefined);
  assert.equal(routes[0].legs[2].end.nameRole, "endPoint");
  assert.deepEqual(routes[0].legs[1].stops, ["시청역", "을지로입구역"]);
  assert.deepEqual(legPoints(routes[0].legs[1]), [{ lat: 37.501, lng: 127.001 }, { lat: 37.51, lng: 127.01 }]);
  assert.deepEqual(elevatorStops(routes[0]), [{ name: "시청", line: "2" }, { name: "을지로입구", line: "2" }]);
});

test("returns no routes for Kakao no-results status", () => {
  assert.deepEqual(normalizeKakaoRoutes({ status: "NO_RESULTS" }), []);
});
