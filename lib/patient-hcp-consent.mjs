/**
 * @typedef {{ status: "success", message: string } | { status: "error", message: string }} MutationResult
 * @typedef {{ hcpID: number, specialization: string, workplace: string, user: { fullName: string } }} EligibleHcp
 * @typedef {{ consentID: number, hcpID: number, grantedAt: Date, hcp: { specialization: string, workplace: string, user: { fullName: string } } }} ActiveConsent
 * @typedef {{ status: "success", eligibleHcps: EligibleHcp[], activeConsents: ActiveConsent[] } | { status: "error", message: string }} PatientHcpAccessResult
 */

const UNAVAILABLE = Object.freeze({
  status: "error",
  message: "This access request is unavailable or no longer eligible.",
});

const FAILED = Object.freeze({
  status: "error",
  message: "We could not update HCP access right now. Please refresh and try again.",
});

function positiveInteger(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

function authorizationMessage() {
  return "Your patient session is no longer available. Please sign in again.";
}

async function currentPatientId(requirePatient) {
  const principal = await requirePatient();
  return positiveInteger(principal?.patient?.patientID);
}

/**
 * Loads only eligible HCPs and consents belonging to the authenticated Patient.
 * @param {{ requirePatient: () => Promise<{ patient: { patientID: number } | null }>, prisma: any }} input
 * @returns {Promise<PatientHcpAccessResult>}
 */
export async function loadPatientHcpAccess({ requirePatient, prisma }) {
  let patientID;
  try {
    patientID = await currentPatientId(requirePatient);
  } catch {
    return { status: "error", message: authorizationMessage() };
  }
  if (patientID === null) return { status: "error", message: authorizationMessage() };

  try {
    const [eligibleHcps, activeConsents] = await Promise.all([
      prisma.healthcareProfessional.findMany({
        where: {
          verificationStatus: "Approved",
          user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
        },
        select: {
          hcpID: true,
          specialization: true,
          workplace: true,
          user: { select: { fullName: true } },
        },
        orderBy: { user: { fullName: "asc" } },
      }),
      prisma.patientHcpConsent.findMany({
        where: { patientID, status: "ACTIVE" },
        select: {
          consentID: true,
          hcpID: true,
          grantedAt: true,
          hcp: {
            select: {
              specialization: true,
              workplace: true,
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: { grantedAt: "desc" },
      }),
    ]);

    return { status: "success", eligibleHcps, activeConsents };
  } catch {
    return { status: "error", message: "Your HCP access information could not be loaded. Please refresh to try again." };
  }
}

/**
 * Creates one Patient-authorized grant. The partial unique index in the migration
 * is the concurrency backstop; duplicate requests resolve to the existing grant.
 * @param {{ requirePatient: () => Promise<{ patient: { patientID: number } | null }>, prisma: any, hcpID: unknown, now?: () => Date }} input
 * @returns {Promise<MutationResult>}
 */
export async function grantPatientHcpAccess({ requirePatient, prisma, hcpID, now = () => new Date() }) {
  let patientID;
  try {
    patientID = await currentPatientId(requirePatient);
  } catch {
    return { status: "error", message: authorizationMessage() };
  }

  const professionalID = positiveInteger(hcpID);
  if (patientID === null || professionalID === null) return UNAVAILABLE;

  try {
    const eligible = await prisma.healthcareProfessional.findFirst({
      where: {
        hcpID: professionalID,
        verificationStatus: "Approved",
        user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
      },
      select: { hcpID: true },
    });
    if (!eligible) return UNAVAILABLE;

    const existing = await prisma.patientHcpConsent.findFirst({
      where: { patientID, hcpID: professionalID, status: "ACTIVE" },
      select: { consentID: true },
    });
    if (existing) return { status: "success", message: "Access is already active for this HCP." };

    await prisma.patientHcpConsent.create({
      data: { patientID, hcpID: professionalID, status: "ACTIVE", grantedAt: now() },
      select: { consentID: true },
    });
    return { status: "success", message: "You granted this HCP access permission." };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      try {
        const concurrentGrant = await prisma.patientHcpConsent.findFirst({
          where: { patientID, hcpID: professionalID, status: "ACTIVE" },
          select: { consentID: true },
        });
        if (concurrentGrant) return { status: "success", message: "Access is already active for this HCP." };
      } catch {
        // Return the same safe failure if the concurrent state cannot be verified.
      }
    }
    return FAILED;
  }
}

/**
 * Revokes only an ACTIVE consent belonging to the authenticated Patient.
 * @param {{ requirePatient: () => Promise<{ patient: { patientID: number } | null }>, prisma: any, consentID: unknown, now?: () => Date }} input
 * @returns {Promise<MutationResult>}
 */
export async function revokePatientHcpAccess({ requirePatient, prisma, consentID, now = () => new Date() }) {
  let patientID;
  try {
    patientID = await currentPatientId(requirePatient);
  } catch {
    return { status: "error", message: authorizationMessage() };
  }

  const accessID = positiveInteger(consentID);
  if (patientID === null || accessID === null) return UNAVAILABLE;

  try {
    const result = await prisma.patientHcpConsent.updateMany({
      where: { consentID: accessID, patientID, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now() },
    });
    return result.count === 1
      ? { status: "success", message: "HCP access permission has been revoked." }
      : UNAVAILABLE;
  } catch {
    return FAILED;
  }
}
