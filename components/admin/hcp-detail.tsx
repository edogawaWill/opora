"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  deleteHcpAction,
  setHcpStatusAction,
  setHcpVerificationAction,
  updateHcpAction,
} from "@/app/(protected)/admin/hcps/actions";
import type { AdminActionState } from "@/lib/admin-action-state";

export type HcpDetailData = {
  hcpID: number;
  userID: number;
  licenseNo: string;
  specialization: string;
  workplace: string;
  yearsOfExperience: number;
  verificationStatus: string;
  verifiedAt: Date | string | null;
  verifiedBy: number | null;
  verifier: {
    adminID: number;
    user: { fullName: string };
  } | null;
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNo: string;
    accountStatus: string;
    emailVerified: boolean;
    dateRegistered: Date | string;
    updatedAt: Date | string;
  };
  _count: {
    appointments: number;
    patientConsents: number;
  };
};

type Props = {
  hcp: HcpDetailData;
};

const initialActionState: AdminActionState = {
  status: "idle",
  message: "",
};

export default function HcpDetail({ hcp }: Props) {
  const router = useRouter();
  const [isMutating, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const boundUpdateAction = updateHcpAction.bind(null, hcp.hcpID);
  const [editState, formAction, isSubmitting] = useActionState(boundUpdateAction, initialActionState);

  async function handleVerificationChange(targetStatus: "Approved" | "Rejected" | "Pending") {
    startTransition(async () => {
      const res = await setHcpVerificationAction(hcp.hcpID, targetStatus);
      if (res.status === "success") {
        setFeedback({ type: "success", text: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    });
  }

  async function handleToggleStatus() {
    const nextStatus = hcp.user.accountStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    startTransition(async () => {
      const res = await setHcpStatusAction(hcp.hcpID, nextStatus);
      if (res.status === "success") {
        setFeedback({ type: "success", text: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      const res = await deleteHcpAction(hcp.hcpID);
      if (res.status === "success") {
        router.push("/admin/hcps");
      } else {
        setFeedback({ type: "error", text: res.message });
        setShowDeleteConfirm(false);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/hcps"
            className="text-xs font-bold uppercase tracking-wider text-[#7E2D43] hover:underline"
          >
            &larr; Back to all healthcare professionals
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[#35101F] sm:text-3xl">
            {hcp.user.fullName}
          </h1>
          <p className="mt-1 text-xs text-[#705660]">
            HCP ID: #{hcp.hcpID} · License No: {hcp.licenseNo} · Specialization: {hcp.specialization}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isMutating}
            onClick={handleToggleStatus}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition ${
              hcp.user.accountStatus === "ACTIVE"
                ? "border border-[#F8D7DA] bg-[#FDF2F2] text-[#9B1C1C] hover:bg-[#FCE8E6]"
                : "bg-[#28543A] text-white hover:bg-[#1E3F2B]"
            }`}
          >
            {isMutating
              ? "Updating…"
              : hcp.user.accountStatus === "ACTIVE"
                ? "Deactivate account"
                : "Reactivate account"}
          </button>

          <button
            type="button"
            disabled={isMutating}
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#F8D7DA] bg-white px-4 py-2 text-xs font-bold text-[#9B1C1C] hover:bg-[#FDF2F2]"
          >
            Delete record
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {(feedback || editState.status !== "idle") && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            (feedback?.type ?? editState.status) === "success"
              ? "border-[#D3E8D9] bg-[#EDF6F0] text-[#28543A]"
              : "border-[#F8D7DA] bg-[#FDF2F2] text-[#9B1C1C]"
          }`}
          role="alert"
        >
          {feedback?.text || editState.message}
        </div>
      )}

      {/* Delete Confirmation Box */}
      {showDeleteConfirm && (
        <div className="rounded-2xl border border-[#F8D7DA] bg-[#FDF2F2] p-5">
          <h3 className="text-sm font-extrabold text-[#9B1C1C]">
            Confirm Permanent HCP Record Deletion
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#7E2D43]">
            Deleting this record permanently deletes the healthcare professional account and credential mapping. If appointments or patient permissions exist, the database disallows deletion to preserve relational integrity.
          </p>
          {(hcp._count.appointments > 0 || hcp._count.patientConsents > 0) && (
            <p className="mt-2 text-xs font-bold text-[#9B1C1C]">
              Notice: This HCP has {hcp._count.appointments} appointments and {hcp._count.patientConsents} consents attached. Deactivate the account instead of deleting.
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isMutating}
              onClick={handleDelete}
              className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#9B1C1C] px-4 py-2 text-xs font-bold text-white hover:bg-[#771414] disabled:opacity-50"
            >
              {isMutating ? "Deleting…" : "Yes, attempt deletion"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#D8AAB5] bg-white px-4 py-2 text-xs font-semibold text-[#6F1D35] hover:bg-[#FCF9F7]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Bar & Action Controls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Verification Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                hcp.verificationStatus === "Approved"
                  ? "bg-[#EDF6F0] text-[#28543A]"
                  : hcp.verificationStatus === "Pending"
                    ? "bg-[#FEF9E7] text-[#946C00]"
                    : "bg-[#FDF2F2] text-[#9B1C1C]"
              }`}
            >
              {hcp.verificationStatus}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hcp.verificationStatus !== "Approved" && (
              <button
                type="button"
                disabled={isMutating}
                onClick={() => handleVerificationChange("Approved")}
                className="rounded-lg bg-[#28543A] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1E3F2B]"
              >
                Approve
              </button>
            )}
            {hcp.verificationStatus !== "Rejected" && (
              <button
                type="button"
                disabled={isMutating}
                onClick={() => handleVerificationChange("Rejected")}
                className="rounded-lg border border-[#F8D7DA] bg-[#FDF2F2] px-2.5 py-1 text-[11px] font-bold text-[#9B1C1C] hover:bg-[#FCE8E6]"
              >
                Reject
              </button>
            )}
            {hcp.verificationStatus !== "Pending" && (
              <button
                type="button"
                disabled={isMutating}
                onClick={() => handleVerificationChange("Pending")}
                className="rounded-lg border border-[#E8D9DD] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6F1D35] hover:bg-[#FCF9F7]"
              >
                Reset to Pending
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Account Status</p>
          <p className="mt-2 text-lg font-extrabold text-[#35101F]">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                hcp.user.accountStatus === "ACTIVE"
                  ? "bg-[#EDF6F0] text-[#28543A]"
                  : "bg-[#FDF2F2] text-[#9B1C1C]"
              }`}
            >
              {hcp.user.accountStatus}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-[#8A737A]">
            {hcp.user.emailVerified ? "Verified email" : "Unverified email"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Appointments</p>
          <p className="mt-2 text-2xl font-extrabold text-[#35101F]">
            {hcp._count.appointments}
          </p>
          <p className="mt-1 text-[11px] text-[#8A737A]">Scheduled consultations</p>
        </div>

        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Authorised Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-[#35101F]">
            {hcp._count.patientConsents}
          </p>
          <p className="mt-1 text-[11px] text-[#8A737A]">Active consent grants</p>
        </div>
      </div>

      {/* Edit HCP Profile Form */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-8">
        <div className="border-b border-[#F0E6E8] pb-4">
          <h2 className="text-lg font-extrabold text-[#35101F]">
            Edit Professional Profile
          </h2>
          <p className="mt-1 text-xs text-[#705660]">
            Update verified professional credentials, hospital affiliation, and contact details.
          </p>
        </div>

        <form action={formAction} className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                maxLength={100}
                defaultValue={hcp.user.fullName}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div>
              <label htmlFor="phoneNo" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Phone Number *
              </label>
              <input
                type="text"
                id="phoneNo"
                name="phoneNo"
                required
                maxLength={15}
                defaultValue={hcp.user.phoneNo}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div>
              <label htmlFor="specialization" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Specialization *
              </label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                required
                maxLength={60}
                defaultValue={hcp.specialization}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div>
              <label htmlFor="yearsOfExperience" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Years of Clinical Experience *
              </label>
              <input
                type="number"
                id="yearsOfExperience"
                name="yearsOfExperience"
                required
                min={0}
                max={100}
                defaultValue={hcp.yearsOfExperience}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="workplace" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Hospital / Clinic Workplace *
              </label>
              <input
                type="text"
                id="workplace"
                name="workplace"
                required
                maxLength={120}
                defaultValue={hcp.workplace}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#57152A] disabled:opacity-50"
            >
              {isSubmitting ? "Saving changes…" : "Save professional record"}
            </button>
          </div>
        </form>
      </div>

      {/* Verification & System Data */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-8">
        <h2 className="text-base font-extrabold text-[#35101F]">
          Verification & System Metadata
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-bold text-[#8A737A]">Professional License Number</dt>
            <dd className="mt-1 font-mono font-medium text-[#35101F]">{hcp.licenseNo}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Email Address</dt>
            <dd className="mt-1 font-medium text-[#35101F]">{hcp.user.email}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Account Registered</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {new Date(hcp.user.dateRegistered).toLocaleDateString("en-MY", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Verified At</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {hcp.verifiedAt
                ? new Date(hcp.verifiedAt).toLocaleDateString("en-MY", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Not verified"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Verified By</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {hcp.verifier?.user?.fullName ?? (hcp.verifiedBy ? `Admin #${hcp.verifiedBy}` : "None")}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
