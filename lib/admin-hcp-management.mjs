const MAX_ID = 2_147_483_647;

const UNAVAILABLE = Object.freeze({
  status: "error",
  message: "This healthcare professional record is unavailable or unauthorized.",
});

const INVALID = Object.freeze({
  status: "error",
  message: "Invalid input. Please check the provided information.",
});

const FAILED = Object.freeze({
  status: "error",
  message: "Could not complete this administrative operation. Please try again.",
});

const VALID_ACCOUNT_STATUSES = new Set([
  "ACTIVE", "DISABLED", "SUSPENDED",
]);

const VALID_VERIFICATION_STATUSES = new Set([
  "Pending", "Approved", "Rejected",
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
function parseYears(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100
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
 * Searches and paginates healthcare professional records for administrators.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   search?: string | null,
 *   verificationStatus?: string | null,
 *   page?: unknown,
 *   pageSize?: number,
 * }} options
 */
export async function searchHcpRecords({
  requireAdmin,
  prisma,
  search = null,
  verificationStatus = null,
  page = 1,
  pageSize = 10,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const currentPage = parsePage(page);
  const take = Math.min(Math.max(1, pageSize), 50);

  const query = typeof search === "string" ? search.trim() : "";
  const statusFilter =
    typeof verificationStatus === "string" &&
    verificationStatus !== "All" &&
    VALID_VERIFICATION_STATUSES.has(verificationStatus)
      ? verificationStatus
      : null;

  const where = {
    ...(statusFilter ? { verificationStatus: statusFilter } : {}),
    ...(query
      ? {
          OR: [
            { user: { fullName: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
            { licenseNo: { contains: query, mode: "insensitive" } },
            { specialization: { contains: query, mode: "insensitive" } },
            { workplace: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const total = await prisma.healthcareProfessional.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / take));
    const safePage = Math.min(currentPage, pageCount);
    const skip = (safePage - 1) * take;

    const hcps = await prisma.healthcareProfessional.findMany({
      where,
      select: {
        hcpID: true,
        userID: true,
        licenseNo: true,
        specialization: true,
        workplace: true,
        yearsOfExperience: true,
        verificationStatus: true,
        verifiedAt: true,
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
            appointments: true,
            patientConsents: true,
          },
        },
      },
      orderBy: [{ user: { fullName: "asc" } }, { hcpID: "asc" }],
      skip,
      take,
    });

    return {
      status: "success",
      hcps,
      total,
      page: safePage,
      pageSize: take,
      pageCount,
    };
  } catch {
    return {
      status: "error",
      message: "Could not load healthcare professional records.",
      hcps: [],
      total: 0,
      page: 1,
      pageSize: take,
      pageCount: 1,
    };
  }
}

/**
 * Loads full healthcare professional record for administrative view and edit.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   hcpID: unknown,
 * }} options
 */
export async function getHcpDetail({ requireAdmin, prisma, hcpID }) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(hcpID);
  if (validID === null) return UNAVAILABLE;

  try {
    const hcp = await prisma.healthcareProfessional.findUnique({
      where: { hcpID: validID },
      select: {
        hcpID: true,
        userID: true,
        licenseNo: true,
        specialization: true,
        workplace: true,
        yearsOfExperience: true,
        verificationStatus: true,
        verifiedAt: true,
        verifiedBy: true,
        verifier: {
          select: {
            adminID: true,
            user: { select: { fullName: true } },
          },
        },
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
            appointments: true,
            patientConsents: true,
          },
        },
      },
    });

    if (!hcp) return UNAVAILABLE;

    return {
      status: "success",
      hcp,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Validates inputs for updating HCP profile.
 * @param {Record<string, unknown>} input
 */
function validateHcpUpdateInput(input) {
  if (!input || typeof input !== "object") return null;

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (!fullName || fullName.length > 100) return null;

  const phoneNo = typeof input.phoneNo === "string" ? input.phoneNo.trim() : "";
  if (!phoneNo || phoneNo.length > 15 || !/^[0-9+\-\s()]{3,15}$/.test(phoneNo)) return null;

  const specialization = typeof input.specialization === "string" ? input.specialization.trim() : "";
  if (!specialization || specialization.length > 60) return null;

  const workplace = typeof input.workplace === "string" ? input.workplace.trim() : "";
  if (!workplace || workplace.length > 120) return null;

  const yearsOfExperience = parseYears(input.yearsOfExperience);
  if (yearsOfExperience === null) return null;

  return {
    fullName,
    phoneNo,
    specialization,
    workplace,
    yearsOfExperience,
  };
}

/**
 * Updates permitted healthcare professional fields and records an AuditLog entry.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   hcpID: unknown,
 *   input: unknown,
 * }} options
 */
export async function updateHcpRecord({
  requireAdmin,
  prisma,
  hcpID,
  input,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(hcpID);
  if (validID === null) return UNAVAILABLE;

  const data = validateHcpUpdateInput(/** @type {Record<string, unknown>} */ (input));
  if (!data) return INVALID;

  try {
    const existing = await prisma.healthcareProfessional.findUnique({
      where: { hcpID: validID },
      select: {
        hcpID: true,
        userID: true,
        specialization: true,
        workplace: true,
        yearsOfExperience: true,
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
    if (existing.specialization !== data.specialization) {
      diff.specialization = { from: existing.specialization, to: data.specialization };
    }
    if (existing.workplace !== data.workplace) {
      diff.workplace = { from: existing.workplace, to: data.workplace };
    }
    if (existing.yearsOfExperience !== data.yearsOfExperience) {
      diff.yearsOfExperience = { from: existing.yearsOfExperience, to: data.yearsOfExperience };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userID },
        data: {
          fullName: data.fullName,
          phoneNo: data.phoneNo,
        },
      });

      await tx.healthcareProfessional.update({
        where: { hcpID: validID },
        data: {
          specialization: data.specialization,
          workplace: data.workplace,
          yearsOfExperience: data.yearsOfExperience,
        },
      });

      await tx.auditLog.create({
        data: {
          adminID,
          action: "HCP_UPDATED",
          entityType: "HealthcareProfessional",
          entityID: validID,
          changeSummary: `Administrator updated profile details for healthcare professional ${data.fullName}.`,
          changedFields: diff,
        },
      });
    });

    return {
      status: "success",
      message: "Healthcare professional record updated successfully.",
    };
  } catch {
    return FAILED;
  }
}

/**
 * Changes healthcare professional account status (ACTIVE, DISABLED, SUSPENDED).
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   hcpID: unknown,
 *   targetStatus: unknown,
 * }} options
 */
export async function setHcpAccountStatus({
  requireAdmin,
  prisma,
  hcpID,
  targetStatus,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(hcpID);
  if (validID === null) return UNAVAILABLE;

  if (typeof targetStatus !== "string" || !VALID_ACCOUNT_STATUSES.has(targetStatus)) {
    return INVALID;
  }

  try {
    const existing = await prisma.healthcareProfessional.findUnique({
      where: { hcpID: validID },
      select: {
        hcpID: true,
        userID: true,
        user: { select: { fullName: true, accountStatus: true } },
      },
    });

    if (!existing) return UNAVAILABLE;

    const oldStatus = existing.user.accountStatus;
    if (oldStatus === targetStatus) {
      return {
        status: "success",
        message: `HCP account is already ${targetStatus.toLowerCase()}.`,
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
          action: targetStatus === "DISABLED" ? "HCP_DEACTIVATED" : "HCP_STATUS_CHANGED",
          entityType: "HealthcareProfessional",
          entityID: validID,
          changeSummary: `Changed HCP account status for ${existing.user.fullName} from ${oldStatus} to ${targetStatus}.`,
          changedFields: { accountStatus: { from: oldStatus, to: targetStatus } },
        },
      });
    });

    return {
      status: "success",
      message: `HCP account has been ${targetStatus === "DISABLED" ? "deactivated" : `set to ${targetStatus.toLowerCase()}`}.`,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Transitions HCP verification status (Pending, Approved, Rejected).
 * Sets verifiedBy and verifiedAt when Approved; clears them otherwise.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   hcpID: unknown,
 *   targetStatus: unknown,
 *   now?: () => Date,
 * }} options
 */
export async function setHcpVerificationStatus({
  requireAdmin,
  prisma,
  hcpID,
  targetStatus,
  now = () => new Date(),
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(hcpID);
  if (validID === null) return UNAVAILABLE;

  if (typeof targetStatus !== "string" || !VALID_VERIFICATION_STATUSES.has(targetStatus)) {
    return INVALID;
  }

  try {
    const existing = await prisma.healthcareProfessional.findUnique({
      where: { hcpID: validID },
      select: {
        hcpID: true,
        verificationStatus: true,
        user: { select: { fullName: true } },
      },
    });

    if (!existing) return UNAVAILABLE;

    const oldStatus = existing.verificationStatus;
    if (oldStatus === targetStatus) {
      return {
        status: "success",
        message: `HCP verification status is already ${targetStatus}.`,
      };
    }

    const isApproved = targetStatus === "Approved";

    await prisma.$transaction(async (tx) => {
      await tx.healthcareProfessional.update({
        where: { hcpID: validID },
        data: {
          verificationStatus: targetStatus,
          verifiedBy: isApproved ? adminID : null,
          verifiedAt: isApproved ? now() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          adminID,
          action: isApproved ? "HCP_APPROVED" : targetStatus === "Rejected" ? "HCP_REJECTED" : "HCP_VERIFICATION_UPDATED",
          entityType: "HealthcareProfessional",
          entityID: validID,
          changeSummary: `Changed verification status for ${existing.user.fullName} from ${oldStatus} to ${targetStatus}.`,
          changedFields: {
            verificationStatus: { from: oldStatus, to: targetStatus },
          },
        },
      });
    });

    return {
      status: "success",
      message: `HCP verification status set to ${targetStatus}.`,
    };
  } catch {
    return FAILED;
  }
}

/**
 * Deletes healthcare professional record if and only if no relational dependencies exist.
 * Rejects with a clear message if appointment or consent records are attached.
 *
 * @param {{
 *   requireAdmin: () => Promise<any>,
 *   prisma: any,
 *   hcpID: unknown,
 * }} options
 */
export async function deleteHcpRecord({
  requireAdmin,
  prisma,
  hcpID,
}) {
  const adminID = await resolveAdminId(requireAdmin);
  if (adminID === null) return UNAVAILABLE;

  const validID = positiveInteger(hcpID);
  if (validID === null) return UNAVAILABLE;

  try {
    const existing = await prisma.healthcareProfessional.findUnique({
      where: { hcpID: validID },
      select: {
        hcpID: true,
        userID: true,
        licenseNo: true,
        user: { select: { id: true, fullName: true } },
        _count: {
          select: {
            appointments: true,
            patientConsents: true,
          },
        },
      },
    });

    if (!existing) return UNAVAILABLE;

    const { appointments, patientConsents } = existing._count;
    const hasDependencies = appointments > 0 || patientConsents > 0;

    if (hasDependencies) {
      return {
        status: "error",
        message:
          "Cannot permanently delete this healthcare professional record because scheduled appointments or patient consents exist. Deactivate the account or update verification status instead.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          adminID,
          action: "HCP_DELETED",
          entityType: "HealthcareProfessional",
          entityID: validID,
          changeSummary: `Administrator permanently deleted HCP record ${existing.user.fullName} (License: ${existing.licenseNo}).`,
          changedFields: { healthcareProfessional: { deleted: true } },
        },
      });

      await tx.healthcareProfessional.delete({ where: { hcpID: validID } });
      await tx.user.delete({ where: { id: existing.userID } });
    });

    return {
      status: "success",
      message: "Healthcare professional record has been permanently deleted.",
    };
  } catch {
    return FAILED;
  }
}
