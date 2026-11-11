import { findConditionsForSymptoms, symptomIDsFromAssessmentAnswers } from "./assessment-condition-matching.mjs";

const MAX_ID = 2_147_483_647;

function positiveInteger(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_ID ? parsed : null;
}

/**
 * Load one saved assessment and its current relationship-based condition
 * references for its owning authenticated Patient. This GET-side operation is
 * read-only, so refreshing the results route cannot create another assessment.
 * @param {{requirePatient: () => Promise<{patient: {patientID: number} | null}>, prisma: any, assessmentID: unknown}} input
 * @returns {Promise<{status: "denied" | "unavailable" | "error"} | {status: "success", assessment: {assessmentID: number, assessmentDate: Date, symptomsInput: string}, diseases: Array<{diseaseID: number, diseaseName: string, description: string | null, causes: string | null, treatment: string | null, prevention: string | null, whenToSeekCare: string | null, relatedSymptoms: Array<{symptomName: string, bodyPart: string}>>}>}
 */
export async function loadPatientAssessmentResults({ requirePatient, prisma, assessmentID }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return { status: "denied" };
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  const id = positiveInteger(assessmentID);
  if (patientID === null) return { status: "denied" };
  if (id === null) return { status: "unavailable" };

  try {
    const assessment = await prisma.assessment.findFirst({
      where: { assessmentID: id, patientID },
      select: { assessmentID: true, assessmentDate: true, symptomsInput: true, answers: true },
    });
    if (!assessment) return { status: "unavailable" };

    const parsedAnswers = symptomIDsFromAssessmentAnswers(assessment.answers);
    if (parsedAnswers.status !== "success") return { status: "error" };

    const matchResult = await findConditionsForSymptoms({ prisma, symptomIDs: parsedAnswers.symptomIDs });
    if (matchResult.status !== "success") return { status: "error" };

    return {
      status: "success",
      assessment: {
        assessmentID: assessment.assessmentID,
        assessmentDate: assessment.assessmentDate,
        symptomsInput: assessment.symptomsInput,
      },
      diseases: matchResult.diseases,
    };
  } catch {
    return { status: "error" };
  }
}
