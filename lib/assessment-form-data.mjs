/**
 * Convert repeated assessment form controls into the server-side validation
 * shape. FormData values are preserved as-is so non-text values are rejected
 * by assessment validation rather than coerced into strings.
 * @param {FormData} formData
 * @returns {{ok: true, data: {symptoms: Array<{symptomID: FormDataEntryValue, severity: FormDataEntryValue, onsetDate: FormDataEntryValue, duration: FormDataEntryValue, notes: FormDataEntryValue | null}>}} | {ok: false, message: string}}
 */
export function assessmentInputFromFormData(formData) {
  const symptomIDs = formData.getAll("symptomID");
  const severities = formData.getAll("severity");
  const onsetDates = formData.getAll("onsetDate");
  const durations = formData.getAll("duration");
  const notes = formData.getAll("notes");

  if (
    symptomIDs.length === 0 ||
    severities.length !== symptomIDs.length ||
    onsetDates.length !== symptomIDs.length ||
    durations.length !== symptomIDs.length ||
    (notes.length !== 0 && notes.length !== symptomIDs.length)
  ) {
    return { ok: false, message: "Complete the required details for each symptom." };
  }

  return {
    ok: true,
    data: {
      symptoms: symptomIDs.map((symptomID, index) => ({
        symptomID,
        severity: severities[index],
        onsetDate: onsetDates[index],
        duration: durations[index],
        notes: notes.length ? notes[index] : null,
      })),
    },
  };
}
