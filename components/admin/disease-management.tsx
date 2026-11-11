"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/admin/admin-disease.module.css";

import {
  createDiseaseAction,
  deleteDiseaseAction,
  updateDiseaseAction,
} from "@/app/(protected)/admin/disease-actions";
import {
  INITIAL_DISEASE_ACTION_STATE,
  type DiseaseActionState,
} from "@/lib/disease-action-state";

export type DiseaseManagementRecord = {
  diseaseID: number;
  diseaseName: string;
  description: string;
  causes: string;
  treatment: string;
  prevention: string;
  whenToSeekCare: string;
  lastUpdated: string;
  symptoms: { symptomID: number; symptomName: string }[];
};

export type DiseaseSymptomOption = { symptomID: number; symptomName: string };

export default function DiseaseManagement({
  records,
  symptomOptions,
  query,
  pageCount,
  currentPage,
}: {
  records: DiseaseManagementRecord[];
  symptomOptions: DiseaseSymptomOption[];
  query: string;
  pageCount: number;
  currentPage: number;
}) {
  const [adding, setAdding] = useState(false);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [desktopEditing, setDesktopEditing] = useState(false);
  const [desktopConfirmingDelete, setDesktopConfirmingDelete] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const selectedRecord = records.find((record) => record.diseaseID === selectedID) ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedRecord && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (!selectedRecord && dialog.open) {
      dialog.close();
    }
  }, [selectedRecord]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selectedID]);

  const closeDetails = useCallback(() => {
    setSelectedID(null);
    setDesktopEditing(false);
    setDesktopConfirmingDelete(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);
  const returnToDetails = useCallback(() => {
    setDesktopEditing(false);
    requestAnimationFrame(() => detailHeadingRef.current?.focus());
  }, []);

  return (
    <>
      <section className="admin-mobile-glass-panel mt-6 rounded-3xl border border-[#E8D9DD] bg-white p-4 shadow-sm sm:mt-8 sm:p-7" aria-labelledby="disease-management-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Admin tools</p>
            <h2 id="disease-management-heading" className="mt-1 text-xl font-extrabold text-[#35101F]">Disease information</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#705660]">Manage the information catalogue and its links to existing symptoms. Content is informational and is not a patient diagnosis.</p>
          </div>
          <button type="button" onClick={() => setAdding((value) => !value)} className="min-h-11 rounded-xl bg-[#6F1D35] px-4 py-3 text-sm font-bold text-white hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] sm:px-5">
            {adding ? "Close form" : "Add disease information"}
          </button>
        </div>

        <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row" role="search">
          <div className="flex-1">
            <label htmlFor="disease-search" className="sr-only">Search diseases by name</label>
            <input id="disease-search" type="search" name="q" defaultValue={query} maxLength={100} placeholder="Search by disease or condition name" className="min-h-11 w-full rounded-xl border border-[#DCC9CE] px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
          </div>
          <button type="submit" className="min-h-11 rounded-xl border border-[#D8AAB5] bg-white px-5 py-3 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]">Search</button>
          {query ? <a href="/admin/diseases" className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[#6F1D35] underline">Clear</a> : null}
        </form>
      </section>

      {adding ? (
        <DiseaseEditorForm
          title="Add disease or condition"
          symptoms={symptomOptions}
          onCancel={() => setAdding(false)}
          action={createDiseaseAction}
        />
      ) : null}

      <section className={`mt-6 ${styles.collapsedCatalogue}`} aria-label="Disease records">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/40 bg-white/85 px-6 py-10 text-center shadow-sm backdrop-blur-xl">
            <h3 className="font-bold text-[#48172A]">{query ? "No matching disease records" : "No disease information yet"}</h3>
            <p className="mt-2 text-sm text-[#806771]">{query ? "Try a different name." : "Use Add disease information to create the first record."}</p>
          </div>
        ) : (
          <ul className={styles.cardGrid}>
            {records.map((record) => (
              <li key={record.diseaseID} className={styles.diseaseCard}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-[#45162A]">{record.diseaseName}</h3>
                    <p className="mt-1 text-xs text-[#806771]">Updated {record.lastUpdated}</p>
                  </div>
                  <span className={styles.symptomCount}>{record.symptoms.length} {record.symptoms.length === 1 ? "symptom" : "symptoms"}</span>
                </div>
                <p className={styles.description}>{record.description}</p>
                {record.symptoms.length ? (
                  <ul className={styles.symptomList} aria-label={`Associated symptoms for ${record.diseaseName}`}>
                    {record.symptoms.slice(0, 3).map((symptom) => <li key={symptom.symptomID}>{symptom.symptomName}</li>)}
                    {record.symptoms.length > 3 ? <li>+{record.symptoms.length - 3} more</li> : null}
                  </ul>
                ) : <p className={styles.noSymptoms}>No associated symptoms</p>}
                <button
                  type="button"
                  className={styles.viewButton}
                  onClick={(event) => {
                    openerRef.current = event.currentTarget;
                    setDesktopEditing(false);
                    setDesktopConfirmingDelete(false);
                    setSelectedID(record.diseaseID);
                  }}
                >
                  View information <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pageCount > 1 ? (
          <nav aria-label="Disease result pages" className={styles.pagination}>
            {currentPage > 1 ? <Link href={diseasePageHref(query, currentPage - 1)} className="min-h-10 px-3 py-2 font-semibold text-[#6F1D35] underline">Previous</Link> : <span />}
            <span>Page {currentPage} of {pageCount}</span>
            {currentPage < pageCount ? <Link href={diseasePageHref(query, currentPage + 1)} className="min-h-10 px-3 py-2 font-semibold text-[#6F1D35] underline">Next</Link> : <span />}
          </nav>
        ) : null}
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="admin-disease-dialog-title"
        onClose={() => { if (selectedID !== null) closeDetails(); }}
        onClick={(event) => {
          const dialog = dialogRef.current;
          if (!dialog || event.target !== dialog) return;
          const bounds = dialog.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetails();
        }}
        className={styles.diseaseDialog}
      >
        {selectedRecord ? (
          <>
            <header className={styles.dialogHeader}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A3D53]">Disease information</p>
                <h2 ref={detailHeadingRef} id="admin-disease-dialog-title" tabIndex={-1} className="mt-1 text-2xl font-extrabold text-[#45162A]">{selectedRecord.diseaseName}</h2>
                <p className="mt-1 text-xs text-[#806771]">Updated {selectedRecord.lastUpdated}</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={closeDetails} aria-label="Close disease information" className={styles.dialogClose}>×</button>
            </header>
            <div className={styles.dialogBody}>
              {desktopEditing ? (
                <DiseaseEditorForm
                  key={`desktop-edit-${selectedRecord.diseaseID}`}
                  title={`Edit ${selectedRecord.diseaseName}`}
                  symptoms={symptomOptions}
                  initial={selectedRecord}
                  idPrefix="desktop-edit"
                  onCancel={returnToDetails}
                  onSuccess={returnToDetails}
                  action={updateDiseaseAction.bind(null, selectedRecord.diseaseID)}
                />
              ) : desktopConfirmingDelete ? (
                <DeleteConfirmation record={selectedRecord} onCancel={() => setDesktopConfirmingDelete(false)} onSuccess={closeDetails} />
              ) : (
                <dl className={styles.detailGrid}>
                  <DiseaseDetail label="Description" value={selectedRecord.description} />
                  <DiseaseDetail label="Causes" value={selectedRecord.causes} />
                  <DiseaseDetail label="Treatment" value={selectedRecord.treatment} />
                  <DiseaseDetail label="Prevention" value={selectedRecord.prevention} />
                  <DiseaseDetail label="When to seek care" value={selectedRecord.whenToSeekCare} />
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Associated symptoms</dt><dd className="mt-1 text-[#4F3540]">{selectedRecord.symptoms.length ? selectedRecord.symptoms.map((symptom) => symptom.symptomName).join(", ") : "None associated"}</dd></div>
                </dl>
              )}
            </div>
            {!desktopEditing && !desktopConfirmingDelete ? (
              <footer className={styles.dialogFooter}>
                <button type="button" onClick={() => setDesktopEditing(true)} className="min-h-10 rounded-xl border border-[#D8AAB5] bg-white px-4 py-2 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]">Edit information</button>
                <button type="button" onClick={() => setDesktopConfirmingDelete(true)} className="min-h-10 rounded-xl border border-[#E1B9C1] bg-white px-4 py-2 text-sm font-bold text-[#8A263D] hover:bg-[#FBF0F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A263D]">Delete</button>
              </footer>
            ) : null}
          </>
        ) : null}
      </dialog>
    </>
  );
}

function diseasePageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/admin/diseases?${params.toString()}`;
}

function DiseaseDetail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-[#4F3540]">{value}</dd></div>;
}

function DiseaseEditorForm({
  title,
  symptoms,
  initial,
  action,
  onCancel,
  idPrefix = "disease",
  onSuccess,
}: {
  title: string;
  symptoms: DiseaseSymptomOption[];
  initial?: DiseaseManagementRecord;
  action: (previousState: DiseaseActionState, formData: FormData) => Promise<DiseaseActionState>;
  onCancel: () => void;
  idPrefix?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, INITIAL_DISEASE_ACTION_STATE);
  useEffect(() => { if (state.status === "success") { router.refresh(); onSuccess?.(); } }, [router, state.status, state.message, onSuccess]);
  const selectedIds = new Set(initial?.symptoms.map((symptom) => symptom.symptomID) ?? []);

  return (
    <form action={formAction} className="admin-mobile-glass-panel mt-5 rounded-2xl border border-[#E8D9DD] bg-[#FFFCFB] p-4 sm:p-6">
      <h4 className="text-base font-extrabold text-[#45162A]">{title}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-diseaseName`} label="Disease or condition name" name="diseaseName" initialValue={initial?.diseaseName} maxLength={100} />
        <LongField id={`${idPrefix}-description`} label="Description" name="description" initialValue={initial?.description} />
        <LongField id={`${idPrefix}-causes`} label="Causes" name="causes" initialValue={initial?.causes} />
        <LongField id={`${idPrefix}-treatment`} label="Treatment" name="treatment" initialValue={initial?.treatment} />
        <LongField id={`${idPrefix}-prevention`} label="Prevention" name="prevention" initialValue={initial?.prevention} />
        <LongField id={`${idPrefix}-whenToSeekCare`} label="When to seek care" name="whenToSeekCare" initialValue={initial?.whenToSeekCare} />
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-[#4D303A]">Associated symptoms <span className="font-normal text-[#806771]">(optional)</span></legend>
        <p className="mt-1 text-xs text-[#806771]">Choose from the existing symptom catalogue. Selecting none removes all associations.</p>
        {symptoms.length ? (
          <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-[#E8D9DD] bg-white p-3 sm:grid-cols-2">
            {symptoms.map((symptom) => (
              <label key={symptom.symptomID} className="flex min-h-10 items-start gap-2 rounded-lg px-2 py-2 text-sm text-[#4F3540] hover:bg-[#FBF4F5]">
                <input type="checkbox" name="symptomIDs" value={symptom.symptomID} defaultChecked={selectedIds.has(symptom.symptomID)} className="mt-0.5 h-4 w-4 accent-[#6F1D35]" />
                <span>{symptom.symptomName}</span>
              </label>
            ))}
          </div>
        ) : <p className="mt-3 rounded-xl bg-[#FBF4F5] p-3 text-sm text-[#6B4652]">The symptom catalogue is unavailable. You can save without associations.</p>}
      </fieldset>

      {state.message ? <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${state.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Saving…" : initial ? "Save changes" : "Add disease information"}</button>
        <button type="button" disabled={pending} onClick={onCancel} className="min-h-11 rounded-xl border border-[#D8AAB5] bg-white px-5 py-3 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">Cancel</button>
      </div>
    </form>
  );
}

function Field({ id, label, name, initialValue, maxLength }: { id: string; label: string; name: string; initialValue?: string; maxLength: number }) {
  return <div className="space-y-2 sm:col-span-2"><label htmlFor={id} className="block text-sm font-semibold text-[#4D303A]">{label}</label><input id={id} name={name} required maxLength={maxLength} defaultValue={initialValue ?? ""} className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" /></div>;
}

function LongField({ id, label, name, initialValue }: { id: string; label: string; name: string; initialValue?: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-semibold text-[#4D303A]">{label}</label><textarea id={id} name={name} required rows={4} maxLength={10_000} defaultValue={initialValue ?? ""} className="w-full resize-y rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" /><p className="text-xs text-[#806771]">Required, up to 10,000 characters.</p></div>;
}

function DeleteConfirmation({ record, onCancel, onSuccess }: { record: DiseaseManagementRecord; onCancel: () => void; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(
    deleteDiseaseAction.bind(null, record.diseaseID),
    INITIAL_DISEASE_ACTION_STATE,
  );
  const router = useRouter();
  useEffect(() => { if (state.status === "success") { router.refresh(); onSuccess?.(); } }, [router, state.status, state.message, onSuccess]);

  return (
    <div role="group" aria-label={`Confirm deletion of ${record.diseaseName}`} className="mt-5 rounded-xl border border-[#E1B9C1] bg-[#FBF4F5] p-4">
      <p className="text-sm font-semibold text-[#6B2639]">Delete “{record.diseaseName}” and its symptom associations?</p>
      <p className="mt-1 text-xs text-[#806771]">This action cannot be undone.</p>
      {state.message ? <p className={`mt-3 text-sm ${state.status === "success" ? "text-[#28543A]" : "text-[#7D2639]"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <form action={formAction} className="mt-3 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-[#8A263D] px-4 py-2 text-sm font-bold text-white hover:bg-[#6E1C30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A263D] disabled:opacity-60">{pending ? "Deleting…" : "Confirm delete"}</button>
        <button type="button" disabled={pending} onClick={onCancel} className="min-h-10 rounded-xl border border-[#D8AAB5] bg-white px-4 py-2 text-sm font-bold text-[#6F1D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">Cancel</button>
      </form>
    </div>
  );
}
