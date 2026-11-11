"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedHcp } from "@/lib/authorization";
import { updateHcpAppointmentStatus } from "@/lib/appointment-mutations.mjs";
import prisma from "@/lib/prisma";

export async function updateAppointmentStatusAction(
  appointmentID: unknown,
  targetStatus: string,
) {
  const result = await updateHcpAppointmentStatus({
    requireApprovedHcp,
    prisma,
    appointmentID,
    targetStatus,
  });

  if (result.status === "success") {
    revalidatePath("/hcp/appointments");
    revalidatePath(`/hcp/appointments/${appointmentID}`);
    revalidatePath("/hcp");
  }

  return result;
}
