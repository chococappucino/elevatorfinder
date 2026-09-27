// This is the only file that talks to the elevator-location API.
// For local testing, replace API_KEY_PLACEHOLDER with the key you received.
// Before publishing, move this request to your server so the key stays private.
const API_KEY = "API_KEY_PLACEHOLDER";
const ELEVATOR_API_ENDPOINT = "PASTE_THE_KRIC_OR_PUBLIC_DATA_API_ENDPOINT_HERE";

export async function getPlatformElevators(stationName) {
  if (API_KEY === "API_KEY_PLACEHOLDER" || ELEVATOR_API_ENDPOINT.includes("PASTE_THE")) {
    return null;
  }

  const url = new URL(ELEVATOR_API_ENDPOINT);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("stationName", stationName);

  const response = await fetch(url);
  if (!response.ok) throw new Error("엘리베이터 정보를 가져오지 못했어요.");

  const payload = await response.json();
  // Adapt this return statement to the exact response shape from your API.
  return payload;
}
