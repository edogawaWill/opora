"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { updateHcpProfileAction } from "@/app/(protected)/hcp/profile/actions";
import type { ProfileActionResult } from "@/lib/profile-state";

const INITIAL_STATE: ProfileActionResult = { status: "error", message: "" };
const INPUT_CLASS = "opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition";

export default function HcpProfileForm({
  fullName,
  email,
  phoneNo,
  licenseNo,
  specialization,
  workplace,
  yearsOfExperience,
  verificationStatus,
  accountStatus,
}: {
  fullName: string;
  email: string;
  phoneNo: string;
  licenseNo: string;
  specialization: string;
  workplace: string;
  yearsOfExperience: number;
  verificationStatus: string;
  accountStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(updateHcpProfileAction, INITIAL_STATE);

  return (
    <div className="space-y-7">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="hcp-profile-full-name">
            <input id="hcp-profile-full-name" name="fullName" defaultValue={fullName} autoComplete="name" maxLength={100} required className={INPUT_CLASS} />
          </Field>
          <Field label="Phone number" id="hcp-profile-phone">
            <input id="hcp-profile-phone" name="phoneNo" defaultValue={phoneNo} type="tel" autoComplete="tel" minLength={7} maxLength={15} required className={INPUT_CLASS} />
          </Field>
        </div>

        <section aria-labelledby="hcp-professional-details-heading" className="space-y-4 border-t border-[#F0DFE3] pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Read-only credentials</p>
            <h3 id="hcp-professional-details-heading" className="mt-1 text-lg font-extrabold text-[#35101F]">Professional details</h3>
            <p className="mt-1 text-xs leading-5 text-[#806D74]">Licence and verification details are managed through OPORA&apos;s verification process.</p>
          </div>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <ProfileValue label="Email" value={email} />
            <ProfileValue label="Professional licence number" value={licenseNo} />
            <ProfileValue label="Specialization" value={specialization} />
            <ProfileValue label="Workplace" value={workplace} />
            <ProfileValue label="Years of experience" value={String(yearsOfExperience)} />
            <ProfileValue label="Verification status" value={verificationStatus} />
            <ProfileValue label="Account status" value={accountStatus} />
          </dl>
        </section>

        {state.message && <p className={`rounded-xl p-3 text-sm ${state.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF4F5] text-[#6B4652]"}`} role={state.status === "success" ? "status" : "alert"}>{state.message}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-[#F0DFE3] pt-5">
          <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <Link href="/hcp" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8BBC3] px-5 py-3 text-sm font-semibold text-[#6F1D35] hover:bg-[#FBF4F5]">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#230711]">{label}</label>{children}</div>;
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">{label}</dt><dd className="mt-1 break-words font-medium text-[#4F3540]">{value}</dd></div>;
}
