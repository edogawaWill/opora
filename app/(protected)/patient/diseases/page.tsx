import { Suspense } from "react";
import { redirect } from "next/navigation";

import PatientDiseaseList, {
  type DiseaseListItem,
} from "@/components/patient/patient-disease-list";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadPatientDiseases } from "@/lib/patient-disease-directory.mjs";
import prisma from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

function LoadingFallback() {
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8">
      <div className="rounded-xl border border-[#EADDE0] bg-white p-8 shadow-xs">
        <p className="text-sm font-semibold text-[#7E2D43] font-['Inter']">
          Loading disease directory…
        </p>
      </div>
    </div>
  );
}

export default function PatientDiseasesPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PatientDiseasesContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PatientDiseasesContent({ searchParams }: PageProps) {
  try {
    await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;

  const result = await loadPatientDiseases({
    requirePatient,
    prisma,
    page: rawPage,
    query: rawQuery,
  });

  const diseases: DiseaseListItem[] =
    result.status === "success" ? result.diseases : [];

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
      {/* Top Editorial Header & Discovery Intro */}
      <section className="patient-disease-directory-hero relative overflow-hidden rounded-xl bg-[#F6F3F1] p-6 md:p-8 shadow-xs border border-[#EADDE0]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EADDE0] text-[#7E2D43] text-[11px] font-['Manrope'] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6F1D35]" />
              Clinical Knowledge Repository
            </div>
            <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-extrabold text-[#1B1C1B] tracking-tight">
              Disease Directory
            </h1>
            <p className="patient-disease-directory-description font-['Inter'] text-xs sm:text-sm text-[#544245] max-w-xl leading-relaxed">
              Explore evidence-backed health condition profiles, educational overviews, and symptom associations for personal health literacy.
            </p>
          </div>

          {/* Quick Registry Telemetry Box */}
          <div className="flex items-center gap-3.5 bg-white p-3.5 rounded-xl border border-[#EADDE0] shadow-2xs self-start md:self-auto">
            <div className="w-10 h-10 rounded-lg bg-[#EADDE0]/60 flex items-center justify-center text-[#6F1D35]">
              <Icon name="verified" className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Manrope'] text-sm sm:text-base font-bold text-[#1B1C1B] leading-tight">
                {result.total} Condition Profiles
              </span>
              <span className="font-['Inter'] text-[11px] text-[#8A737A]">
                Validated Medical Education Catalog
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Directory Component (Search + Cards Grid) */}
      <PatientDiseaseList
        diseases={diseases}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        query={result.query ?? ""}
      />

      {/* Editorial Patient Advisory Notice Banner */}
      <section className="rounded-xl bg-[#F6F3F1] p-5 border border-[#EADDE0] shadow-2xs mt-8">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-[#7E2D43] shadow-2xs mt-0.5">
            <Icon name="info" className="w-5 h-5" />
          </div>
          <div className="flex-1 font-['Inter']">
            <h3 className="font-['Manrope'] text-sm font-bold text-[#1B1C1B] mb-1">
              Clinical Guidance &amp; Patient Advisory Notice
            </h3>
            <p className="text-xs text-[#544245] leading-relaxed">
              Information provided within this directory is compiled for educational reference and symptom literacy only. It does not constitute individual medical diagnosis, prognosis, or prescriptive care. Always review acute symptom onset or condition alterations directly with your designated healthcare provider or emergency medical response team.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
