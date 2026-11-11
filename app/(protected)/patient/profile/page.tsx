import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import PasswordChangeForm from "@/components/profile/password-change-form";
import PatientProfileForm from "@/components/profile/patient-profile-form";
import { requirePatient } from "@/lib/authorization";
import { loadOwnPatientProfile } from "@/lib/profile-queries.mjs";
import prisma from "@/lib/prisma";
import { changePatientPasswordAction } from "./actions";

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your profile…</p>
      </div>
    </div>
  );
}

export default function PatientProfilePage() {
  return <Suspense fallback={<LoadingFallback />}><PatientProfileContent /></Suspense>;
}

async function PatientProfileContent() {
  const result = await loadOwnPatientProfile({ requirePatient, prisma });
  if (result.status === "denied") redirect("/account");
  if (result.status !== "success") return <ProfileError />;
  const { profile } = result;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Personal settings</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">Manage your profile</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Review and update your contact and health information. Your profile changes are saved to your OPORA account.
        </p>
      </section>

      <section aria-labelledby="patient-profile-heading" className="rounded-3xl border border-[#EADDE0] bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Patient details</p>
          <h2 id="patient-profile-heading" className="mt-1 text-xl font-bold text-[#1B1C1B] font-headline">Personal and medical information</h2>
          <p className="mt-1 text-sm text-[#705660]">Signed-in email: {profile.user.email}</p>
        </div>
        <dl className="mb-6 grid gap-x-6 gap-y-4 border-b border-[#EADDE0] pb-5 text-sm sm:grid-cols-2">
          <ProfileValue label="Date of birth" value={formatDate(profile.dateOfBirth)} />
          <ProfileValue label="Gender" value={profile.gender === "Declined" ? "Prefer not to say" : profile.gender} />
        </dl>
        <PatientProfileForm
          fullName={profile.user.fullName}
          phoneNo={profile.user.phoneNo}
          address={profile.address}
          bloodType={profile.bloodType}
          allergies={profile.allergies}
          emergencyContact={profile.emergencyContact}
        />
      </section>

      <section aria-labelledby="patient-password-heading" className="mt-8 rounded-3xl border border-[#EADDE0] bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Account security</p>
          <h2 id="patient-password-heading" className="mt-1 text-xl font-bold text-[#1B1C1B] font-headline">Change password</h2>
          <p className="mt-1 text-sm text-[#705660]">Confirm your current password. Other active sessions will be signed out.</p>
        </div>
        <PasswordChangeForm action={changePatientPasswordAction} />
      </section>
    </div>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">{label}</dt><dd className="mt-1 break-words font-medium text-[#4F3540]">{value}</dd></div>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function ProfileError() {
  return <main className="min-h-screen bg-[#FCF9F7] px-5 py-10 sm:px-8"><section className="mx-auto max-w-3xl rounded-3xl border border-[#E8D9DD] bg-white p-8"><Link href="/patient" className="text-sm font-semibold text-[#6F1D35] underline">Back to dashboard</Link><h1 className="mt-4 text-2xl font-extrabold text-[#35101F]">Profile unavailable</h1><p className="mt-3 rounded-xl bg-[#FBF4F5] p-4 text-sm text-[#6B4652]" role="alert">We could not load your profile right now. Please refresh to try again.</p></section></main>;
}
