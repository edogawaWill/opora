import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import HcpAccessPanel, {
  type ActiveHcpConsent,
  type EligibleHcp,
} from "@/components/patient/hcp-access-panel";
import SymptomRecordForm from "@/components/patient/symptom-record-form";
import SymptomHistory from "@/components/patient/symptom-history";
import SymptomTrendChart from "@/components/patient/symptom-trend-chart";
import { Icon, type IconName } from "@/components/ui/icon";
import dashboardStyles from "@/app/(protected)/patient/dashboard-mobile.module.css";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadPatientHcpAccess } from "@/lib/patient-hcp-consent.mjs";
import { loadPatientAppointments } from "@/lib/appointment-queries.mjs";
import { buildSymptomSeverityTrend } from "@/lib/symptom-trend.mjs";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 10;

type DashboardAppointment = {
  appointmentDate: Date | string;
  appointmentTime: Date | string;
  status: string;
  formattedDate: string;
  formattedTime: string;
  reason: string;
  hcp: { fullName: string; specialization: string; workplace: string };
};

type PatientPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function PatientLoadingFallback() {
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8">
      <div className="rounded-xl border border-[#EADDE0] bg-white p-8 shadow-xs">
        <p className="text-sm font-semibold text-[#7E2D43] font-['Inter']">
          Loading your health dashboard…
        </p>
      </div>
    </div>
  );
}

