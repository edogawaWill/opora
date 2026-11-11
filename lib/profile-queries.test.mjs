import test from "node:test";
import assert from "node:assert/strict";

import { loadOwnHcpProfile, loadOwnPatientProfile } from "./profile-queries.mjs";

const patientPrincipal = {
  userId: 12,
  role: "PATIENT",
  accountStatus: "ACTIVE",
  emailVerified: true,
  patient: { patientID: 21 },
};
const hcpPrincipal = {
  userId: 34,
  role: "HCP",
  accountStatus: "ACTIVE",
  emailVerified: true,
  healthcareProfessional: { hcpID: 43, verificationStatus: "Pending" },
};

test("Patient profile read is authorized and scoped to the Patient linked to the current user", async () => {
  let query;
  const result = await loadOwnPatientProfile({
    requirePatient: async () => patientPrincipal,
    prisma: { patient: { findUnique: async (input) => { query = input; return { address: "Synthetic", user: { fullName: "Patient" } }; } } },
  });
  assert.equal(result.status, "success");
  assert.deepEqual(query.where, { userID: 12 });
  assert.deepEqual(query.select, {
    dateOfBirth: true,
    gender: true,
    address: true,
    bloodType: true,
    allergies: true,
    emergencyContact: true,
    user: { select: { fullName: true, email: true, phoneNo: true } },
  });
});

test("HCP profile read stays scoped to the authenticated HCP, including pending HCP own profile", async () => {
  let query;
  const result = await loadOwnHcpProfile({
    requireHcpAccount: async () => hcpPrincipal,
    prisma: { healthcareProfessional: { findUnique: async (input) => { query = input; return { verificationStatus: "Pending" }; } } },
  });
  assert.equal(result.status, "success");
  assert.deepEqual(query.where, { userID: 34 });
  assert.equal(query.select.licenseNo, true);
  assert.equal(query.select.verificationStatus, true);
});

test("authorization failures and invalid principal identities do not query profile records", async () => {
  for (const input of [
    { requirePatient: async () => { throw new Error("denied"); } },
    { requirePatient: async () => ({ ...patientPrincipal, userId: 99_999, role: "HCP" }) },
    { requirePatient: async () => ({ ...patientPrincipal, emailVerified: false }) },
    { requirePatient: async () => ({ ...patientPrincipal, accountStatus: "DISABLED" }) },
  ]) {
    let reads = 0;
    const result = await loadOwnPatientProfile({
      ...input,
      prisma: { patient: { findUnique: async () => { reads += 1; return null; } } },
    });
    assert.deepEqual(result, { status: "denied" });
    assert.equal(reads, 0);
  }
});
