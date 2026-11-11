import {
  validateAppointmentBookingInput,
  validateStatusTransition,
} from "./appointment-validation.mjs";

const AUTH_REQUIRED = Object.freeze({
  status: "error",
  message: "Your session is no longer available. Please sign in again.",
});

const HCP_UNAVAILABLE = Object.freeze({
  status: "error",
  message: "The selected healthcare professional is unavailable or unverified.",
});

const CONFLICT = Object.freeze({
  status: "error",
  message: "This time slot is already booked with this healthcare professional. Please choose another time.",
});

function positiveInteger(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

/**
 * Creates a new appointment booking for the authenticated Patient.
 * @param {{
 *   requirePatient: () => Promise<{ patient: { patientID: number } | null }>,
 *   prisma: any,
 *   input: unknown,
 *   now?: () => Date
 * }} options
 * @returns {Promise<{ status: "success", message: string, appointmentID: number } | { status: "error", message: string }>}
 */
export async function bookPatientAppointment({
  requirePatient,
  prisma,
  input,
  now = () => new Date(),
}) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return AUTH_REQUIRED;
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return AUTH_REQUIRED;

  const validation = validateAppointmentBookingInput(input, now);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { hcpID, appointmentDate, appointmentTime, reason } = validation.data;

  try {
    // Verify that the target HCP exists, is approved, and has an active account
    const hcp = await prisma.healthcareProfessional.findFirst({
      where: {
        hcpID,
        verificationStatus: "Approved",
        user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
      },
      select: { hcpID: true },
    });

    if (!hcp) return HCP_UNAVAILABLE;

    const parsedDate = new Date(`${appointmentDate}T00:00:00.000Z`);
    const parsedTime = new Date(`1970-01-01T${appointmentTime}:00.000Z`);

    // Check for existing non-cancelled appointment at the same slot
    const existing = await prisma.appointment.findFirst({
      where: {
        hcpID,
        appointmentDate: parsedDate,
        appointmentTime: parsedTime,
        status: { not: "Cancelled" },
      },
      select: { appointmentID: true },
    });

    if (existing) return CONFLICT;

    const created = await prisma.appointment.create({
      data: {
        patientID,
        hcpID,
        appointmentDate: parsedDate,
        appointmentTime: parsedTime,
        reason,
        status: "Pending",
      },
      select: { appointmentID: true },
    });

    return {
      status: "success",
      message: "Your appointment request has been submitted.",
      appointmentID: created.appointmentID,
    };
  } catch {
    return {
      status: "error",
      message: "We could not book this appointment right now. Please try again.",
    };
  }
}

/**
 * Updates an appointment's status by its assigned Healthcare Professional.
 * @param {{
 *   requireApprovedHcp: () => Promise<{ healthcareProfessional: { hcpID: number } | null }>,
 *   prisma: any,
 *   appointmentID: unknown,
 *   targetStatus: unknown
 * }} options
 * @returns {Promise<{ status: "success", message: string } | { status: "error", message: string }>}
 */
export async function updateHcpAppointmentStatus({
  requireApprovedHcp,
  prisma,
  appointmentID,
  targetStatus,
}) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch {
    return AUTH_REQUIRED;
  }

  const hcpID = positiveInteger(principal?.healthcareProfessional?.hcpID);
  if (hcpID === null) return AUTH_REQUIRED;

  const validAppointmentID = positiveInteger(appointmentID);
  if (validAppointmentID === null) {
    return { status: "error", message: "This appointment is unavailable." };
  }

  if (typeof targetStatus !== "string") {
    return { status: "error", message: "Invalid status update." };
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        appointmentID: validAppointmentID,
        hcpID,
      },
      select: { appointmentID: true, status: true },
    });

    if (!appointment) {
      return { status: "error", message: "Appointment unavailable or unauthorized." };
    }

    const transition = validateStatusTransition(appointment.status, targetStatus);
    if (!transition.ok) {
      return { status: "error", message: transition.message };
    }

    await prisma.appointment.update({
      where: { appointmentID: validAppointmentID },
      data: { status: targetStatus },
    });

    return {
      status: "success",
      message: `Appointment status updated to ${targetStatus}.`,
    };
  } catch {
    return {
      status: "error",
      message: "We could not update the appointment status. Please try again.",
    };
  }
}

/**
 * Cancels an appointment on behalf of the owning Patient.
 * @param {{
 *   requirePatient: () => Promise<{ patient: { patientID: number } | null }>,
 *   prisma: any,
 *   appointmentID: unknown
 * }} options
 * @returns {Promise<{ status: "success", message: string } | { status: "error", message: string }>}
 */
export async function cancelPatientAppointment({
  requirePatient,
  prisma,
  appointmentID,
}) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return AUTH_REQUIRED;
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return AUTH_REQUIRED;

  const validAppointmentID = positiveInteger(appointmentID);
  if (validAppointmentID === null) {
    return { status: "error", message: "This appointment is unavailable." };
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        appointmentID: validAppointmentID,
        patientID,
      },
      select: { appointmentID: true, status: true },
    });

    if (!appointment) {
      return { status: "error", message: "Appointment unavailable or unauthorized." };
    }

    if (appointment.status === "Cancelled") {
      return { status: "error", message: "Appointment is already cancelled." };
    }

    if (appointment.status === "Completed") {
      return { status: "error", message: "Completed appointments cannot be cancelled." };
    }

    await prisma.appointment.update({
      where: { appointmentID: validAppointmentID },
      data: { status: "Cancelled" },
    });

    return {
      status: "success",
      message: "Your appointment has been cancelled.",
    };
  } catch {
    return {
      status: "error",
      message: "We could not cancel this appointment. Please try again.",
    };
  }
}
