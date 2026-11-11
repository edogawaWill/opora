const MAX_ID = 2_147_483_647;

const AUTH_REQUIRED = Object.freeze({
  status: "error",
  message: "Your session is no longer available. Please sign in again.",
});

const INVALID = Object.freeze({
  status: "error",
  message: "Please provide a valid diagnosis name and information.",
});

const FAILED = Object.freeze({
  status: "error",
  message: "Could not save your diagnosis record. Please try again.",
});

/** @param {unknown} value */
function positiveInteger(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_ID
    ? parsed
    : null;
}

/**
 * Validates patient-reported previous diagnosis input.
 * @param {unknown} input
 * @param {() => Date} [now]
 */
export function validateDiagnosisInput(input, now = () => new Date()) {
  if (!input || typeof input !== "object") return null;

  const candidate = /** @type {Record<string, unknown>} */ (input);

  const diagnosisName =
    typeof candidate.diagnosisName === "string" ? candidate.diagnosisName.trim() : "";
  if (!diagnosisName || diagnosisName.length > 120) return null;

  let diagnosisDate = null;
  if (candidate.diagnosisDate) {
    const parsed =
      candidate.diagnosisDate instanceof Date
        ? candidate.diagnosisDate
        : new Date(String(candidate.diagnosisDate));

    if (Number.isNaN(parsed.getTime())) return null;

    // Must not be in the future
    const currentTime = now().getTime();
    if (parsed.getTime() > currentTime + 86_400_000) {
      // 1 day buffer for timezone differences
      return null;
    }
    diagnosisDate = parsed;
  }

  const diagnosedByRaw =
    typeof candidate.diagnosedBy === "string" ? candidate.diagnosedBy.trim() : "";
  const diagnosedBy = diagnosedByRaw ? diagnosedByRaw.slice(0, 120) : null;

  const notesRaw = typeof candidate.notes === "string" ? candidate.notes.trim() : "";
  const notes = notesRaw ? notesRaw.slice(0, 1000) : null;

  return {
    diagnosisName,
    diagnosisDate,
    diagnosedBy,
    notes,
  };
}

/**
 * Records a previous diagnosis reported by the patient for health history.
 *
 * @param {{
 *   requirePatient: () => Promise<any>,
 *   prisma: any,
 *   input: unknown,
 *   now?: () => Date
 * }} options
 */
export async function recordPatientDiagnosis({
  requirePatient,
  prisma,
  input,
  now = () => new Date(),
}) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return AUTH_REQUIRED;
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return AUTH_REQUIRED;

  const validated = validateDiagnosisInput(input, now);
  if (!validated) return INVALID;

  try {
    const created = await prisma.diagnosis.create({
      data: {
        patientID,
        diagnosisName: validated.diagnosisName,
        diagnosisDate: validated.diagnosisDate,
        diagnosedBy: validated.diagnosedBy,
        notes: validated.notes,
      },
      select: { diagnosisID: true },
    });

    return {
      status: "success",
      message: "Previous diagnosis added to your health history.",
      diagnosisID: created.diagnosisID,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Loads previous diagnoses recorded by the authenticated patient.
 *
 * @param {{
 *   requirePatient: () => Promise<any>,
 *   prisma: any,
 * }} options
 */
export async function loadPatientDiagnoses({ requirePatient, prisma }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return { status: "denied", diagnoses: [] };
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return { status: "denied", diagnoses: [] };

  try {
    const rawDiagnoses = await prisma.diagnosis.findMany({
      where: { patientID },
      orderBy: [{ diagnosisDate: "desc" }, { recordedAt: "desc" }],
      select: {
        diagnosisID: true,
        patientID: true,
        diagnosisName: true,
        diagnosisDate: true,
        diagnosedBy: true,
        notes: true,
        recordedAt: true,
      },
    });

    const diagnoses = rawDiagnoses.map((d) => ({
      ...d,
      formattedDate: d.diagnosisDate
        ? new Date(d.diagnosisDate).toLocaleDateString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : "Not specified",
      formattedRecordedAt: new Date(d.recordedAt).toLocaleDateString("en-MY", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

    return { status: "success", diagnoses };
  } catch {
    return { status: "error", message: "Could not load diagnoses.", diagnoses: [] };
  }
}

/**
 * Deletes a patient-reported diagnosis, strictly scoped to the owning patient.
 *
 * @param {{
 *   requirePatient: () => Promise<any>,
 *   prisma: any,
 *   diagnosisID: unknown,
 * }} options
 */
export async function deletePatientDiagnosis({
  requirePatient,
  prisma,
  diagnosisID,
}) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return AUTH_REQUIRED;
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return AUTH_REQUIRED;

  const validID = positiveInteger(diagnosisID);
  if (validID === null) return INVALID;

  try {
    const deleted = await prisma.diagnosis.deleteMany({
      where: {
        diagnosisID: validID,
        patientID,
      },
    });

    if (deleted.count === 0) {
      return {
        status: "error",
        message: "Diagnosis record not found or unauthorized.",
      };
    }

    return {
      status: "success",
      message: "Diagnosis record removed from your history.",
    };
  } catch {
    return FAILED;
  }
}

/**
 * Loads patient previous diagnoses for an HCP with active patient consent.
 *
 * @param {{
 *   requireApprovedHcp: () => Promise<any>,
 *   prisma: any,
 *   patientID: unknown,
 * }} options
 */
export async function loadConsentedPatientDiagnoses({
  requireApprovedHcp,
  prisma,
  patientID,
}) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch {
    return { status: "denied", diagnoses: [] };
  }

  const hcpID = positiveInteger(principal?.healthcareProfessional?.hcpID);
  if (hcpID === null) return { status: "denied", diagnoses: [] };

  const validPatientID = positiveInteger(patientID);
  if (validPatientID === null) return { status: "unavailable", diagnoses: [] };

  try {
    // Check active consent
    const activeConsent = await prisma.patientHcpConsent.findFirst({
      where: {
        patientID: validPatientID,
        hcpID,
        status: "ACTIVE",
      },
      select: { consentID: true },
    });

    if (!activeConsent) {
      return { status: "unavailable", diagnoses: [] };
    }

    const rawDiagnoses = await prisma.diagnosis.findMany({
      where: { patientID: validPatientID },
      orderBy: [{ diagnosisDate: "desc" }, { recordedAt: "desc" }],
      select: {
        diagnosisID: true,
        patientID: true,
        diagnosisName: true,
        diagnosisDate: true,
        diagnosedBy: true,
        notes: true,
        recordedAt: true,
      },
    });

    const diagnoses = rawDiagnoses.map((d) => ({
      ...d,
      formattedDate: d.diagnosisDate
        ? new Date(d.diagnosisDate).toLocaleDateString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : "Not specified",
    }));

    return { status: "success", diagnoses };
  } catch {
    return { status: "error", message: "Could not load diagnoses.", diagnoses: [] };
  }
}
