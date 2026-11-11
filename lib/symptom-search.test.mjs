import assert from "node:assert/strict";
import test from "node:test";

import { filterSymptoms, formatSymptomChoice } from "./symptom-search.mjs";
import { validateSymptomRecordInput } from "./symptom-validation.mjs";

const symptoms = [
  { symptomID: 1, symptomName: "Headache", bodyPart: "Head" },
  { symptomID: 2, symptomName: "Cough", bodyPart: "Respiratory system" },
  { symptomID: 3, symptomName: "Productive cough", bodyPart: "Respiratory system" },
  { symptomID: 4, symptomName: "Head pain", bodyPart: "Head" },
];

test("searches symptom names and body areas without case sensitivity", () => {
  assert.deepEqual(filterSymptoms(symptoms, "head").map((item) => item.symptomID), [1, 4]);
  assert.deepEqual(filterSymptoms(symptoms, "RESPIRATORY").map((item) => item.symptomID), [2, 3]);
  assert.deepEqual(filterSymptoms(symptoms, "cough").map((item) => item.symptomID), [2, 3]);
  assert.deepEqual(filterSymptoms(symptoms, "  "), symptoms);
});

test("returns no matches for an unmatched search", () => {
  assert.deepEqual(filterSymptoms(symptoms, "dizziness"), []);
});

test("formats the selected option and submits its ID through server validation", () => {
  const selected = filterSymptoms(symptoms, "productive cough")[0];
  assert.equal(formatSymptomChoice(selected), "Productive cough · Respiratory system");

  const formData = new FormData();
  formData.set("symptomID", String(selected.symptomID));
  formData.set("severity", "5");
  formData.set("onsetDate", "2026-10-23");
  formData.set("duration", "1 day");
  formData.set("notes", "");
  const validation = validateSymptomRecordInput({
    symptomID: formData.get("symptomID"),
    severity: formData.get("severity"),
    onsetDate: formData.get("onsetDate"),
    duration: formData.get("duration"),
    notes: formData.get("notes"),
  });
  assert.equal(validation.ok, true);
  if (validation.ok) assert.equal(validation.data.symptomID, selected.symptomID);
});
