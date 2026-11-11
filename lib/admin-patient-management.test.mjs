import assert from "node:assert/strict";
import test from "node:test";

import {
  searchPatientRecords,
  getPatientDetail,
  updatePatientRecord,
  setPatientAccountStatus,
  deletePatientRecord,
} from "./admin-patient-management.mjs";

function makeRequireAdmin(adminID = 1) {
  return async () => {
    if (adminID === null) throw new Error("unauthorized");
    return { admin: { adminID } };
  };
}

function makePrismaHarness({
  patientCount = 0,
  patients = [],
  patientDetail = null,
} = {}) {
  const state = {
    counts: [],
    findManys: [],
    findUniques: [],
    updates: [],
    deletes: [],
    auditLogs: [],
  };

  const prisma = {
    patient: {
      count: async (args) => {
        state.counts.push({ model: "patient", args });
        return patientCount;
      },
      findMany: async (args) => {
        state.findManys.push({ model: "patient", args });
        return patients;
      },
      findUnique: async (args) => {
        state.findUniques.push({ model: "patient", args });
        return patientDetail;
      },
      update: async (args) => {
        state.updates.push({ model: "patient", args });
        return { ...patientDetail, ...args.data };
      },
      delete: async (args) => {
        state.deletes.push({ model: "patient", args });
        return patientDetail;
      },
    },
    user: {
      update: async (args) => {
        state.updates.push({ model: "user", args });
        return { id: args.where.id, ...args.data };
      },
      delete: async (args) => {
        state.deletes.push({ model: "user", args });
        return { id: args.where.id };
      },
    },
    auditLog: {
      create: async (args) => {
        state.auditLogs.push(args);
        return { auditLogID: 100, ...args.data };
      },
    },
    $transaction: async (fn) => {
      return fn(prisma);
    },
  };

  return { prisma, state };
}

// ---------------------------------------------------------------------------
// searchPatientRecords
// ---------------------------------------------------------------------------

test("searchPatientRecords denies access if requireAdmin rejects", async () => {
  const { prisma } = makePrismaHarness();
  const result = await searchPatientRecords({
    requireAdmin: makeRequireAdmin(null),
    prisma,
  });

  assert.equal(result.status, "error");
});

test("searchPatientRecords paginates and applies search filter", async () => {
  const mockPatient = {
    patientID: 5,
    userID: 12,
    icNumber: "010203040506",
    user: { fullName: "Ahmad Patient", email: "ahmad@example.com" },
  };

  const { prisma, state } = makePrismaHarness({
    patientCount: 15,
    patients: [mockPatient],
  });

  const result = await searchPatientRecords({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    search: "Ahmad",
    page: 2,
    pageSize: 10,
  });

  assert.equal(result.status, "success");
  assert.equal(result.total, 15);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
  assert.equal(result.patients.length, 1);

  assert.equal(state.counts.length, 1);
  assert.equal(state.findManys.length, 1);
  assert.equal(state.findManys[0].args.skip, 10);
  assert.equal(state.findManys[0].args.take, 10);
});

// ---------------------------------------------------------------------------
// getPatientDetail
// ---------------------------------------------------------------------------

test("getPatientDetail returns patient when found", async () => {
  const mockDetail = {
    patientID: 3,
    userID: 7,
    icNumber: "990101-14-5555",
    user: { fullName: "Siti Nur", email: "siti@example.com" },
    _count: { symptomRecords: 2, assessments: 1, appointments: 0, diagnoses: 0, hcpConsents: 1 },
  };

  const { prisma } = makePrismaHarness({ patientDetail: mockDetail });
  const result = await getPatientDetail({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: 3,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.patient.patientID, 3);
    assert.equal(result.patient.icNumber, "990101-14-5555");
  }
});

test("getPatientDetail rejects invalid id or missing patient", async () => {
  const { prisma } = makePrismaHarness({ patientDetail: null });
  const res1 = await getPatientDetail({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: -1,
  });
  assert.equal(res1.status, "error");

  const res2 = await getPatientDetail({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: 999,
  });
  assert.equal(res2.status, "error");
});

// ---------------------------------------------------------------------------
// updatePatientRecord
// ---------------------------------------------------------------------------

