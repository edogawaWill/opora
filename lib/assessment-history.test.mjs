import assert from "node:assert/strict";
import test from "node:test";

import { loadPatientAssessmentHistory } from "./assessment-history.mjs";

function historyHarness(assessments = []) {
  const state = { reads: [], writes: 0 };
  const prisma = {
    assessment: {
      findMany: async (args) => {
        state.reads.push(args);
        return assessments;
      },
      create: async () => { state.writes += 1; },
      update: async () => { state.writes += 1; },
      delete: async () => { state.writes += 1; },
    },
  };
  return { prisma, state };
}

const patient = async () => ({ patient: { patientID: 8 } });

test("retrieves only the authenticated patient's assessment history, newest first", async () => {
  const assessments = [
    { assessmentID: 18, assessmentDate: new Date("2026-10-26T10:00:00Z"), symptomsInput: "Nausea" },
    { assessmentID: 12, assessmentDate: new Date("2026-10-20T10:00:00Z"), symptomsInput: "Headache" },
  ];
  const { prisma, state } = historyHarness(assessments);
  const result = await loadPatientAssessmentHistory({ requirePatient: patient, prisma });

  assert.deepEqual(result, { status: "success", assessments });
  assert.deepEqual(state.reads[0], {
    where: { patientID: 8 },
    orderBy: [{ assessmentDate: "desc" }, { assessmentID: "desc" }],
    select: { assessmentID: true, assessmentDate: true, symptomsInput: true },
  });
  assert.equal(state.writes, 0);
});

test("returns an empty history for a patient with no saved assessments", async () => {
  const { prisma } = historyHarness();
  assert.deepEqual(await loadPatientAssessmentHistory({ requirePatient: patient, prisma }), {
    status: "success",
    assessments: [],
  });
});

test("denies an unauthenticated caller before querying assessment data", async () => {
  const { prisma, state } = historyHarness();
  const result = await loadPatientAssessmentHistory({
    requirePatient: async () => { throw new Error("forbidden"); },
    prisma,
  });
  assert.deepEqual(result, { status: "denied" });
  assert.equal(state.reads.length, 0);
});

test("denies a principal without a valid Patient ID before querying", async () => {
  const { prisma, state } = historyHarness();
  const result = await loadPatientAssessmentHistory({
    requirePatient: async () => ({ patient: null }),
    prisma,
  });
  assert.deepEqual(result, { status: "denied" });
  assert.equal(state.reads.length, 0);
});

test("returns a safe error if the history query fails", async () => {
  const result = await loadPatientAssessmentHistory({
    requirePatient: patient,
    prisma: { assessment: { findMany: async () => { throw new Error("private database detail"); } } },
  });
  assert.deepEqual(result, { status: "error" });
});
