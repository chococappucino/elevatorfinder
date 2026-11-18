import assert from "node:assert/strict";
import test from "node:test";
import { createApiHandler } from "./api.js";

test("place suggestions return distinguishable results with valid coordinates", async ({ mock }) => {
  const address = { address_name: "서울 중구 세종대로 110", x: "126.978", y: "37.567" };
  mock.method(globalThis, "fetch", async (url) => {
    const documents = url.pathname.endsWith("/address.json") ? [address] : [
      address,
      { ...address, place_name: "서울시청", road_address_name: address.address_name },
      { ...address, place_name: "시청역 1호선", category_group_code: "SW8", x: "126.977", y: "37.566" },
      { address_name: "대전 서구 둔산동", place_name: "시청역 1호선", category_group_code: "SW8", x: "127.389", y: "36.351" },
      { address_name: "경기 의왕시 왕곡동 260", place_name: "의왕TG", category_name: "교통,수송 > 도로시설 > 톨게이트", x: "126.972", y: "37.337" },
      { place_name: "Invalid" },
    ];
    return Response.json({ documents });
  });
  const handler = createApiHandler({ kakaoRestKey: "test-key" });
  let payload;
  const response = { setHeader() {}, end(body) { payload = JSON.parse(body); } };
  await handler({ url: "/suggestions?query=서울시청&type=place", method: "GET" }, response, () => assert.fail("Expected suggestions endpoint"));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(payload.suggestions, [
    { name: address.address_name, lat: 37.567, lng: 126.978, detail: "" },
    { name: "서울시청", lat: 37.567, lng: 126.978, detail: address.address_name },
    { name: "시청역 1호선", lat: 37.566, lng: 126.977, detail: address.address_name, englishName: "City Hall Station · Line 1" },
    { name: "시청역 1호선", lat: 36.351, lng: 127.389, detail: "대전 서구 둔산동" },
    { name: "의왕TG", lat: 37.337, lng: 126.972, detail: "경기 의왕시 왕곡동 260", englishName: "Uiwang Tollgate", type: "tollgate" },
  ]);
});
