export const REGISTRATION_CONFLICT_MESSAGES = Object.freeze({
  email:
    "This email address is already registered. Please use another email address or sign in to your existing account.",
  licenseNo:
    "This MMC registration number is already registered. Please check the number or use the existing account.",
});

/** @returns {{ ok: true, value: string } | { ok: false, message: string }} */
export function validateMmcRegistrationNumber(value) {
  const licenseNo = typeof value === "string" ? value.trim() : "";
  if (!licenseNo) {
    return { ok: false, message: "Enter your MMC registration number." };
  }
  if (licenseNo.length > 20) {
    return { ok: false, message: "Your MMC registration number is too long." };
  }
  return { ok: true, value: licenseNo };
}

/**
 * Checks the canonical email across every role, then the MMC number for HCPs.
 * Email normalization matches the value used by Better Auth and the User model.
 * @returns {Promise<"email" | "licenseNo" | null>}
 */
export async function findRegistrationConflict(
  prisma,
  input,
  { skipEmailLookup = false } = {},
) {
  if (!skipEmailLookup) {
    const email = normalizeRegistrationEmail(input.email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) return "email";
  }

  if (input.kind === "HCP") {
    const existingProfessional = await prisma.healthcareProfessional.findUnique({
      where: { licenseNo: input.licenseNo },
      select: { hcpID: true },
    });
    if (existingProfessional) return "licenseNo";
  }

  return null;
}

/**
 * Runs the server-side duplicate preflight before invoking account creation,
 * then translates a concurrent unique-index conflict to the same field error.
 * @param {() => Promise<any>} createUser
 * @returns {Promise<{ kind: "duplicate", field: "email" | "licenseNo" } | { kind: "created", value: any }>}
 */
export async function createRegistrationUserIfUnique(
  prisma,
  input,
  createUser,
) {
  const conflict = await findRegistrationConflict(prisma, input);
  if (conflict) return { kind: "duplicate", field: conflict };

  try {
    return { kind: "created", value: await createUser() };
  } catch (error) {
    const field = getRegistrationUniqueConflictField(error);
    if (field) return { kind: "duplicate", field };
    throw error;
  }
}

/** @returns {"email" | "licenseNo" | null} */
export function getRegistrationUniqueConflictField(error) {
  const visited = new Set();
  const pending = [error];

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    const code = current.code ?? current.body?.code;
    if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "email";
    if (code === "P2002") {
      const target = current.meta?.target ?? current.meta?.constraint ?? current.constraint;
      const normalizedTarget = (Array.isArray(target) ? target : [target])
        .filter((part) => typeof part === "string")
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      if (normalizedTarget.includes("email")) return "email";
      if (normalizedTarget.includes("licenseno")) return "licenseNo";
    }

    pending.push(current.cause, current.originalError, current.body);
  }

  return null;
}

/** @param {"email" | "licenseNo"} field */
export function registrationConflictMessage(field) {
  return REGISTRATION_CONFLICT_MESSAGES[field] ?? null;
}

export async function removeUnfinishedRegistrationUser(prisma, userId) {
  return prisma.user.deleteMany({
    where: {
      id: userId,
      role: "UNASSIGNED",
      accountStatus: "PROVISIONING",
      patient: { is: null },
      healthcareProfessional: { is: null },
      admin: { is: null },
    },
  });
}

function normalizeRegistrationEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}
