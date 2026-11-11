"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveHcpApplicationAction,
  rejectHcpApplicationAction,
} from "@/app/(protected)/admin/actions";

export type HcpApplicationSummary = {
  hcpID: number;
  fullName: string;
  email: string;
  licenseNo: string;
  specialization: string;
  workplace: string;
  yearsOfExperience: number;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  submittedDate: string;
};

type ReviewResult = { status: "success" | "error"; message: string };

export default function HcpVerificationQueue({
  applications,
  loadFailed,
}: {
  applications: HcpApplicationSummary[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const requestLock = useRef(false);
  const [pendingHcpID, setPendingHcpID] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);

  function review(hcpID: number, decision: "Approved" | "Rejected") {
    if (requestLock.current) return;
    requestLock.current = true;
    setPendingHcpID(hcpID);
    setFeedback(null);

    startTransition(async () => {
      try {
        const result =
          decision === "Approved"
            ? await approveHcpApplicationAction(hcpID)
            : await rejectHcpApplicationAction(hcpID);
        setFeedback(result);
        if (result.status === "success") router.refresh();
      } catch {
        setFeedback({
          status: "error",
          message: "We could not complete this review. Please refresh and try again.",
        });
      } finally {
        requestLock.current = false;
        setPendingHcpID(null);
      }
    });
  }

  return (
    <section aria-labelledby="hcp-verification-heading" className="mt-10">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Applications</p>
        <h2 id="hcp-verification-heading" className="mt-1 text-xl font-extrabold text-[#35101F]">
          HCP verification
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#705660]">
          Review the professional details submitted with each application. Approval or rejection is available only when the account role is HCP, the account is active, and its email is verified.
        </p>
      </div>

      {feedback ? (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${feedback.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`}
          role={feedback.status === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      ) : null}

      {loadFailed ? (
        <p className="rounded-2xl border border-[#E8D9DD] bg-white p-6 text-sm text-[#7D2639]" role="alert">
          The verification queue could not be loaded. Please refresh the page and try again.
        </p>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCC4CB] bg-white px-6 py-10 text-center">
          <h3 className="font-bold text-[#48172A]">No HCP applications are awaiting review</h3>
          <p className="mt-2 text-sm text-[#806771]">New pending applications will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {applications.map((application) => {
            const eligible =
              application.role === "HCP" &&
              application.accountStatus === "ACTIVE" &&
              application.emailVerified;
            const rowPending = isPending && pendingHcpID === application.hcpID;

            return (
              <li key={application.hcpID} className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#45162A]">{application.fullName}</h3>
                    <p className="mt-1 text-sm text-[#705660]">{application.email}</p>
                  </div>
                  <span className="rounded-full bg-[#FBF4E8] px-3 py-1 text-xs font-bold text-[#76511A]">
                    Pending review
                  </span>
                </div>

                <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">License number</dt><dd className="mt-1 text-[#4F3540]">{application.licenseNo}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Specialization</dt><dd className="mt-1 text-[#4F3540]">{application.specialization}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Workplace</dt><dd className="mt-1 text-[#4F3540]">{application.workplace}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Experience</dt><dd className="mt-1 text-[#4F3540]">{application.yearsOfExperience} years</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Submitted</dt><dd className="mt-1 text-[#4F3540]">{application.submittedDate}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Account role</dt><dd className="mt-1 text-[#4F3540]">{application.role}</dd></div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${application.emailVerified ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`}>
                    Email {application.emailVerified ? "verified" : "not verified"}
                  </span>
                  <span className={`rounded-full px-3 py-1 ${application.accountStatus === "ACTIVE" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`}>
                    Account {application.accountStatus}
                  </span>
                </div>

                {!eligible ? (
                  <p className="mt-3 text-sm text-[#7D2639]">
                    Review is disabled until this account has the HCP role, is active, and has a verified email address.
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!eligible || isPending}
                    onClick={() => review(application.hcpID, "Approved")}
                    aria-label={`Approve application for ${application.fullName}`}
                    className="min-h-11 rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rowPending ? "Reviewing…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={!eligible || isPending}
                    onClick={() => review(application.hcpID, "Rejected")}
                    aria-label={`Reject application for ${application.fullName}`}
                    className="min-h-11 rounded-xl border border-[#D8AAB5] bg-white px-5 py-3 text-sm font-bold text-[#7D2639] hover:bg-[#FBF0F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rowPending ? "Reviewing…" : "Reject"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
