import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import SymptomTrendChart from "@/components/patient/symptom-trend-chart";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { buildSymptomSeverityTrend } from "@/lib/symptom-trend.mjs";
import prisma from "@/lib/prisma";

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your health history…</p>
      </div>
    </div>
  );
}

export default function PatientHealthHistoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PatientHealthHistoryContent />
    </Suspense>
  );
}

async function PatientHealthHistoryContent() {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const patientID = principal.patient!.patientID;

  const [symptomRecords, assessments, appointments] = await Promise.all([
    prisma.symptomRecord.findMany({
      where: { patientID },
      select: {
        recordID: true,
        severity: true,
        onsetDate: true,
        recordedAt: true,
        duration: true,
        symptom: { select: { symptomName: true, bodyPart: true } },
      },
      orderBy: [{ recordedAt: "desc" }, { recordID: "desc" }],
    }),
    prisma.assessment.findMany({
      where: { patientID },
      take: 5,
      orderBy: [{ assessmentDate: "desc" }, { assessmentID: "desc" }],
      select: {
        assessmentID: true,
        assessmentDate: true,
        symptomsInput: true,
        resultSummary: true,
      },
    }),
    prisma.appointment.findMany({
      where: { patientID },
      take: 5,
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
      include: {
        hcp: {
          select: {
            specialization: true,
            user: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const trendData = buildSymptomSeverityTrend(symptomRecords);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="patient-page-intro mb-6">
        <p className="patient-page-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Medical Timeline</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Patient Health History
        </h1>
        <p className="patient-page-description mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          An organized history of your recorded symptoms, 14-day severity trends, guided assessments, and clinical interactions.
        </p>
      </section>

      <div className="space-y-10">
        {/* FR05: 14-Day Symptom Severity Trend */}
        <section id="severity-trend">
          <SymptomTrendChart
            days={trendData.days}
            summary={trendData.summary}
            title="14-Day Symptom Severity Trend"
            subtitle="Aggregated observation history over the past 14 days."
          />
        </section>

          {/* Assessment History Summary */}
          <section className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#F0E6E8] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Guided Assessments</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Recent assessment records</h2>
              </div>
              <Link
                href="/patient/assessment/history"
                className="text-xs font-bold text-[#6F1D35] hover:underline"
              >
                View all &rarr;
              </Link>
            </div>

            {assessments.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#FBF4F5] p-4 text-xs text-[#705660]">
                No guided assessments taken yet. You can complete an assessment anytime to review informational condition possibilities.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#F0E6E8]">
                {assessments.map((a) => (
                  <li key={a.assessmentID} className="py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#35101F]">
                        {new Date(a.assessmentDate).toLocaleDateString("en-MY", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-[#705660]">Reported: {a.symptomsInput}</p>
                    </div>
                    <Link
                      href={`/patient/assessment/${a.assessmentID}`}
                      className="text-xs font-semibold text-[#6F1D35] hover:underline"
                    >
                      View results &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Appointments Summary */}
          <section className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#F0E6E8] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Clinical Interactions</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Scheduled appointments</h2>
              </div>
              <Link
                href="/patient/appointments"
                className="text-xs font-bold text-[#6F1D35] hover:underline"
              >
                Manage visits &rarr;
              </Link>
            </div>

            {appointments.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#FBF4F5] p-4 text-xs text-[#705660]">
                No appointments booked yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#F0E6E8]">
                {appointments.map((appt) => (
                  <li key={appt.appointmentID} className="py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#35101F]">
                        {appt.hcp.user.fullName} ({appt.hcp.specialization})
                      </p>
                      <p className="text-xs text-[#705660]">
                        Date: {new Date(appt.appointmentDate).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })} · Status: <span className="font-semibold text-[#6F1D35]">{appt.status}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
    </main>
  );
}
