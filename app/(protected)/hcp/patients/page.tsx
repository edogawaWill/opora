import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { loadConsentedPatients } from "@/lib/hcp-patient-access.mjs";
import { requireApprovedHcp } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

type PatientsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your authorised patient list…</p>
      </div>
    </div>
  );
}

export default function HcpPatientsPage(props: PatientsPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HcpPatientsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function HcpPatientsContent({ searchParams }: PatientsPageProps) {
  const query = await searchParams;
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const result = await loadConsentedPatients({
    requireApprovedHcp,
    prisma,
    page: requestedPage,
  });

  if (result.status === "denied") redirect("/account");
  if (result.status === "error") {
    return <PageMessage title="Patient list unavailable" message="We could not load your authorised patient list right now. Please refresh to try again." />;
  }

  return (
    <main className={`${styles.desktopPage} ${styles.rosterPage}`}>
      <section className={`${styles.pageIntro} mb-6`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Patient management</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">Authorized patients</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          This list includes only Patients with current active permission for your professional profile.
        </p>
      </section>

      <section aria-label="Authorized patient overview" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/85 bg-white/60 p-4 shadow-sm backdrop-blur-2xl sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A3D53]">Active patient access</p>
          <p className="mt-1 text-sm text-[#705660]">Patient-controlled permission is checked when records are opened.</p>
        </div>
        <p className="shrink-0 text-right text-2xl font-extrabold text-[#6F1D35]" aria-label={`${result.total} authorized patients`}>{result.total}</p>
      </section>

      {result.patients.length === 0 ? (
        <section className="rounded-3xl border border-[#EADDE0] bg-white p-8 text-center" role="status">
          <h2 className="text-lg font-bold text-[#1B1C1B]">No authorized patients yet</h2>
          <p className="mt-2 text-sm text-[#705660]">A Patient will appear here after granting you access.</p>
        </section>
      ) : (
        <section aria-label="Patients who have granted access" className="overflow-hidden rounded-3xl border border-[#EADDE0] bg-white shadow-sm">
          <ul className="divide-y divide-[#EADDE0]">
            {result.patients.map((patient) => (
              <li key={patient.patientID}>
                <Link
                  href={`/hcp/patients/${patient.patientID}`}
                  className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-[#FAF4F4]/50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#6F1D35] sm:px-7"
                >
                  <div>
                    <span className="block font-bold text-[#1B1C1B]">{patient.user.fullName}</span>
                    <span className="mt-1 block text-xs text-[#705660]">Date of birth: {formatDate(patient.dateOfBirth)}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#6F1D35]">View symptom history <span aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Patient list pages" className="mt-6 flex items-center justify-between rounded-2xl border border-[#EADDE0] bg-white px-4 py-3 text-sm">
          <span className="text-[#705660]">Page {result.page} of {result.pageCount}</span>
          <span className="flex gap-4 font-semibold text-[#6F1D35]">
            {result.page > 1 && <Link href={`/hcp/patients?page=${result.page - 1}`} rel="prev">Previous</Link>}
            {result.page < result.pageCount && <Link href={`/hcp/patients?page=${result.page + 1}`} rel="next">Next</Link>}
          </span>
        </nav>
      )}

      <p className="mt-8 border-t border-[#EADDE0] pt-5 text-center text-xs leading-5 text-[#705660]">
        Patient permission can be revoked at any time. Access is checked again whenever this page or a patient record is requested.
      </p>
    </main>
  );
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-[#FCF9F7] px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#E8D9DD] bg-white p-8">
        <Link href="/hcp" className="text-sm font-semibold text-[#6F1D35] underline">Back to dashboard</Link>
        <h1 className="mt-4 text-2xl font-extrabold text-[#35101F]">{title}</h1>
        <p className="mt-3 rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="alert">{message}</p>
      </section>
    </main>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
