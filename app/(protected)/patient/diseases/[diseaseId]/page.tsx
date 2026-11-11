import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { AssessmentSafetyNotice } from "@/components/patient/assessment-safety-notice";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadPatientDiseaseDetail } from "@/lib/patient-disease-directory.mjs";
import prisma from "@/lib/prisma";

type PageProps = {
  params: Promise<{ diseaseId: string }>;
};

function LoadingFallback() {
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8">
      <div className="rounded-xl border border-[#EADDE0] bg-white p-8 shadow-xs">
        <p className="text-sm font-semibold text-[#7E2D43] font-['Inter']">
          Loading condition information…
        </p>
      </div>
    </div>
  );
}

export default function PatientDiseaseDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PatientDiseaseDetailContent params={props.params} />
    </Suspense>
  );
}

async function PatientDiseaseDetailContent({ params }: PageProps) {
  try {
    await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const { diseaseId } = await params;
  const result = await loadPatientDiseaseDetail({
    requirePatient,
    prisma,
    diseaseId,
  });

  if (result.status === "denied") redirect("/account");
  if (result.status === "unavailable" || !result.disease) notFound();
  if (result.status === "error") {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-10">
        <div className="max-w-2xl mx-auto rounded-xl border border-[#EADDE0] bg-white p-8 shadow-xs space-y-4">
          <Link
            href="/patient/diseases"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F1D35] hover:underline"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
            <span>Back to disease directory</span>
          </Link>
          <h1 className="font-['Manrope'] text-2xl font-bold text-[#1B1C1B]">
            Condition Information Unavailable
          </h1>
          <p className="font-['Inter'] text-sm text-[#544245]">
            We could not load this disease information right now. Please refresh the page or return to the directory.
          </p>
        </div>
      </div>
    );
  }

  const disease = result.disease;

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/patient/diseases"
          className="patient-desktop-contextual-link inline-flex items-center gap-1.5 font-['Inter'] text-xs font-bold text-[#6F1D35] hover:text-[#520420] transition-colors"
        >
          <Icon name="chevron-left" className="w-4 h-4" />
          <span>Back to Disease Directory</span>
        </Link>
      </div>

      {/* Title & Overview Banner */}
      <section className="relative overflow-hidden rounded-xl bg-[#F6F3F1] p-6 md:p-8 shadow-xs border border-[#EADDE0] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EADDE0] text-[#7E2D43] text-[11px] font-['Manrope'] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6F1D35]" />
            Educational Condition Overview
          </span>
          <span className="font-['Inter'] text-xs text-[#8A737A]">
            Catalog entry #{disease.diseaseID}
          </span>
        </div>

        <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-extrabold text-[#1B1C1B] tracking-tight">
          {disease.diseaseName}
        </h1>

        <p className="font-['Inter'] text-sm md:text-base leading-relaxed text-[#544245]">
          {disease.description}
        </p>
      </section>

      {/* Safety Warning */}
      <AssessmentSafetyNotice />

      {/* Content Modules */}
      <div className="space-y-6 font-['Inter']">
        {/* Associated Symptoms */}
        <section className="rounded-xl border border-[#EADDE0] bg-white p-5 md:p-6 shadow-xs space-y-3">
          <h2 className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
            Frequently Associated Symptoms
          </h2>
          <p className="text-xs text-[#544245]">
            The following symptoms from OPORA&apos;s standard catalog are commonly observed in clinical reference records for {disease.diseaseName}. Presence or absence of these symptoms does not confirm or rule out this condition.
          </p>

          {disease.symptoms.length === 0 ? (
            <p className="text-xs italic text-[#8A737A]">
              No associated symptoms recorded for this condition yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {disease.symptoms.map(
                (symptom: {
                  symptomID: number;
                  symptomName: string;
                  bodyPart: string;
                  description?: string;
                }) => (
                  <div
                    key={symptom.symptomID}
                    className="rounded-lg border border-[#EADDE0]/60 bg-[#F6F3F1] p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#1B1C1B]">
                        {symptom.symptomName}
                      </span>
                      <span className="rounded-full bg-[#EADDE0] px-2 py-0.5 text-[10px] font-semibold text-[#6F1D35]">
                        {symptom.bodyPart}
                      </span>
                    </div>
                    {symptom.description && (
                      <p className="text-[11px] text-[#544245] leading-relaxed">
                        {symptom.description}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Causes & Risk Factors */}
        <section className="rounded-xl border border-[#EADDE0] bg-white p-5 md:p-6 shadow-xs space-y-2">
          <h2 className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
            Causes &amp; Etiology
          </h2>
          <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-[#544245]">
            {disease.causes}
          </p>
        </section>

        {/* Treatment & Management */}
        <section className="rounded-xl border border-[#EADDE0] bg-white p-5 md:p-6 shadow-xs space-y-3">
          <h2 className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
            Treatment &amp; Management Overview
          </h2>
          <div className="rounded-lg bg-[#F6F3F1] p-3 text-xs text-[#7E2D43] border border-[#EADDE0]">
            <strong>Notice:</strong> This treatment overview is educational only. It does not constitute a prescription, clinical directive, or personalized treatment plan. Consult a qualified healthcare professional before taking any medication or altering your health regimen.
          </div>
          <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-[#544245]">
            {disease.treatment}
          </p>
        </section>

        {/* Prevention */}
        <section className="rounded-xl border border-[#EADDE0] bg-white p-5 md:p-6 shadow-xs space-y-2">
          <h2 className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
            Prevention &amp; Lifestyle Measures
          </h2>
          <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-[#544245]">
            {disease.prevention}
          </p>
        </section>

        {/* When to Seek Medical Care */}
        <section className="rounded-xl border border-[#EADDE0] bg-white p-5 md:p-6 shadow-xs space-y-2">
          <h2 className="font-['Manrope'] text-base md:text-lg font-bold text-[#6F1D35]">
            When to Seek Medical Care
          </h2>
          <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-[#544245]">
            {disease.whenToSeekCare}
          </p>
        </section>

        {/* Action Links */}
        <section className="rounded-xl border border-[#EADDE0] bg-[#F6F3F1] p-6 text-center space-y-3">
          <h3 className="font-['Manrope'] text-base font-bold text-[#1B1C1B]">
            Have questions about symptoms you are experiencing?
          </h3>
          <p className="text-xs text-[#544245] max-w-lg mx-auto">
            Log what you noticed in your personal symptom journal or consult with a verified healthcare professional.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/patient#record-symptom"
              className="inline-flex items-center justify-center rounded-xl bg-[#6F1D35] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#57152A] transition-colors"
            >
              Record a symptom
            </Link>
            <Link
              href="/patient/assessment"
              className="inline-flex items-center justify-center rounded-xl border border-[#EADDE0] bg-white px-4 py-2.5 text-xs font-bold text-[#6F1D35] hover:bg-[#F6F3F1] transition-colors"
            >
              Guided assessment
            </Link>
            <Link
              href="/patient/appointments"
              className="inline-flex items-center justify-center rounded-xl border border-[#EADDE0] bg-white px-4 py-2.5 text-xs font-bold text-[#6F1D35] hover:bg-[#F6F3F1] transition-colors"
            >
              Book HCP appointment
            </Link>
          </div>
        </section>
      </div>

      {/* Attribution & Reference Footer */}
      <footer className="pt-4 border-t border-[#EADDE0] text-center text-[11px] leading-relaxed text-[#8A737A]">
        <p>
          Educational health topic content is sourced from MedlinePlus, a service of the National Library of Medicine (NLM), National Institutes of Health (NIH).
        </p>
        <p className="mt-1">
          Symptom terms are mapped to the Human Phenotype Ontology (HPO), version 2026-09-01. HPO and NLM do not endorse OPORA.
        </p>
      </footer>
    </div>
  );
}
