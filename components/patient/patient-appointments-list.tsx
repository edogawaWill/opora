"use client";

import { useTransition } from "react";

import { cancelAppointmentAction } from "@/app/(protected)/patient/appointments/actions";
import { Icon } from "@/components/ui/icon";

export type PatientAppointmentItem = {
  appointmentID: number;
  patientID: number;
  hcpID: number;
  formattedDate: string;
  formattedTime: string;
  timeSlot: string;
  reason: string;
  status: string;
  hcp: {
    hcpID: number;
    fullName: string;
    specialization: string;
    workplace: string;
  };
};

type Props = {
  appointments: PatientAppointmentItem[];
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "Confirmed":
      return "border-[#D3E8D9] bg-[#EDF6F0] text-[#28543A]";
    case "Pending":
      return "border-[#FBE3B5] bg-[#FFF8E6] text-[#8C6B00]";
    case "Completed":
      return "border-[#DCE4EC] bg-[#F0F4F8] text-[#2C5282]";
    case "Cancelled":
      return "border-[#F8D7DA] bg-[#FDF2F2] text-[#9B1C1C]";
    default:
      return "border-[#E8D9DD] bg-[#FCF9F7] text-[#705660]";
  }
}

export default function PatientAppointmentsList({ appointments }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = (appointmentID: number) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      startTransition(async () => {
        await cancelAppointmentAction(appointmentID);
      });
    }
  };

  return (
    <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E6E8] pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Your bookings</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Saved appointments</h2>
        </div>
        <span className="text-xs font-semibold text-[#705660]">
          {appointments.length} {appointments.length === 1 ? "record" : "records"}
        </span>
      </div>

      {appointments.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-[#705660]">No appointments scheduled yet.</p>
          <p className="mt-1 text-xs text-[#806D74]">
            Use the form to request an appointment with an approved healthcare professional.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#F0E6E8]">
          {appointments.map((appt) => {
            const canCancel = appt.status === "Pending" || appt.status === "Confirmed";
            return (
              <li key={appt.appointmentID} className="py-4.5 first:pt-2 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#35101F]">{appt.hcp.fullName}</h3>
                      <span className="text-xs text-[#806D74]">({appt.hcp.specialization})</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#806D74]">{appt.hcp.workplace}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(
                      appt.status,
                    )}`}
                  >
                    {appt.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#4A1525]">
                  <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" />{appt.formattedDate}</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" />{appt.formattedTime}</span>
                </div>

                <div className="mt-2.5 rounded-xl bg-[#FCF9F7] p-3 text-xs leading-relaxed text-[#5A454E]">
                  <strong className="text-[#35101F]">Reason:</strong> {appt.reason}
                </div>

                {canCancel && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancel(appt.appointmentID)}
                      className="rounded-lg border border-[#E07A5F] px-3 py-1 text-xs font-semibold text-[#C44A2F] transition hover:bg-[#FDF2F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] disabled:opacity-50"
                    >
                      {isPending ? "Cancelling…" : "Cancel appointment"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
