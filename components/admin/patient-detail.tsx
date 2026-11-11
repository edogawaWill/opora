"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  deletePatientAction,
  setPatientStatusAction,
  updatePatientAction,
} from "@/app/(protected)/admin/patients/actions";
import type { AdminActionState } from "@/lib/admin-action-state";

export type PatientDetailData = {
  patientID: number;
  userID: number;
  icNumber: string;
  dateOfBirth: Date | string;
  gender: string;
  address: string;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
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
    symptomRecords: number;
    assessments: number;
    appointments: number;
    diagnoses: number;
    hcpConsents: number;
  };
};

type Props = {
  patient: PatientDetailData;
};

const initialActionState: AdminActionState = {
  status: "idle",
  message: "",
};

export default function PatientDetail({ patient }: Props) {
  const router = useRouter();
  const [isMutating, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const boundUpdateAction = updatePatientAction.bind(null, patient.patientID);
  const [editState, formAction, isSubmitting] = useActionState(boundUpdateAction, initialActionState);

  const totalHistory =
    patient._count.symptomRecords +
    patient._count.assessments +
    patient._count.appointments +
    patient._count.diagnoses +
    patient._count.hcpConsents;

  async function handleToggleStatus() {
    const nextStatus = patient.user.accountStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    startTransition(async () => {
      const res = await setPatientStatusAction(patient.patientID, nextStatus);
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
      const res = await deletePatientAction(patient.patientID);
      if (res.status === "success") {
        router.push("/admin/patients");
      } else {
        setFeedback({ type: "error", text: res.message });
        setShowDeleteConfirm(false);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/patients"
            className="text-xs font-bold uppercase tracking-wider text-[#7E2D43] hover:underline"
          >
            &larr; Back to all patients
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[#35101F] sm:text-3xl">
            {patient.user.fullName}
          </h1>
          <p className="mt-1 text-xs text-[#705660]">
            Patient ID: #{patient.patientID} · User ID: #{patient.userID} · IC: {patient.icNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isMutating}
            onClick={handleToggleStatus}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition ${
              patient.user.accountStatus === "ACTIVE"
                ? "border border-[#F8D7DA] bg-[#FDF2F2] text-[#9B1C1C] hover:bg-[#FCE8E6]"
                : "bg-[#28543A] text-white hover:bg-[#1E3F2B]"
            }`}
          >
            {isMutating
              ? "Updating status…"
              : patient.user.accountStatus === "ACTIVE"
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

      {/* Feedback banner */}
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

      {/* Delete confirmation warning modal/banner */}
      {showDeleteConfirm && (
        <div className="rounded-2xl border border-[#F8D7DA] bg-[#FDF2F2] p-5">
          <h3 className="text-sm font-extrabold text-[#9B1C1C]">
            Confirm Permanent Record Deletion
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#7E2D43]">
            Permanent deletion removes the patient profile and credentials. If clinical history exists, the database will preserve medical safety and disallow deletion.
          </p>
          {totalHistory > 0 && (
            <p className="mt-2 text-xs font-bold text-[#9B1C1C]">
              Notice: This patient has {totalHistory} associated clinical/appointment records. Deactivate the account instead of deleting.
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

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Account Status</p>
          <p className="mt-2 text-lg font-extrabold text-[#35101F]">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                patient.user.accountStatus === "ACTIVE"
                  ? "bg-[#EDF6F0] text-[#28543A]"
                  : "bg-[#FDF2F2] text-[#9B1C1C]"
              }`}
            >
              {patient.user.accountStatus}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Symptom Logs</p>
          <p className="mt-2 text-xl font-extrabold text-[#35101F]">
            {patient._count.symptomRecords}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Assessments</p>
          <p className="mt-2 text-xl font-extrabold text-[#35101F]">
            {patient._count.assessments}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">Appointments</p>
          <p className="mt-2 text-xl font-extrabold text-[#35101F]">
            {patient._count.appointments}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E8D9DD] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-[#8A737A]">HCP Permissions</p>
          <p className="mt-2 text-xl font-extrabold text-[#35101F]">
            {patient._count.hcpConsents}
          </p>
        </div>
      </div>

      {/* Edit Patient Record Form */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-8">
        <div className="border-b border-[#F0E6E8] pb-4">
          <h2 className="text-lg font-extrabold text-[#35101F]">
            Edit Patient Record
          </h2>
          <p className="mt-1 text-xs text-[#705660]">
            Update verified contact and medical information. All administrative changes are logged to the OPORA audit trail.
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
                defaultValue={patient.user.fullName}
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
                defaultValue={patient.user.phoneNo}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div>
              <label htmlFor="bloodType" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Blood Type
              </label>
              <select
                id="bloodType"
                name="bloodType"
                defaultValue={patient.bloodType ?? ""}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              >
                <option value="">Not specified</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label htmlFor="emergencyContact" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Emergency Contact
              </label>
              <input
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                maxLength={100}
                defaultValue={patient.emergencyContact ?? ""}
                placeholder="Name and contact number"
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Residential Address *
              </label>
              <textarea
                id="address"
                name="address"
                required
                rows={2}
                maxLength={500}
                defaultValue={patient.address}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="allergies" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Allergies & Medical Sensitivities
              </label>
              <textarea
                id="allergies"
                name="allergies"
                rows={2}
                maxLength={1000}
                defaultValue={patient.allergies ?? ""}
                placeholder="e.g. Penicillin, Peanuts"
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
              {isSubmitting ? "Saving changes…" : "Save patient record"}
            </button>
          </div>
        </form>
      </div>

      {/* Read-Only Account Details */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-8">
        <h2 className="text-base font-extrabold text-[#35101F]">
          Immutable & System Account Data
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-bold text-[#8A737A]">NRIC / IC Number</dt>
            <dd className="mt-1 font-mono font-medium text-[#35101F]">{patient.icNumber}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Email Address</dt>
            <dd className="mt-1 font-medium text-[#35101F]">{patient.user.email}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Gender</dt>
            <dd className="mt-1 font-medium text-[#35101F]">{patient.gender}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Date of Birth</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {new Date(patient.dateOfBirth).toLocaleDateString("en-MY", {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Date Registered</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {new Date(patient.user.dateRegistered).toLocaleDateString("en-MY", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A737A]">Email Verified</dt>
            <dd className="mt-1 font-medium text-[#35101F]">
              {patient.user.emailVerified ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
