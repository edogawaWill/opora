"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import {
  deleteSymptomRecordAction,
  updateSymptomRecordAction,
} from "@/app/(protected)/patient/actions";
import SymptomCombobox, { type SymptomChoice } from "@/components/patient/symptom-combobox";
import {
  INITIAL_SYMPTOM_ACTION_STATE,
  type SymptomActionState,
} from "@/lib/symptom-action-state";

type HistoryRecord = {
  recordID: number;
  symptomID: number;
  severity: number;
  onsetDate: string;
  onsetDateLabel: string;
  duration: string;
  notes: string | null;
  recordedAtLabel: string;
  symptom: { symptomName: string; bodyPart: string };
};

export default function SymptomHistory({
  records,
  totalRecords,
  pageCount,
  currentPage,
  symptoms,
}: {
  records: HistoryRecord[];
  totalRecords: number;
  pageCount: number;
  currentPage: number;
  symptoms: SymptomChoice[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");

  function handleDeleteSuccess() {
    setFeedback("Your symptom entry has been deleted.");
    router.refresh();
  }

  return (
    <section className="patient-symptom-history mt-8 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="patient-symptom-history-eyebrow text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Your saved entries</p>
          <h2 className="patient-symptom-history-title mt-1 text-xl font-extrabold text-[#35101F]">Symptom history</h2>
        </div>
        <p className="patient-symptom-history-count text-sm text-[#806771]">{totalRecords} {totalRecords === 1 ? "entry" : "entries"}</p>
      </div>
      {feedback ? <p className="mb-4 rounded-xl bg-[#EDF6F0] px-4 py-3 text-sm text-[#28543A]" role="status">{feedback}</p> : null}
      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCC4CB] bg-white px-6 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F8ECEF] text-[#7E2D43]" aria-hidden="true">＋</span>
          <h3 className="mt-4 font-bold text-[#48172A]">No symptom entries yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#806771]">When you record a symptom, it will appear here so you can review your own history.</p>
          <a href="#record-symptom" className="mt-5 inline-flex rounded-lg px-3 py-2 text-sm font-bold text-[#7E2D43] hover:bg-[#FBF4F5]">Create your first entry</a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E8D9DD] bg-white">
          <ul className="divide-y divide-[#F0E6E9]">
            {records.map((record) => (
              <SymptomHistoryEntry
                key={record.recordID}
                record={record}
                symptoms={symptoms}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ))}
          </ul>
          {pageCount > 1 ? (
            <nav aria-label="Symptom history pages" className="flex items-center justify-between border-t border-[#F0E6E9] px-5 py-4 text-sm">
              {currentPage > 1 ? <Link href={`/patient?page=${currentPage - 1}#symptom-history`} className="font-semibold text-[#6F1D35] hover:underline">← Newer entries</Link> : <span />}
              <span className="text-[#806771]">Page {currentPage} of {pageCount}</span>
              {currentPage < pageCount ? <Link href={`/patient?page=${currentPage + 1}#symptom-history`} className="font-semibold text-[#6F1D35] hover:underline">Older entries →</Link> : <span />}
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SymptomHistoryEntry({
  record,
  symptoms,
  onDeleteSuccess,
}: {
  record: HistoryRecord;
  symptoms: SymptomChoice[];
  onDeleteSuccess: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, updateFormAction, isUpdatePending] = useActionState<
    SymptomActionState,
    FormData
  >(updateSymptomRecordAction.bind(null, record.recordID), INITIAL_SYMPTOM_ACTION_STATE);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<SymptomActionState>(INITIAL_SYMPTOM_ACTION_STATE);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (isDeleteOpen && !dialog.open) dialog.showModal();
    if (!isDeleteOpen && dialog.open) dialog.close();
  }, [isDeleteOpen]);

  function confirmDelete() {
    if (isDeletePending) return;
    startDeleteTransition(async () => {
      const result = await deleteSymptomRecordAction(record.recordID);
      setDeleteState(result);
      if (result.status === "success") {
        setIsDeleteOpen(false);
        onDeleteSuccess();
      }
    });
  }

  return (
    <li className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#45162A]">{record.symptom.symptomName}</h3>
          <p className="mt-1 text-xs text-[#8A737A]">{record.symptom.bodyPart} · Recorded {record.recordedAtLabel}</p>
        </div>
        <span className="rounded-full bg-[#F8ECEF] px-3 py-1 text-xs font-bold text-[#6F1D35]">Severity {record.severity}/10</span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Onset</dt><dd className="mt-1 text-[#4F3540]">{record.onsetDateLabel}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Duration</dt><dd className="mt-1 text-[#4F3540]">{record.duration}</dd></div>
      </dl>
      {record.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#5D4650]">{record.notes}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isUpdatePending || isDeletePending}
          aria-expanded={isEditing}
          aria-controls={`edit-symptom-${record.recordID}`}
          onClick={() => setIsEditing((value) => !value)}
          className="rounded-lg px-3 py-2 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEditing ? "Close edit" : "Edit"}
        </button>
        <button
          type="button"
          disabled={isUpdatePending || isDeletePending}
          onClick={() => {
            setDeleteState(INITIAL_SYMPTOM_ACTION_STATE);
            setIsDeleteOpen(true);
          }}
          className="rounded-lg px-3 py-2 text-sm font-bold text-[#7D2639] hover:bg-[#FBF0F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {isEditing ? (
        <form id={`edit-symptom-${record.recordID}`} action={updateFormAction} className="mt-4 grid gap-4 rounded-2xl bg-[#FCF9F7] p-4 sm:p-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <SymptomCombobox symptoms={symptoms} defaultSymptomID={record.symptomID} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`severity-${record.recordID}`} className="block text-sm font-semibold text-[#4D303A]">Severity</label>
            <select id={`severity-${record.recordID}`} name="severity" required defaultValue={record.severity} className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{value}{value === 1 ? " · Mild" : value === 10 ? " · Severe" : ""}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor={`onsetDate-${record.recordID}`} className="block text-sm font-semibold text-[#4D303A]">When did it start?</label>
            <input id={`onsetDate-${record.recordID}`} name="onsetDate" type="date" required defaultValue={record.onsetDate} className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
          </div>
          <div className="space-y-2">
            <label htmlFor={`duration-${record.recordID}`} className="block text-sm font-semibold text-[#4D303A]">Duration</label>
            <input id={`duration-${record.recordID}`} name="duration" type="text" required maxLength={30} defaultValue={record.duration} placeholder="For example, 2 days" className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label htmlFor={`notes-${record.recordID}`} className="block text-sm font-semibold text-[#4D303A]">Additional details <span className="font-normal text-[#806771]">(optional)</span></label>
            <textarea id={`notes-${record.recordID}`} name="notes" rows={3} maxLength={2000} defaultValue={record.notes ?? ""} placeholder="Add any details you would like to remember." className="w-full resize-y rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
          </div>
          {editState.message ? (
            <p className={`rounded-xl px-4 py-3 text-sm lg:col-span-2 ${editState.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`} role={editState.status === "error" ? "alert" : "status"}>
              {editState.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <button type="submit" disabled={isUpdatePending} className="min-h-11 rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60">
              {isUpdatePending ? "Saving changes…" : "Save changes"}
            </button>
            <button type="button" disabled={isUpdatePending} onClick={() => setIsEditing(false)} className="min-h-11 rounded-xl border border-[#DCC9CE] bg-white px-5 py-3 text-sm font-bold text-[#5D4650] hover:bg-[#FBF6F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <dialog
        ref={deleteDialogRef}
        aria-labelledby={`delete-title-${record.recordID}`}
        aria-describedby={`delete-description-${record.recordID}`}
        onCancel={(event) => {
          event.preventDefault();
          setIsDeleteOpen(false);
        }}
        onClose={() => setIsDeleteOpen(false)}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-[#E8D9DD] bg-white p-0 text-[#29101A] shadow-2xl backdrop:bg-[#29101A]/40"
      >
        <div className="p-6">
          <h3 id={`delete-title-${record.recordID}`} className="text-lg font-extrabold text-[#45162A]">Delete symptom entry?</h3>
          <p id={`delete-description-${record.recordID}`} className="mt-2 text-sm leading-6 text-[#705660]">
            This will permanently remove the {record.symptom.symptomName} entry from your symptom history.
          </p>
          {deleteState.status === "error" ? <p className="mt-4 rounded-xl bg-[#FBF0F1] px-4 py-3 text-sm text-[#7D2639]" role="alert">{deleteState.message}</p> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={isDeletePending} onClick={() => setIsDeleteOpen(false)} className="min-h-11 rounded-xl border border-[#DCC9CE] px-4 py-2 text-sm font-bold text-[#5D4650] hover:bg-[#FBF6F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">
              Cancel
            </button>
            <button type="button" disabled={isDeletePending} onClick={confirmDelete} className="min-h-11 rounded-xl bg-[#7D2639] px-4 py-2 text-sm font-bold text-white hover:bg-[#641D2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:cursor-not-allowed disabled:opacity-60">
              {isDeletePending ? "Deleting…" : "Delete entry"}
            </button>
          </div>
        </div>
      </dialog>
    </li>
  );
}