test("updatePatientRecord updates patient and logs audit entry", async () => {
  const existing = {
    patientID: 4,
    userID: 10,
    address: "123 Old Street",
    emergencyContact: "0123456789",
    allergies: "None",
    bloodType: "O+",
    user: { fullName: "Jane Doe", phoneNo: "0191234567" },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existing });
  const result = await updatePatientRecord({
    requireAdmin: makeRequireAdmin(2),
    prisma,
    patientID: 4,
    input: {
      fullName: "Jane Updated",
      phoneNo: "0199998888",
      address: "456 New Road",
      emergencyContact: "0111222333",
      allergies: "Penicillin",
      bloodType: "A+",
    },
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 2); // user update + patient update
  assert.equal(state.auditLogs.length, 1);

  const audit = state.auditLogs[0].data;
  assert.equal(audit.action, "PATIENT_UPDATED");
  assert.equal(audit.adminID, 2);
  assert.equal(audit.entityID, 4);
  assert.deepEqual(audit.changedFields.fullName, { from: "Jane Doe", to: "Jane Updated" });
});

test("updatePatientRecord rejects invalid blood type", async () => {
  const existing = {
    patientID: 4,
    userID: 10,
    user: { fullName: "Jane Doe", phoneNo: "0191234567" },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existing });
  const result = await updatePatientRecord({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: 4,
    input: {
      fullName: "Jane Doe",
      phoneNo: "0191234567",
      address: "123 Street",
      bloodType: "INVALID_BLOOD",
    },
  });

  assert.equal(result.status, "error");
  assert.equal(state.updates.length, 0);
  assert.equal(state.auditLogs.length, 0);
});

// ---------------------------------------------------------------------------
// setPatientAccountStatus
// ---------------------------------------------------------------------------

test("setPatientAccountStatus sets DISABLED and logs PATIENT_DEACTIVATED", async () => {
  const existing = {
    patientID: 8,
    userID: 20,
    user: { fullName: "Target Patient", accountStatus: "ACTIVE" },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existing });
  const result = await setPatientAccountStatus({
    requireAdmin: makeRequireAdmin(5),
    prisma,
    patientID: 8,
    targetStatus: "DISABLED",
  });

  assert.equal(result.status, "success");
  assert.match(result.message, /deactivated/i);
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].args.data.accountStatus, "DISABLED");
  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].data.action, "PATIENT_DEACTIVATED");
  assert.equal(state.auditLogs[0].data.adminID, 5);
});

test("setPatientAccountStatus allows reactivation to ACTIVE", async () => {
  const existing = {
    patientID: 8,
    userID: 20,
    user: { fullName: "Target Patient", accountStatus: "DISABLED" },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existing });
  const result = await setPatientAccountStatus({
    requireAdmin: makeRequireAdmin(5),
    prisma,
    patientID: 8,
    targetStatus: "ACTIVE",
  });

  assert.equal(result.status, "success");
  assert.equal(state.auditLogs[0].data.action, "PATIENT_STATUS_CHANGED");
});

test("setPatientAccountStatus returns success without redundant writes if already same status", async () => {
  const existing = {
    patientID: 8,
    userID: 20,
    user: { fullName: "Target Patient", accountStatus: "ACTIVE" },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existing });
  const result = await setPatientAccountStatus({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: 8,
    targetStatus: "ACTIVE",
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 0);
});

// ---------------------------------------------------------------------------
// deletePatientRecord
// ---------------------------------------------------------------------------

test("deletePatientRecord rejects deletion when patient has clinical records", async () => {
  const existingWithHistory = {
    patientID: 2,
    userID: 6,
    icNumber: "000101-10-1111",
    user: { id: 6, fullName: "Active History Patient" },
    _count: {
      symptomRecords: 5,
      assessments: 1,
      appointments: 0,
      diagnoses: 0,
      hcpConsents: 0,
    },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: existingWithHistory });
  const result = await deletePatientRecord({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    patientID: 2,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /cannot permanently delete/i);
  assert.match(result.message, /deactivate/i);
  assert.equal(state.deletes.length, 0);
  assert.equal(state.auditLogs.length, 0);
});

test("deletePatientRecord deletes cleanly and logs audit when 0 dependencies exist", async () => {
  const cleanPatient = {
    patientID: 99,
    userID: 120,
    icNumber: "950505-14-9999",
    user: { id: 120, fullName: "Fresh Test Patient" },
    _count: {
      symptomRecords: 0,
      assessments: 0,
      appointments: 0,
      diagnoses: 0,
      hcpConsents: 0,
    },
  };

  const { prisma, state } = makePrismaHarness({ patientDetail: cleanPatient });
  const result = await deletePatientRecord({
    requireAdmin: makeRequireAdmin(3),
    prisma,
    patientID: 99,
  });

  assert.equal(result.status, "success");
  assert.match(result.message, /permanently deleted/i);
  assert.equal(state.deletes.length, 2); // patient + user
  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].data.action, "PATIENT_DELETED");
  assert.equal(state.auditLogs[0].data.adminID, 3);
  assert.equal(state.auditLogs[0].data.entityID, 99);
});
