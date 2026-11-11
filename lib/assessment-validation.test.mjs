import assert from "node:assert/strict";
import test from "node:test";

import { validateAssessmentInput } from "./assessment-validation.mjs";

const validSymptom = {
  symptomID: "4",
  severity: "7",
  onsetDate: "2026-10-20",
  duration: "2 days",
  notes: "  Intermittent  ",
};

test("accepts supported symptom details and normalizes them", () => {
  assert.deepEqual(validateAssessmentInput({ symptoms: [validSymptom] }), {
    ok: true,
    data: {
      symptoms: [{
        symptomID: 4,
        severity: 7,
        onsetDate: "2026-10-20",
        duration: "2 days",
        notes: "Intermittent",
      }],
    },
  });
});

test("rejects empty, malformed, and non-object submissions", () => {
  for (const input of [null, "symptom", {}, { symptoms: [] }, { symptoms: "4" }, { symptoms: [null] }]) {
    assert.equal(validateAssessmentInput(input).ok, false);
  }
});

test("rejects unsupported fields, including browser-supplied ownership", () => {
  assert.equal(validateAssessmentInput({ patientID: 99, symptoms: [validSymptom] }).ok, false);
  assert.equal(validateAssessmentInput({ symptoms: [{ ...validSymptom, patientID: 99 }] }).ok, false);
});

test("rejects invalid symptom values and excessive input", () => {
  assert.equal(validateAssessmentInput({ symptoms: [{ ...validSymptom, onsetDate: "2026-02-30" }] }).ok, false);
  assert.equal(validateAssessmentInput({ symptoms: [{ ...validSymptom, severity: "11" }] }).ok, false);
  assert.equal(validateAssessmentInput({ symptoms: [{ ...validSymptom, notes: 42 }] }).ok, false);
  assert.equal(validateAssessmentInput({ symptoms: Array.from({ length: 21 }, () => validSymptom) }).ok, false);
});
