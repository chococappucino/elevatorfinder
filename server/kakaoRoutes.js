function coordinate(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const lng = Number(pair[0]);
  const lat = Number(pair[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function stopName(step, first) {
  const stops = step?.properties?.stops;
  if (!Array.isArray(stops) || !stops.length) return "";
  return String((first ? stops[0] : stops.at(-1))?.name || "").trim();
}

export function normalizeKakaoRoutes(payload) {
  if (payload?.status !== "OK" || !Array.isArray(payload.routes)) return [];
  return payload.routes.slice(0, 3).map((route) => {
    const steps = Array.isArray(route.steps) ? route.steps : [];
    const legs = steps.map((step, index) => {
      const properties = step.properties || {};
      const points = (step.path?.points || []).map(coordinate).filter(Boolean);
      const first = points[0];
      const last = points.at(-1);
      const mode = properties.type === "WALKING" ? "WALK" : properties.type;
      const startName = stopName(step, true) || stopName(steps[index - 1], false);
      const endName = stopName(step, false) || stopName(steps[index + 1], true);
      const startLabel = startName ? { name: startName } : index === 0
        ? { name: "출발지", nameRole: "startPoint" }
        : { name: "도보 출발", nameRole: "walkStart" };
      const endLabel = endName ? { name: endName } : index === steps.length - 1
        ? { name: "도착지", nameRole: "endPoint" }
        : { name: "다음 지점", nameRole: "nextPoint" };
      return {
        mode,
        route: String(properties.vehicles?.[0]?.name || properties.guidance || ""),
        stops: Array.isArray(properties.stops) ? properties.stops.map((stop) => String(stop?.name || "").trim()).filter(Boolean) : [],
        sectionTime: Number(properties.time) || 0,
        distance: Number(properties.distance) || 0,
        start: { ...startLabel, lat: first?.lat, lon: first?.lng },
        end: { ...endLabel, lat: last?.lat, lon: last?.lng },
        points,
      };
    });
    return {
      totalTime: Number(route.properties?.totalTime) || 0,
      transferCount: Number(route.properties?.transfers) || 0,
      legs,
    };
  }).filter((route) => route.legs.length > 0);
}
