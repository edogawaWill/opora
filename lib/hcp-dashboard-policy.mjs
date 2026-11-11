/**
 * Build a profile filter only from the server-authorized HCP principal.
 * Client-provided HCP identifiers are never consulted.
 * @param {unknown} principal
 */
export function ownApprovedHcpProfileWhere(principal) {
  if (principal === null || typeof principal !== "object") return null;
  const candidate = /** @type {{ role?: unknown, accountStatus?: unknown, emailVerified?: unknown, healthcareProfessional?: { hcpID?: unknown, verificationStatus?: unknown } | null }} */ (principal);
  const hcpID = candidate.healthcareProfessional?.hcpID;

  if (
    candidate.role !== "HCP" ||
    candidate.accountStatus !== "ACTIVE" ||
    candidate.emailVerified !== true ||
    candidate.healthcareProfessional?.verificationStatus !== "Approved" ||
    typeof hcpID !== "number" ||
    !Number.isSafeInteger(hcpID) ||
    hcpID < 1 ||
    hcpID > 2_147_483_647
  ) {
    return null;
  }

  return { hcpID };
}
