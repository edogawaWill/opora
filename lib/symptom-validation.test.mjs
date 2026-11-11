import assert from "node:assert/strict";
import test from "node:test";

import { validateSymptomRecordInput } from "./symptom-validation.mjs";

const validInput = {
  symptomID: "4",
  severity: "7",
  onsetDate: "2026-10-20",
  duration: "2 days",
  notes: "  Intermittent  ",
};

test("accepts valid symptom data and normalizes optional notes", () => {
  assert.deepEqual(validateSymptomRecordInput(validInput), {
    ok: true,
    data: {
      symptomID: 4,
      severity: 7,
      onsetDate: "2026-10-20",
      duration: "2 days",
      notes: "Intermittent",
    },
  });
});

test("enforces the database severity range", () => {
  for (const severity of ["0", "11", "1.5", "one"]) {
    assert.equal(validateSymptomRecordInput({ ...validInput, severity }).ok, false);
  }
  for (const severity of ["1", "10"]) {
    assert.equal(validateSymptomRecordInput({ ...validInput, severity }).ok, true);
  }
});

test("rejects invalid catalog IDs and calendar dates", () => {
  assert.equal(validateSymptomRecordInput({ ...validInput, symptomID: "-1" }).ok, false);
  assert.equal(validateSymptomRecordInput({ ...validInput, onsetDate: "2026-02-30" }).ok, false);
});

test("enforces schema-compatible duration and a bounded notes field", () => {
  assert.equal(validateSymptomRecordInput({ ...validInput, duration: " " }).ok, false);
  assert.equal(validateSymptomRecordInput({ ...validInput, duration: "x".repeat(31) }).ok, false);
  assert.equal(validateSymptomRecordInput({ ...validInput, notes: "x".repeat(2001) }).ok, false);
});
