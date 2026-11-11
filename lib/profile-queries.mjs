function validId(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647;
}

async function currentPrincipal(authorize, role, profileKey, profileIdKey) {
  let principal;
  try {
    principal = await authorize();
  } catch {
    return null;
  }
  if (
    principal?.role !== role ||
    principal.accountStatus !== "ACTIVE" ||
    principal.emailVerified !== true ||
    !validId(principal.userId) ||
    !validId(principal[profileKey]?.[profileIdKey])
  ) return null;
  return principal;
}

/** @param {{requirePatient: () => Promise<any>, prisma: any}} input */
export async function loadOwnPatientProfile({ requirePatient, prisma }) {
  const principal = await currentPrincipal(requirePatient, "PATIENT", "patient", "patientID");
  if (!principal) return { status: "denied" };
  try {
    const profile = await prisma.patient.findUnique({
      where: { userID: principal.userId },
      select: {
        dateOfBirth: true,
        gender: true,
        address: true,
        bloodType: true,
        allergies: true,
        emergencyContact: true,
        user: { select: { fullName: true, email: true, phoneNo: true } },
      },
    });
    return profile ? { status: "success", profile } : { status: "unavailable" };
  } catch {
    return { status: "error" };
  }
}

/** @param {{requireHcpAccount: () => Promise<any>, prisma: any}} input */
export async function loadOwnHcpProfile({ requireHcpAccount, prisma }) {
  const principal = await currentPrincipal(requireHcpAccount, "HCP", "healthcareProfessional", "hcpID");
  if (!principal) return { status: "denied" };
  try {
    const profile = await prisma.healthcareProfessional.findUnique({
      where: { userID: principal.userId },
      select: {
        licenseNo: true,
        specialization: true,
        workplace: true,
        yearsOfExperience: true,
        verificationStatus: true,
        user: { select: { fullName: true, email: true, phoneNo: true, accountStatus: true } },
      },
    });
    return profile ? { status: "success", profile } : { status: "unavailable" };
  } catch {
    return { status: "error" };
  }
}
