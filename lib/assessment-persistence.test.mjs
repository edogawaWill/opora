import assert from "node:assert/strict";
import test from "node:test";

import { createPatientAssessment } from "./assessment-persistence.mjs";

const validInput = {
  symptoms: [{
    symptomID: "4",
    severity: "7",
    onsetDate: "2026-10-20",
    duration: "2 days",
    notes: "Intermittent",
  }],
};

function assessmentHarness({ createFailure = false, catalog = [{ symptomID: 4, symptomName: "Headache", bodyPart: "Head" }] } = {}) {
  const state = { reads: [], writes: [], symptomRecordWrites: 0, diagnosisWrites: 0 };
  const prisma = {
    symptom: {
      findMany: async (args) => {
        state.reads.push(args);
        return catalog;
      },
    },
    assessment: {
      create: async (args) => {
        if (createFailure) throw new Error("database details must not escape");
        state.writes.push(args);
        return { assessmentID: 23 };
      },
    },
    symptomRecord: { create: async () => { state.symptomRecordWrites += 1; } },
    diagnosis: { create: async () => { state.diagnosisWrites += 1; } },
  };
  return { prisma, state };
}

const requirePatient = async () => ({ patient: { patientID: 8 } });

test("saves assessment under the authenticated Patient and creates no other records", async () => {
  const { prisma, state } = assessmentHarness();
  const result = await createPatientAssessment({ requirePatient, prisma, input: validInput });

  assert.deepEqual(result, { status: "success", assessmentID: 23 });
  assert.deepEqual(state.writes[0], {
    data: {
      patientID: 8,
      symptomsInput: "Headache",
      answers: [{
        symptomID: 4,
        symptomName: "Headache",
        bodyPart: "Head",
        severity: 7,
        onsetDate: "2026-10-20",
        duration: "2 days",
        notes: "Intermittent",
      }],
      resultSummary: "Assessment details saved. Results are informational and are not a confirmed diagnosis.",
    },
    select: { assessmentID: true },
  });
  assert.equal(state.symptomRecordWrites, 0);
  assert.equal(state.diagnosisWrites, 0);
});

test("rejects an unavailable patient session before database access", async () => {
  const { prisma, state } = assessmentHarness();
  const result = await createPatientAssessment({
    requirePatient: async () => { throw new Error("forbidden"); },
    prisma,
    input: validInput,
  });
  assert.equal(result.status, "error");
  assert.equal(state.reads.length, 0);
  assert.equal(state.writes.length, 0);
});

test("rejects invalid input before database access", async () => {
  const { prisma, state } = assessmentHarness();
  const result = await createPatientAssessment({ requirePatient, prisma, input: { symptoms: [] } });
  assert.equal(result.status, "error");
  assert.equal(state.reads.length, 0);
  assert.equal(state.writes.length, 0);
});

test("rejects symptom IDs absent from the catalog without saving", async () => {
  const { prisma, state } = assessmentHarness({ catalog: [] });
  const result = await createPatientAssessment({ requirePatient, prisma, input: validInput });
  assert.deepEqual(result, {
    status: "error",
    message: "Choose symptoms from the available list and try again.",
  });
  assert.equal(state.writes.length, 0);
});

test("returns a safe error when persistence fails", async () => {
  const { prisma, state } = assessmentHarness({ createFailure: true });
  const result = await createPatientAssessment({ requirePatient, prisma, input: validInput });
  assert.deepEqual(result, {
    status: "error",
    message: "We could not save this assessment. Please check your details and try again.",
  });
  assert.equal(state.symptomRecordWrites, 0);
  assert.equal(state.diagnosisWrites, 0);
});
