import { validateAssessmentInput } from "./assessment-validation.mjs";

const AUTH_REQUIRED = Object.freeze({
  status: "error",
  message: "Your patient session is no longer available. Please sign in again.",
});
const INVALID_SYMPTOMS = Object.freeze({
  status: "error",
  message: "Choose symptoms from the available list and try again.",
});
const SAVE_FAILED = Object.freeze({
  status: "error",
  message: "We could not save this assessment. Please check your details and try again.",
});

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647 ? value : null;
}

/**
 * Creates a saved Patient assessment without creating symptom-tracking or
 * diagnosis records. The result summary stays informational and does not claim
 * that the saved assessment is a confirmed diagnosis.
 * @param {{ requirePatient: () => Promise<{patient: {patientID: number} | null}>, prisma: any, input: unknown }} options
 * @returns {Promise<{status: "success", assessmentID: number} | {status: "error", message: string}>}
 */
export async function createPatientAssessment({ requirePatient, prisma, input }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return AUTH_REQUIRED;
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return AUTH_REQUIRED;

  const validation = validateAssessmentInput(input);
  if (!validation.ok) return { status: "error", message: validation.message };

  try {
    const symptomIDs = [...new Set(validation.data.symptoms.map(({ symptomID }) => symptomID))];
    const catalogSymptoms = await prisma.symptom.findMany({
      where: { symptomID: { in: symptomIDs } },
      select: { symptomID: true, symptomName: true, bodyPart: true },
    });
    if (catalogSymptoms.length !== symptomIDs.length) return INVALID_SYMPTOMS;

    const symptomsById = new Map(catalogSymptoms.map((symptom) => [symptom.symptomID, symptom]));
    const answers = validation.data.symptoms.map((answer) => {
      const catalogSymptom = symptomsById.get(answer.symptomID);
      return {
        ...answer,
        symptomName: catalogSymptom.symptomName,
        bodyPart: catalogSymptom.bodyPart,
      };
    });
    const symptomsInput = [...new Set(answers.map(({ symptomName }) => symptomName))].join(", ");

    const saved = await prisma.assessment.create({
      data: {
        patientID,
        symptomsInput,
        answers,
        resultSummary: "Assessment details saved. Results are informational and are not a confirmed diagnosis.",
      },
      select: { assessmentID: true },
    });

    return { status: "success", assessmentID: saved.assessmentID };
  } catch {
    return SAVE_FAILED;
  }
}
