"use server";

import { redirect } from "next/navigation";

import { requirePatient } from "@/lib/authorization";
import { createPatientAssessment } from "@/lib/assessment-persistence.mjs";
import { assessmentInputFromFormData } from "@/lib/assessment-form-data.mjs";
import type { SymptomActionState } from "@/lib/symptom-action-state";
import prisma from "@/lib/prisma";

export async function submitAssessmentAction(
  _previousState: SymptomActionState,
  formData: FormData,
): Promise<SymptomActionState> {
  const parsed = assessmentInputFromFormData(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await createPatientAssessment({
    requirePatient,
    prisma,
    input: parsed.data,
  });
  if (result.status === "error") return result;

  redirect(`/patient/assessment/${result.assessmentID}`);
}
