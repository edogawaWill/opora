"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authorization";
import {
  deletePatientRecord,
  setPatientAccountStatus,
  updatePatientRecord,
} from "@/lib/admin-patient-management.mjs";
import type { AdminActionState } from "@/lib/admin-action-state";
import prisma from "@/lib/prisma";

export async function updatePatientAction(
  patientID: unknown,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const input = {
    fullName: formData.get("fullName"),
    phoneNo: formData.get("phoneNo"),
    address: formData.get("address"),
    emergencyContact: formData.get("emergencyContact"),
    bloodType: formData.get("bloodType"),
    allergies: formData.get("allergies"),
  };

  const result = await updatePatientRecord({
    requireAdmin,
    prisma,
    patientID,
    input,
  });

  if (result.status === "success") {
    revalidatePath("/admin/patients");
    revalidatePath(`/admin/patients/${patientID}`);
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}

export async function setPatientStatusAction(
  patientID: unknown,
  targetStatus: unknown,
): Promise<AdminActionState> {
  const result = await setPatientAccountStatus({
    requireAdmin,
    prisma,
    patientID,
    targetStatus,
  });

  if (result.status === "success") {
    revalidatePath("/admin/patients");
    revalidatePath(`/admin/patients/${patientID}`);
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}

export async function deletePatientAction(
  patientID: unknown,
): Promise<AdminActionState> {
  const result = await deletePatientRecord({
    requireAdmin,
    prisma,
    patientID,
  });

  if (result.status === "success") {
    revalidatePath("/admin/patients");
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}
