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
      const previousName = stopName(steps[index - 1], false);
      const nextName = stopName(steps[index + 1], true);
      const startName = stopName(step, true) || previousName || (index === 0 ? "출발지" : "도보 출발");
      const endName = stopName(step, false) || nextName || (index === steps.length - 1 ? "도착지" : "다음 지점");
      return {
        mode,
        route: String(properties.vehicles?.[0]?.name || properties.guidance || ""),
        stops: Array.isArray(properties.stops) ? properties.stops.map((stop) => String(stop?.name || "").trim()).filter(Boolean) : [],
        sectionTime: Number(properties.time) || 0,
        distance: Number(properties.distance) || 0,
        start: { name: startName, lat: first?.lat, lon: first?.lng },
        end: { name: endName, lat: last?.lat, lon: last?.lng },
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
