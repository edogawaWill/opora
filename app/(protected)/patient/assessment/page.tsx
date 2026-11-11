import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentSafetyNotice } from "@/components/patient/assessment-safety-notice";
import SymptomAssessmentForm from "@/components/patient/symptom-assessment-form";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export default async function PatientAssessmentPage() {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  let symptoms: { symptomID: number; symptomName: string; bodyPart: string }[] | null;
  try {
    symptoms = await prisma.symptom.findMany({
      select: { symptomID: true, symptomName: true, bodyPart: true },
      orderBy: { symptomName: "asc" },
    });
  } catch {
    symptoms = null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Contextual Action */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/patient/assessment/history"
          className="patient-desktop-contextual-link inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="clock" className="h-4 w-4" />
          View Assessment History
        </Link>
      </div>

      <section className="patient-page-intro mb-6">
        <p className="patient-page-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">OPORA · Patient</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">Guided symptom assessment</h1>
        <p className="patient-page-description mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Enter the symptoms you want to include, with their severity and timing. After you submit, OPORA will show condition information linked in the database to at least one selected symptom.
        </p>
      </section>

      <div className="mb-5">
        <AssessmentSafetyNotice />
      </div>

      <section className="rounded-3xl border border-[#EADDE0] bg-white p-6 sm:p-8 shadow-sm">
          {symptoms === null ? (
            <p className="rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="alert">
              The symptom list could not be loaded. Please refresh and try again.
            </p>
          ) : symptoms.length === 0 ? (
            <p className="rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="status">
              The symptom list is not available yet. Please try again later.
            </p>
          ) : (
            <SymptomAssessmentForm symptoms={symptoms} />
          )}
          <p className="mt-6 border-t border-[#F0E6E9] pt-4 text-xs leading-5 text-[#806D74]">
            Assessment details are saved separately from your symptom-tracking history.
          </p>
          <p className="mt-2 text-sm text-[#705660]">Signed in as {principal.fullName}.</p>
        </section>
      </div>
  );
}
