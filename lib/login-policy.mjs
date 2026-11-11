export const LOGIN_MODE_HEADER = "x-opora-login-mode";

export const LOGIN_MODES = Object.freeze({
  REGULAR: "regular",
  ADMIN: "admin",
});

/**
 * @param {string} role
 * @param {string | null | undefined} mode
 */
export function isRoleAllowedForLoginMode(role, mode) {
  if (mode === LOGIN_MODES.ADMIN) return role === "ADMIN";
  if (mode === LOGIN_MODES.REGULAR) {
    return role === "PATIENT" || role === "HCP";
  }
  return false;
}

/** @param {string} pathname @param {string} basePath */
export function isBlockedPublicAuthPath(pathname, basePath = "/api/auth") {
  let normalizedPath = pathname;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const decodedPath = decodeURIComponent(normalizedPath);
      if (decodedPath === normalizedPath) break;
      normalizedPath = decodedPath;
    }
  } catch {
    return true;
  }

  normalizedPath = normalizedPath.replace(/\/+/g, "/").replace(/\/+$/, "");
  return (
    normalizedPath === `${basePath}/sign-up/email` ||
    normalizedPath === `${basePath}/sign-in/email`
  );
}
