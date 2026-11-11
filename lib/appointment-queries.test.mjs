import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTimeSlot,
  formatAppointmentDate,
  formatAppointmentTime,
  loadHcpAppointmentDetail,
  loadHcpAppointments,
  loadPatientAppointments,
} from "./appointment-queries.mjs";

test("formatAppointmentDate formats valid date correctly", () => {
  const formatted = formatAppointmentDate("2026-10-14T00:00:00.000Z");
  assert.match(formatted, /14 Oct 2026/);
});

test("formatAppointmentTime formats 24-hr time to 12-hr string", () => {
  const formatted = formatAppointmentTime("1970-01-01T10:30:00.000Z");
  assert.equal(formatted, "10:30 AM");

  const formattedPm = formatAppointmentTime("1970-01-01T14:00:00.000Z");
  assert.equal(formattedPm, "2:00 PM");
});

test("extractTimeSlot extracts HH:MM", () => {
  assert.equal(extractTimeSlot("1970-01-01T09:30:00.000Z"), "09:30");
  assert.equal(extractTimeSlot("1970-01-01T15:00:00.000Z"), "15:00");
});

test("loadPatientAppointments scopes query to authenticated patient", async () => {
  const state = { queries: [] };
  const prisma = {
    appointment: {
      findMany: async (args) => {
        state.queries.push(args);
        return [
          {
            appointmentID: 1,
            patientID: 4,
            hcpID: 2,
            appointmentDate: new Date("2026-10-29T00:00:00.000Z"),
            appointmentTime: new Date("1970-01-01T10:00:00.000Z"),
            reason: "Checkup",
            status: "Pending",
            createdAt: new Date(),
            hcp: {
              hcpID: 2,
              specialization: "General Practice",
              workplace: "Klinik Kesihatan",
              user: { fullName: "Dr. Farid" },
            },
          },
        ];
      },
    },
  };

  const requirePatient = async () => ({ patient: { patientID: 4 } });
  const result = await loadPatientAppointments({ requirePatient, prisma });

  assert.equal(result.status, "success");
  assert.equal(result.appointments.length, 1);
  assert.equal(state.queries[0].where.patientID, 4);
  assert.equal(result.appointments[0].hcp.fullName, "Dr. Farid");
});

test("loadHcpAppointments scopes query to authenticated HCP and applies status filter", async () => {
  const state = { queries: [] };
  const prisma = {
    appointment: {
      findMany: async (args) => {
        state.queries.push(args);
        return [];
      },
    },
  };

  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 9 },
  });

  const result = await loadHcpAppointments({
    requireApprovedHcp,
    prisma,
    statusFilter: "Confirmed",
  });

  assert.equal(result.status, "success");
  assert.deepEqual(state.queries[0].where, {
    hcpID: 9,
    status: "Confirmed",
  });
});

test("loadHcpAppointmentDetail hides sensitive health info when patient has not granted consent", async () => {
  const prisma = {
    appointment: {
      findFirst: async () => ({
        appointmentID: 3,
        patientID: 15,
        hcpID: 9,
        appointmentDate: new Date("2026-10-30T00:00:00.000Z"),
        appointmentTime: new Date("1970-01-01T11:00:00.000Z"),
        reason: "Fever",
        status: "Confirmed",
        createdAt: new Date(),
        patient: {
          patientID: 15,
          dateOfBirth: new Date("2000-01-01"),
          gender: "Female",
          bloodType: "O+",
          allergies: "Penicillin",
          emergencyContact: "012-3456789",
          user: { fullName: "Aisyah", phoneNo: "011-1234567", email: "aisyah@example.com" },
        },
      }),
    },
    patientHcpConsent: {
      findFirst: async () => null, // No active consent
    },
  };

  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 9 },
  });

  const result = await loadHcpAppointmentDetail({
    requireApprovedHcp,
    prisma,
    appointmentID: 3,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.appointment.hasActiveConsent, false);
    assert.equal(result.appointment.patient.bloodType, null);
    assert.equal(result.appointment.patient.allergies, null);
    assert.equal(result.appointment.patient.emergencyContact, null);
  }
});

test("loadHcpAppointmentDetail reveals sensitive health info when patient has active consent", async () => {
  const prisma = {
    appointment: {
      findFirst: async () => ({
        appointmentID: 3,
        patientID: 15,
        hcpID: 9,
        appointmentDate: new Date("2026-10-30T00:00:00.000Z"),
        appointmentTime: new Date("1970-01-01T11:00:00.000Z"),
        reason: "Fever",
        status: "Confirmed",
        createdAt: new Date(),
        patient: {
          patientID: 15,
          dateOfBirth: new Date("2000-01-01"),
          gender: "Female",
          bloodType: "O+",
          allergies: "Penicillin",
          emergencyContact: "012-3456789",
          user: { fullName: "Aisyah", phoneNo: "011-1234567", email: "aisyah@example.com" },
        },
      }),
    },
    patientHcpConsent: {
      findFirst: async () => ({ consentID: 42 }), // Active consent!
    },
  };

  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 9 },
  });

  const result = await loadHcpAppointmentDetail({
    requireApprovedHcp,
    prisma,
    appointmentID: 3,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.appointment.hasActiveConsent, true);
    assert.equal(result.appointment.patient.bloodType, "O+");
    assert.equal(result.appointment.patient.allergies, "Penicillin");
    assert.equal(result.appointment.patient.emergencyContact, "012-3456789");
  }
});
