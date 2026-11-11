"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";

export type HcpAppointmentItem = {
  appointmentID: number;
  patientID: number;
  hcpID: number;
  formattedDate: string;
  formattedTime: string;
  timeSlot: string;
  reason: string;
  status: string;
  patient: {
    patientID: number;
    fullName: string;
    phoneNo: string;
    email: string;
    gender: string;
    formattedDob: string;
  };
};

type Props = {
  appointments: HcpAppointmentItem[];
  currentFilter: string;
  selectedID?: number | null;
  loadError?: boolean;
};

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

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

export default function HcpAppointmentSchedule({
  appointments,
  currentFilter,
  selectedID,
  loadError = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "All") {
      params.delete("status");
    } else {
      params.set("status", filter);
    }
    router.push(`/hcp/appointments?${params.toString()}`);
  };

  return (
    <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0E6E8] pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Clinical schedule</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Appointments</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((filter) => {
            const active = currentFilter === filter || (filter === "All" && !currentFilter);
            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E2D43] ${
                  active
                    ? "bg-[#6F1D35] text-white shadow-sm"
                    : "bg-[#FCF9F7] text-[#705660] hover:bg-[#F3DEE3] hover:text-[#4A1525]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <div className="py-12 text-center" role="status">
          <p className="text-sm font-semibold text-[#705660]">Schedule temporarily unavailable</p>
          <p className="mt-1 text-xs text-[#806D74]">We could not load appointments. Refresh to try again.</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-[#705660]">No appointments found.</p>
          <p className="mt-1 text-xs text-[#806D74]">
            {currentFilter && currentFilter !== "All"
              ? `There are no ${currentFilter.toLowerCase()} appointments.`
              : "No patient visits have been booked yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#F0E6E8]">
          {appointments.map((appt) => {
            const isSelected = selectedID === appt.appointmentID;
            return (
              <li
                key={appt.appointmentID}
                className={`rounded-2xl p-4 transition ${
                  isSelected ? "bg-[#FCF5F7] ring-1 ring-[#D8AAB5]" : "hover:bg-[#FCF9F7]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#35101F]">{appt.patient.fullName}</h3>
                      <span className="text-xs text-[#806D74]">({appt.patient.gender})</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#806D74]">
                      DOB: {appt.patient.formattedDob} · Phone: {appt.patient.phoneNo}
                    </p>
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

                <p className="mt-2 text-xs leading-relaxed text-[#5A454E] line-clamp-2">
                  <strong className="text-[#35101F]">Reason:</strong> {appt.reason}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-[#F0E6E8]/80 pt-2.5">
                  <span className="text-[11px] text-[#806D74]">APT-{String(appt.appointmentID).padStart(4, "0")}</span>
                  <Link
                    href={`/hcp/appointments?selected=${appt.appointmentID}${
                      currentFilter && currentFilter !== "All" ? `&status=${currentFilter}` : ""
                    }`}
                    className="text-xs font-bold text-[#6F1D35] hover:underline"
                  >
                    {isSelected ? "Selected ✓" : "View & manage →"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
