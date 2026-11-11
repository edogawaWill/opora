import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadPatientAssessmentHistory } from "@/lib/assessment-history.mjs";
import prisma from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kuala_Lumpur",
});

export default async function PatientAssessmentHistoryPage() {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const result = await loadPatientAssessmentHistory({
    requirePatient: async () => principal,
    prisma,
  });
  if (result.status === "denied") redirect("/account");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Contextual Action */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/patient/assessment"
          className="patient-desktop-contextual-link inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="plus" className="h-4 w-4" />
          Start New Assessment
        </Link>
      </div>

      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Your saved assessments</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">Assessment history</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">Review an earlier assessment and reopen its related condition information.</p>
      </section>

      {result.status === "error" ? (
        <p className="rounded-2xl border border-[#EADDE0] bg-white p-5 text-sm leading-6 text-[#6B4652]" role="alert">
          Your assessment history could not be loaded right now. Please refresh and try again.
        </p>
      ) : result.assessments.length === 0 ? (
        <section className="rounded-2xl border border-[#EADDE0] bg-white p-6">
          <h2 className="text-lg font-bold text-[#1B1C1B]">No assessments saved yet</h2>
          <p className="mt-2 text-sm leading-6 text-[#705660]">Your completed guided assessments will appear here.</p>
          <Link href="/patient/assessment" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#57152A] shadow-xs">
            Start a new assessment
          </Link>
        </section>
      ) : (
        <ol className="space-y-3">
          {result.assessments.map((assessment) => (
            <li key={assessment.assessmentID}>
              <Link
                href={`/patient/assessment/${assessment.assessmentID}`}
                className="block rounded-2xl border border-[#EADDE0] bg-white p-5 shadow-xs transition hover:border-[#D8AAB5] hover:bg-[#FAF4F4]/40"
              >
                <span className="block text-sm font-bold text-[#6F1D35]">{dateFormatter.format(assessment.assessmentDate)}</span>
                <span className="mt-2 block text-sm leading-6 text-[#705660]">Submitted symptoms: {assessment.symptomsInput}</span>
                <span className="mt-3 inline-block text-sm font-semibold text-[#6F1D35] underline">View saved results</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-6 text-xs leading-5 text-[#705660]">Signed in as {principal.fullName}.</p>
    </div>
  );
}
