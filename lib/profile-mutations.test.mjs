import test from "node:test";
import assert from "node:assert/strict";

import { changeOwnPassword, updateHcpPersonalProfile, updatePatientProfile } from "./profile-mutations.mjs";

const patientPrincipal = {
  userId: 101,
  role: "PATIENT",
  accountStatus: "ACTIVE",
  emailVerified: true,
  patient: { patientID: 201 },
};
const hcpPrincipal = {
  userId: 301,
  role: "HCP",
  accountStatus: "ACTIVE",
  emailVerified: true,
  healthcareProfessional: { hcpID: 401, verificationStatus: "Pending" },
};

test("Patient profile mutation is scoped to the authenticated User and Patient, ignoring supplied IDs", async () => {
  const operations = [];
  let transactionCalls = 0;
  const prisma = {
    user: { update: (query) => { operations.push(["user", query]); return query; } },
    patient: { update: (query) => { operations.push(["patient", query]); return query; } },
    $transaction: async (queries) => { transactionCalls += 1; return queries; },
  };
  const result = await updatePatientProfile({
    requirePatient: async () => patientPrincipal,
    prisma,
    input: {
      fullName: "Patient A Updated",
      phoneNo: "0123456789",
      address: "Updated address",
      bloodType: "A+",
      allergies: "None stated",
      emergencyContact: "Contact",
      userId: 999,
      patientID: 999,
    },
  });
  assert.equal(result.status, "success");
  assert.equal(transactionCalls, 1);
  assert.deepEqual(operations[0], ["user", {
    where: { id: 101 },
    data: { fullName: "Patient A Updated", phoneNo: "0123456789" },
  }]);
  assert.deepEqual(operations[1], ["patient", {
    where: { userID: 101 },
    data: { address: "Updated address", bloodType: "A+", allergies: "None stated", emergencyContact: "Contact" },
  }]);
});

test("unauthorized Patient profile mutation performs no database writes", async () => {
  let writes = 0;
  const prisma = {
    user: { update: () => { writes += 1; } },
    patient: { update: () => { writes += 1; } },
    $transaction: async () => { writes += 1; },
  };
  const result = await updatePatientProfile({
    requirePatient: async () => { throw new Error("denied"); },
    prisma,
    input: { ...validPatientInput },
  });
  assert.equal(result.status, "error");
  assert.equal(writes, 0);
});

test("HCP personal update changes only the signed-in HCP's User fields", async () => {
  let query;
  const result = await updateHcpPersonalProfile({
    requireHcpAccount: async () => hcpPrincipal,
    prisma: { user: { update: async (value) => { query = value; } } },
    input: {
      fullName: "Dr Example",
      phoneNo: "0123456789",
      userId: 999,
      hcpID: 999,
      licenseNo: "CHANGED-LICENSE",
      verificationStatus: "Approved",
    },
  });
  assert.equal(result.status, "success");
  assert.deepEqual(query, {
    where: { id: 301 },
    data: { fullName: "Dr Example", phoneNo: "0123456789" },
  });
});

test("inactive, unverified, or wrong-role principals cannot mutate profiles", async () => {
  for (const principal of [
    { ...patientPrincipal, accountStatus: "SUSPENDED" },
    { ...patientPrincipal, emailVerified: false },
    { ...patientPrincipal, role: "HCP" },
  ]) {
    let writes = 0;
    const result = await updatePatientProfile({
      requirePatient: async () => principal,
      prisma: {
        user: { update: () => { writes += 1; } },
        patient: { update: () => { writes += 1; } },
        $transaction: async () => { writes += 1; },
      },
      input: { ...validPatientInput },
    });
    assert.equal(result.status, "error");
    assert.equal(writes, 0);
  }
});

test("password change requires the role-specific guard and requests revocation of other sessions", async () => {
  let request;
  const result = await changeOwnPassword({
    authorize: async () => patientPrincipal,
    expectedRole: "PATIENT",
    changePassword: async (body) => { request = body; },
    input: { currentPassword: "current-pass", newPassword: "new-password", confirmPassword: "new-password" },
  });
  assert.deepEqual(result, { status: "success", message: "Your password was changed. Other active sessions were signed out." });
  assert.deepEqual(request, {
    currentPassword: "current-pass",
    newPassword: "new-password",
    revokeOtherSessions: true,
  });
});

test("password validation and Better Auth failures do not disclose provider errors", async () => {
  let calls = 0;
  const invalid = await changeOwnPassword({
    authorize: async () => hcpPrincipal,
    expectedRole: "HCP",
    changePassword: async () => { calls += 1; },
    input: { currentPassword: "current", newPassword: "short", confirmPassword: "short" },
  });
  assert.equal(invalid.status, "error");
  assert.equal(calls, 0);

  const failed = await changeOwnPassword({
    authorize: async () => hcpPrincipal,
    expectedRole: "HCP",
    changePassword: async () => { throw new Error("private Better Auth detail"); },
    input: { currentPassword: "current", newPassword: "new-password", confirmPassword: "new-password" },
  });
  assert.equal(failed.status, "error");
  assert.equal(failed.message.includes("private Better Auth detail"), false);
});

test("password change is not attempted when the role-specific server guard rejects", async () => {
  let calls = 0;
  const result = await changeOwnPassword({
    authorize: async () => { throw new Error("not authenticated"); },
    expectedRole: "PATIENT",
    changePassword: async () => { calls += 1; },
    input: { currentPassword: "current", newPassword: "new-password", confirmPassword: "new-password" },
  });
  assert.equal(result.status, "error");
  assert.equal(calls, 0);
});

const validPatientInput = {
  fullName: "Patient A",
  phoneNo: "0123456789",
  address: "Address",
  bloodType: "O+",
  allergies: "",
  emergencyContact: "",
};
