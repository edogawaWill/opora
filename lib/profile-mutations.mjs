import {
  passwordChangeFeedback,
  validateHcpProfile,
  validatePatientProfile,
  validatePasswordChange,
} from "./profile-policy.mjs";

const AUTH_REQUIRED = "Your account session is no longer available. Please sign in again.";
const SAVE_FAILED = "We could not update your profile right now. Please try again.";

function validId(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647;
}

function formValue(input, key) {
  return typeof input?.[key] === "string" ? input[key] : "";
}

/**
 * Executes Patient profile updates using only the identity returned by requirePatient.
 * @param {{requirePatient: () => Promise<any>, prisma: any, input: Record<string, unknown>}} dependencies
 * @returns {Promise<{status: "success" | "error", message: string}>}
 */
export async function updatePatientProfile({ requirePatient, prisma, input }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return { status: "error", message: AUTH_REQUIRED };
  }
  if (
    principal?.role !== "PATIENT" ||
    principal.accountStatus !== "ACTIVE" ||
    principal.emailVerified !== true ||
    !validId(principal.userId) ||
    !validId(principal.patient?.patientID)
  ) return { status: "error", message: AUTH_REQUIRED };

  const validation = validatePatientProfile({
    fullName: formValue(input, "fullName"),
    phoneNo: formValue(input, "phoneNo"),
    address: formValue(input, "address"),
    bloodType: formValue(input, "bloodType"),
    allergies: formValue(input, "allergies"),
    emergencyContact: formValue(input, "emergencyContact"),
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: principal.userId },
        data: { fullName: validation.value.fullName, phoneNo: validation.value.phoneNo },
      }),
      prisma.patient.update({
        where: { userID: principal.userId },
        data: {
          address: validation.value.address,
          bloodType: validation.value.bloodType,
          allergies: validation.value.allergies,
          emergencyContact: validation.value.emergencyContact,
        },
      }),
    ]);
    return { status: "success", message: "Your profile was updated." };
  } catch {
    console.error("OPORA Patient profile update failed");
    return { status: "error", message: SAVE_FAILED };
  }
}

/**
 * Executes HCP personal-info updates; verification/profile credentials are never accepted.
 * @param {{requireHcpAccount: () => Promise<any>, prisma: any, input: Record<string, unknown>}} dependencies
 * @returns {Promise<{status: "success" | "error", message: string}>}
 */
export async function updateHcpPersonalProfile({ requireHcpAccount, prisma, input }) {
  let principal;
  try {
    principal = await requireHcpAccount();
  } catch {
    return { status: "error", message: AUTH_REQUIRED };
  }
  if (
    principal?.role !== "HCP" ||
    principal.accountStatus !== "ACTIVE" ||
    principal.emailVerified !== true ||
    !validId(principal.userId) ||
    !validId(principal.healthcareProfessional?.hcpID)
  ) return { status: "error", message: AUTH_REQUIRED };

  const validation = validateHcpProfile({
    fullName: formValue(input, "fullName"),
    phoneNo: formValue(input, "phoneNo"),
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  try {
    await prisma.user.update({
      where: { id: principal.userId },
      data: { fullName: validation.value.fullName, phoneNo: validation.value.phoneNo },
    });
    return { status: "success", message: "Your profile was updated." };
  } catch {
    console.error("OPORA HCP profile update failed");
    return { status: "error", message: SAVE_FAILED };
  }
}

/**
 * Changes only the password belonging to the role-authorized current session.
 * @param {{authorize: () => Promise<any>, expectedRole: "PATIENT" | "HCP", changePassword: (body: {currentPassword: string, newPassword: string, revokeOtherSessions: true}) => Promise<unknown>, input: Record<string, unknown>}} dependencies
 * @returns {Promise<{status: "success" | "error", message: string}>}
 */
export async function changeOwnPassword({ authorize, expectedRole, changePassword, input }) {
  let principal;
  try {
    principal = await authorize();
  } catch {
    return { status: "error", message: AUTH_REQUIRED };
  }
  if (
    principal?.role !== expectedRole ||
    principal.accountStatus !== "ACTIVE" ||
    principal.emailVerified !== true
  ) return { status: "error", message: AUTH_REQUIRED };

  const currentPassword = typeof input?.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input?.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input?.confirmPassword === "string" ? input.confirmPassword : "";
  const validation = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
  if (!validation.ok) return { status: "error", message: validation.message };

  try {
    await changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    return passwordChangeFeedback(null);
  } catch (error) {
    return passwordChangeFeedback(error);
  }
}
