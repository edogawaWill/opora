"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authorization";
import { manageDisease } from "@/lib/disease-management.mjs";
import prisma from "@/lib/prisma";
import type { DiseaseActionState } from "@/lib/disease-action-state";

function toInput(formData: FormData) {
  return {
    diseaseName: formData.get("diseaseName"),
    description: formData.get("description"),
    causes: formData.get("causes"),
    treatment: formData.get("treatment"),
    prevention: formData.get("prevention"),
    whenToSeekCare: formData.get("whenToSeekCare"),
    symptomIDs: formData.getAll("symptomIDs"),
  };
}

async function runMutation(
  operation: "create" | "update" | "delete",
  input?: unknown,
  diseaseID?: unknown,
) {
  const result = await manageDisease({ operation, input, diseaseID, requireAdmin, prisma });
  if (result.status === "success") {
    revalidatePath("/admin/diseases");
    revalidatePath("/admin");
  }
  return result;
}

export async function createDiseaseAction(
  _previousState: DiseaseActionState,
  formData: FormData,
): Promise<DiseaseActionState> {
  return runMutation("create", toInput(formData));
}

export async function updateDiseaseAction(
  diseaseID: unknown,
  _previousState: DiseaseActionState,
  formData: FormData,
): Promise<DiseaseActionState> {
  return runMutation("update", toInput(formData), diseaseID);
}

export async function deleteDiseaseAction(
  diseaseID: unknown,
  _previousState: DiseaseActionState,
  _formData: FormData,
): Promise<DiseaseActionState> {
  void _previousState;
  void _formData;
  return runMutation("delete", undefined, diseaseID);
}
