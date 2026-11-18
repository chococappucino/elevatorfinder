export function normalizeStationName(name) {
  return String(name || "").replace(/\([^)]*\)/g, "").replace(/^지하철\s*\d+호선/, "").trim().replace(/역$/, "");
}

export function subwayLine(leg) {
  const text = String(leg.route || leg.lane?.[0]?.route || "");
  return text.match(/(\d+)호선/)?.[1] || "";
}

export function elevatorStops(itinerary) {
  const stops = new Map();
  for (const leg of itinerary?.legs || []) {
    if (leg.mode !== "SUBWAY") continue;
    const line = subwayLine(leg);
    for (const point of [leg.start, leg.end]) {
      const name = normalizeStationName(point?.name);
      if (name) stops.set(`${name}|${line}`, { name, line });
    }
  }
  return [...stops.values()];
}

export function stopKey(name, line) {
  return `${normalizeStationName(name)}|${line || ""}`;
}

export function routeTransfers(itinerary) {
  const legs = itinerary?.legs || [];
  const rail = legs.flatMap((leg, index) => leg.mode === "SUBWAY" ? [{ leg, index }] : []);
  return rail.slice(1).flatMap((next, index) => {
    const previous = rail[index];
    const station = normalizeStationName(previous.leg.end?.name);
    const fromLine = subwayLine(previous.leg);
    const toLine = subwayLine(next.leg);
    if (!station || station !== normalizeStationName(next.leg.start?.name)
      || !fromLine || !toLine || fromLine === toLine
      || legs.slice(previous.index + 1, next.index).some((leg) => leg.mode !== "WALK")) return [];
    return [{
      station, fromLine, toLine,
      fromIndex: previous.index, toIndex: next.index,
      previousStation: previous.leg.stops?.at(-2) || previous.leg.start?.name || "",
      nextStation: next.leg.stops?.[1] || next.leg.end?.name || "",
    }];
  });
}

export function transferKey(transfer) {
  return [transfer.station, transfer.fromLine, transfer.toLine, transfer.previousStation, transfer.nextStation].join("|");
}

export function elevatorCoverage(itinerary, elevatorData) {
  const stops = elevatorStops(itinerary);
  return {
    available: stops.filter((stop) => elevatorData[stopKey(stop.name, stop.line)]?.status === "available").length,
    total: stops.length,
  };
}

export function minutes(seconds) {
  return Math.max(1, Math.round((Number(seconds) || 0) / 60));
}

export function parseLineString(value) {
  return String(value || "").trim().split(/\s+/).map((pair) => {
    const [lng, lat] = pair.split(",").map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }).filter(Boolean);
}

export function legPoints(leg) {
  if (Array.isArray(leg.points) && leg.points.length > 1) return leg.points;
  const shape = leg.mode === "WALK"
    ? (leg.steps || []).flatMap((step) => parseLineString(step.linestring))
    : parseLineString(leg.passShape?.linestring);
  if (shape.length > 1) return shape;
  return [leg.start, leg.end].map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lon) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}
