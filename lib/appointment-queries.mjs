/**
 * Formats a Date object or ISO string to Malaysian date string (e.g. "14 Oct 2026").
 * @param {Date | string | null | undefined} value
 * @returns {string}
 */
export function formatAppointmentDate(value) {
  if (!value) return "Unknown date";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats a Date object or ISO string from @db.Time(0) to a 12-hour time string (e.g. "10:30 AM").
 * @param {Date | string | null | undefined} value
 * @returns {string}
 */
export function formatAppointmentTime(value) {
  if (!value) return "Unknown time";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Extracts "HH:MM" 24-hour slot representation from a Date or time string.
 * @param {Date | string | null | undefined} value
 * @returns {string}
 */
export function extractTimeSlot(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

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
 * Loads eligible approved Healthcare Professionals for appointment booking.
 * @param {{ requirePatient: () => Promise<any>, prisma: any }} options
 */
export async function loadEligibleBookingHcps({ requirePatient, prisma }) {
  await requirePatient();
  return prisma.healthcareProfessional.findMany({
    where: {
      verificationStatus: "Approved",
      user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
    },
    select: {
      hcpID: true,
      specialization: true,
      workplace: true,
      yearsOfExperience: true,
      user: { select: { fullName: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  });
}

/**
 * Loads appointments booked for the authenticated Patient.
 * @param {{ requirePatient: () => Promise<{ patient: { patientID: number } | null }>, prisma: any }} options
 */
export async function loadPatientAppointments({ requirePatient, prisma }) {
  let principal;
  try {
    principal = await requirePatient();
  } catch {
    return { status: "denied", appointments: [] };
  }

  const patientID = positiveInteger(principal?.patient?.patientID);
  if (patientID === null) return { status: "denied", appointments: [] };

  try {
    const rawAppointments = await prisma.appointment.findMany({
      where: { patientID },
      include: {
        hcp: {
          select: {
            hcpID: true,
            specialization: true,
            workplace: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [
        { appointmentDate: "desc" },
        { appointmentTime: "desc" },
        { appointmentID: "desc" },
      ],
    });

    const appointments = rawAppointments.map((appt) => ({
      appointmentID: appt.appointmentID,
      patientID: appt.patientID,
      hcpID: appt.hcpID,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      formattedDate: formatAppointmentDate(appt.appointmentDate),
      formattedTime: formatAppointmentTime(appt.appointmentTime),
      timeSlot: extractTimeSlot(appt.appointmentTime),
      reason: appt.reason,
      status: appt.status,
      createdAt: appt.createdAt,
      hcp: {
        hcpID: appt.hcp.hcpID,
        fullName: appt.hcp.user.fullName,
        specialization: appt.hcp.specialization,
        workplace: appt.hcp.workplace,
      },
    }));

    return { status: "success", appointments };
  } catch {
    return { status: "error", message: "Could not load appointments.", appointments: [] };
  }
}

/**
 * Loads appointments assigned to the authenticated Healthcare Professional.
 * @param {{
 *   requireApprovedHcp: () => Promise<{ healthcareProfessional: { hcpID: number } | null }>,
 *   prisma: any,
 *   statusFilter?: string | null
 * }} options
 */
export async function loadHcpAppointments({
  requireApprovedHcp,
  prisma,
  statusFilter = null,
}) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch {
    return { status: "denied", appointments: [] };
  }

  const hcpID = positiveInteger(principal?.healthcareProfessional?.hcpID);
  if (hcpID === null) return { status: "denied", appointments: [] };

  const where = {
    hcpID,
    ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
  };

  try {
    const rawAppointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            patientID: true,
            dateOfBirth: true,
            gender: true,
            user: { select: { fullName: true, phoneNo: true, email: true } },
          },
        },
      },
      orderBy: [
        { appointmentDate: "asc" },
        { appointmentTime: "asc" },
        { appointmentID: "asc" },
      ],
    });

    const appointments = rawAppointments.map((appt) => ({
      appointmentID: appt.appointmentID,
      patientID: appt.patientID,
      hcpID: appt.hcpID,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      formattedDate: formatAppointmentDate(appt.appointmentDate),
      formattedTime: formatAppointmentTime(appt.appointmentTime),
      timeSlot: extractTimeSlot(appt.appointmentTime),
      reason: appt.reason,
      status: appt.status,
      createdAt: appt.createdAt,
      patient: {
        patientID: appt.patient.patientID,
        fullName: appt.patient.user.fullName,
        phoneNo: appt.patient.user.phoneNo,
        email: appt.patient.user.email,
        gender: appt.patient.gender,
        dateOfBirth: appt.patient.dateOfBirth,
        formattedDob: formatAppointmentDate(appt.patient.dateOfBirth),
      },
    }));

    return { status: "success", appointments };
  } catch {
    return { status: "error", message: "Could not load appointment schedule.", appointments: [] };
  }
}

/**
 * Loads a single appointment's full detail for an authorized HCP, checking active consent.
 * @param {{
 *   requireApprovedHcp: () => Promise<{ healthcareProfessional: { hcpID: number } | null }>,
 *   prisma: any,
 *   appointmentID: unknown
 * }} options
 */
export async function loadHcpAppointmentDetail({
  requireApprovedHcp,
  prisma,
  appointmentID,
}) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch {
    return { status: "denied" };
  }

  const hcpID = positiveInteger(principal?.healthcareProfessional?.hcpID);
  if (hcpID === null) return { status: "denied" };

  const validID = positiveInteger(appointmentID);
  if (validID === null) return { status: "unavailable" };

  try {
    const appt = await prisma.appointment.findFirst({
      where: { appointmentID: validID, hcpID },
      include: {
        patient: {
          select: {
            patientID: true,
            dateOfBirth: true,
            gender: true,
            bloodType: true,
            allergies: true,
            emergencyContact: true,
            user: { select: { fullName: true, phoneNo: true, email: true } },
          },
        },
      },
    });

    if (!appt) return { status: "unavailable" };

    // Check if the patient has granted active consent to this HCP
    const activeConsent = await prisma.patientHcpConsent.findFirst({
      where: {
        patientID: appt.patientID,
        hcpID,
        status: "ACTIVE",
      },
      select: { consentID: true },
    });

    const hasActiveConsent = Boolean(activeConsent);

    return {
      status: "success",
      appointment: {
        appointmentID: appt.appointmentID,
        patientID: appt.patientID,
        hcpID: appt.hcpID,
        formattedDate: formatAppointmentDate(appt.appointmentDate),
        formattedTime: formatAppointmentTime(appt.appointmentTime),
        timeSlot: extractTimeSlot(appt.appointmentTime),
        reason: appt.reason,
        status: appt.status,
        createdAt: appt.createdAt,
        patient: {
          patientID: appt.patient.patientID,
          fullName: appt.patient.user.fullName,
          phoneNo: appt.patient.user.phoneNo,
          email: appt.patient.user.email,
          gender: appt.patient.gender,
          formattedDob: formatAppointmentDate(appt.patient.dateOfBirth),
          // Disclose sensitive health data only if active consent is granted
          bloodType: hasActiveConsent ? appt.patient.bloodType : null,
          allergies: hasActiveConsent ? appt.patient.allergies : null,
          emergencyContact: hasActiveConsent ? appt.patient.emergencyContact : null,
        },
        hasActiveConsent,
      },
    };
  } catch {
    return { status: "error", message: "Could not load appointment details." };
  }
}
