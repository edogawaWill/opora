const routeDestinations = [
  ["/patient/history", "history"],
  ["/patient/assessment", "assessment"],
  ["/patient/diseases", "diseases"],
  ["/patient/appointments", "appointments"],
  ["/patient/messages", "messages"],
];

const symptomSectionHashes = new Set([
  "#symptom-history",
  "#record-symptom",
  "#symptom-trends",
]);

/** Resolve route destinations before dashboard section state. */
/**
 * @param {string} pathname
 * @param {string} [hash]
 * @param {"overview" | "symptoms" | null} [visibleDashboardSection]
 * @returns {"overview" | "symptoms" | "history" | "assessment" | "diseases" | "appointments" | "messages" | null}
 */
export function getActivePatientDestination(pathname, hash = "", visibleDashboardSection = null) {
  if (pathname !== "/patient") {
    return routeDestinations.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ?? null;
  }

  if (visibleDashboardSection) return visibleDashboardSection;
  if (symptomSectionHashes.has(hash)) return "symptoms";
  return "overview";
}

/** @param {Element | null} element @returns {"overview" | "symptoms" | null} */
export function getPatientDashboardSectionTarget(element) {
  if (element?.id === "patient-overview") return "overview";
  if (["symptom-trends", "record-symptom", "symptom-history"].includes(element?.id)) return "symptoms";
  return null;
}
