/** @typedef {{ symptomID: number, symptomName: string, bodyPart: string }} SymptomChoice */

/**
 * @param {SymptomChoice[]} symptoms
 * @param {string} query
 * @returns {SymptomChoice[]}
 */
export function filterSymptoms(symptoms, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  if (!normalizedQuery) return symptoms;

  return symptoms.filter((symptom) =>
    `${symptom.symptomName} ${symptom.bodyPart}`
      .toLocaleLowerCase("en")
      .includes(normalizedQuery),
  );
}

/** @param {SymptomChoice} symptom */
export function formatSymptomChoice(symptom) {
  return `${symptom.symptomName} · ${symptom.bodyPart}`;
}
