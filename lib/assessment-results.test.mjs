import assert from "node:assert/strict";
import test from "node:test";

import { loadPatientAssessmentResults } from "./assessment-results.mjs";

function resultsHarness({ assessment = null, diseases = [] } = {}) {
  const state = { assessmentReads: [], diseaseReads: [], writes: 0 };
  const prisma = {
    assessment: {
      findFirst: async (args) => {
        state.assessmentReads.push(args);
        return assessment;
      },
      create: async () => { state.writes += 1; },
    },
    disease: {
      findMany: async (args) => {
        state.diseaseReads.push(args);
        return diseases;
      },
    },
  };
  return { prisma, state };
}

const patient = async () => ({ patient: { patientID: 8 } });

test("requires Patient authorization before accessing assessment or disease data", async () => {
  const { prisma, state } = resultsHarness();
  const result = await loadPatientAssessmentResults({
    requirePatient: async () => { throw new Error("forbidden"); },
    prisma,
    assessmentID: "15",
  });
  assert.deepEqual(result, { status: "denied" });
  assert.equal(state.assessmentReads.length, 0);
  assert.equal(state.diseaseReads.length, 0);
});

test("scopes saved assessment lookup to the authenticated Patient", async () => {
  const assessment = { assessmentID: 15, patientID: 8, assessmentDate: new Date("2026-10-26T00:00:00Z"), symptomsInput: "Headache", answers: [{ symptomID: 4 }] };
  const { prisma, state } = resultsHarness({ assessment });
  const result = await loadPatientAssessmentResults({ requirePatient: patient, prisma, assessmentID: "15" });
  assert.equal(result.status, "success");
  assert.deepEqual(state.assessmentReads[0].where, { assessmentID: 15, patientID: 8 });
  assert.equal(state.diseaseReads.length, 1);
  assert.equal(state.writes, 0);
});

test("reloading results only reads saved data and never creates another assessment", async () => {
  const assessment = { assessmentID: 15, patientID: 8, assessmentDate: new Date("2026-10-26T00:00:00Z"), symptomsInput: "Headache", answers: [{ symptomID: 4 }] };
  const { prisma, state } = resultsHarness({ assessment });
  await loadPatientAssessmentResults({ requirePatient: patient, prisma, assessmentID: "15" });
  await loadPatientAssessmentResults({ requirePatient: patient, prisma, assessmentID: "15" });
  assert.equal(state.assessmentReads.length, 2);
  assert.equal(state.diseaseReads.length, 2);
  assert.equal(state.writes, 0);
});

test("does not query conditions if the assessment is not owned by the patient", async () => {
  const { prisma, state } = resultsHarness();
  const result = await loadPatientAssessmentResults({ requirePatient: patient, prisma, assessmentID: "15" });
  assert.deepEqual(result, { status: "unavailable" });
  assert.equal(state.diseaseReads.length, 0);
});
