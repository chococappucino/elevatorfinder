import { normalizeStationName } from "./routeModel.js";

function stationId(value) {
  return normalizeStationName(value).replace(/\s/g, "");
}

function locationSegments(location) {
  return String(location || "").split(/[,，]/).map((segment) => segment.trim()).filter(Boolean);
}

function segmentDirection(segment) {
  const match = segment.match(/(.+?)\s*방면/);
  if (!match) return "";
  return stationId(match[1].replace(/^(?:내선|외선|상선|하선)\s*/, ""));
}

export function selectDirectionalElevators(facilities, context = {}) {
  const rows = facilities.map((facility) => ({
    facility,
    segments: locationSegments(facility.location),
  }));
  const directions = new Set(rows.flatMap(({ segments }) => segments.map(segmentDirection).filter(Boolean)));
  if (!directions.size) return { status: "undirected", facilities, direction: "" };

  let direction = stationId(context.nextStation);
  if (!direction && context.previousStation && directions.size === 2) {
    const previous = stationId(context.previousStation);
    if (directions.has(previous)) direction = [...directions].find((candidate) => candidate !== previous) || "";
  }
  if (!direction || !directions.has(direction)) return { status: "unverified", facilities: [], direction: "" };

  const selected = rows.flatMap(({ facility, segments }) => {
    const matching = segments.filter((segment) => segmentDirection(segment) === direction);
    return matching.length ? [{ ...facility, location: matching.join(", ") }] : [];
  });
  return selected.length
    ? { status: "matched", facilities: selected, direction }
    : { status: "unverified", facilities: [], direction: "" };
}
