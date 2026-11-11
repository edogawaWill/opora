const FALLBACK_BACKGROUND =
  "linear-gradient(150deg, rgba(234, 221, 224, 0.55), rgba(252, 249, 247, 0.92) 55%, rgba(246, 243, 241, 0.82))";

const DESKTOP_DASHBOARD_FALLBACK =
  "radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.06), transparent 55%), linear-gradient(145deg, #18191d, #0c0c10 78%)";

const PATIENT_BACKGROUND_ROUTES = [
  ["/patient/assessment/history", "assessment-history"],
  ["/patient/assessment/", "assessment-detail"],
  ["/patient/assessment", "guided-assessment"],
  ["/patient/diseases/", "disease-details"],
  ["/patient/diseases", "disease-directory"],
  ["/patient/appointments", "appointments"],
  ["/patient/messages/", "conversation-detail"],
  ["/patient/messages", "messages"],
  ["/patient/history", "symptom-history"],
  ["/patient/profile", "profile"],
];

const HCP_BACKGROUND_ROUTES = [
  ["/hcp/patients/", "hcp-patient-detail"],
  ["/hcp/appointments/", "hcp-appointments"],
  ["/hcp/appointments", "hcp-appointments"],
  ["/hcp/messages/", "hcp-conversation"],
  ["/hcp/messages", "hcp-messages"],
  ["/hcp/patients", "hcp-patients"],
  ["/hcp/profile", "hcp-profile"],
  ["/hcp/status", "hcp-profile"],
];

/** @param {string | null} pathname */
export function getPatientMobilePageGroupForPath(pathname) {
  if (pathname === "/patient" || pathname === "/patient/") return "dashboard";
  if (typeof pathname !== "string") return null;
  const route = PATIENT_BACKGROUND_ROUTES.find(([prefix]) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
  );
  return route?.[1] ?? null;
}

/** @param {string | null} pathname */
export function getHcpMobilePageGroupForPath(pathname) {
  if (pathname === "/hcp" || pathname === "/hcp/") return "hcp-dashboard";
  if (typeof pathname !== "string") return null;
  const route = HCP_BACKGROUND_ROUTES.find(([prefix]) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
  );
  return route?.[1] ?? null;
}

/** @param {Array<{id: string, pageGroup: string}>} photos */
export function validateCuratedBackgroundAssignments(photos) {
  if (!Array.isArray(photos)) return false;
  const ids = new Set();
  const groups = new Set();
  for (const photo of photos) {
    if (!photo || typeof photo.id !== "string" || !photo.id ||
      typeof photo.pageGroup !== "string" || ids.has(photo.id) || groups.has(photo.pageGroup)) {
      return false;
    }
    ids.add(photo.id);
    groups.add(photo.pageGroup);
  }
  return true;
}

/** @param {string} value */
export function isAllowedUnsplashImageUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

/** @param {string} value */
export function buildUnsplashReferralUrl(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["unsplash.com", "www.unsplash.com"].includes(url.hostname)
    ) {
      throw new Error("invalid attribution URL");
    }
    url.searchParams.set("utm_source", "opora");
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    throw new Error("Attribution link must point to Unsplash over HTTPS.");
  }
}

/**
 * @param {{ imageUrl: string, objectPosition: string, photographerName: string, photographerProfileUrl: string, sourcePhotoUrl: string } | null | undefined} photo
 */
export function getPatientMobileBackgroundPresentation(photo) {
  const validPhoto = photo && isAllowedUnsplashImageUrl(photo.imageUrl) ? photo : null;
  return {
    photo: validPhoto,
    backgroundImage: validPhoto
      ? `linear-gradient(rgba(252, 249, 247, 0.58), rgba(234, 221, 224, 0.42)), url(${JSON.stringify(validPhoto.imageUrl)})`
      : FALLBACK_BACKGROUND,
    backgroundPosition: validPhoto ? `center, ${validPhoto.objectPosition}` : "center",
  };
}

/** @param {{ imageUrl: string, objectPosition: string, photographerName: string, photographerProfileUrl: string, sourcePhotoUrl: string } | null | undefined} photo */
export function getPatientDesktopBackgroundPresentation(photo) {
  const validPhoto = photo && isAllowedUnsplashImageUrl(photo.imageUrl) ? photo : null;
  return {
    photo: validPhoto,
    backgroundImage: validPhoto
      ? `linear-gradient(rgba(12, 12, 16, 0.62), rgba(12, 12, 16, 0.62)), url(${JSON.stringify(validPhoto.imageUrl)})`
      : DESKTOP_DASHBOARD_FALLBACK,
    backgroundPosition: validPhoto ? `center, ${validPhoto.objectPosition}` : "center",
  };
}

export const patientMobileBackgroundFallback = FALLBACK_BACKGROUND;
