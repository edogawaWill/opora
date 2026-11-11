"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  grantPatientHcpAccessAction,
  revokePatientHcpAccessAction,
} from "@/app/(protected)/patient/consent-actions";

export type EligibleHcp = {
  hcpID: number;
  fullName: string;
  specialization: string;
  workplace: string;
};

export type ActiveHcpConsent = {
  consentID: number;
  hcpID: number;
  fullName: string;
  specialization: string;
  workplace: string;
  grantedAt: string;
};

type MutationState = { status: "success" | "error"; message: string };

export default function HcpAccessPanel({
  eligibleHcps,
  activeConsents,
  loadError,
}: {
  eligibleHcps: EligibleHcp[];
  activeConsents: ActiveHcpConsent[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<MutationState | null>(null);
  const [pendingHcpID, setPendingHcpID] = useState<number | null>(null);
  const [selectedConsent, setSelectedConsent] = useState<ActiveHcpConsent | null>(null);
  const [revokeFeedback, setRevokeFeedback] = useState<MutationState | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedConsent && !dialog.open) dialog.showModal();
    if (!selectedConsent && dialog.open) dialog.close();
  }, [selectedConsent]);

  function grant(hcpID: number) {
    if (isPending) return;
    setPendingHcpID(hcpID);
    setFeedback(null);
    startTransition(async () => {
      const result = await grantPatientHcpAccessAction(hcpID);
      setFeedback(result);
      setPendingHcpID(null);
      if (result.status === "success") router.refresh();
    });
  }

  function revoke() {
    if (!selectedConsent || isPending) return;
    startTransition(async () => {
      const result = await revokePatientHcpAccessAction(selectedConsent.consentID);
      setRevokeFeedback(result);
      if (result.status === "success") {
        setSelectedConsent(null);
        setFeedback(result);
        router.refresh();
      }
    });
  }

  const activeHcpIds = new Set(activeConsents.map((consent) => consent.hcpID));

  return (
    <section
      id="hcp-access"
      aria-labelledby="hcp-access-heading"
      className="mt-8 scroll-mt-6 rounded-3xl border border-[#E8D9DD] bg-white p-5 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Your choice</p>
        <h2 id="hcp-access-heading" className="mt-1 text-xl font-extrabold text-[#35101F]">HCP access permissions</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#705660]">
          You control which eligible healthcare professionals may be authorized to access your information in future features. Granting permission here does not itself provide access to your records. OPORA checks HCP eligibility and patient-specific permission separately for any protected operation.
        </p>
      </div>

      {feedback ? (
        <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${feedback.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`} role={feedback.status === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="eligible-hcps-heading">
          <h3 id="eligible-hcps-heading" className="font-bold text-[#45162A]">Eligible healthcare professionals</h3>
          {loadError ? (
            <p className="mt-3 rounded-xl bg-[#FBF0F1] p-4 text-sm text-[#7D2639]" role="alert">{loadError}</p>
          ) : eligibleHcps.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#DCC4CB] p-4 text-sm text-[#806771]" role="status">
              No eligible healthcare professionals are available right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {eligibleHcps.map((hcp) => {
                const alreadyActive = activeHcpIds.has(hcp.hcpID);
                return (
                  <li key={hcp.hcpID} className="rounded-2xl border border-[#F0E6E9] p-4">
                    <p className="font-semibold text-[#45162A]">{hcp.fullName}</p>
                    <p className="mt-1 text-sm text-[#705660]">{hcp.specialization}</p>
                    <p className="text-sm text-[#806771]">{hcp.workplace}</p>
                    {alreadyActive ? (
                      <p className="mt-3 inline-flex rounded-full bg-[#EDF6F0] px-3 py-1 text-xs font-bold text-[#28543A]">Permission active</p>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => grant(hcp.hcpID)}
                        className="mt-3 min-h-10 rounded-xl bg-[#6F1D35] px-4 py-2 text-sm font-bold text-white hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending && pendingHcpID === hcp.hcpID ? "Saving permission…" : "Grant permission"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="active-consents-heading">
          <h3 id="active-consents-heading" className="font-bold text-[#45162A]">Current permissions</h3>
          {loadError ? (
            <p className="mt-3 rounded-xl bg-[#FBF0F1] p-4 text-sm text-[#7D2639]" role="alert">{loadError}</p>
          ) : activeConsents.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#DCC4CB] p-4 text-sm text-[#806771]" role="status">
              You have not granted HCP access permission.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activeConsents.map((consent) => (
                <li key={consent.consentID} className="rounded-2xl border border-[#F0E6E9] p-4">
                  <p className="font-semibold text-[#45162A]">{consent.fullName}</p>
                  <p className="mt-1 text-sm text-[#705660]">{consent.specialization}</p>
                  <p className="text-sm text-[#806771]">{consent.workplace}</p>
                  <p className="mt-2 text-xs text-[#806771]">
                    <time dateTime={consent.grantedAt}>Permission granted {formatDate(consent.grantedAt)}</time>
                  </p>
                  <p className="mt-2 text-xs text-[#806771]">Current HCP eligibility is checked separately before any protected use.</p>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { setRevokeFeedback(null); setSelectedConsent(consent); }}
                    className="mt-3 min-h-10 rounded-xl border border-[#B85C6E] px-4 py-2 text-sm font-bold text-[#7D2639] hover:bg-[#FBF0F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Revoke permission
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-5 text-xs leading-5 text-[#806771]">
        You can revoke a permission at any time. This page records your choice only; it does not expose symptom records to HCPs.
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="revoke-consent-title"
        aria-describedby="revoke-consent-description"
        onCancel={(event) => { event.preventDefault(); setSelectedConsent(null); }}
        onClose={() => setSelectedConsent(null)}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-[#E8D9DD] bg-white p-0 text-[#29101A] shadow-2xl backdrop:bg-[#29101A]/40"
      >
        <div className="p-6">
          <h3 id="revoke-consent-title" className="text-lg font-extrabold text-[#45162A]">Revoke HCP permission?</h3>
          <p id="revoke-consent-description" className="mt-2 text-sm leading-6 text-[#705660]">
            Revoke the permission recorded for {selectedConsent?.fullName ?? "this HCP"}? This can be granted again later if the HCP remains eligible.
          </p>
          {revokeFeedback?.status === "error" ? <p className="mt-4 rounded-xl bg-[#FBF0F1] px-4 py-3 text-sm text-[#7D2639]" role="alert">{revokeFeedback.message}</p> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={isPending} onClick={() => setSelectedConsent(null)} className="min-h-11 rounded-xl border border-[#DCC9CE] px-4 py-2 text-sm font-bold text-[#5D4650] hover:bg-[#FBF6F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">Cancel</button>
            <button type="button" disabled={isPending} onClick={revoke} className="min-h-11 rounded-xl bg-[#7D2639] px-4 py-2 text-sm font-bold text-white hover:bg-[#641D2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:cursor-not-allowed disabled:opacity-60">
              {isPending ? "Revoking…" : "Revoke permission"}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
