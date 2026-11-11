/**
 * @typedef {{ symptomID: number, severity: number, onsetDate: string, duration: string, notes: string | null }} SymptomRecordInput
 * @typedef {{ ok: true, data: SymptomRecordInput } | { ok: false, message: string }} SymptomValidationResult
 */

/** @param {unknown} value */
function formString(value) {
  return typeof value === "string" ? value : null;
}

/**
 * @param {{ symptomID: unknown, severity: unknown, onsetDate: unknown, duration: unknown, notes: unknown }} input
 * @returns {SymptomValidationResult}
 */
export function validateSymptomRecordInput(input) {
  const symptomValue = formString(input.symptomID);
  if (!symptomValue || !/^\d+$/.test(symptomValue)) {
    return { ok: false, message: "Choose a symptom from the list." };
  }
  const symptomID = Number(symptomValue);
  if (!Number.isSafeInteger(symptomID) || symptomID < 1 || symptomID > 2_147_483_647) {
    return { ok: false, message: "Choose a valid symptom from the list." };
  }

  const severityValue = formString(input.severity);
  if (!severityValue || !/^\d{1,2}$/.test(severityValue)) {
    return { ok: false, message: "Choose a severity from 1 to 10." };
  }
  const severity = Number(severityValue);
  if (!Number.isInteger(severity) || severity < 1 || severity > 10) {
    return { ok: false, message: "Severity must be between 1 and 10." };
  }

  const onsetDate = formString(input.onsetDate);
  if (!onsetDate || !/^\d{4}-\d{2}-\d{2}$/.test(onsetDate)) {
    return { ok: false, message: "Enter a valid symptom start date." };
  }
  const parsedDate = new Date(`${onsetDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== onsetDate) {
    return { ok: false, message: "Enter a valid symptom start date." };
  }

  const durationValue = formString(input.duration);
  const duration = durationValue?.trim() ?? "";
  if (!duration) return { ok: false, message: "Enter how long the symptom has lasted." };
  if (duration.length > 30) {
    return { ok: false, message: "Duration must be 30 characters or fewer." };
  }

  const notesValue = formString(input.notes);
  if (input.notes !== null && input.notes !== undefined && notesValue === null) {
    return { ok: false, message: "Notes must be plain text." };
  }
  const notes = notesValue?.trim() || null;
  if (notes && notes.length > 2000) {
    return { ok: false, message: "Notes must be 2,000 characters or fewer." };
  }

  return {
    ok: true,
    data: { symptomID, severity, onsetDate, duration, notes },
  };
}
