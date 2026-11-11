import { validateSymptomRecordInput } from "./symptom-validation.mjs";

const MAX_ASSESSMENT_SYMPTOMS = 20;
const MAX_ID = 2_147_483_647;

/**
 * @typedef {{ symptomID: number, severity: number, onsetDate: string, duration: string, notes: string | null }} AssessmentSymptomInput
 * @typedef {{ ok: true, data: { symptoms: AssessmentSymptomInput[] } } | { ok: false, message: string }} AssessmentValidationResult
 */

/** @param {unknown} value */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Accepts only the patient symptom details already supported by the symptom
 * record workflow and the Assessment JSON answers field. Patient ownership is
 * deliberately not part of this input shape.
 * @param {unknown} input
 * @returns {AssessmentValidationResult}
 */
export function validateAssessmentInput(input) {
  if (!isRecord(input) || Object.keys(input).some((key) => key !== "symptoms")) {
    return { ok: false, message: "Enter valid assessment information." };
  }

  const rawSymptoms = input.symptoms;
  if (!Array.isArray(rawSymptoms) || rawSymptoms.length === 0) {
    return { ok: false, message: "Add at least one symptom to the assessment." };
  }
  if (rawSymptoms.length > MAX_ASSESSMENT_SYMPTOMS) {
    return { ok: false, message: `An assessment can include up to ${MAX_ASSESSMENT_SYMPTOMS} symptoms.` };
  }

  const symptoms = [];
  for (const rawSymptom of rawSymptoms) {
    if (!isRecord(rawSymptom)) {
      return { ok: false, message: "Enter valid symptom details." };
    }
    const allowedFields = new Set(["symptomID", "severity", "onsetDate", "duration", "notes"]);
    if (Object.keys(rawSymptom).some((key) => !allowedFields.has(key))) {
      return { ok: false, message: "Enter only supported symptom details." };
    }

    const validated = validateSymptomRecordInput({
      symptomID: rawSymptom.symptomID,
      severity: rawSymptom.severity,
      onsetDate: rawSymptom.onsetDate,
      duration: rawSymptom.duration,
      notes: rawSymptom.notes,
    });
    if (!validated.ok) return validated;
    if (!Number.isSafeInteger(validated.data.symptomID) || validated.data.symptomID > MAX_ID) {
      return { ok: false, message: "Choose a valid symptom from the list." };
    }
    symptoms.push(validated.data);
  }

  return { ok: true, data: { symptoms } };
}
