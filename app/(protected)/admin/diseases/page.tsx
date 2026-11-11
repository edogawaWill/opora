import { Suspense } from "react";
import { redirect } from "next/navigation";

import DiseaseManagement, {
  type DiseaseManagementRecord,
  type DiseaseSymptomOption,
} from "@/components/admin/disease-management";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import styles from "@/components/admin/admin-desktop.module.css";

const PAGE_SIZE = 20;
type PageProps = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

function LoadingFallback() {
  return (
    <div className="admin-management-page mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading disease information…</p>
      </div>
    </div>
  );
}

export default function AdminDiseasesPage(props: PageProps) {
  return <Suspense fallback={<LoadingFallback />}><AdminDiseasesContent searchParams={props.searchParams} /></Suspense>;
}

async function AdminDiseasesContent({ searchParams }: PageProps) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let records: DiseaseManagementRecord[] = [];
  let symptomOptions: DiseaseSymptomOption[] = [];
  let pageCount = 1;
  let currentPage = 1;
  let loadFailed = false;
  try {
    const [totalRecords, symptoms] = await Promise.all([
      prisma.disease.count({ where: query ? { diseaseName: { contains: query, mode: "insensitive" } } : undefined }),
      prisma.symptom.findMany({
        orderBy: { symptomName: "asc" },
        select: { symptomID: true, symptomName: true },
      }),
    ]);
    pageCount = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    currentPage = Math.min(requestedPage, pageCount);
    const diseases = await prisma.disease.findMany({
      where: query ? { diseaseName: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { diseaseName: "asc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        diseaseID: true,
        diseaseName: true,
        description: true,
        causes: true,
        treatment: true,
        prevention: true,
        whenToSeekCare: true,
        lastUpdated: true,
        diseaseSymptoms: {
          orderBy: { symptom: { symptomName: "asc" } },
          select: { symptom: { select: { symptomID: true, symptomName: true } } },
        },
      },
    });

    records = diseases.map((disease) => ({
      diseaseID: disease.diseaseID,
      diseaseName: disease.diseaseName,
      description: disease.description,
      causes: disease.causes,
      treatment: disease.treatment,
      prevention: disease.prevention,
      whenToSeekCare: disease.whenToSeekCare,
      lastUpdated: disease.lastUpdated.toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" }),
      symptoms: disease.diseaseSymptoms.map(({ symptom }) => symptom),
    }));
    symptomOptions = symptoms;
  } catch {
    console.error("OPORA disease management data lookup failed");
    loadFailed = true;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className={`mb-6 ${styles.pageIntro}`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">OPORA · Administration</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Disease Information Management
        </h1>
        <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Maintain disease and condition information and associate it with entries in the existing symptom catalogue.
        </p>
      </section>

      {loadFailed ? (
        <p className="rounded-2xl border border-[#EADDE0] bg-white p-6 text-sm text-[#7D2639]" role="alert">
          Disease information could not be loaded. Please refresh and try again.
        </p>
      ) : (
        <DiseaseManagement records={records} symptomOptions={symptomOptions} query={query} pageCount={pageCount} currentPage={currentPage} />
      )}
    </div>
  );
}