export default function PatientDashboardPage(props: PatientPageProps) {
  return (
    <Suspense fallback={<PatientLoadingFallback />}>
      <PatientDashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PatientDashboardContent({ searchParams }: PatientPageProps) {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const query = await searchParams;
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsedPage =
    requestedPage && /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
  const currentPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let symptomCatalog: { symptomID: number; symptomName: string; bodyPart: string }[];
  let totalRecords: number;
  let latestRecord: {
    recordedAt: Date;
    severity: number;
    notes: string | null;
    symptom: { symptomName: string; bodyPart: string };
  } | null;
  let records: {
    recordID: number;
    symptomID: number;
    severity: number;
    onsetDate: Date;
    duration: string;
    notes: string | null;
    recordedAt: Date;
    symptom: { symptomName: string; bodyPart: string };
  }[];
  let trendRecords: {
    recordID: number;
    severity: number;
    onsetDate: Date;
    recordedAt: Date;
    symptom: { symptomName: string };
  }[] = [];

  try {
    const [symptomRows, count, latestRow, allTrendRows] = await Promise.all([
      prisma.symptom.findMany({
        select: { symptomID: true, symptomName: true, bodyPart: true },
        orderBy: { symptomName: "asc" },
      }),
      prisma.symptomRecord.count({
        where: { patientID: principal.patient!.patientID },
      }),
      prisma.symptomRecord.findFirst({
        where: { patientID: principal.patient!.patientID },
        select: {
          recordedAt: true,
          severity: true,
          notes: true,
          symptom: { select: { symptomName: true, bodyPart: true } },
        },
        orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
      }),
      prisma.symptomRecord.findMany({
        where: { patientID: principal.patient!.patientID },
        select: {
          recordID: true,
          severity: true,
          onsetDate: true,
          recordedAt: true,
          symptom: { select: { symptomName: true } },
        },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    symptomCatalog = symptomRows;
    totalRecords = count;
    latestRecord = latestRow;
    trendRecords = allTrendRows;

    const pageCount = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    const safePage = Math.min(currentPage, pageCount);
    records = await prisma.symptomRecord.findMany({
      where: { patientID: principal.patient!.patientID },
      select: {
        recordID: true,
        symptomID: true,
        severity: true,
        onsetDate: true,
        duration: true,
        notes: true,
        recordedAt: true,
        symptom: { select: { symptomName: true, bodyPart: true } },
      },
      orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  } catch {
    return <DashboardDataError fullName={principal.fullName} />;
  }

  const pageCount = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const trend = buildSymptomSeverityTrend(trendRecords);

  const [hcpAccess, appointmentsResult] = await Promise.all([
    loadPatientHcpAccess({ requirePatient, prisma }),
    loadPatientAppointments({ requirePatient, prisma }),
  ]);

  const eligibleHcps: EligibleHcp[] =
    hcpAccess.status === "success"
      ? hcpAccess.eligibleHcps.map((hcp) => ({
          hcpID: hcp.hcpID,
          fullName: hcp.user.fullName,
          specialization: hcp.specialization,
          workplace: hcp.workplace,
        }))
      : [];

  const activeConsents: ActiveHcpConsent[] =
    hcpAccess.status === "success"
      ? hcpAccess.activeConsents.map((consent) => ({
          consentID: consent.consentID,
          hcpID: consent.hcpID,
          fullName: consent.hcp.user.fullName,
          specialization: consent.hcp.specialization,
          workplace: consent.hcp.workplace,
          grantedAt: consent.grantedAt.toISOString(),
        }))
      : [];
  const hcpAccessError =
    hcpAccess.status === "error" ? hcpAccess.message : null;

  // Derive next upcoming appointment if any exists
  const upcomingAppointments: DashboardAppointment[] =
    appointmentsResult.status === "success" && Array.isArray(appointmentsResult.appointments)
      ? appointmentsResult.appointments.filter(
          (a: { status: string }) =>
            a.status === "Confirmed" || a.status === "Pending"
        )
      : [];
  const nextAppointment = findNextAppointment(upcomingAppointments);
  const mobileNextAppointment = nextAppointment;

  // Active care monitor (primary consented HCP if one exists)
  const primaryConsent = activeConsents.length > 0 ? activeConsents[0] : null;

  return (
    <>
      <section className={`${dashboardStyles.mobileDashboard} patient-mobile-dashboard`} aria-label="Patient dashboard">
        <div className="space-y-5">
          {mobileNextAppointment ? (
            <section className={`${dashboardStyles.appointmentHero} patient-mobile-appointment-hero rounded-[1.5rem] p-5 text-white shadow-[0_18px_38px_rgba(83,29,48,0.25)]`} aria-labelledby="mobile-appointment-title">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-['Manrope'] font-bold uppercase tracking-wide">
                  {mobileNextAppointment.status} appointment
                </span>
                <Icon name="calendar" className="h-5 w-5 text-white/80" />
              </div>
              <h1 id="mobile-appointment-title" className="mt-4 font-['Manrope'] text-xl font-bold">
                {mobileNextAppointment.hcp.fullName}
              </h1>
              <p className="mt-1 text-sm text-white/80">{mobileNextAppointment.hcp.specialization}</p>
              <div className="mt-4 rounded-2xl bg-[#57152A]/70 p-4">
                <p className="font-['Manrope'] font-bold">{mobileNextAppointment.formattedDate} · {mobileNextAppointment.formattedTime}</p>
                <p className="mt-1 text-sm text-white/80">{mobileNextAppointment.reason}</p>
                <p className="mt-1 text-xs text-white/70">{mobileNextAppointment.hcp.workplace}</p>
              </div>
              <Link href="/patient/appointments" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 font-['Manrope'] text-sm font-bold text-[#6F1D35]">
                View appointments
              </Link>
            </section>
          ) : (
            <section className={`${dashboardStyles.appointmentHero} patient-mobile-appointment-hero rounded-[1.5rem] p-5 text-white shadow-[0_18px_38px_rgba(83,29,48,0.25)]`}>
              <span className="text-xs font-bold uppercase tracking-wide text-white/75">Your care, at a glance</span>
              <h1 className="mt-2 font-['Manrope'] text-2xl font-bold">Welcome, {principal.fullName}</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/85">Keep your personal symptom record up to date and review it with your healthcare professional.</p>
              <Link href="/patient/appointments" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 font-['Manrope'] text-sm font-bold text-[#6F1D35]">
                Book an appointment
              </Link>
            </section>
          )}

          <section aria-labelledby="mobile-actions-heading">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 id="mobile-actions-heading" className="font-['Manrope'] text-base font-bold text-[#1B1C1B]">Your health</h2>
              <span className="text-xs text-[#7E2D43]">Quick access</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href="#mobile-record-symptom" className={`${dashboardStyles.glassCard} patient-mobile-glass-card flex min-h-32 flex-col justify-between rounded-2xl p-4`}>
                <Icon name="plus" className="h-6 w-6 text-[#6F1D35]" /><span><strong className="block font-['Manrope'] text-sm">Log symptom</strong><span className="mt-1 block text-xs text-[#544245]">Record how you feel</span></span>
              </a>
              <Link href="/patient/assessment" className={`${dashboardStyles.glassCard} patient-mobile-glass-card flex min-h-32 flex-col justify-between rounded-2xl p-4`}>
                <Icon name="assessment" className="h-6 w-6 text-[#236789]" /><span><strong className="block font-['Manrope'] text-sm">Guided assessment</strong><span className="mt-1 block text-xs text-[#544245]">Review your symptoms</span></span>
              </Link>
              <Link href="/patient/diseases" className={`${dashboardStyles.glassCard} patient-mobile-glass-card flex min-h-32 flex-col justify-between rounded-2xl p-4`}>
                <Icon name="disease" className="h-6 w-6 text-[#16735A]" /><span><strong className="block font-['Manrope'] text-sm">Disease directory</strong><span className="mt-1 block text-xs text-[#544245]">Browse health information</span></span>
              </Link>
              <Link href="/patient/history" className={`${dashboardStyles.glassCard} patient-mobile-glass-card flex min-h-32 flex-col justify-between rounded-2xl p-4`}>
                <Icon name="calendar" className="h-6 w-6 text-[#9A5A16]" /><span><strong className="block font-['Manrope'] text-sm">Health history</strong><span className="mt-1 block text-xs text-[#544245]">Review your record</span></span>
              </Link>
            </div>
          </section>

          <section id="mobile-symptom-trends" className={`${dashboardStyles.trendCard} patient-mobile-trend-card`} aria-label="Symptom trends">
            <SymptomTrendChart days={trend.days} summary={trend.summary} title="Your symptom trend" subtitle="A view of your last 14 days" gradientId="oporaMobileCurveGradient" />
          </section>

          <section id="mobile-recent-symptom" className={`${dashboardStyles.glassCard} patient-mobile-glass-card rounded-2xl p-4`} aria-labelledby="mobile-latest-heading">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EADDE0] text-[#6F1D35]"><Icon name="activity" className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="mobile-latest-heading" className="font-['Manrope'] text-sm font-bold">Recent symptom record</h2>
                {latestRecord ? <><p className="mt-1 text-sm font-semibold">{latestRecord.symptom.symptomName} · severity {latestRecord.severity}/10</p><p className="mt-1 text-xs text-[#544245]">{formatDate(latestRecord.recordedAt)} · {latestRecord.symptom.bodyPart}</p></> : <p className="mt-1 text-sm text-[#544245]">No symptoms recorded yet.</p>}
              </div>
            </div>
            <Link href="#symptom-history" className="mt-3 inline-flex min-h-10 items-center font-['Manrope'] text-sm font-bold text-[#6F1D35]">View symptom records <Icon name="chevron-right" className="ml-1 h-4 w-4" /></Link>
          </section>

          <section id="mobile-record-symptom" className={`${dashboardStyles.glassCard} patient-mobile-glass-card scroll-mt-24 rounded-2xl p-4`}>
            <h2 className="font-['Manrope'] text-base font-bold">Record a symptom</h2>
            <p className="mb-4 mt-1 text-xs leading-relaxed text-[#544245]">Add what you noticed and when it began.</p>
            {symptomCatalog.length > 0 ? <SymptomRecordForm symptoms={symptomCatalog} idPrefix="mobile" /> : <p role="status" className="rounded-xl bg-[#F6F3F1] p-3 text-sm text-[#544245]">The symptom catalog is currently unavailable. Please try again later.</p>}
          </section>

          <section className={`${dashboardStyles.glassCard} patient-mobile-glass-card rounded-2xl p-4`} aria-labelledby="mobile-care-heading">
            <div className="flex items-center gap-2"><Icon name="hcp" className="h-5 w-5 text-[#6F1D35]"/><h2 id="mobile-care-heading" className="font-['Manrope'] font-bold">Healthcare professional access</h2></div>
            {primaryConsent ? <p className="mt-2 text-sm text-[#544245]">You have an active consent with {primaryConsent.fullName} ({primaryConsent.specialization}).</p> : <p className="mt-2 text-sm text-[#544245]">No healthcare professional currently has access to your health history.</p>}
            {hcpAccessError && <p role="status" className="mt-2 text-xs text-[#7E2D43]">Access details are temporarily unavailable.</p>}
            <Link href="#hcp-access" className="mt-3 inline-flex min-h-10 items-center font-['Manrope'] text-sm font-bold text-[#6F1D35]">Review permissions <Icon name="chevron-right" className="ml-1 h-4 w-4" /></Link>
          </section>

          <p className="rounded-2xl border border-[#EADDE0] bg-[#F6F3F1]/85 p-4 text-xs leading-relaxed text-[#544245]">
            <strong className="text-[#1B1C1B]">Health information notice:</strong> Your symptom records and assessment results are informational and are not a medical diagnosis. Consult your healthcare professional about health concerns. In an emergency, contact local emergency services.
          </p>
        </div>
      </section>
      <div className={`${dashboardStyles.desktopDashboard} patient-dashboard-desktop-page hidden lg:block`}>
        <main className={`${dashboardStyles.desktopContent} mx-auto max-w-[1520px] space-y-7 px-6 pb-10 pt-6 xl:px-10`}>
          <section id="patient-overview" className={`${dashboardStyles.desktopHero} flex flex-col justify-between gap-7 rounded-[1.5rem] border p-8 text-white shadow-xl xl:flex-row xl:items-center xl:px-10 xl:py-9`}>
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-['Manrope'] text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#F4CAD5]" />
                Personal health dashboard · Informational
              </p>
              <h1 className="mt-4 font-['Manrope'] text-3xl font-extrabold tracking-tight md:text-4xl xl:text-[2.65rem]">
                Welcome back, {principal.fullName}
              </h1>
              <p className="mt-3 max-w-2xl font-['Inter'] text-sm leading-relaxed text-white/80 md:text-base">
                Review your symptom records, health history, and upcoming care in one place.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <a href="#record-symptom" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-['Manrope'] text-sm font-bold text-[#5B1028] shadow-md transition hover:bg-[#FCF9F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <Icon name="plus" className="h-4 w-4" /> Record a symptom
              </a>
              <Link href="/patient/assessment" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 font-['Manrope'] text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <Icon name="assessment" className="h-4 w-4" /> Start guided assessment
              </Link>
            </div>
          </section>

          <section aria-label="Health overview" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <article className={`${dashboardStyles.desktopGlassCard} rounded-2xl p-5`}>
              <div className="flex items-center justify-between"><p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6B4C55]">Symptom records</p><Icon name="file-text" className="h-5 w-5 text-[#6F1D35]" /></div>
              <p className="mt-5 font-['Manrope'] text-4xl font-extrabold text-[#6F1D35]">{totalRecords}</p>
              <p className="mt-1 font-['Inter'] text-xs text-[#544245]">{totalRecords === 1 ? "record in your history" : "records in your history"}</p>
            </article>
            <article className={`${dashboardStyles.desktopGlassCard} rounded-2xl p-5`}>
              <div className="flex items-center justify-between"><p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6B4C55]">Latest symptom</p><Icon name="clock" className="h-5 w-5 text-[#6F1D35]" /></div>
              {latestRecord ? <><p className="mt-5 truncate font-['Manrope'] text-xl font-bold text-[#31131D]">{latestRecord.symptom.symptomName}</p><p className="mt-1 font-['Inter'] text-xs text-[#544245]">{formatDate(latestRecord.recordedAt)} · Severity {latestRecord.severity}/10</p></> : <p className="mt-5 font-['Inter'] text-sm text-[#544245]">No symptom records yet</p>}
            </article>
            <article className={`${dashboardStyles.desktopGlassCard} rounded-2xl p-5`}>
              <div className="flex items-center justify-between"><p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6B4C55]">14-day activity</p><Icon name="chart" className="h-5 w-5 text-[#6F1D35]" /></div>
              <p className="mt-5 font-['Manrope'] text-4xl font-extrabold text-[#6F1D35]">{trend.summary.activeDays}<span className="text-xl font-semibold text-[#775E66]"> / 14</span></p>
              <p className="mt-1 font-['Inter'] text-xs text-[#544245]">days with symptom records</p>
            </article>
            <article className={`${dashboardStyles.desktopGlassCard} rounded-2xl p-5`}>
              <div className="flex items-center justify-between"><p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6B4C55]">Next appointment</p><Icon name="calendar" className="h-5 w-5 text-[#6F1D35]" /></div>
              {appointmentsResult.status === "error" ? <><p className="mt-5 font-['Manrope'] text-lg font-bold text-[#31131D]">Unavailable</p><p className="mt-1 font-['Inter'] text-xs text-[#544245]">Appointment details could not be loaded.</p></> : nextAppointment ? <><p className="mt-5 font-['Manrope'] text-lg font-bold text-[#31131D]">{nextAppointment.formattedDate}</p><p className="mt-1 truncate font-['Inter'] text-xs text-[#544245]">{nextAppointment.formattedTime} · {nextAppointment.hcp.fullName}</p><p className="mt-1 font-['Inter'] text-[11px] font-semibold text-[#6F1D35]">{nextAppointment.status} · {nextAppointment.hcp.specialization}</p></> : <><p className="mt-5 font-['Manrope'] text-lg font-bold text-[#31131D]">No upcoming appointment</p><Link href="/patient/appointments" className="mt-1 inline-flex items-center gap-1 font-['Inter'] text-xs font-semibold text-[#6F1D35] hover:underline">View appointments <Icon name="arrow-right" className="h-3 w-3" /></Link></>}
            </article>
          </section>

          <section className="grid grid-cols-12 items-start gap-6">
            <div className="col-span-12 flex min-w-0 flex-col gap-6 xl:col-span-8">
              <section id="symptom-trends" className="scroll-mt-24">
                <div className={`${dashboardStyles.desktopGlassCard} rounded-[1.5rem] p-5 xl:p-7`}>
                  <SymptomTrendChart days={trend.days} summary={trend.summary} title="14-Day Symptom Severity Curve" subtitle="Your recorded symptom severity over the last 14 days" gradientId="oporaDesktopCurveGradient" showSeverityFilters showMissingAsGaps neutralScaleLabels sparseAxisLabels />
                </div>
              </section>
              {latestRecord && <article className={`${dashboardStyles.desktopGlassCard} rounded-2xl border-l-4 border-l-[#6F1D35] p-5`}>
                <p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6F1D35]">Recent record</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-['Manrope'] text-lg font-bold text-[#26151A]">{latestRecord.symptom.symptomName} · Severity {latestRecord.severity}/10</h2><p className="mt-1 font-['Inter'] text-sm text-[#544245]">Recorded {formatDate(latestRecord.recordedAt)} · {latestRecord.symptom.bodyPart}</p>{latestRecord.notes && <p className="mt-2 font-['Inter'] text-sm text-[#544245]">{latestRecord.notes}</p>}</div><a href="#symptom-history" className="font-['Manrope'] text-sm font-bold text-[#6F1D35] hover:underline">Review symptom history →</a></div>
              </article>}
              <section id="record-symptom" className={`${dashboardStyles.desktopGlassCard} scroll-mt-24 rounded-2xl p-6 xl:p-7`}>
                <div className="mb-5"><p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#6F1D35]">Personal tracking</p><h2 className="mt-1 font-['Manrope'] text-2xl font-bold text-[#211116]">Record a symptom</h2><p className="mt-1 font-['Inter'] text-sm text-[#544245]">Add what you noticed and when it began.</p></div>
                {symptomCatalog.length ? <SymptomRecordForm symptoms={symptomCatalog} /> : <p role="status" className="rounded-xl bg-white/70 p-4 text-sm text-[#544245]">The symptom catalog is currently unavailable. Please try again later.</p>}
              </section>
              <section id="symptom-history" className="scroll-mt-24"><SymptomHistory records={records.map((record) => ({ recordID: record.recordID, symptomID: record.symptomID, severity: record.severity, onsetDate: record.onsetDate.toISOString().slice(0, 10), onsetDateLabel: formatDate(record.onsetDate), duration: record.duration, notes: record.notes, recordedAtLabel: formatDate(record.recordedAt), symptom: record.symptom }))} totalRecords={totalRecords} pageCount={pageCount} currentPage={safePage} symptoms={symptomCatalog} /></section>
              <section id="hcp-access" className="scroll-mt-24"><HcpAccessPanel eligibleHcps={eligibleHcps} activeConsents={activeConsents} loadError={hcpAccessError} /></section>
            </div>

            <aside className="col-span-12 flex flex-col gap-6 xl:col-span-4">
              <section className={`${dashboardStyles.desktopGlassCard} rounded-2xl p-6`} aria-labelledby="desktop-care-title">
                <div className="flex items-center justify-between gap-3"><h2 id="desktop-care-title" className="font-['Manrope'] text-lg font-bold text-[#27131A]">Care team &amp; appointments</h2>{primaryConsent && <span className="rounded-full bg-[#EADDE0] px-3 py-1 font-['Inter'] text-[11px] font-semibold text-[#6F1D35]">Active consent</span>}</div>
                <div className="mt-4 border-t border-[#7E2D43]/15 pt-4">
                  {hcpAccessError ? <p role="status" className="text-sm text-[#544245]">Your consented healthcare professional details are temporarily unavailable.</p> : primaryConsent ? <div className="flex items-center gap-3 rounded-xl bg-white/70 p-4"><span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6F1D35] font-['Manrope'] font-bold text-white">{primaryConsent.fullName.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-['Manrope'] font-bold text-[#25151A]">{primaryConsent.fullName}</p><p className="truncate font-['Inter'] text-xs text-[#544245]">{primaryConsent.specialization}</p><p className="truncate font-['Inter'] text-xs text-[#705660]">{primaryConsent.workplace}</p></div></div> : <p className="rounded-xl bg-white/55 p-4 font-['Inter'] text-sm text-[#544245]">No healthcare professional currently has active access to your health history.</p>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3"><Link href="/patient/messages" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-3 text-center font-['Manrope'] text-xs font-bold text-white hover:bg-[#57152A]">Messages</Link><a href="#hcp-access" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#7E2D43]/25 bg-white/60 px-3 text-center font-['Manrope'] text-xs font-bold text-[#6F1D35] hover:bg-white">Consent settings</a></div>
                <Link href="/patient/appointments" className="mt-3 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7E2D43]/20 bg-white/60 px-3 font-['Manrope'] text-sm font-semibold text-[#6F1D35] hover:bg-white"><Icon name="calendar" className="h-4 w-4" /> View appointments</Link>
              </section>
              <section className="rounded-2xl border border-white/25 bg-[#501126]/90 p-6 text-white shadow-lg">
                <div className="flex items-center gap-2"><Icon name="info" className="h-4 w-4 text-[#F4CAD5]" /><h2 className="font-['Manrope'] text-sm font-bold">A note about your health information</h2></div>
                <p className="mt-3 font-['Inter'] text-xs leading-relaxed text-white/85">Your symptom records and assessment results are informational and are not a medical diagnosis. Consult your healthcare professional about health concerns. In an emergency, contact local emergency services.</p>
              </section>
            </aside>
          </section>
          <section aria-label="Quick access" className="grid gap-4 md:grid-cols-3">
            <DashboardShortcut href="/patient/diseases" icon="disease" title="Browse Disease Directory" description="Read health information and condition profiles" />
            <DashboardShortcut href="/patient/history" icon="health" title="Health History" description="Review your health history" />
            <DashboardShortcut href="/patient/assessment" icon="assessment" title="Guided Assessments" description="Review your symptoms" />
          </section>
          <div className={`${dashboardStyles.desktopGlassCard} flex items-start gap-3 rounded-xl p-4 font-['Inter'] text-xs leading-relaxed text-[#49353C]`}>
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-[#6F1D35]" />
            <p><strong className="font-semibold text-[#27131A]">Patient advisory:</strong> Health information shown here is self-reported for personal tracking and awareness. OPORA does not provide medical diagnosis or prescribe care. Discuss health concerns and treatment decisions with your healthcare professional. In an emergency, contact local emergency services.</p>
          </div>
        </main>
      </div>
    </>
  );
}

function findNextAppointment(appointments: DashboardAppointment[]) {
  const now = Date.now();
  return appointments
    .map((appointment) => {
      const date = new Date(appointment.appointmentDate);
      const time = new Date(appointment.appointmentTime);
      if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return null;
      return {
        appointment,
        timestamp: Date.UTC(
          date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
          time.getUTCHours(), time.getUTCMinutes(),
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp)[0]?.appointment ?? null;
}

function DashboardDataError({ fullName }: { fullName: string }) {
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-10">
      <div className="rounded-xl border border-[#EADDE0] bg-white p-8 shadow-xs">
        <p className="font-['Manrope'] text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
          OPORA · Patient Dashboard
        </p>
        <h1 className="font-['Manrope'] mt-2 text-2xl font-extrabold text-[#1B1C1B]">
          Welcome, {fullName}
        </h1>
        <p
          className="font-['Inter'] mt-4 rounded-xl bg-[#FFDAD6]/30 border border-[#BA1A1A]/20 p-4 text-sm text-[#BA1A1A]"
          role="alert"
        >
          Your dashboard data could not load right now. Please refresh the page to try again.
        </p>
      </div>
    </div>
  );
}

function DashboardShortcut({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="desktop-quick-access-card group flex items-center gap-3 rounded-xl border border-white/80 bg-white/60 p-3 transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
    >
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EADDE0] text-[#6F1D35]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-['Manrope'] text-sm font-bold text-[#2A151C]">{title}</span>
        <span className="mt-0.5 block font-['Inter'] text-xs text-[#544245]">{description}</span>
      </span>
      <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-[#6F1D35] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
