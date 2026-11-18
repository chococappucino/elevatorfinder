import assert from "node:assert/strict";
import test from "node:test";
import { elevatorLocationParts, isGroundExitFacility, isTransferFacility } from "./elevatorPresentation.js";

test("separates the train-door position from a platform direction", () => {
  assert.deepEqual(elevatorLocationParts("잠실새내 방면6-3"), { label: "잠실새내 방면", door: "6-3" });
  assert.deepEqual(elevatorLocationParts("9번 출입구"), { label: "9번 출입구", door: "" });
});

test("only calls an elevator transfer-specific when the label says so", () => {
  assert.equal(isTransferFacility({ location: "2호선 환승 통로" }), true);
  assert.equal(isTransferFacility({ location: "잠실새내 방면6-3" }), false);
});

test("keeps ground-level elevator exits separate from platform equipment", () => {
  assert.equal(isGroundExitFacility({ location: "1번 출입구", section: "B1-1F" }), true);
  assert.equal(isGroundExitFacility({ location: "6,7번 출입구 사이", section: "BM1-1F" }), true);
  assert.equal(isGroundExitFacility({ location: "잠실새내 방면6-3", section: "B2-B1" }), false);
  assert.equal(isGroundExitFacility({ location: "2번 출입구", section: "B2-B1" }), false);
});
