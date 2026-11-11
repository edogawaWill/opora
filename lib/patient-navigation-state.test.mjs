import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivePatientDestination,
  getPatientDashboardSectionTarget,
} from "./patient-navigation-state.mjs";

test("dashboard symptom anchors select Symptom Logs on direct loads", () => {
  assert.equal(getActivePatientDestination("/patient", "#symptom-history"), "symptoms");
  assert.equal(getActivePatientDestination("/patient", "#record-symptom"), "symptoms");
  assert.equal(getActivePatientDestination("/patient", "#symptom-trends"), "symptoms");
});

test("route destinations take precedence over unrelated dashboard hash or scroll state", () => {
  assert.equal(getActivePatientDestination("/patient/assessment/123", "#symptom-history", "symptoms"), "assessment");
  assert.equal(getActivePatientDestination("/patient/messages/45", "", "overview"), "messages");
  assert.equal(getActivePatientDestination("/patient/history/records", ""), "history");
});

test("the visible dashboard section can update the active item while the URL hash stays unchanged", () => {
  assert.equal(getActivePatientDestination("/patient", "#symptom-history", "overview"), "overview");
  assert.equal(getActivePatientDestination("/patient", "", "symptoms"), "symptoms");
});

test("unrelated patient routes do not select a primary destination", () => {
  assert.equal(getActivePatientDestination("/patient/profile"), null);
  assert.equal(getActivePatientDestination("/patient/history-archive"), null);
});

test("dashboard section IDs map only existing overview and symptom destinations", () => {
  assert.equal(getPatientDashboardSectionTarget({ id: "patient-overview" }), "overview");
  assert.equal(getPatientDashboardSectionTarget({ id: "symptom-history" }), "symptoms");
  assert.equal(getPatientDashboardSectionTarget({ id: "record-symptom" }), "symptoms");
  assert.equal(getPatientDashboardSectionTarget({ id: "unmapped-section" }), null);
});
