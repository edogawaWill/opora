const MAX_ID = 2_147_483_647;

const UNAVAILABLE = Object.freeze({
  status: "error",
  message: "This patient record is unavailable or unauthorized.",
});

const INVALID = Object.freeze({
  status: "error",
  message: "Invalid input. Please check the provided information.",
});

const FAILED = Object.freeze({
  status: "error",
  message: "Could not complete this administrative operation. Please try again.",
});

const VALID_BLOOD_TYPES = new Set([
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
]);

const VALID_ACCOUNT_STATUSES = new Set([
  "ACTIVE", "DISABLED", "SUSPENDED",
]);

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

/** @param {unknown} value */
function parsePage(value) {
  const parsed = positiveInteger(value);
  return parsed ?? 1;
}

/**
 * Resolves the authenticated adminID or returns null.
 * @param {() => Promise<any>} requireAdmin
 */
async function resolveAdminId(requireAdmin) {
  try {
    const principal = await requireAdmin();
    return positiveInteger(principal?.admin?.adminID);
  } catch {
    return null;
  }
}

/**
 * Searches and paginates patient records for administrators.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   search?: string | null,
 *   page?: unknown,
 *   pageSize?: number,
 * }} options
 */
export async function searchPatientRecords({
  requireAdmin,
  prisma,
  search = null,
  page = 1,
  pageSize = 10,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const currentPage = parsePage(page);
  const take = Math.min(Math.max(1, pageSize), 50);

  const query = typeof search === "string" ? search.trim() : "";

  const where = query
    ? {
        OR: [
          { user: { fullName: { contains: query, mode: "insensitive" } } },
          { user: { email: { contains: query, mode: "insensitive" } } },
          { user: { phoneNo: { contains: query, mode: "insensitive" } } },
          { icNumber: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  try {
    const total = await prisma.patient.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / take));
    const safePage = Math.min(currentPage, pageCount);
    const skip = (safePage - 1) * take;

    const patients = await prisma.patient.findMany({
      where,
      select: {
        patientID: true,
        userID: true,
        icNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        bloodType: true,
        emergencyContact: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNo: true,
            accountStatus: true,
            emailVerified: true,
            dateRegistered: true,
          },
        },
        _count: {
          select: {
            symptomRecords: true,
            assessments: true,
            appointments: true,
            diagnoses: true,
          },
        },
      },
      orderBy: [{ user: { fullName: "asc" } }, { patientID: "asc" }],
      skip,
      take,
    });

    return {
      status: "success",
      patients,
      total,
      page: safePage,
      pageSize: take,
      pageCount,
    };
  } catch {
    return {
      status: "error",
      message: "Could not load patient records.",
      patients: [],
      total: 0,
      page: 1,
      pageSize: take,
      pageCount: 1,
    };
  }
}

/**
 * Loads detailed patient record for administrative view and edit.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   patientID: unknown,
 * }} options
 */
export async function getPatientDetail({ requireAdmin, prisma, patientID }) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(patientID);
  if (validID === null) return UNAVAILABLE;

  try {
    const patient = await prisma.patient.findUnique({
      where: { patientID: validID },
      select: {
        patientID: true,
        userID: true,
        icNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        bloodType: true,
        allergies: true,
        emergencyContact: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNo: true,
            accountStatus: true,
            emailVerified: true,
            dateRegistered: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            symptomRecords: true,
            assessments: true,
            appointments: true,
            diagnoses: true,
            hcpConsents: true,
          },
        },
      },
    });

    if (!patient) return UNAVAILABLE;

    return {
      status: "success",
      patient,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Validates inputs for updating patient record.
 * @param {Record<string, unknown>} input
 */
function validatePatientUpdateInput(input) {
  if (!input || typeof input !== "object") return null;

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (!fullName || fullName.length > 100) return null;

  const phoneNo = typeof input.phoneNo === "string" ? input.phoneNo.trim() : "";
  if (!phoneNo || phoneNo.length > 15 || !/^[0-9+\-\s()]{3,15}$/.test(phoneNo)) return null;

  const address = typeof input.address === "string" ? input.address.trim() : "";
  if (!address || address.length > 500) return null;

  const emergencyContactRaw = typeof input.emergencyContact === "string" ? input.emergencyContact.trim() : "";
  const emergencyContact = emergencyContactRaw ? emergencyContactRaw.slice(0, 100) : null;

  const allergiesRaw = typeof input.allergies === "string" ? input.allergies.trim() : "";
  const allergies = allergiesRaw ? allergiesRaw.slice(0, 1000) : null;

  const bloodTypeRaw = typeof input.bloodType === "string" ? input.bloodType.trim().toUpperCase() : "";
  let bloodType = null;
  if (bloodTypeRaw) {
    if (!VALID_BLOOD_TYPES.has(bloodTypeRaw)) return null;
    bloodType = bloodTypeRaw;
  }

  return {
    fullName,
    phoneNo,
    address,
    emergencyContact,
    allergies,
    bloodType,
  };
}

/**
 * Updates permitted patient fields and records an AuditLog entry.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   patientID: unknown,
 *   input: unknown,
 * }} options
 */
export async function updatePatientRecord({
  requireAdmin,
  prisma,
  patientID,
  input,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(patientID);
  if (validID === null) return UNAVAILABLE;

  const data = validatePatientUpdateInput(/** @type {Record<string, unknown>} */ (input));
  if (!data) return INVALID;

  try {
    const existing = await prisma.patient.findUnique({
      where: { patientID: validID },
      select: {
        patientID: true,
        userID: true,
        address: true,
        emergencyContact: true,
        allergies: true,
        bloodType: true,
        user: { select: { fullName: true, phoneNo: true } },
      },
    });

    if (!existing) return UNAVAILABLE;

    const diff = {};
    if (existing.user.fullName !== data.fullName) {
      diff.fullName = { from: existing.user.fullName, to: data.fullName };
    }
    if (existing.user.phoneNo !== data.phoneNo) {
      diff.phoneNo = { from: existing.user.phoneNo, to: data.phoneNo };
    }
    if (existing.address !== data.address) {
      diff.address = { from: existing.address, to: data.address };
    }
    if (existing.emergencyContact !== data.emergencyContact) {
      diff.emergencyContact = { from: existing.emergencyContact, to: data.emergencyContact };
    }
    if (existing.allergies !== data.allergies) {
      diff.allergies = { from: existing.allergies, to: data.allergies };
    }
    if (existing.bloodType !== data.bloodType) {
      diff.bloodType = { from: existing.bloodType, to: data.bloodType };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userID },
        data: {
          fullName: data.fullName,
          phoneNo: data.phoneNo,
        },
      });

      await tx.patient.update({
        where: { patientID: validID },
        data: {
          address: data.address,
          emergencyContact: data.emergencyContact,
          allergies: data.allergies,
          bloodType: data.bloodType,
        },
      });

      await tx.auditLog.create({
        data: {
          adminID,
          action: "PATIENT_UPDATED",
          entityType: "Patient",
          entityID: validID,
          changeSummary: `Administrator updated profile details for patient ${data.fullName}.`,
          changedFields: diff,
        },
      });
    });

    return {
      status: "success",
      message: "Patient record updated successfully.",
    };
  } catch {
    return FAILED;
  }
}

