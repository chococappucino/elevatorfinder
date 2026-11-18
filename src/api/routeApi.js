async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "경로 정보를 가져오지 못했어요.");
  return payload;
}

export async function findTransitRoutes(start, end) {
  const response = await fetch("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, end }),
  });
  return (await readResponse(response)).itineraries;
}

export async function findPlace(query) {
  const response = await fetch(`/api/place?query=${encodeURIComponent(query)}`);
  return readResponse(response);
}

export async function findElevatorMovement(name, line) {
  const params = new URLSearchParams({ name, line: line || "" });
  const response = await fetch(`/api/elevators?${params}`);
  return readResponse(response);
}

export async function findTransferMovement(transfer) {
  const params = new URLSearchParams({
    station: transfer.station,
    fromLine: transfer.fromLine,
    toLine: transfer.toLine,
    previous: transfer.previousStation,
    next: transfer.nextStation,
  });
  const response = await fetch(`/api/transfer?${params}`);
  return readResponse(response);
}
