import test from "node:test";
import assert from "node:assert/strict";

import {
  passwordChangeFeedback,
  validateHcpProfile,
  validatePatientProfile,
  validatePasswordChange,
} from "./profile-policy.mjs";

const patientInput = {
  fullName: "  Synthetic Patient  ",
  phoneNo: "+60123456789",
  address: "10 Test Road",
  bloodType: "O+",
  allergies: "Pollen",
  emergencyContact: "Contact 0123456789",
};

test("Patient profile validation trims supported fields and maps blank optional fields to null", () => {
  const result = validatePatientProfile({ ...patientInput, allergies: "  ", emergencyContact: "" });
  assert.deepEqual(result, {
    ok: true,
    value: {
      fullName: "Synthetic Patient",
      phoneNo: "+60123456789",
      address: "10 Test Road",
      bloodType: "O+",
      allergies: null,
      emergencyContact: null,
    },
  });
});

test("Patient profile validation rejects invalid phone, name, address, blood type, and oversized fields", () => {
  assert.match(validatePatientProfile({ ...patientInput, fullName: " " }).message, /full name/i);
  assert.match(validatePatientProfile({ ...patientInput, fullName: "n".repeat(101) }).message, /too long/i);
  assert.match(validatePatientProfile({ ...patientInput, phoneNo: "abc" }).message, /phone/i);
  assert.match(validatePatientProfile({ ...patientInput, address: "" }).message, /address/i);
  assert.match(validatePatientProfile({ ...patientInput, address: "a".repeat(501) }).message, /500/i);
  assert.match(validatePatientProfile({ ...patientInput, bloodType: "Unknown" }).message, /blood type/i);
  assert.match(validatePatientProfile({ ...patientInput, allergies: "a".repeat(2001) }).message, /2,000/i);
  assert.match(validatePatientProfile({ ...patientInput, emergencyContact: "e".repeat(101) }).message, /100/i);
});

test("HCP profile validation accepts only personal name and phone fields", () => {
  const result = validateHcpProfile({
    fullName: "Dr Example",
    phoneNo: "0123456789",
    licenseNo: "ATTACKER-CREDENTIAL",
    verificationStatus: "Approved",
  });
  assert.deepEqual(result, { ok: true, value: { fullName: "Dr Example", phoneNo: "0123456789" } });
});

test("password change validates current password, Better Auth length limits, and confirmation", () => {
  assert.equal(validatePasswordChange({ currentPassword: "", newPassword: "longpassword", confirmPassword: "longpassword" }).ok, false);
  assert.equal(validatePasswordChange({ currentPassword: "current", newPassword: "short", confirmPassword: "short" }).ok, false);
  assert.equal(validatePasswordChange({ currentPassword: "current", newPassword: "n".repeat(129), confirmPassword: "n".repeat(129) }).ok, false);
  assert.equal(validatePasswordChange({ currentPassword: "current", newPassword: "newpassword", confirmPassword: "different" }).ok, false);
  assert.deepEqual(validatePasswordChange({ currentPassword: "current", newPassword: "newpassword", confirmPassword: "newpassword" }), { ok: true });
});

test("password API errors map to generic safe feedback", () => {
  const feedback = passwordChangeFeedback({ message: "sensitive provider details" });
  assert.equal(feedback.status, "error");
  assert.match(feedback.message, /current password/i);
  assert.equal(feedback.message.includes("sensitive provider details"), false);
  assert.equal(passwordChangeFeedback(null).status, "success");
});
