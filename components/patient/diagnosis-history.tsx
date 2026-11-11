"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteDiagnosisAction,
  recordDiagnosisAction,
} from "@/app/(protected)/patient/history/actions";
import {
  INITIAL_DIAGNOSIS_ACTION_STATE,
} from "@/lib/diagnosis-action-state";

export type DiagnosisItem = {
  diagnosisID: number;
  diagnosisName: string;
  diagnosisDate: Date | string | null;
  formattedDate: string;
  diagnosedBy: string | null;
  notes: string | null;
  recordedAt: Date | string;
};

type Props = {
  diagnoses: DiagnosisItem[];
};

export default function DiagnosisHistory({ diagnoses }: Props) {
  const router = useRouter();
  const [state, formAction, isSubmitting] = useActionState(
    recordDiagnosisAction,
    INITIAL_DIAGNOSIS_ACTION_STATE,
  );
  const [deletingID, setDeletingID] = useState<number | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  function handleDelete(id: number) {
    if (!confirm("Are you sure you want to remove this diagnosis record from your history?")) {
      return;
    }
    setDeletingID(id);
    startDeleteTransition(async () => {
      const res = await deleteDiagnosisAction(id);
      if (res.status === "success") {
        setFeedback(res.message);
        router.refresh();
      } else {
        setFeedback(res.message);
      }
      setDeletingID(null);
    });
  }

  return (
    <div className="space-y-8">
      {/* Notice / Disclaimer Banner */}
      <div className="rounded-2xl border border-[#D8AAB5] bg-[#FCF9F7] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#6F1D35] text-xs font-bold text-white">
            ℹ
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-[#35101F]">
              Patient-Reported Previous Diagnoses
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#705660]">
              This section is for maintaining your personal medical background (e.g. chronic conditions or conditions previously diagnosed by a medical doctor). Entries here are reported by you for your records and are separate from OPORA symptom assessment results.
            </p>
          </div>
        </div>
      </div>

      {/* Record New Diagnosis Form */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
        <div className="border-b border-[#F0E6E8] pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">
            Medical Background
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">
            Record a previous diagnosis
          </h2>
          <p className="mt-1 text-xs text-[#705660]">
            Add a condition previously identified by a licensed healthcare provider to your medical history.
          </p>
        </div>

        {state.status === "error" && (
          <div className="mt-4 rounded-xl border border-[#F8D7DA] bg-[#FDF2F2] p-4 text-xs font-semibold text-[#9B1C1C]">
            {state.message}
          </div>
        )}

        {state.status === "success" && (
          <div className="mt-4 rounded-xl border border-[#D3E8D9] bg-[#EDF6F0] p-4 text-xs font-semibold text-[#28543A]">
            {state.message}
          </div>
        )}

        {feedback && (
          <div className="mt-4 rounded-xl border border-[#D3E8D9] bg-[#EDF6F0] p-4 text-xs font-semibold text-[#28543A]">
            {feedback}
          </div>
        )}

        <form action={formAction} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="diagnosisName" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Condition / Diagnosis Name *
              </label>
              <input
                type="text"
                id="diagnosisName"
                name="diagnosisName"
                required
                maxLength={120}
                placeholder="e.g. Asthma, Hypertension, Migraine"
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div>
              <label htmlFor="diagnosisDate" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Date Diagnosed
              </label>
              <input
                type="date"
                id="diagnosisDate"
                name="diagnosisDate"
                max={todayStr}
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="diagnosedBy" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Diagnosing Doctor or Medical Facility
              </label>
              <input
                type="text"
                id="diagnosedBy"
                name="diagnosedBy"
                maxLength={120}
                placeholder="e.g. Dr. Tan, Subang Jaya Medical Centre, Klinik Kesihatan"
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-[#4A1525]">
                Notes / Prescribed Treatments
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={1000}
                placeholder="Details regarding severity, ongoing medication, or relevant clinical advice"
                className="mt-1.5 block w-full rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-xs focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#57152A] disabled:opacity-50"
            >
              {isSubmitting ? "Adding…" : "Add to health history"}
            </button>
          </div>
        </form>
      </div>

      {/* List of Previous Diagnoses */}
      <div className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
        <div className="flex items-center justify-between border-b border-[#F0E6E8] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">
              Saved Diagnoses
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">
              Your recorded diagnoses
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#8A737A]">
            {diagnoses.length} {diagnoses.length === 1 ? "record" : "records"}
          </span>
        </div>

        {diagnoses.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FBF4F5] text-xl font-bold text-[#6F1D35]">
              📋
            </div>
            <p className="text-base font-bold text-[#35101F]">No previous diagnoses recorded</p>
            <p className="mt-1 text-xs text-[#705660]">
              Use the form above to add any medical conditions diagnosed in the past.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#F0E6E8]">
            {diagnoses.map((d) => (
              <li key={d.diagnosisID} className="py-4 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#35101F]">{d.diagnosisName}</h3>
                    <p className="mt-0.5 text-xs text-[#705660]">
                      Diagnosed: <span className="font-medium text-[#4A1525]">{d.formattedDate}</span>
                      {d.diagnosedBy && (
                        <span> · By: <span className="font-medium text-[#4A1525]">{d.diagnosedBy}</span></span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isDeleting && deletingID === d.diagnosisID}
                    onClick={() => handleDelete(d.diagnosisID)}
                    className="inline-flex items-center rounded-lg border border-[#F8D7DA] bg-white px-2.5 py-1 text-xs font-semibold text-[#9B1C1C] hover:bg-[#FDF2F2] disabled:opacity-50"
                  >
                    {isDeleting && deletingID === d.diagnosisID ? "Removing…" : "Remove"}
                  </button>
                </div>
                {d.notes && (
                  <p className="mt-2 rounded-xl bg-[#FCF9F7] p-3 text-xs leading-relaxed text-[#4F3540]">
                    {d.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
