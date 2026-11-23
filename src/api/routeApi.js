const apiErrorMessages = new Map([
  ["kakao_not_configured", "error.kakaoNotConfigured"],
  ["request_too_large", "error.requestTooLarge"],
  ["invalid_request", "error.invalidRequest"],
  ["kakao_unavailable", "error.kakaoUnavailable"],
  ["invalid_route_points", "error.invalidRoutePoints"],
  ["no_routes", "error.noRoutes"],
  ["invalid_place", "error.invalidPlace"],
  ["place_not_found", "error.placeNotFound"],
  ["invalid_station", "error.invalidStation"],
]);

const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.messageKey = apiErrorMessages.get(payload?.code);
    throw error;
  }
  return payload;
}

export async function findTransitRoutes(start, end, signal) {
  const response = await fetch(`${apiBase}/api/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, end }),
    signal,
  });
  return (await readResponse(response)).itineraries;
}

export async function findPlace(query, signal) {
  const response = await fetch(`${apiBase}/api/place?query=${encodeURIComponent(query)}`, { signal });
  return readResponse(response);
}

export async function findSuggestions(query, type, signal) {
  const params = new URLSearchParams({ query, type });
  const response = await fetch(`${apiBase}/api/suggestions?${params}`, { signal });
  return (await readResponse(response)).suggestions;
}

export async function findElevatorMovement(name, line, signal) {
  const params = new URLSearchParams({ name, line: line || "" });
  const response = await fetch(`${apiBase}/api/elevators?${params}`, { signal });
  return readResponse(response);
}

export async function findTransferMovement(transfer, signal) {
  const params = new URLSearchParams({
    station: transfer.station,
    fromLine: transfer.fromLine,
    toLine: transfer.toLine,
    previous: transfer.previousStation,
    next: transfer.nextStation,
  });
  const response = await fetch(`${apiBase}/api/transfer?${params}`, { signal });
  return readResponse(response);
}
