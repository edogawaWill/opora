import { Suspense } from "react";
import { redirect } from "next/navigation";

import HcpAppointmentSchedule from "@/components/hcp/hcp-appointment-schedule";
import HcpAppointmentDetail from "@/components/hcp/hcp-appointment-detail";
import { AuthorizationError, requireApprovedHcp } from "@/lib/authorization";
import {
  loadHcpAppointmentDetail,
  loadHcpAppointments,
} from "@/lib/appointment-queries.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

type PageProps = {
  searchParams: Promise<{ status?: string | string[]; selected?: string | string[] }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading clinical schedule…</p>
      </div>
    </div>
  );
}

export default function HcpAppointmentsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HcpAppointmentsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function HcpAppointmentsContent({ searchParams }: PageProps) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const query = await searchParams;
  const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status;
  const currentFilter = rawStatus ?? "All";

  const rawSelected = Array.isArray(query.selected) ? query.selected[0] : query.selected;
  const selectedID = rawSelected && /^\d+$/.test(rawSelected) ? Number(rawSelected) : null;

  const appointmentsResult = await loadHcpAppointments({
    requireApprovedHcp: async () => principal,
    prisma,
    statusFilter: currentFilter,
  });

  const appointments = appointmentsResult.status === "success" ? appointmentsResult.appointments : [];

  // Determine which appointment to display in detail: explicitly selected, or fallback to first
  const effectiveSelectedID = selectedID ?? (appointments.length > 0 ? appointments[0].appointmentID : null);

  let selectedAppointment = null;
  if (effectiveSelectedID) {
    const detailResult = await loadHcpAppointmentDetail({
      requireApprovedHcp: async () => principal,
      prisma,
      appointmentID: effectiveSelectedID,
    });
    if (detailResult.status === "success") {
      selectedAppointment = detailResult.appointment;
    }
  }

  return (
    <main className={`${styles.desktopPage} ${styles.appointmentsPage}`}>
      <section className={`${styles.pageIntro} mb-6`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Patient appointments</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Appointment Schedule
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Review requested and upcoming patient consultations, manage visit statuses, and access authorized patient information.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HcpAppointmentSchedule
            appointments={appointments}
            currentFilter={currentFilter}
            selectedID={effectiveSelectedID}
            loadError={appointmentsResult.status === "error"}
          />
        </div>
        <div className="lg:col-span-5">
          <HcpAppointmentDetail
            appointment={selectedAppointment}
            detailUnavailable={Boolean(effectiveSelectedID && !selectedAppointment)}
          />
        </div>
      </div>
    </main>
  );
}
