import assert from "node:assert/strict";
import test from "node:test";

import {
  validateDiagnosisInput,
  recordPatientDiagnosis,
  loadPatientDiagnoses,
  deletePatientDiagnosis,
  loadConsentedPatientDiagnoses,
} from "./patient-diagnosis.mjs";

test("validateDiagnosisInput accepts valid diagnosis and trims input", () => {
  const result = validateDiagnosisInput({
    diagnosisName: "  Type 2 Diabetes  ",
    diagnosisDate: "2024-05-10",
    diagnosedBy: "  Dr. Lee  ",
    notes: "  Metformin 500mg daily  ",
  });

  assert.ok(result);
  assert.equal(result.diagnosisName, "Type 2 Diabetes");
  assert.equal(result.diagnosedBy, "Dr. Lee");
  assert.equal(result.notes, "Metformin 500mg daily");
  assert.ok(result.diagnosisDate instanceof Date);
});

test("validateDiagnosisInput rejects empty name or future date", () => {
  const fixedNow = () => new Date("2026-10-28T00:00:00Z");

  assert.equal(validateDiagnosisInput({ diagnosisName: "" }, fixedNow), null);
  assert.equal(validateDiagnosisInput({ diagnosisName: "   " }, fixedNow), null);
  assert.equal(
    validateDiagnosisInput(
      { diagnosisName: "Asthma", diagnosisDate: "2028-01-01" },
      fixedNow,
    ),
    null,
  );
});

test("recordPatientDiagnosis saves diagnosis with authenticated patientID", async () => {
  const state = { creates: [] };
  const prisma = {
    diagnosis: {
      create: async (args) => {
        state.creates.push(args);
        return { diagnosisID: 42 };
      },
    },
  };

  const requirePatient = async () => ({
    patient: { patientID: 7 },
  });

  const result = await recordPatientDiagnosis({
    requirePatient,
    prisma,
    input: {
      diagnosisName: "Hypertension",
      diagnosisDate: "2025-01-15",
      diagnosedBy: "General Hospital",
    },
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.diagnosisID, 42);
  }
  assert.equal(state.creates.length, 1);
  assert.equal(state.creates[0].data.patientID, 7);
  assert.equal(state.creates[0].data.diagnosisName, "Hypertension");
});

test("recordPatientDiagnosis rejects unauthenticated caller", async () => {
  const prisma = {};
  const requirePatient = async () => {
    throw new Error("unauthenticated");
  };

  const result = await recordPatientDiagnosis({
    requirePatient,
    prisma,
    input: { diagnosisName: "Asthma" },
  });

  assert.equal(result.status, "error");
});

test("loadPatientDiagnoses returns scoped and formatted records", async () => {
  const prisma = {
    diagnosis: {
      findMany: async ({ where }) => {
        assert.equal(where.patientID, 12);
        return [
          {
            diagnosisID: 1,
            patientID: 12,
            diagnosisName: "Migraine",
            diagnosisDate: new Date("2024-03-01T00:00:00Z"),
            diagnosedBy: "Dr. Tan",
            notes: "Mild",
            recordedAt: new Date("2026-10-01T00:00:00Z"),
          },
        ];
      },
    },
  };

  const requirePatient = async () => ({
    patient: { patientID: 12 },
  });

  const result = await loadPatientDiagnoses({ requirePatient, prisma });
  assert.equal(result.status, "success");
  assert.equal(result.diagnoses.length, 1);
  assert.equal(result.diagnoses[0].diagnosisName, "Migraine");
  assert.match(result.diagnoses[0].formattedDate, /2024/);
});

test("deletePatientDiagnosis removes record scoped to patient", async () => {
  const state = { deletes: [] };
  const prisma = {
    diagnosis: {
      deleteMany: async (args) => {
        state.deletes.push(args);
        return { count: 1 };
      },
    },
  };

  const requirePatient = async () => ({
    patient: { patientID: 5 },
  });

  const result = await deletePatientDiagnosis({
    requirePatient,
    prisma,
    diagnosisID: 20,
  });

  assert.equal(result.status, "success");
  assert.equal(state.deletes.length, 1);
  assert.equal(state.deletes[0].where.diagnosisID, 20);
  assert.equal(state.deletes[0].where.patientID, 5);
});

test("deletePatientDiagnosis returns error if record not owned or missing", async () => {
  const prisma = {
    diagnosis: {
      deleteMany: async () => ({ count: 0 }),
    },
  };

  const requirePatient = async () => ({
    patient: { patientID: 5 },
  });

  const result = await deletePatientDiagnosis({
    requirePatient,
    prisma,
    diagnosisID: 999,
  });

  assert.equal(result.status, "error");
});

test("loadConsentedPatientDiagnoses checks active consent before returning records", async () => {
  const state = { consentChecks: [] };
  const prisma = {
    patientHcpConsent: {
      findFirst: async (args) => {
        state.consentChecks.push(args);
        // Active consent exists
        return { consentID: 101 };
      },
    },
    diagnosis: {
      findMany: async () => [
        {
          diagnosisID: 3,
          patientID: 9,
          diagnosisName: "Eczema",
          diagnosisDate: null,
          diagnosedBy: null,
          notes: null,
          recordedAt: new Date("2026-10-10"),
        },
      ],
    },
  };

  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 4 },
  });

  const result = await loadConsentedPatientDiagnoses({
    requireApprovedHcp,
    prisma,
    patientID: 9,
  });

  assert.equal(result.status, "success");
  assert.equal(result.diagnoses.length, 1);
  assert.equal(state.consentChecks.length, 1);
  assert.equal(state.consentChecks[0].where.patientID, 9);
  assert.equal(state.consentChecks[0].where.hcpID, 4);
});

test("loadConsentedPatientDiagnoses returns unavailable if no active consent", async () => {
  const prisma = {
    patientHcpConsent: {
      findFirst: async () => null, // No active consent
    },
  };

  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 4 },
  });

  const result = await loadConsentedPatientDiagnoses({
    requireApprovedHcp,
    prisma,
    patientID: 9,
  });

  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.diagnoses, []);
});
