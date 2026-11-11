"use client";

import { useActionState, useState } from "react";

import { bookAppointmentAction } from "@/app/(protected)/patient/appointments/actions";
import { SUPPORTED_TIME_SLOTS } from "@/lib/appointment-validation.mjs";
import type { AppointmentActionState } from "@/lib/appointment-action-state";

type BookingHcp = {
  hcpID: number;
  specialization: string;
  workplace: string;
  user: { fullName: string };
};

type Props = {
  hcps: BookingHcp[];
  minDate: string;
};

const initialState: AppointmentActionState = {
  status: "idle",
  message: "",
};

export default function AppointmentBookingForm({ hcps, minDate }: Props) {
  const [state, formAction, isPending] = useActionState(bookAppointmentAction, initialState);
  const [selectedSlot, setSelectedSlot] = useState<string>("10:00");

  return (
    <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
      <div className="border-b border-[#F0E6E8] pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Schedule visit</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">New appointment</h2>
        <p className="mt-1 text-xs text-[#705660]">
          Select an approved healthcare professional, choose a date and time slot, and describe the reason for your visit.
        </p>
      </div>

      {state.status === "error" && (
        <div className="mt-4 rounded-xl border border-[#F8D7DA] bg-[#FDF2F2] p-4 text-sm text-[#9B1C1C]" role="alert">
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div className="mt-4 rounded-xl border border-[#D3E8D9] bg-[#EDF6F0] p-4 text-sm font-semibold text-[#28543A]" role="status">
          {state.message}
        </div>
      )}

      {hcps.length === 0 ? (
        <p className="mt-4 text-sm text-[#705660]">
          There are currently no verified healthcare professionals available for booking.
        </p>
      ) : (
        <form action={formAction} className="mt-5 space-y-5">
          <div>
            <label htmlFor="hcpID" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
              Healthcare professional
            </label>
            <select
              id="hcpID"
              name="hcpID"
              required
              className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-sm transition focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
            >
              <option value="">Choose a healthcare professional…</option>
              {hcps.map((hcp) => (
                <option key={hcp.hcpID} value={hcp.hcpID}>
                  {hcp.user.fullName} — {hcp.specialization} ({hcp.workplace})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="appointmentDate" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
              Appointment date
            </label>
            <input
              type="date"
              id="appointmentDate"
              name="appointmentDate"
              required
              min={minDate}
              defaultValue={minDate}
              className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-sm transition focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
            />
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
              Available time slot
            </span>
            <input type="hidden" name="appointmentTime" value={selectedSlot} />
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SUPPORTED_TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E2D43] ${
                      isSelected
                        ? "border-[#6F1D35] bg-[#6F1D35] text-white shadow-sm"
                        : "border-[#E8D9DD] bg-[#FCF9F7] text-[#4A1525] hover:border-[#C78393]"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#806D74]">
              Selected time: <strong className="text-[#35101F]">{selectedSlot}</strong>
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
              Reason for visit
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
              placeholder="e.g. Headache and fever for two days, need clinical review…"
              className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm text-[#29101A] shadow-sm transition placeholder:text-[#A18E94] focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-[#57152A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Submitting request…" : "Confirm appointment"}
          </button>
        </form>
      )}
    </div>
  );
}