/**
 * Changes patient account status (ACTIVE, DISABLED, SUSPENDED) and logs audit event.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   patientID: unknown,
 *   targetStatus: unknown,
 * }} options
 */
export async function setPatientAccountStatus({
  requireAdmin,
  prisma,
  patientID,
  targetStatus,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(patientID);
  if (validID === null) return UNAVAILABLE;

  if (typeof targetStatus !== "string" || !VALID_ACCOUNT_STATUSES.has(targetStatus)) {
    return INVALID;
  }

  try {
    const existing = await prisma.patient.findUnique({
      where: { patientID: validID },
      select: {
        patientID: true,
        userID: true,
        user: { select: { fullName: true, accountStatus: true } },
      },
    });

    if (!existing) return UNAVAILABLE;

    const oldStatus = existing.user.accountStatus;
    if (oldStatus === targetStatus) {
      return {
        status: "success",
        message: `Patient account is already ${targetStatus.toLowerCase()}.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userID },
        data: { accountStatus: targetStatus },
      });

      await tx.auditLog.create({
        data: {
          adminID,
          action: targetStatus === "DISABLED" ? "PATIENT_DEACTIVATED" : "PATIENT_STATUS_CHANGED",
          entityType: "Patient",
          entityID: validID,
          changeSummary: `Changed patient account status for ${existing.user.fullName} from ${oldStatus} to ${targetStatus}.`,
          changedFields: { accountStatus: { from: oldStatus, to: targetStatus } },
        },
      });
    });

    return {
      status: "success",
      message: `Patient account has been ${targetStatus === "DISABLED" ? "deactivated" : `set to ${targetStatus.toLowerCase()}`}.`,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Deletes patient record if and only if no relational dependencies exist.
 * Rejects with a clear message if clinical/transactional records are attached.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   patientID: unknown,
 * }} options
 */
export async function deletePatientRecord({
  requireAdmin,
  prisma,
  patientID,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(patientID);
  if (validID === null) return UNAVAILABLE;

  try {
    const existing = await prisma.patient.findUnique({
      where: { patientID: validID },
      select: {
        patientID: true,
        userID: true,
        icNumber: true,
        user: { select: { id: true, fullName: true } },
        _count: {
          select: {
            symptomRecords: true,
            assessments: true,
            appointments: true,
            diagnoses: true,
            hcpConsents: true,
          },
        },
      },
    });

    if (!existing) return UNAVAILABLE;

    const { symptomRecords, assessments, appointments, diagnoses, hcpConsents } = existing._count;
    const hasDependencies =
      symptomRecords > 0 ||
      assessments > 0 ||
      appointments > 0 ||
      diagnoses > 0 ||
      hcpConsents > 0;

    if (hasDependencies) {
      return {
        status: "error",
        message:
          "Cannot permanently delete this patient record because clinical or appointment history exists. Deactivate the patient account instead to restrict access while preserving medical and audit records.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          adminID,
          action: "PATIENT_DELETED",
          entityType: "Patient",
          entityID: validID,
          changeSummary: `Administrator permanently deleted patient record ${existing.user.fullName} (IC: ${existing.icNumber}).`,
          changedFields: { patient: { deleted: true } },
        },
      });

      await tx.patient.delete({ where: { patientID: validID } });
      await tx.user.delete({ where: { id: existing.userID } });
    });

    return {
      status: "success",
      message: "Patient record has been permanently deleted.",
    };
  } catch {
    return FAILED;
  }
}
