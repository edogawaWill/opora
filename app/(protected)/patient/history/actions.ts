"use server";

import { revalidatePath } from "next/cache";

import { requirePatient } from "@/lib/authorization";
import {
  deletePatientDiagnosis,
  recordPatientDiagnosis,
} from "@/lib/patient-diagnosis.mjs";
import type { DiagnosisActionState } from "@/lib/diagnosis-action-state";
import prisma from "@/lib/prisma";

export async function recordDiagnosisAction(
  _previousState: DiagnosisActionState,
  formData: FormData,
): Promise<DiagnosisActionState> {
  const input = {
    diagnosisName: formData.get("diagnosisName"),
    diagnosisDate: formData.get("diagnosisDate"),
    diagnosedBy: formData.get("diagnosedBy"),
    notes: formData.get("notes"),
  };

  const result = await recordPatientDiagnosis({
    requirePatient,
    prisma,
    input,
  });

  if (result.status === "success") {
    revalidatePath("/patient/history");
    revalidatePath("/patient");
    return {
      status: "success",
      message: result.message,
      diagnosisID: result.diagnosisID,
    };
  }

  return {
    status: "error",
    message: result.message,
  };
}

export async function deleteDiagnosisAction(
  diagnosisID: unknown,
): Promise<DiagnosisActionState> {
  const result = await deletePatientDiagnosis({
    requirePatient,
    prisma,
    diagnosisID,
  });

  if (result.status === "success") {
    revalidatePath("/patient/history");
    revalidatePath("/patient");
    return {
      status: "success",
      message: result.message,
    };
  }

  return {
    status: "error",
    message: result.message,
  };
}
