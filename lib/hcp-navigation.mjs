const HCP_PRIMARY_ROUTES = [
  ["/hcp/patients", "patients"],
  ["/hcp/appointments", "appointments"],
  ["/hcp/messages", "messages"],
  ["/hcp/profile", "profile"],
  ["/hcp/status", "profile"],
];

/** @param {string | null} pathname */
export function getHcpPrimaryNavigationItem(pathname) {
  if (pathname === "/hcp" || pathname === "/hcp/") return "home";
  if (typeof pathname !== "string") return null;
  return HCP_PRIMARY_ROUTES.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ?? null;
}
