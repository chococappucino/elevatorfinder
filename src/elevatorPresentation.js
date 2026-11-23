export function elevatorLocationParts(location, name) {
  const text = String(location || name || "엘리베이터").trim();
  const directions = text.split(/[,，]/).map((part) => part.trim()).filter(Boolean);
  if (directions.length > 1 && directions.every((part) => /방면\s*\d+-\d+/.test(part))) {
    return { label: directions.map((part) => part.replace(/방면\s*(\d+-\d+)/, "방면 $1")).join(" · "), door: "" };
  }
  const match = text.match(/^(.*?)\s*방면\s*(\d+-\d+)(.*)$/);
  if (!match) return { label: text, door: "" };
  return { label: `${match[1].trim()} 방면${match[3].trim() ? ` ${match[3].trim()}` : ""}`, door: match[2] };
}

export function facilityPosition(facility, t) {
  const name = facility.unnamed || !facility.name ? t("elevator.label") : facility.name;
  const { label, door } = elevatorLocationParts(facility.location, name);
  return { label: facility.locationKey ? t(facility.locationKey) : label, door };
}

export function isTransferFacility(facility) {
  return /환승|연결\s*통로/.test(`${facility?.name || ""} ${facility?.location || ""}`);
}

export function isGroundExitFacility(facility) {
  const text = `${facility?.location || ""} ${facility?.name || ""}`;
  return /출입구|출구/.test(text) && /(?:^|[^A-Z])(?:1F|지상)/i.test(`${facility?.section || ""} ${text}`);
}
