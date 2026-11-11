const PAGE_SIZE = 10;
const MAX_PAGE = 2_147_483_647;

function parsePage(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_PAGE
    ? parsed
    : 1;
}

function parseId(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_PAGE
    ? parsed
    : null;
}

function authorizedHcpId(principal) {
  if (
    principal?.role !== "HCP" ||
    principal.accountStatus !== "ACTIVE" ||
    principal.emailVerified !== true ||
    principal.healthcareProfessional?.verificationStatus !== "Approved"
  ) return null;
  return parseId(principal.healthcareProfessional?.hcpID);
}

async function getHcpId(requireApprovedHcp) {
  const principal = await requireApprovedHcp();
  return authorizedHcpId(principal);
}

/**
 * Loads a bounded page of Patients whose current consent belongs to this HCP.
 * A final consent read filters entries revoked while the list query was running.
 * @param {{requireApprovedHcp: () => Promise<unknown>, prisma: any, page?: unknown}} input
 * @returns {Promise<{status: "denied"} | {status: "error"} | {status: "success", patients: Array<{patientID: number, dateOfBirth: Date, user: {fullName: string}}>, page: number, pageCount: number, total: number}>}
 */
export async function loadConsentedPatients({ requireApprovedHcp, prisma, page = 1 }) {
  let hcpID;
  try {
    hcpID = await getHcpId(requireApprovedHcp);
  } catch {
    return { status: "denied" };
  }
  if (hcpID === null) return { status: "denied" };

  const currentPage = parsePage(page);
  const consentWhere = { hcpID, status: "ACTIVE" };
  const patientWhere = { hcpConsents: { some: consentWhere } };

  try {
    const total = await prisma.patient.count({ where: patientWhere });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(currentPage, pageCount);
    const patients = await prisma.patient.findMany({
      where: patientWhere,
      select: {
        patientID: true,
        dateOfBirth: true,
        user: { select: { fullName: true } },
      },
      orderBy: [{ user: { fullName: "asc" } }, { patientID: "asc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const patientIDs = patients.map((patient) => patient.patientID);
    const activeRows = patientIDs.length === 0
      ? []
      : await prisma.patientHcpConsent.findMany({
        where: { ...consentWhere, patientID: { in: patientIDs } },
        select: { patientID: true },
      });
    const stillAuthorized = new Set(activeRows.map((row) => row.patientID));
    const visiblePatients = patients.filter((patient) => stillAuthorized.has(patient.patientID));

    return {
      status: "success",
      patients: visiblePatients,
      page: safePage,
      pageCount,
      total,
    };
  } catch {
    return { status: "error" };
  }
}

/**
 * Loads symptom history only while this HCP has an active consent for this Patient.
 * All count/list queries repeat the consent relation predicate; a post-read consent
 * check discards results if consent was revoked during the request.
 * @param {{requireApprovedHcp: () => Promise<unknown>, prisma: any, patientId: unknown, page?: unknown}} input
 * @returns {Promise<{status: "denied"} | {status: "unavailable"} | {status: "error"} | {status: "success", patient: {patientID: number, dateOfBirth: Date, user: {fullName: string}}, records: Array<{recordID: number, severity: number, onsetDate: Date, duration: string, notes: string | null, recordedAt: Date, symptom: {symptomName: string, bodyPart: string}}>, total: number, page: number, pageCount: number}>}
 */
export async function loadConsentedPatientSymptoms({
  requireApprovedHcp,
  prisma,
  patientId,
  page = 1,
}) {
  let hcpID;
  try {
    hcpID = await getHcpId(requireApprovedHcp);
  } catch {
    return { status: "denied" };
  }
  if (hcpID === null) return { status: "denied" };

  const patientID = parseId(patientId);
  if (patientID === null) return { status: "unavailable" };

  const activeConsent = { hcpID, status: "ACTIVE" };
  const patientWhere = { patientID, hcpConsents: { some: activeConsent } };
  const recordWhere = {
    patientID,
    patient: { is: { hcpConsents: { some: activeConsent } } },
  };
  const currentPage = parsePage(page);

  try {
    const patient = await prisma.patient.findFirst({
      where: patientWhere,
      select: {
        patientID: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        allergies: true,
        emergencyContact: true,
        user: { select: { fullName: true } },
      },
    });
    if (!patient) return { status: "unavailable" };

    const total = await prisma.symptomRecord.count({ where: recordWhere });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(currentPage, pageCount);
    const records = await prisma.symptomRecord.findMany({
      where: recordWhere,
      select: {
        recordID: true,
        severity: true,
        onsetDate: true,
        duration: true,
        notes: true,
        recordedAt: true,
        symptom: { select: { symptomName: true, bodyPart: true } },
      },
      orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const consentStillActive = await prisma.patientHcpConsent.findFirst({
      where: { patientID, ...activeConsent },
      select: { consentID: true },
    });
    if (!consentStillActive) return { status: "unavailable" };

    return { status: "success", patient, records, total, page: safePage, pageCount };
  } catch {
    return { status: "error" };
  }
}

/**
 * Loads all symptom records needed to compute a 14-day trend visualization
 * only while this HCP has an active consent for this Patient.
 * @param {{requireApprovedHcp: () => Promise<unknown>, prisma: any, patientId: unknown}} input
 * @returns {Promise<{status: "denied"} | {status: "unavailable"} | {status: "error"} | {status: "success", records: Array<{recordID: number, severity: number, onsetDate: Date, recordedAt: Date, symptom: {symptomName: string}}>}>}
 */
export async function loadConsentedPatientTrend({
  requireApprovedHcp,
  prisma,
  patientId,
}) {
  let hcpID;
  try {
    hcpID = await getHcpId(requireApprovedHcp);
  } catch {
    return { status: "denied" };
  }
  if (hcpID === null) return { status: "denied" };

  const patientID = parseId(patientId);
  if (patientID === null) return { status: "unavailable" };

  const activeConsent = { hcpID, status: "ACTIVE" };
  const recordWhere = {
    patientID,
    patient: { is: { hcpConsents: { some: activeConsent } } },
  };

  try {
    const records = await prisma.symptomRecord.findMany({
      where: recordWhere,
      select: {
        recordID: true,
        severity: true,
        onsetDate: true,
        recordedAt: true,
        symptom: { select: { symptomName: true } },
      },
      orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
    });

    const consentStillActive = await prisma.patientHcpConsent.findFirst({
      where: { patientID, ...activeConsent },
      select: { consentID: true },
    });
    if (!consentStillActive) return { status: "unavailable" };

    return { status: "success", records };
  } catch {
    return { status: "error" };
  }
}

/** Loads saved, informational assessment summaries only while active HCP consent remains in force.
 * @param {{requireApprovedHcp: () => Promise<unknown>, prisma: any, patientId: unknown}} input
 * @returns {Promise<{status: "denied" | "unavailable" | "error"} | {status: "success", assessments: Array<{assessmentID: number, assessmentDate: Date, symptomsInput: string, resultSummary: string}>}>}
 */
export async function loadConsentedPatientAssessments({ requireApprovedHcp, prisma, patientId }) {
  let hcpID;
  try {
    hcpID = await getHcpId(requireApprovedHcp);
  } catch {
    return { status: "denied" };
  }
  if (hcpID === null) return { status: "denied" };

  const patientID = parseId(patientId);
  if (patientID === null) return { status: "unavailable" };
  const activeConsent = { hcpID, status: "ACTIVE" };

  try {
    const assessments = await prisma.assessment.findMany({
      where: { patientID, patient: { is: { hcpConsents: { some: activeConsent } } } },
      select: { assessmentID: true, assessmentDate: true, symptomsInput: true, resultSummary: true },
      orderBy: [{ assessmentDate: "desc" }, { assessmentID: "desc" }],
    });
    const consentStillActive = await prisma.patientHcpConsent.findFirst({
      where: { patientID, ...activeConsent },
      select: { consentID: true },
    });
    if (!consentStillActive) return { status: "unavailable" };
    return { status: "success", assessments };
  } catch {
    return { status: "error" };
  }
}

/**
 * Loads the newest patient-reported symptom visible through this HCP's current consent.
 * The consent is checked again after the read so a concurrent revocation hides the result.
 * @param {{requireApprovedHcp: () => Promise<unknown>, prisma: any}} input
 * @returns {Promise<{status: "denied"} | {status: "error"} | {status: "success", record: null | {recordID: number, patientID: number, severity: number, recordedAt: Date, symptom: {symptomName: string}, patient: {patientID: number, user: {fullName: string}}}}>
 */
export async function loadLatestConsentedPatientSymptom({ requireApprovedHcp, prisma }) {
  let hcpID;
  try {
    hcpID = await getHcpId(requireApprovedHcp);
  } catch {
    return { status: "denied" };
  }
  if (hcpID === null) return { status: "denied" };

  try {
    const record = await prisma.symptomRecord.findFirst({
      where: {
        patient: { is: { hcpConsents: { some: { hcpID, status: "ACTIVE" } } } },
      },
      select: {
        recordID: true,
        patientID: true,
        severity: true,
        recordedAt: true,
        symptom: { select: { symptomName: true } },
        patient: {
          select: {
            patientID: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
    });
    if (!record) return { status: "success", record: null };

    const consentStillActive = await prisma.patientHcpConsent.findFirst({
      where: { hcpID, patientID: record.patientID, status: "ACTIVE" },
      select: { consentID: true },
    });
    if (!consentStillActive) return { status: "success", record: null };

    return { status: "success", record };
  } catch {
    return { status: "error" };
  }
}

export const HCP_PATIENT_PAGE_SIZE = PAGE_SIZE;
