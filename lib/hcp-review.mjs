const UNAVAILABLE = Object.freeze({
  status: "error",
  message: "This HCP application is unavailable or no longer eligible for review.",
});

const FAILED = Object.freeze({
  status: "error",
  message: "We could not complete this review. Please refresh and try again.",
});

/** @param {unknown} value */
function positiveInteger(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

/**
 * Admin authorization is resolved on every invocation. The conditional update
 * is the compare-and-set: only one reviewer can transition a Pending profile.
 * @param {{ requireAdmin: () => Promise<{ admin: { adminID: number } | null }>, prisma: { $transaction: Function }, hcpID: unknown, decision: unknown, now?: () => Date }} input
 * @returns {Promise<{ status: "success" | "error", message: string }>}
 */
export async function reviewHcpApplication({
  requireAdmin,
  prisma,
  hcpID,
  decision,
  now = () => new Date(),
}) {
  let principal;
  try {
    principal = await requireAdmin();
  } catch {
    return UNAVAILABLE;
  }

  const profileId = positiveInteger(hcpID);
  const adminID = positiveInteger(principal?.admin?.adminID);
  if (
    profileId === null ||
    adminID === null ||
    (decision !== "Approved" && decision !== "Rejected")
  ) {
    return UNAVAILABLE;
  }

  try {
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.healthcareProfessional.updateMany({
        where: {
          hcpID: profileId,
          verificationStatus: "Pending",
          user: {
            is: {
              role: "HCP",
              accountStatus: "ACTIVE",
              emailVerified: true,
            },
          },
        },
        data:
          decision === "Approved"
            ? { verificationStatus: "Approved", verifiedBy: adminID, verifiedAt: now() }
            : { verificationStatus: "Rejected", verifiedBy: null, verifiedAt: null },
      });

      if (result.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          adminID,
          action: decision === "Approved" ? "HCP_APPROVED" : "HCP_REJECTED",
          entityType: "HealthcareProfessional",
          entityID: profileId,
          changeSummary:
            decision === "Approved"
              ? "Approved HCP application."
              : "Rejected HCP application.",
          changedFields: {
            verificationStatus: { from: "Pending", to: decision },
          },
        },
      });

      return true;
    });

    if (!changed) return UNAVAILABLE;
    return {
      status: "success",
      message:
        decision === "Approved"
          ? "The HCP application has been approved."
          : "The HCP application has been rejected.",
    };
  } catch {
    return FAILED;
  }
}
