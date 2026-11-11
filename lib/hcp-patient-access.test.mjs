import test from "node:test";
import assert from "node:assert/strict";

import {
  HCP_PATIENT_PAGE_SIZE,
  loadConsentedPatientSymptoms,
  loadConsentedPatientAssessments,
  loadConsentedPatients,
  loadConsentedPatientTrend,
  loadLatestConsentedPatientSymptom,
} from "./hcp-patient-access.mjs";

const approvedPrincipal = {
  role: "HCP",
  accountStatus: "ACTIVE",
  emailVerified: true,
  healthcareProfessional: { hcpID: 41, verificationStatus: "Approved" },
};
const patient = {
  patientID: 7,
  dateOfBirth: new Date("1990-01-02T00:00:00Z"),
  user: { fullName: "Synthetic Patient" },
};
const record = {
  recordID: 9,
  severity: 4,
  onsetDate: new Date("2026-10-01T00:00:00Z"),
  duration: "2 days",
  notes: null,
  recordedAt: new Date("2026-10-02T00:00:00Z"),
  symptom: { symptomName: "Headache", bodyPart: "Head" },
};

function symptomPrisma({ patientResult = patient, active = true } = {}) {
  const calls = { patient: [], count: [], records: [], consent: [] };
  const writes = [];
  return {
    calls,
    writes,
    patient: {
      findFirst: async (query) => { calls.patient.push(query); return patientResult; },
    },
    symptomRecord: {
      count: async (query) => { calls.count.push(query); return 1; },
      findMany: async (query) => { calls.records.push(query); return [record]; },
      create: (...args) => writes.push(["create", ...args]),
      update: (...args) => writes.push(["update", ...args]),
      delete: (...args) => writes.push(["delete", ...args]),
    },
    patientHcpConsent: {
      findFirst: async (query) => {
        calls.consent.push(query);
        return active ? { consentID: 3 } : null;
      },
    },
  };
}

test("approved HCP lists only patients with an active consent for their principal HCP ID", async () => {
  const prisma = {
    patientHcpConsent: {
      findMany: async (query) => {
        assert.deepEqual(query.where, { hcpID: 41, status: "ACTIVE", patientID: { in: [7] } });
        return [{ patientID: 7 }];
      },
    },
    patient: {
      count: async ({ where }) => {
        assert.deepEqual(where, { hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } } });
        return 1;
      },
      findMany: async (query) => {
        assert.deepEqual(query.where, { hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } } });
        assert.equal(query.take, HCP_PATIENT_PAGE_SIZE);
        return [patient];
      },
    },
  };
  const result = await loadConsentedPatients({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    page: 1,
  });
  assert.equal(result.status, "success");
  assert.deepEqual(result.patients, [patient]);
});

test("symptom count and list queries are scoped to the requested Patient and current HCP consent", async () => {
  const prisma = symptomPrisma();
  const result = await loadConsentedPatientSymptoms({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    patientId: "7",
    page: "1",
  });
  assert.equal(result.status, "success");
  assert.deepEqual(prisma.calls.patient[0].where, {
    patientID: 7,
    hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } },
  });
  for (const query of [...prisma.calls.count, ...prisma.calls.records]) {
    assert.equal(query.where.patientID, 7);
    assert.deepEqual(query.where.patient.is.hcpConsents.some, { hcpID: 41, status: "ACTIVE" });
  }
  assert.equal(prisma.calls.records[0].take, HCP_PATIENT_PAGE_SIZE);
  assert.deepEqual(prisma.calls.consent[0].where, {
    patientID: 7,
    hcpID: 41,
    status: "ACTIVE",
  });
  assert.deepEqual(prisma.writes, []);
});

test("missing, revoked, or other-HCP consent returns the same unavailable result without symptom queries", async () => {
  for (const prisma of [
    symptomPrisma({ patientResult: null }), // no active consent for this HCP, including another HCP's grant
    symptomPrisma({ patientResult: null }), // revoked consent is absent from the active-consent filter
  ]) {
    const result = await loadConsentedPatientSymptoms({
      requireApprovedHcp: async () => approvedPrincipal,
      prisma,
      patientId: 7,
    });
    assert.deepEqual(result, { status: "unavailable" });
    assert.deepEqual(prisma.calls.patient[0].where, {
      patientID: 7,
      hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } },
    });
    assert.equal(prisma.calls.count.length, 0);
    assert.equal(prisma.calls.records.length, 0);
    assert.equal(prisma.calls.consent.length, 0);
  }
});

test("crafted invalid Patient IDs do not reach the database", async () => {
  const prisma = symptomPrisma();
  const result = await loadConsentedPatientSymptoms({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    patientId: "7?includeAll=true",
  });
  assert.deepEqual(result, { status: "unavailable" });
  assert.equal(prisma.calls.patient.length, 0);
  assert.equal(prisma.calls.count.length, 0);
});

