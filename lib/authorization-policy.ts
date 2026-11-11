export const OPORA_ROLES = ["PATIENT", "HCP", "ADMIN"] as const;
export type OporaRole = (typeof OPORA_ROLES)[number];

export type AuthorizationSnapshot = {
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  hasPatientProfile: boolean;
  hasHcpProfile: boolean;
  hcpVerificationStatus: string | null;
  hasAdminProfile: boolean;
};

export type AuthorizationFailure =
  | "unknown_account_status"
  | "account_not_active"
  | "email_not_verified"
  | "unknown_role"
  | "profile_missing"
  | "role_mismatch"
  | "unknown_hcp_verification_status"
  | "hcp_approval_required";

const KNOWN_ACCOUNT_STATUSES = new Set([
  "ACTIVE",
  "PROVISIONING",
  "SUSPENDED",
  "DISABLED",
]);

export function parseDatabaseUserId(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > 2_147_483_647
  ) {
    return null;
  }

  return parsed;
}

export function evaluateAuthorization(
  snapshot: AuthorizationSnapshot,
): AuthorizationFailure | null {
  if (!KNOWN_ACCOUNT_STATUSES.has(snapshot.accountStatus)) {
    return "unknown_account_status";
  }
  if (snapshot.accountStatus !== "ACTIVE") {
    return "account_not_active";
  }
  if (!snapshot.emailVerified) {
    return "email_not_verified";
  }
  if (!(OPORA_ROLES as readonly string[]).includes(snapshot.role)) {
    return "unknown_role";
  }

  switch (snapshot.role as OporaRole) {
    case "PATIENT":
      return snapshot.hasPatientProfile ? null : "profile_missing";
    case "HCP":
      if (!snapshot.hasHcpProfile) return "profile_missing";
      if (
        snapshot.hcpVerificationStatus !== "Pending" &&
        snapshot.hcpVerificationStatus !== "Approved" &&
        snapshot.hcpVerificationStatus !== "Rejected"
      ) {
        return "unknown_hcp_verification_status";
      }
      return null;
    case "ADMIN":
      return snapshot.hasAdminProfile ? null : "profile_missing";
  }
}

export function evaluateRoleAuthorization(
  snapshot: AuthorizationSnapshot,
  requiredRole: OporaRole,
  requireApprovedHcp = false,
): AuthorizationFailure | null {
  const accountFailure = evaluateAuthorization(snapshot);
  if (accountFailure) return accountFailure;
  if (snapshot.role !== requiredRole) return "role_mismatch";
  if (
    requireApprovedHcp &&
    (requiredRole !== "HCP" || snapshot.hcpVerificationStatus !== "Approved")
  ) {
    return "hcp_approval_required";
  }
  return null;
}
