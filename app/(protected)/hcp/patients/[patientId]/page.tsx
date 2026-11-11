import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { loadConsentedPatientAssessments, loadConsentedPatientSymptoms, loadConsentedPatientTrend } from "@/lib/hcp-patient-access.mjs";
import { buildSymptomSeverityTrend } from "@/lib/symptom-trend.mjs";
import SymptomTrendChart from "@/components/patient/symptom-trend-chart";
import { Icon } from "@/components/ui/icon";
import { requireApprovedHcp } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

type PatientHistoryPageProps = {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading authorised patient record…</p>
      </div>
    </div>
  );
}

export default function HcpPatientHistoryPage(props: PatientHistoryPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HcpPatientHistoryContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function HcpPatientHistoryContent({ params, searchParams }: PatientHistoryPageProps) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page;

  const [result, trendResult, assessmentResult] = await Promise.all([
    loadConsentedPatientSymptoms({
      requireApprovedHcp,
      prisma,
      patientId,
      page: requestedPage,
    }),
    loadConsentedPatientTrend({
      requireApprovedHcp,
      prisma,
      patientId,
    }),
    loadConsentedPatientAssessments({
      requireApprovedHcp,
      prisma,
      patientId,
    }),
  ]);

  if (result.status === "denied") redirect("/account");
  if (trendResult.status === "denied" || assessmentResult.status === "denied") redirect("/account");
  if (result.status === "unavailable") notFound();
  if (trendResult.status === "unavailable" || assessmentResult.status === "unavailable") notFound();
  if (result.status === "error") {
    return <HistoryError />;
  }

  const patient = result.patient as {
    patientID: number;
    dateOfBirth: Date;
    gender?: string;
    bloodType?: string | null;
    allergies?: string | null;
    emergencyContact?: string | null;
    user: { fullName: string };
  };

  const trend = trendResult.status === "success"
    ? buildSymptomSeverityTrend(trendResult.records)
    : null;

  const assessments = assessmentResult.status === "success"
    ? assessmentResult.assessments
    : [];

  return (
    <main className={`${styles.desktopPage} ${styles.patientDetailPage}`}>
      {/* Contextual navigation action & section jumps */}
      <div className="mb-6 flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/hcp/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Authorised Patients
        </Link>
        <nav aria-label="Patient record sections" className="hcp-patient-section-nav flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-semibold text-[#6F1D35]">
          <a href="#medical-summary" className="shrink-0 rounded-full border border-white/80 bg-white/60 px-3 py-2 hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-[#6F1D35]">Medical summary</a>
          <a href="#symptom-trends" className="shrink-0 rounded-full border border-white/80 bg-white/60 px-3 py-2 hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-[#6F1D35]">14-day trend</a>
          <a href="#assessment-history" className="shrink-0 rounded-full border border-white/80 bg-white/60 px-3 py-2 hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-[#6F1D35]">Assessments</a>
          <a href="#symptom-history" className="shrink-0 rounded-full border border-white/80 bg-white/60 px-3 py-2 hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-[#6F1D35]">Symptoms</a>
        </nav>
      </div>

        <section className={`${styles.patientDetailHero} rounded-3xl border border-white/85 bg-white/60 p-5 shadow-sm backdrop-blur-2xl sm:p-7`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Patient-authorised health record</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#35101F] sm:text-4xl">{patient.user.fullName}</h1>
          <p className="mt-2 text-sm text-[#705660]">Date of birth: {formatDate(patient.dateOfBirth)}</p>
          <p className="mt-4 max-w-3xl rounded-xl border border-[#EADDE0] bg-white p-4 text-sm leading-6 text-[#705660]">
            This page shows health information authorized by the patient for professional review. Information reported by the patient is intended for tracking and clinical context; it is not an automated OPORA diagnosis. Access requires the patient&apos;s active consent and terminates if consent is revoked.
          </p>
        </section>

        {/* FR14: Medical Profile Summary */}
        <section id="medical-summary" className="rounded-3xl border border-[#E8D9DD] bg-white p-5 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
          <div className="border-b border-[#F0E6E8] pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Clinical baseline</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Patient medical profile</h2>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#F0E6E8] bg-[#FDFBFB] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#8A3D53]">Gender</dt>
              <dd className="mt-2 text-base font-semibold text-[#35101F]">{patient.gender || "Not specified"}</dd>
            </div>
            <div className="rounded-2xl border border-[#F0E6E8] bg-[#FDFBFB] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#8A3D53]">Blood type</dt>
              <dd className="mt-2 text-base font-semibold text-[#35101F]">{patient.bloodType || "Not specified"}</dd>
            </div>
            <div className="rounded-2xl border border-[#F0E6E8] bg-[#FDFBFB] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#8A3D53]">Known allergies</dt>
              <dd className="mt-2 text-base font-semibold text-[#35101F]">{patient.allergies || "Not recorded"}</dd>
            </div>
            <div className="rounded-2xl border border-[#F0E6E8] bg-[#FDFBFB] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#8A3D53]">Emergency contact</dt>
              <dd className="mt-2 text-base font-semibold text-[#35101F]">{patient.emergencyContact || "Not recorded"}</dd>
            </div>
          </dl>
        </section>

        {/* FR05 / FR14: 14-day symptom severity trend */}
        <section id="symptom-trends" className="mt-8">
          {trend ? (
            <SymptomTrendChart days={trend.days} summary={trend.summary} />
          ) : (
            <div className="rounded-3xl border border-white/85 bg-white/60 p-5 text-sm text-[#705660] shadow-sm backdrop-blur-2xl" role="status">Symptom trend information is temporarily unavailable.</div>
          )}
        </section>

        <section id="assessment-history" aria-labelledby="assessment-history-heading" className="mt-8 rounded-3xl border border-white/85 bg-white/65 p-5 shadow-sm backdrop-blur-2xl sm:p-7">
          <div className="border-b border-[#F0E6E8] pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Patient-reported history</p>
            <h2 id="assessment-history-heading" className="mt-1 text-xl font-extrabold text-[#35101F]">Guided assessments</h2>
            <p className="mt-1 text-sm text-[#705660]">Saved assessment summaries are informational and are not confirmed diagnoses.</p>
          </div>
          {assessmentResult.status === "error" ? (
            <p className="mt-4 rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="status">Assessment history is temporarily unavailable.</p>
          ) : assessments.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white/65 p-4 text-sm text-[#6B4652]" role="status">No saved guided assessments are available.</p>
          ) : (
            <ul className="divide-y divide-[#F0E6E8]">
              {assessments.map((assessment) => (
                <li key={assessment.assessmentID} className="py-4 first:pt-5 last:pb-1">
                  <p className="text-xs font-semibold text-[#806D74]">{formatDate(assessment.assessmentDate)}</p>
                  <p className="mt-2 text-sm font-semibold text-[#35101F]">Reported symptoms: {assessment.symptomsInput}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#5C454F]">{assessment.resultSummary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FR14: Reported symptoms history */}
        <section id="symptom-history" aria-labelledby="history-heading" className="mt-8 rounded-3xl border border-[#E8D9DD] bg-white p-5 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#F0E6E8] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Read-only history</p>
              <h2 id="history-heading" className="mt-1 text-xl font-extrabold text-[#35101F]">Reported symptoms</h2>
            </div>
            <p className="text-sm text-[#705660]">{result.total} {result.total === 1 ? "record" : "records"}</p>
          </div>

          {result.records.length === 0 ? (
            <p className="mt-5 rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="status">This Patient has no symptom records to display.</p>
          ) : (
            <ol className="divide-y divide-[#F0E6E8]">
              {result.records.map((entry) => (
                <li key={entry.recordID} className="py-5 first:pt-5 last:pb-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#35101F]">{entry.symptom.symptomName}</h3>
                      <p className="mt-1 text-xs text-[#806D74]">{entry.symptom.bodyPart} · Reported {formatDate(entry.recordedAt)}</p>
                    </div>
                    <span className="rounded-full bg-[#FBF4F5] px-3 py-1 text-xs font-bold text-[#6F1D35]">Severity {entry.severity} / 10</span>
                  </div>
                  <dl className="mt-4 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                    <DetailField label="Onset date" value={formatDate(entry.onsetDate)} />
                    <DetailField label="Duration" value={entry.duration} />
                    {entry.notes && <DetailField label="Patient notes" value={entry.notes} />}
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>

        {result.pageCount > 1 && (
          <nav aria-label="Symptom history pages" className="mt-5 flex items-center justify-between rounded-2xl border border-[#E8D9DD] bg-white px-4 py-3 text-sm">
            <span className="text-[#705660]">Page {result.page} of {result.pageCount}</span>
            <span className="flex gap-4 font-semibold text-[#6F1D35]">
              {result.page > 1 && <Link href={`/hcp/patients/${patient.patientID}?page=${result.page - 1}#symptom-history`} rel="prev">Previous</Link>}
              {result.page < result.pageCount && <Link href={`/hcp/patients/${patient.patientID}?page=${result.page + 1}#symptom-history`} rel="next">Next</Link>}
            </span>
          </nav>
        )}
    </main>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words font-medium text-[#4F3540]">{value}</dd>
    </div>
  );
}

function HistoryError() {
  return (
    <main className="min-h-screen bg-[#FCF9F7] px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#E8D9DD] bg-white p-8">
        <Link href="/hcp/patients" className="text-sm font-semibold text-[#6F1D35] underline">Back to your patients</Link>
        <h1 className="mt-4 text-2xl font-extrabold text-[#35101F]">Symptom history unavailable</h1>
        <p className="mt-3 rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="alert">We could not load this authorised record right now. Please refresh to try again.</p>
      </section>
    </main>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
