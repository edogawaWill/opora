"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { updatePatientProfileAction } from "@/app/(protected)/patient/profile/actions";
import type { ProfileActionResult } from "@/lib/profile-state";

const INITIAL_STATE: ProfileActionResult = { status: "error", message: "" };
const INPUT_CLASS = "opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition";

export default function PatientProfileForm({
  fullName,
  phoneNo,
  address,
  bloodType,
  allergies,
  emergencyContact,
}: {
  fullName: string;
  phoneNo: string;
  address: string;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updatePatientProfileAction, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" id="patient-profile-full-name">
          <input id="patient-profile-full-name" name="fullName" defaultValue={fullName} autoComplete="name" maxLength={100} required className={INPUT_CLASS} />
        </Field>
        <Field label="Phone number" id="patient-profile-phone">
          <input id="patient-profile-phone" name="phoneNo" defaultValue={phoneNo} type="tel" autoComplete="tel" minLength={7} maxLength={15} required className={INPUT_CLASS} />
        </Field>
      </div>

      <Field label="Home address" id="patient-profile-address">
        <textarea id="patient-profile-address" name="address" defaultValue={address} autoComplete="street-address" maxLength={500} rows={3} required className={`${INPUT_CLASS} resize-y`} />
      </Field>

      <section aria-labelledby="patient-medical-profile-heading" className="space-y-4 border-t border-[#F0DFE3] pt-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Health information</p>
          <h3 id="patient-medical-profile-heading" className="mt-1 text-lg font-extrabold text-[#35101F]">Medical profile</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Blood type" id="patient-profile-blood-type">
            <select id="patient-profile-blood-type" name="bloodType" defaultValue={bloodType ?? ""} className={INPUT_CLASS}>
              <option value="">Not provided</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Emergency contact" id="patient-profile-emergency-contact">
            <input id="patient-profile-emergency-contact" name="emergencyContact" defaultValue={emergencyContact ?? ""} autoComplete="off" maxLength={100} className={INPUT_CLASS} />
          </Field>
        </div>
        <Field label="Known allergies" id="patient-profile-allergies">
          <textarea id="patient-profile-allergies" name="allergies" defaultValue={allergies ?? ""} maxLength={2000} rows={3} className={`${INPUT_CLASS} resize-y`} aria-describedby="patient-profile-allergies-help" />
          <span id="patient-profile-allergies-help" className="mt-1 block text-xs text-[#806D74]">Leave blank if allergy information has not been provided.</span>
        </Field>
      </section>

      {state.message && <p className={`rounded-xl p-3 text-sm ${state.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF4F5] text-[#6B4652]"}`} role={state.status === "success" ? "status" : "alert"}>{state.message}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#F0DFE3] pt-5">
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <Link href="/patient" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8BBC3] px-5 py-3 text-sm font-semibold text-[#6F1D35] hover:bg-[#FBF4F5]">Cancel</Link>
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#230711]">{label}</label>{children}</div>;
}
