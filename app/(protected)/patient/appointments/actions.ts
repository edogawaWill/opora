"use server";

import { revalidatePath } from "next/cache";

import { requirePatient } from "@/lib/authorization";
import {
  bookPatientAppointment,
  cancelPatientAppointment,
} from "@/lib/appointment-mutations.mjs";
import type { AppointmentActionState } from "@/lib/appointment-action-state";
import prisma from "@/lib/prisma";

export async function bookAppointmentAction(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const input = {
    hcpID: formData.get("hcpID"),
    appointmentDate: formData.get("appointmentDate"),
    appointmentTime: formData.get("appointmentTime"),
    reason: formData.get("reason"),
  };

  const result = await bookPatientAppointment({
    requirePatient,
    prisma,
    input,
  });

  if (result.status === "success") {
    revalidatePath("/patient/appointments");
    revalidatePath("/patient");
    return {
      status: "success",
      message: result.message,
      appointmentID: result.appointmentID,
    };
  }

  return {
    status: "error",
    message: result.message,
  };
}

export async function cancelAppointmentAction(appointmentID: unknown) {
  const result = await cancelPatientAppointment({
    requirePatient,
    prisma,
    appointmentID,
  });

  if (result.status === "success") {
    revalidatePath("/patient/appointments");
    revalidatePath("/patient");
  }

  return result;
}
