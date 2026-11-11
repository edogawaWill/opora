"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { validateSymptomRecordInput } from "@/lib/symptom-validation.mjs";
import type { SymptomActionState } from "@/lib/symptom-action-state";
import {
  deletePatientOwnedSymptomRecord,
  patientOwnedSymptomRecordWhere,
  updatePatientOwnedSymptomRecord,
} from "@/lib/symptom-record-mutations.mjs";
import prisma from "@/lib/prisma";

export async function createSymptomRecordAction(
  _previousState: SymptomActionState,
  formData: FormData,
): Promise<SymptomActionState> {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: "Your patient session is no longer available. Please sign in again." };
    }
    throw error;
  }

  const validation = validateSymptomRecordInput({
    symptomID: formData.get("symptomID"),
    severity: formData.get("severity"),
    onsetDate: formData.get("onsetDate"),
    duration: formData.get("duration"),
    notes: formData.get("notes"),
  });
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  try {
    await prisma.symptomRecord.create({
      data: {
        patientID: principal.patient!.patientID,
        symptomID: validation.data.symptomID,
        severity: validation.data.severity,
        onsetDate: new Date(`${validation.data.onsetDate}T00:00:00.000Z`),
        duration: validation.data.duration,
        notes: validation.data.notes,
      },
    });
  } catch {
    return {
      status: "error",
      message: "We could not save this entry. Please check your details and try again.",
    };
  }

  revalidatePath("/patient");
  return { status: "success", message: "Your symptom entry has been saved." };
}

export async function updateSymptomRecordAction(
  recordID: unknown,
  _previousState: SymptomActionState,
  formData: FormData,
): Promise<SymptomActionState> {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: "Your patient session is no longer available. Please sign in again." };
    }
    throw error;
  }

  const where = patientOwnedSymptomRecordWhere(recordID, principal.patient!.patientID);
  if (!where) return { status: "error", message: "This symptom entry is unavailable." };

  const validation = validateSymptomRecordInput({
    symptomID: formData.get("symptomID"),
    severity: formData.get("severity"),
    onsetDate: formData.get("onsetDate"),
    duration: formData.get("duration"),
    notes: formData.get("notes"),
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  try {
    const symptom = await prisma.symptom.findUnique({
      where: { symptomID: validation.data.symptomID },
      select: { symptomID: true },
    });
    if (!symptom) return { status: "error", message: "Choose a symptom from the available list." };

    const updated = await updatePatientOwnedSymptomRecord(
      prisma,
      where.recordID,
      where.patientID,
      {
        symptomID: validation.data.symptomID,
        severity: validation.data.severity,
        onsetDate: new Date(`${validation.data.onsetDate}T00:00:00.000Z`),
        duration: validation.data.duration,
        notes: validation.data.notes,
      },
    );
    if (!updated.ok) return { status: "error", message: updated.message };
  } catch {
    return { status: "error", message: "We could not update this entry. Please check your details and try again." };
  }

  revalidatePath("/patient");
  return { status: "success", message: "Your symptom entry has been updated." };
}

export async function deleteSymptomRecordAction(recordID: unknown): Promise<SymptomActionState> {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: "Your patient session is no longer available. Please sign in again." };
    }
    throw error;
  }

  const where = patientOwnedSymptomRecordWhere(recordID, principal.patient!.patientID);
  if (!where) return { status: "error", message: "This symptom entry is unavailable." };

  try {
    const deleted = await deletePatientOwnedSymptomRecord(prisma, where.recordID, where.patientID);
    if (!deleted.ok) return { status: "error", message: deleted.message };
  } catch {
    return { status: "error", message: "We could not delete this entry. Please try again." };
  }

  return { status: "success", message: "Your symptom entry has been deleted." };
}
