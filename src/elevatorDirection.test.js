import assert from "node:assert/strict";
import test from "node:test";
import { selectDirectionalElevators } from "./elevatorDirection.js";

const cityHall = [
  { name: "외부", location: "9번 출입구" },
  { name: "내부", location: "충정로 방면6-2, 을지로입구 방면5-3" },
];
const jamsil = [
  { name: "내선", location: "잠실새내 방면6-3" },
  { name: "외선", location: "잠실나루 방면5-2" },
  { name: "외부", location: "1번 출입구" },
];

test("boarding shows only the direction of the next station", () => {
  assert.deepEqual(selectDirectionalElevators(cityHall, { nextStation: "을지로입구역" }), {
    status: "matched",
    direction: "을지로입구",
    facilities: [{ name: "내부", location: "을지로입구 방면5-3" }],
  });
});

test("alighting uses the opposite platform direction from the incoming station", () => {
  assert.deepEqual(selectDirectionalElevators(jamsil, { previousStation: "잠실나루" }), {
    status: "matched",
    direction: "잠실새내",
    facilities: [{ name: "내선", location: "잠실새내 방면6-3" }],
  });
});

test("does not guess when the platform direction cannot be verified", () => {
  assert.deepEqual(selectDirectionalElevators(jamsil, { previousStation: "모르는역" }), {
    status: "unverified", facilities: [], direction: "",
  });
});

test("keeps nondirectional data but labels it as such", () => {
  const facilities = [{ name: "외부", location: "1번 출입구" }];
  assert.deepEqual(selectDirectionalElevators(facilities, { nextStation: "잠실나루" }), {
    status: "undirected", facilities, direction: "",
  });
});
