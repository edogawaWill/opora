const MAX_ID = 2_147_483_647;

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID ? value : null;
}

/**
 * List only the saved assessments owned by the authenticated Patient.
 * This is a read-only operation and never accepts an owner ID from the caller.
 * @param {{requirePatient: () => Promise<{patient: {patientID: number} | null}>, prisma: any}} input
 * @returns {Promise<{status: "denied"} | {status: "error"} | {status: "success", assessments: Array<{assessmentID: number, assessmentDate: Date, symptomsInput: string}>}>}
 */
export async function loadPatientAssessmentHistory({ requirePatient, prisma }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return { status: "denied" };
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return { status: "denied" };

  try {
    const assessments = await prisma.assessment.findMany({
      where: { patientID },
      orderBy: [{ assessmentDate: "desc" }, { assessmentID: "desc" }],
      select: { assessmentID: true, assessmentDate: true, symptomsInput: true },
    });
    return { status: "success", assessments };
  } catch {
    return { status: "error" };
  }
}
