import assert from "node:assert/strict";
import test from "node:test";

import {
  grantPatientHcpAccess,
  loadPatientHcpAccess,
  revokePatientHcpAccess,
} from "./patient-hcp-consent.mjs";

function patientGuard(patientID = 8) {
  let calls = 0;
  return {
    requirePatient: async () => {
      calls += 1;
      return { patient: { patientID } };
    },
    calls: () => calls,
  };
}

function consentHarness({ ownerID = 8, active = false, eligible = true } = {}) {
  const state = {
    consents: active ? [{ consentID: 3, patientID: ownerID, hcpID: 41, status: "ACTIVE", grantedAt: new Date("2026-10-01T00:00:00Z"), revokedAt: null }] : [],
    created: 0,
    updates: [],
    hcpChecks: [],
    hcpListWhere: null,
  };
  const prisma = {
    healthcareProfessional: {
      findMany: async ({ where }) => {
        state.hcpListWhere = where;
        return eligible ? [{ hcpID: 41, specialization: "General practice", workplace: "Clinic", user: { fullName: "Example HCP" } }] : [];
      },
      findFirst: async ({ where }) => {
        state.hcpChecks.push(where);
        return eligible && where.verificationStatus === "Approved" && where.user.is.role === "HCP" && where.user.is.accountStatus === "ACTIVE" && where.user.is.emailVerified
          ? { hcpID: where.hcpID }
          : null;
      },
    },
    patientHcpConsent: {
      findMany: async ({ where }) => {
        state.listWhere = where;
        return state.consents.filter((consent) => consent.patientID === where.patientID && consent.status === where.status).map((consent) => ({
          consentID: consent.consentID,
          hcpID: consent.hcpID,
          grantedAt: consent.grantedAt,
          hcp: { specialization: "General practice", workplace: "Clinic", verificationStatus: "Approved", user: { fullName: "Example HCP" } },
        }));
      },
      findFirst: async ({ where }) => state.consents.find((consent) => consent.patientID === where.patientID && consent.hcpID === where.hcpID && consent.status === where.status) ?? null,
      create: async ({ data }) => {
        if (state.consents.some((consent) => consent.patientID === data.patientID && consent.hcpID === data.hcpID && consent.status === "ACTIVE")) {
          const error = new Error("unique active consent");
          error.code = "P2002";
          throw error;
        }
        state.created += 1;
        const consent = { consentID: 100 + state.created, ...data, revokedAt: null };
        state.consents.push(consent);
        return consent;
      },
      updateMany: async ({ where, data }) => {
        state.updates.push({ where, data });
        const row = state.consents.find((consent) => consent.consentID === where.consentID && consent.patientID === where.patientID && consent.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  return { prisma, state };
}

test("consent listing uses the authenticated Patient and filters current HCP eligibility", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness({ active: true });
  const result = await loadPatientHcpAccess({ ...guard, prisma });

  assert.equal(result.status, "success");
  assert.equal(guard.calls(), 1);
  assert.deepEqual(state.listWhere, { patientID: 8, status: "ACTIVE" });
  assert.deepEqual(state.hcpListWhere, {
    verificationStatus: "Approved",
    user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
  });
  assert.deepEqual(result.eligibleHcps.map((hcp) => hcp.hcpID), [41]);
  assert.equal(result.activeConsents.length, 1);
});

test("unauthenticated consent listing fails closed without querying data", async () => {
  let queries = 0;
  const result = await loadPatientHcpAccess({
    requirePatient: async () => { throw new Error("unauthenticated"); },
    prisma: { healthcareProfessional: { findMany: async () => { queries += 1; } }, patientHcpConsent: { findMany: async () => { queries += 1; } } },
  });

  assert.equal(result.status, "error");
  assert.equal(queries, 0);
});

test("unauthenticated grant and revoke attempts fail before database operations", async () => {
  let queries = 0;
  const prisma = {
    healthcareProfessional: { findFirst: async () => { queries += 1; } },
    patientHcpConsent: {
      findFirst: async () => { queries += 1; },
      create: async () => { queries += 1; },
      updateMany: async () => { queries += 1; },
    },
  };
  const requirePatient = async () => { throw new Error("forbidden"); };

  const grant = await grantPatientHcpAccess({ requirePatient, prisma, hcpID: 41 });
  const revoke = await revokePatientHcpAccess({ requirePatient, prisma, consentID: 3 });

  assert.equal(grant.status, "error");
  assert.equal(revoke.status, "error");
  assert.equal(queries, 0);
});

test("grant checks current HCP account, verification, and approval state, then is idempotent", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness();
  const first = await grantPatientHcpAccess({ ...guard, prisma, hcpID: "41", now: () => new Date("2026-10-02T00:00:00Z") });
  const second = await grantPatientHcpAccess({ ...guard, prisma, hcpID: 41 });

  assert.equal(first.status, "success");
  assert.equal(second.status, "success");
  assert.equal(guard.calls(), 2);
  assert.equal(state.created, 1);
  assert.deepEqual(state.hcpChecks[0].user.is, { role: "HCP", accountStatus: "ACTIVE", emailVerified: true });
  assert.equal(state.hcpChecks[0].verificationStatus, "Approved");
  assert.equal(state.consents[0].patientID, 8);
});

test("pending or otherwise ineligible HCPs cannot receive a consent grant", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness({ eligible: false });
  const result = await grantPatientHcpAccess({ ...guard, prisma, hcpID: 41 });

  assert.equal(result.status, "error");
  assert.equal(state.created, 0);
});

test("revocation is scoped to the authenticated Patient and changes only an active row", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness({ ownerID: 9, active: true });
  const result = await revokePatientHcpAccess({ ...guard, prisma, consentID: 3, now: () => new Date("2026-10-03T00:00:00Z") });

  assert.equal(result.status, "error");
  assert.equal(guard.calls(), 1);
  assert.deepEqual(state.updates[0].where, { consentID: 3, patientID: 8, status: "ACTIVE" });
  assert.equal(state.consents[0].status, "ACTIVE");
});

test("the owning Patient can revoke and later grant a new historical cycle", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness({ active: true });
  const revoked = await revokePatientHcpAccess({ ...guard, prisma, consentID: 3, now: () => new Date("2026-10-03T00:00:00Z") });
  const regranted = await grantPatientHcpAccess({ ...guard, prisma, hcpID: 41, now: () => new Date("2026-10-04T00:00:00Z") });

  assert.equal(revoked.status, "success");
  assert.equal(regranted.status, "success");
  assert.equal(state.consents.length, 2);
  assert.equal(state.consents[0].status, "REVOKED");
  assert.equal(state.consents[0].revokedAt.toISOString(), "2026-10-03T00:00:00.000Z");
  assert.equal(state.consents[1].status, "ACTIVE");
});

test("concurrent duplicate grants resolve to one active consent", async () => {
  const guard = patientGuard(8);
  const { prisma, state } = consentHarness();
  const results = await Promise.all([
    grantPatientHcpAccess({ ...guard, prisma, hcpID: 41 }),
    grantPatientHcpAccess({ ...guard, prisma, hcpID: 41 }),
  ]);

  assert.ok(results.every((result) => result.status === "success"));
  assert.equal(state.consents.filter((consent) => consent.status === "ACTIVE").length, 1);
});

