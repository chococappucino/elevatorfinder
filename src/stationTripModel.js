import { isGroundExitFacility } from "./elevatorPresentation.js";
import { normalizeStationName } from "./routeModel.js";

export function chooseStationTrip(routes, origin, destination) {
  const from = normalizeStationName(origin);
  const to = normalizeStationName(destination);
  return (routes || []).filter((route) => {
    const legs = route.legs || [];
    const rail = legs.filter((leg) => leg.mode === "SUBWAY");
    if (!rail.length || legs[0]?.mode !== "SUBWAY" || legs.at(-1)?.mode !== "SUBWAY"
      || legs.some((leg) => leg.mode !== "SUBWAY" && leg.mode !== "WALK")
      || normalizeStationName(rail[0].start?.name) !== from
      || normalizeStationName(rail.at(-1).end?.name) !== to) return false;
    return rail.slice(1).every((leg, index) =>
      normalizeStationName(rail[index].end?.name) === normalizeStationName(leg.start?.name));
  }).sort((a, b) => (Number(a.totalTime) || Infinity) - (Number(b.totalTime) || Infinity))[0] || null;
}

export function groundElevators(result) {
  return (result?.facilities || []).filter(isGroundExitFacility);
}
