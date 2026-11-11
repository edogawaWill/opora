import assert from "node:assert/strict";
import test from "node:test";

import {
  searchHcpRecords,
  getHcpDetail,
  updateHcpRecord,
  setHcpAccountStatus,
  setHcpVerificationStatus,
  deleteHcpRecord,
} from "./admin-hcp-management.mjs";

function makeRequireAdmin(adminID = 1) {
  return async () => {
    if (adminID === null) throw new Error("unauthorized");
    return { admin: { adminID } };
  };
}

function makePrismaHarness({
  hcpCount = 0,
  hcps = [],
  hcpDetail = null,
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
    healthcareProfessional: {
      count: async (args) => {
        state.counts.push({ model: "healthcareProfessional", args });
        return hcpCount;
      },
      findMany: async (args) => {
        state.findManys.push({ model: "healthcareProfessional", args });
        return hcps;
      },
      findUnique: async (args) => {
        state.findUniques.push({ model: "healthcareProfessional", args });
        return hcpDetail;
      },
      update: async (args) => {
        state.updates.push({ model: "healthcareProfessional", args });
        return { ...hcpDetail, ...args.data };
      },
      delete: async (args) => {
        state.deletes.push({ model: "healthcareProfessional", args });
        return hcpDetail;
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
        return { auditLogID: 101, ...args.data };
      },
    },
    $transaction: async (fn) => {
      return fn(prisma);
    },
  };

  return { prisma, state };
}

// ---------------------------------------------------------------------------
// searchHcpRecords
// ---------------------------------------------------------------------------

test("searchHcpRecords denies access if requireAdmin rejects", async () => {
  const { prisma } = makePrismaHarness();
  const result = await searchHcpRecords({
    requireAdmin: makeRequireAdmin(null),
    prisma,
  });

  assert.equal(result.status, "error");
});

test("searchHcpRecords filters by verificationStatus and search term", async () => {
  const mockHcp = {
    hcpID: 2,
    userID: 5,
    licenseNo: "MMC-12345",
    specialization: "General Practice",
    workplace: "Klinik Kesihatan",
    yearsOfExperience: 8,
    verificationStatus: "Approved",
    user: { fullName: "Dr Lim", email: "lim@example.com" },
  };

  const { prisma, state } = makePrismaHarness({
    hcpCount: 1,
    hcps: [mockHcp],
  });

  const result = await searchHcpRecords({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    search: "Lim",
    verificationStatus: "Approved",
    page: 1,
  });

  assert.equal(result.status, "success");
  assert.equal(result.total, 1);
  assert.equal(result.hcps.length, 1);
  assert.equal(state.counts[0].args.where.verificationStatus, "Approved");
});

// ---------------------------------------------------------------------------
// getHcpDetail
// ---------------------------------------------------------------------------

test("getHcpDetail returns HCP with counts", async () => {
  const mockDetail = {
    hcpID: 10,
    userID: 20,
    licenseNo: "MMC-99887",
    specialization: "Pediatrics",
    user: { fullName: "Dr Aisha", email: "aisha@example.com" },
    _count: { appointments: 5, patientConsents: 3 },
  };

  const { prisma } = makePrismaHarness({ hcpDetail: mockDetail });
  const result = await getHcpDetail({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    hcpID: 10,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.hcp.licenseNo, "MMC-99887");
    assert.equal(result.hcp.user.fullName, "Dr Aisha");
  }
});

// ---------------------------------------------------------------------------
// updateHcpRecord
// ---------------------------------------------------------------------------

test("updateHcpRecord updates HCP fields and creates audit log", async () => {
  const existing = {
    hcpID: 7,
    userID: 15,
    specialization: "General Practice",
    workplace: "Old Clinic",
    yearsOfExperience: 5,
    user: { fullName: "Dr Tan", phoneNo: "0123456789" },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: existing });
  const result = await updateHcpRecord({
    requireAdmin: makeRequireAdmin(4),
    prisma,
    hcpID: 7,
    input: {
      fullName: "Dr Tan Wei",
      phoneNo: "0198765432",
      specialization: "Cardiology",
      workplace: "Heart Specialist Centre",
      yearsOfExperience: "7",
    },
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 2); // user + hcp
  assert.equal(state.auditLogs.length, 1);

  const audit = state.auditLogs[0].data;
  assert.equal(audit.action, "HCP_UPDATED");
  assert.equal(audit.entityID, 7);
  assert.equal(audit.adminID, 4);
  assert.deepEqual(audit.changedFields.workplace, { from: "Old Clinic", to: "Heart Specialist Centre" });
});

