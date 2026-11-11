"use client";

import Link from "next/link";
import { useTransition } from "react";

import { updateAppointmentStatusAction } from "@/app/(protected)/hcp/appointments/actions";
import { Icon } from "@/components/ui/icon";

export type HcpAppointmentDetailItem = {
  appointmentID: number;
  patientID: number;
  hcpID: number;
  formattedDate: string;
  formattedTime: string;
  timeSlot: string;
  reason: string;
  status: string;
  createdAt: Date;
  patient: {
    patientID: number;
    fullName: string;
    phoneNo: string;
    email: string;
    gender: string;
    formattedDob: string;
    bloodType: string | null;
    allergies: string | null;
    emergencyContact: string | null;
  };
  hasActiveConsent: boolean;
};

type Props = {
  appointment?: HcpAppointmentDetailItem | null;
  detailUnavailable?: boolean;
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

export default function HcpAppointmentDetail({ appointment, detailUnavailable = false }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!appointment) {
    return (
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-8 text-center shadow-[0_3px_16px_rgba(70,20,39,0.04)]">
        <p className="text-sm font-semibold text-[#705660]">
          {detailUnavailable ? "Appointment details unavailable" : "No appointment selected"}
        </p>
        <p className="mt-1 text-xs text-[#806D74]">
          {detailUnavailable
            ? "This appointment may no longer be available. Refresh the schedule to try again."
            : "Select any visit from the schedule list to view details and update its status."}
        </p>
      </div>
    );
  }

  const { status, patient, hasActiveConsent } = appointment;

  const handleStatusChange = (newStatus: "Confirmed" | "Cancelled" | "Completed") => {
    startTransition(async () => {
      await updateAppointmentStatusAction(appointment.appointmentID, newStatus);
    });
  };

  return (
    <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0E6E8] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">
            APT-{String(appointment.appointmentID).padStart(4, "0")}
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-[#35101F]">{patient.fullName}</h2>
          <p className="mt-0.5 text-xs text-[#806D74]">
            {patient.gender} · Born {patient.formattedDob}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(
            status,
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-[#F0E6E8] bg-[#FCF9F7] p-4 text-xs">
          <p className="font-bold text-[#4A1525]">Contact details</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-[#806D74]">Phone: </span>
              <strong className="text-[#35101F]">{patient.phoneNo}</strong>
            </div>
            <div>
              <span className="text-[#806D74]">Email: </span>
              <strong className="text-[#35101F]">{patient.email}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E6E8] bg-[#FCF9F7] p-4 text-xs">
          <p className="font-bold text-[#4A1525]">Visit details</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-[#35101F]">
            <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" />{appointment.formattedDate}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" />{appointment.formattedTime}</span>
          </div>
          <div className="mt-3">
            <span className="text-[#806D74]">Reason for appointment:</span>
            <p className="mt-1 rounded-xl bg-white p-3 leading-relaxed text-[#29101A] shadow-sm">
              {appointment.reason}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E6E8] bg-white p-4 text-xs">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#4A1525]">Patient medical summary</p>
            {hasActiveConsent ? (
              <span className="rounded-full bg-[#EDF6F0] px-2 py-0.5 text-[10px] font-bold text-[#28543A]">
                Active consent
              </span>
            ) : (
              <span className="rounded-full bg-[#FFF8E6] px-2 py-0.5 text-[10px] font-bold text-[#8C6B00]">
                Consent not granted
              </span>
            )}
          </div>

          {hasActiveConsent ? (
            <div className="mt-3 space-y-2 text-[#35101F]">
              <p>
                <span className="text-[#806D74]">Blood type:</span> {patient.bloodType || "Not recorded"}
              </p>
              <p>
                <span className="text-[#806D74]">Known allergies:</span> {patient.allergies || "None declared"}
              </p>
              <p>
                <span className="text-[#806D74]">Emergency contact:</span> {patient.emergencyContact || "Not recorded"}
              </p>
              <div className="mt-3 pt-2">
                <Link
                  href={`/hcp/patients/${patient.patientID}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6F1D35] hover:underline"
                >
                  View patient symptom history →
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[#705660]">
              The patient has not granted your professional profile active access. Under OPORA privacy rules, detailed medical records and symptom history remain restricted until consent is granted.
            </p>
          )}
        </div>

        <div className="border-t border-[#F0E6E8] pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4A1525]">Status actions</p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {status === "Pending" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange("Confirmed")}
                  className="rounded-xl bg-[#28543A] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E3F2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28543A] disabled:opacity-50"
                >
                  {isPending ? "Updating…" : "Confirm appointment"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange("Cancelled")}
                  className="rounded-xl border border-[#E07A5F] bg-white px-4 py-2 text-xs font-bold text-[#C44A2F] transition hover:bg-[#FDF2F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] disabled:opacity-50"
                >
                  {isPending ? "Updating…" : "Cancel appointment"}
                </button>
              </>
            )}

            {status === "Confirmed" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange("Completed")}
                  className="rounded-xl bg-[#6F1D35] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#57152A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35] disabled:opacity-50"
                >
                  {isPending ? "Updating…" : "Mark as completed"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange("Cancelled")}
                  className="rounded-xl border border-[#E07A5F] bg-white px-4 py-2 text-xs font-bold text-[#C44A2F] transition hover:bg-[#FDF2F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] disabled:opacity-50"
                >
                  {isPending ? "Updating…" : "Cancel appointment"}
                </button>
              </>
            )}

            {status === "Completed" && (
              <p className="text-xs font-semibold text-[#2C5282]">
                This appointment was successfully completed.
              </p>
            )}

            {status === "Cancelled" && (
              <p className="text-xs font-semibold text-[#9B1C1C]">
                This appointment has been cancelled.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
