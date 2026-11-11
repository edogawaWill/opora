import assert from "node:assert/strict";
import test from "node:test";

import { assessmentInputFromFormData } from "./assessment-form-data.mjs";

function formWithTwoSymptoms() {
  const form = new FormData();
  for (const [symptomID, severity, onsetDate, duration, notes] of [
    ["4", "7", "2026-10-20", "2 days", "Intermittent"],
    ["9", "3", "2026-10-19", "1 day", ""],
  ]) {
    form.append("symptomID", symptomID);
    form.append("severity", severity);
    form.append("onsetDate", onsetDate);
    form.append("duration", duration);
    form.append("notes", notes);
  }
  return form;
}

test("parses repeated symptom controls as separate assessment entries", () => {
  assert.deepEqual(assessmentInputFromFormData(formWithTwoSymptoms()), {
    ok: true,
    data: {
      symptoms: [
        { symptomID: "4", severity: "7", onsetDate: "2026-10-20", duration: "2 days", notes: "Intermittent" },
        { symptomID: "9", severity: "3", onsetDate: "2026-10-19", duration: "1 day", notes: "" },
      ],
    },
  });
});

test("rejects missing or mismatched required form controls", () => {
  assert.equal(assessmentInputFromFormData(new FormData()).ok, false);
  const form = formWithTwoSymptoms();
  form.delete("duration");
  assert.equal(assessmentInputFromFormData(form).ok, false);
});

test("supports omitted optional notes and preserves non-text field values", () => {
  const form = new FormData();
  form.append("symptomID", "4");
  form.append("severity", "7");
  form.append("onsetDate", "2026-10-20");
  form.append("duration", "2 days");
  form.set("severity", new Blob(["bad"]), "severity.txt");

  const result = assessmentInputFromFormData(form);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.symptoms[0].notes, null);
    assert.equal(typeof result.data.symptoms[0].severity, "object");
  }
});