test("updateHcpRecord rejects negative or non-integer years of experience", async () => {
  const existing = {
    hcpID: 7,
    userID: 15,
    user: { fullName: "Dr Tan", phoneNo: "0123456789" },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: existing });
  const result = await updateHcpRecord({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    hcpID: 7,
    input: {
      fullName: "Dr Tan",
      phoneNo: "0123456789",
      specialization: "Dermatology",
      workplace: "Clinic",
      yearsOfExperience: -5,
    },
  });

  assert.equal(result.status, "error");
  assert.equal(state.updates.length, 0);
});

// ---------------------------------------------------------------------------
// setHcpAccountStatus
// ---------------------------------------------------------------------------

test("setHcpAccountStatus deactivates account and creates audit log", async () => {
  const existing = {
    hcpID: 12,
    userID: 30,
    user: { fullName: "Dr Lee", accountStatus: "ACTIVE" },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: existing });
  const result = await setHcpAccountStatus({
    requireAdmin: makeRequireAdmin(9),
    prisma,
    hcpID: 12,
    targetStatus: "DISABLED",
  });

  assert.equal(result.status, "success");
  assert.match(result.message, /deactivated/i);
  assert.equal(state.updates.length, 1);
  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].data.action, "HCP_DEACTIVATED");
  assert.equal(state.auditLogs[0].data.adminID, 9);
});

// ---------------------------------------------------------------------------
// setHcpVerificationStatus
// ---------------------------------------------------------------------------

test("setHcpVerificationStatus sets Approved with admin and timestamp", async () => {
  const existing = {
    hcpID: 15,
    verificationStatus: "Pending",
    user: { fullName: "Dr Newbie" },
  };
  const fixedDate = new Date("2026-10-28T12:00:00Z");

  const { prisma, state } = makePrismaHarness({ hcpDetail: existing });
  const result = await setHcpVerificationStatus({
    requireAdmin: makeRequireAdmin(6),
    prisma,
    hcpID: 15,
    targetStatus: "Approved",
    now: () => fixedDate,
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].args.data.verificationStatus, "Approved");
  assert.equal(state.updates[0].args.data.verifiedBy, 6);
  assert.equal(state.updates[0].args.data.verifiedAt, fixedDate);

  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].data.action, "HCP_APPROVED");
});

test("setHcpVerificationStatus clears verifiedBy and verifiedAt when set to Rejected", async () => {
  const existing = {
    hcpID: 15,
    verificationStatus: "Approved",
    user: { fullName: "Dr Review" },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: existing });
  const result = await setHcpVerificationStatus({
    requireAdmin: makeRequireAdmin(6),
    prisma,
    hcpID: 15,
    targetStatus: "Rejected",
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates[0].args.data.verificationStatus, "Rejected");
  assert.equal(state.updates[0].args.data.verifiedBy, null);
  assert.equal(state.updates[0].args.data.verifiedAt, null);
  assert.equal(state.auditLogs[0].data.action, "HCP_REJECTED");
});

// ---------------------------------------------------------------------------
// deleteHcpRecord
// ---------------------------------------------------------------------------

test("deleteHcpRecord rejects deletion if HCP has appointments", async () => {
  const existingWithAppts = {
    hcpID: 3,
    userID: 8,
    licenseNo: "MMC-1111",
    user: { id: 8, fullName: "Dr Active" },
    _count: { appointments: 2, patientConsents: 0 },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: existingWithAppts });
  const result = await deleteHcpRecord({
    requireAdmin: makeRequireAdmin(1),
    prisma,
    hcpID: 3,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /cannot permanently delete/i);
  assert.equal(state.deletes.length, 0);
  assert.equal(state.auditLogs.length, 0);
});

test("deleteHcpRecord deletes cleanly and logs audit when 0 dependencies exist", async () => {
  const cleanHcp = {
    hcpID: 50,
    userID: 90,
    licenseNo: "MMC-9999",
    user: { id: 90, fullName: "Dr Clean" },
    _count: { appointments: 0, patientConsents: 0 },
  };

  const { prisma, state } = makePrismaHarness({ hcpDetail: cleanHcp });
  const result = await deleteHcpRecord({
    requireAdmin: makeRequireAdmin(3),
    prisma,
    hcpID: 50,
  });

  assert.equal(result.status, "success");
  assert.equal(state.deletes.length, 2); // hcp + user
  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].data.action, "HCP_DELETED");
  assert.equal(state.auditLogs[0].data.entityID, 50);
});
