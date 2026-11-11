"use client";

import { useActionState, useEffect, useRef } from "react";

import { createSymptomRecordAction } from "@/app/(protected)/patient/actions";
import SymptomCombobox, { type SymptomChoice } from "@/components/patient/symptom-combobox";
import {
  INITIAL_SYMPTOM_ACTION_STATE,
  type SymptomActionState,
} from "@/lib/symptom-action-state";

export default function SymptomRecordForm({
  symptoms,
  idPrefix = "",
}: {
  symptoms: SymptomChoice[];
  idPrefix?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    SymptomActionState,
    FormData
  >(createSymptomRecordAction, INITIAL_SYMPTOM_ACTION_STATE);
  const fieldId = (name: string) => idPrefix ? `${idPrefix}-${name}` : name;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-5 lg:grid-cols-2"
    >
      <div className="lg:col-span-2">
        <SymptomCombobox symptoms={symptoms} />
      </div>

      <div className="space-y-2">
        <label htmlFor={fieldId("severity")} className="block text-sm font-semibold text-[#4D303A]">Severity</label>
        <select id={fieldId("severity")} name="severity" required defaultValue="" className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10">
          <option value="" disabled>Select from 1 to 10</option>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>{value}{value === 1 ? " · Mild" : value === 10 ? " · Severe" : ""}</option>
          ))}
        </select>
        <p className="text-xs text-[#806771]">Use the scale that feels right to you, from 1 (mild) to 10 (severe).</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={fieldId("onsetDate")} className="block text-sm font-semibold text-[#4D303A]">When did it start?</label>
        <input id={fieldId("onsetDate")} name="onsetDate" type="date" required className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
      </div>

      <div className="space-y-2">
        <label htmlFor={fieldId("duration")} className="block text-sm font-semibold text-[#4D303A]">Duration</label>
        <input id={fieldId("duration")} name="duration" type="text" required maxLength={30} placeholder="For example, 2 days" className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
        <p className="text-xs text-[#806771]">Up to 30 characters.</p>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <label htmlFor={fieldId("notes")} className="block text-sm font-semibold text-[#4D303A]">Additional details <span className="font-normal text-[#806771]">(optional)</span></label>
        <textarea id={fieldId("notes")} name="notes" rows={3} maxLength={2000} placeholder="Add any details you would like to remember." className="w-full resize-y rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none placeholder:text-[#AA969D] focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
      </div>

      {state.message ? (
        <p className={`rounded-xl px-4 py-3 text-sm lg:col-span-2 ${state.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF0F1] text-[#7D2639]"}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Saving entry…" : "Save symptom entry"}
        </button>
        <p className="text-xs text-[#806771]">Only you can view this personal symptom history.</p>
      </div>
    </form>
  );
}
