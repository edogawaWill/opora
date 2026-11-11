import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AssessmentSafetyNotice } from "@/components/patient/assessment-safety-notice";
import { AssessmentConditionResults } from "@/components/patient/assessment-condition-results";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadPatientAssessmentResults } from "@/lib/assessment-results.mjs";
import prisma from "@/lib/prisma";

type ResultsPageProps = { params: Promise<{ assessmentId: string }> };

export default async function PatientAssessmentResultsPage({ params }: ResultsPageProps) {
  const { assessmentId } = await params;
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const result = await loadPatientAssessmentResults({
    requirePatient: async () => principal,
    prisma,
    assessmentID: assessmentId,
  });
  if (result.status === "unavailable") notFound();
  if (result.status === "denied") redirect("/account");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Contextual Action */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/patient/assessment/history"
          className="patient-desktop-contextual-link inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Assessment History
        </Link>
        <Link
          href="/patient/assessment"
          className="patient-desktop-contextual-link inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="plus" className="h-4 w-4" />
          New Assessment
        </Link>
      </div>

      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Assessment saved</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">Related condition information</h1>
        {result.status === "success" ? (
          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">Submitted symptoms: {result.assessment.symptomsInput}</p>
        ) : null}
      </section>

      <div className="space-y-6">
        <AssessmentSafetyNotice />
        {result.status !== "success" ? (
          <p className="rounded-2xl border border-[#EADDE0] bg-white p-5 text-sm leading-6 text-[#6B4652]" role="alert">
            Your assessment was saved, but condition information could not be loaded right now. Please try refreshing this page later.
          </p>
        ) : (
          <AssessmentConditionResults diseases={result.diseases} />
        )}
      </div>

      <p className="mt-8 text-xs leading-5 text-[#705660]">Signed in as {principal.fullName}.</p>
    </div>
  );
}
