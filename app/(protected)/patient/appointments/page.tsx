import { Suspense } from "react";
import { redirect } from "next/navigation";

import AppointmentBookingForm from "@/components/patient/appointment-booking-form";
import PatientAppointmentsList from "@/components/patient/patient-appointments-list";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import {
  loadEligibleBookingHcps,
  loadPatientAppointments,
} from "@/lib/appointment-queries.mjs";
import prisma from "@/lib/prisma";

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your appointments…</p>
      </div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PatientAppointmentsContent />
    </Suspense>
  );
}

async function PatientAppointmentsContent() {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const [eligibleHcps, appointmentsResult] = await Promise.all([
    loadEligibleBookingHcps({ requirePatient: async () => principal, prisma }),
    loadPatientAppointments({ requirePatient: async () => principal, prisma }),
  ]);

  const appointments = appointmentsResult.status === "success" ? appointmentsResult.appointments : [];
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Clinical visits</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Set up & view appointments
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Book a consultation slot with a verified healthcare professional and keep track of your appointment status.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AppointmentBookingForm hcps={eligibleHcps} minDate={minDate} />
        </div>
        <div className="lg:col-span-7">
          <PatientAppointmentsList appointments={appointments} />
        </div>
      </div>
    </div>
  );
}
