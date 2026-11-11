"use client";

import { useActionState } from "react";
import { useRef, useState } from "react";

import { submitAssessmentAction } from "@/app/(protected)/patient/assessment/actions";
import SymptomCombobox, { type SymptomChoice } from "@/components/patient/symptom-combobox";
import {
  INITIAL_SYMPTOM_ACTION_STATE,
  type SymptomActionState,
} from "@/lib/symptom-action-state";

const MAX_ASSESSMENT_SYMPTOMS = 20;

export default function SymptomAssessmentForm({ symptoms }: { symptoms: SymptomChoice[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<SymptomActionState, FormData>(
    submitAssessmentAction,
    INITIAL_SYMPTOM_ACTION_STATE,
  );
  const [entries, setEntries] = useState([0]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewedAnswers, setReviewedAnswers] = useState<Array<{
    symptomName: string;
    bodyPart: string;
    severity: string;
    onsetDate: string;
    duration: string;
    notes: string;
  }> | null>(null);

  function reviewAssessment() {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    const data = new FormData(form);
    const symptomIDs = data.getAll("symptomID");
    const severities = data.getAll("severity");
    const onsetDates = data.getAll("onsetDate");
    const durations = data.getAll("duration");
    const notes = data.getAll("notes");
    const answers = symptomIDs.map((rawID, index) => {
      const selected = symptoms.find((item) => item.symptomID === Number(rawID));
      return {
        symptomName: selected?.symptomName ?? "Unavailable symptom",
        bodyPart: selected?.bodyPart ?? "",
        severity: String(severities[index] ?? ""),
        onsetDate: String(onsetDates[index] ?? ""),
        duration: String(durations[index] ?? ""),
        notes: String(notes[index] ?? ""),
      };
    });
    setReviewedAnswers(answers);
    setIsReviewing(true);
  }

  function addEntry() {
    setEntries((current) => current.length >= MAX_ASSESSMENT_SYMPTOMS
      ? current
      : [...current, Math.max(...current) + 1]);
  }

  function removeEntry(entryID: number) {
    setEntries((current) => current.length <= 1 ? current : current.filter((id) => id !== entryID));
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div hidden={isReviewing} className="space-y-4">
        {entries.map((entryID, index) => (
          <fieldset key={entryID} className="grid gap-5 rounded-2xl border border-[#E8D9DD] bg-[#FFFCFB] p-4 sm:p-5 lg:grid-cols-2">
            <legend className="px-2 text-sm font-bold text-[#45162A]">Symptom {index + 1}</legend>
            <div className="lg:col-span-2">
              <SymptomCombobox symptoms={symptoms} name="symptomID" />
            </div>

            <div className="space-y-2">
              <label htmlFor={`assessment-severity-${entryID}`} className="block text-sm font-semibold text-[#4D303A]">Severity</label>
              <select id={`assessment-severity-${entryID}`} name="severity" required defaultValue="" className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10">
                <option value="" disabled>Select from 1 to 10</option>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>{value}{value === 1 ? " · Mild" : value === 10 ? " · Severe" : ""}</option>
                ))}
              </select>
              <p className="text-xs text-[#806771]">Use the existing scale from 1 (mild) to 10 (severe).</p>
            </div>

            <div className="space-y-2">
              <label htmlFor={`assessment-onset-${entryID}`} className="block text-sm font-semibold text-[#4D303A]">When did it start?</label>
              <input id={`assessment-onset-${entryID}`} name="onsetDate" type="date" required className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
            </div>

            <div className="space-y-2">
              <label htmlFor={`assessment-duration-${entryID}`} className="block text-sm font-semibold text-[#4D303A]">Duration</label>
              <input id={`assessment-duration-${entryID}`} name="duration" type="text" required maxLength={30} placeholder="For example, 2 days" className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
              <p className="text-xs text-[#806771]">Up to 30 characters.</p>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor={`assessment-notes-${entryID}`} className="block text-sm font-semibold text-[#4D303A]">Additional details <span className="font-normal text-[#806771]">(optional)</span></label>
              <textarea id={`assessment-notes-${entryID}`} name="notes" rows={3} maxLength={2000} placeholder="Add any details you would like to include." className="w-full resize-y rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
            </div>

            {entries.length > 1 ? (
              <button type="button" onClick={() => removeEntry(entryID)} disabled={isPending} className="justify-self-start rounded-lg px-3 py-2 text-sm font-bold text-[#7D2639] hover:bg-[#FBF0F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2639] disabled:opacity-60 lg:col-span-2">
                Remove symptom {index + 1}
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      <div hidden={isReviewing} className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#806771]">{entries.length} of {MAX_ASSESSMENT_SYMPTOMS} symptoms</p>
        <button type="button" onClick={addEntry} disabled={isPending || entries.length >= MAX_ASSESSMENT_SYMPTOMS} className="min-h-10 rounded-xl border border-[#D8AAB5] bg-white px-4 py-2 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-50">
          Add another symptom
        </button>
      </div>

      {isReviewing && reviewedAnswers ? (
        <section aria-labelledby="assessment-review-heading" className="space-y-4 rounded-2xl border border-[#E8D9DD] bg-[#FFFCFB] p-4 sm:p-5">
          <div>
            <h2 id="assessment-review-heading" className="text-lg font-extrabold text-[#45162A]">Review your symptoms</h2>
            <p className="mt-1 text-sm text-[#705660]">Check these details before saving the assessment.</p>
          </div>
          <ol className="space-y-3">
            {reviewedAnswers.map((answer, index) => (
              <li key={`${answer.symptomName}-${index}`} className="rounded-xl border border-[#F0E6E9] bg-white p-4">
                <h3 className="font-bold text-[#45162A]">{answer.symptomName}{answer.bodyPart ? ` · ${answer.bodyPart}` : ""}</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Severity</dt><dd className="mt-1 text-[#4F3540]">{answer.severity}/10</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Started</dt><dd className="mt-1 text-[#4F3540]">{answer.onsetDate}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Duration</dt><dd className="mt-1 text-[#4F3540]">{answer.duration}</dd></div>
                  {answer.notes ? <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A737A]">Additional details</dt><dd className="mt-1 whitespace-pre-wrap text-[#4F3540]">{answer.notes}</dd></div> : null}
                </dl>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setIsReviewing(false)} disabled={isPending} className="min-h-10 rounded-xl border border-[#D8AAB5] bg-white px-4 py-2 text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:opacity-60">
            Edit symptom details
          </button>
        </section>
      ) : null}

      {state.message ? (
        <p className={`rounded-xl px-4 py-3 text-sm ${state.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      ) : null}

      {!isReviewing ? (
        <button type="button" onClick={reviewAssessment} disabled={isPending || symptoms.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60">
          Review assessment
        </button>
      ) : (
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Saving assessment…" : "Submit assessment"}
        </button>
      )}
    </form>
  );
}