test("pending, rejected, inactive, and unverified HCP principals are denied before any query", async () => {
  const ineligible = [
    { ...approvedPrincipal, healthcareProfessional: { hcpID: 41, verificationStatus: "Pending" } },
    { ...approvedPrincipal, healthcareProfessional: { hcpID: 41, verificationStatus: "Rejected" } },
    { ...approvedPrincipal, accountStatus: "DISABLED" },
    { ...approvedPrincipal, emailVerified: false },
  ];
  for (const principal of ineligible) {
    const prisma = symptomPrisma();
    const result = await loadConsentedPatientSymptoms({
      requireApprovedHcp: async () => principal,
      prisma,
      patientId: 7,
    });
    assert.deepEqual(result, { status: "denied" });
    assert.equal(prisma.calls.patient.length, 0);
  }
});

test("revocation observed after symptom reads discards the results", async () => {
  const prisma = symptomPrisma({ active: false });
  const result = await loadConsentedPatientSymptoms({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    patientId: 7,
  });
  assert.deepEqual(result, { status: "unavailable" });
  assert.equal(prisma.calls.records.length, 1);
  assert.deepEqual(prisma.writes, []);
});

test("assessment summaries require and recheck active consent", async () => {
  const calls = [];
  let active = true;
  const prisma = {
    assessment: { findMany: async (query) => { calls.push(query); return [{ assessmentID: 4 }]; } },
    patientHcpConsent: { findFirst: async () => active ? { consentID: 3 } : null },
  };
  const result = await loadConsentedPatientAssessments({ requireApprovedHcp: async () => approvedPrincipal, prisma, patientId: "7" });
  assert.equal(result.status, "success");
  assert.deepEqual(calls[0].where, { patientID: 7, patient: { is: { hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } } } } });
  assert.deepEqual(calls[0].select, { assessmentID: true, assessmentDate: true, symptomsInput: true, resultSummary: true });
  active = false;
  const revoked = await loadConsentedPatientAssessments({ requireApprovedHcp: async () => approvedPrincipal, prisma, patientId: "7" });
  assert.deepEqual(revoked, { status: "unavailable" });
});

test("loadConsentedPatientTrend queries records scoped to patient and active consent", async () => {
  const prisma = symptomPrisma();
  const result = await loadConsentedPatientTrend({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    patientId: "7",
  });
  assert.equal(result.status, "success");
  assert.equal(prisma.calls.records.length, 1);
  assert.equal(prisma.calls.records[0].where.patientID, 7);
  assert.deepEqual(prisma.calls.records[0].where.patient.is.hcpConsents.some, {
    hcpID: 41,
    status: "ACTIVE",
  });
});

test("loadConsentedPatientTrend returns unavailable when consent revoked or missing", async () => {
  const prisma = symptomPrisma({ active: false });
  const result = await loadConsentedPatientTrend({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma,
    patientId: 7,
  });
  assert.deepEqual(result, { status: "unavailable" });
});

test("latest dashboard symptom is ordered and scoped to the approved HCP's active consents", async () => {
  const record = {
    recordID: 15,
    patientID: 7,
    severity: 4,
    recordedAt: new Date("2026-11-04T03:00:00Z"),
    symptom: { symptomName: "Headache" },
    patient: { patientID: 7, user: { fullName: "Synthetic Patient" } },
  };
  const calls = { symptom: [], consent: [] };
  const result = await loadLatestConsentedPatientSymptom({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma: {
      symptomRecord: {
        findFirst: async (query) => { calls.symptom.push(query); return record; },
      },
      patientHcpConsent: {
        findFirst: async (query) => { calls.consent.push(query); return { consentID: 2 }; },
      },
    },
  });

  assert.equal(result.status, "success");
  assert.equal(result.record, record);
  assert.deepEqual(calls.symptom[0].where, {
    patient: { is: { hcpConsents: { some: { hcpID: 41, status: "ACTIVE" } } } },
  });
  assert.deepEqual(calls.symptom[0].orderBy, [{ recordedAt: "desc" }, { recordID: "desc" }]);
  assert.deepEqual(calls.consent[0].where, { hcpID: 41, patientID: 7, status: "ACTIVE" });
});

test("dashboard symptom stream hides a result if consent is revoked during the query", async () => {
  const result = await loadLatestConsentedPatientSymptom({
    requireApprovedHcp: async () => approvedPrincipal,
    prisma: {
      symptomRecord: { findFirst: async () => ({ patientID: 7 }) },
      patientHcpConsent: { findFirst: async () => null },
    },
  });
  assert.deepEqual(result, { status: "success", record: null });
});

test("dashboard symptom stream rejects unauthorized HCPs before querying", async () => {
  let queried = false;
  const result = await loadLatestConsentedPatientSymptom({
    requireApprovedHcp: async () => ({ ...approvedPrincipal, healthcareProfessional: null }),
    prisma: { symptomRecord: { findFirst: async () => { queried = true; } } },
  });
  assert.deepEqual(result, { status: "denied" });
  assert.equal(queried, false);
});
