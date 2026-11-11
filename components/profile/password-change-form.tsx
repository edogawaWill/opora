"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";

import type { ProfileActionResult } from "@/lib/profile-state";

const INPUT_CLASS = "opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition";

export default function PasswordChangeForm({
  action,
}: {
  action: (previousState: ProfileActionResult, formData: FormData) => Promise<ProfileActionResult>;
}) {
  const [feedback, formAction, isPending] = useActionState(action, { status: "error", message: "" } satisfies ProfileActionResult);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (feedback.status === "success") formRef.current?.reset();
  }, [feedback]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" id="profile-current-password">
          <input id="profile-current-password" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required className={INPUT_CLASS} />
        </Field>
        <Field label="New password" id="profile-new-password">
          <input id="profile-new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={INPUT_CLASS} />
        </Field>
        <Field label="Confirm new password" id="profile-confirm-password">
          <input id="profile-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={INPUT_CLASS} />
        </Field>
      </div>

      {feedback.message && <p className={`rounded-xl p-3 text-sm ${feedback.status === "success" ? "bg-[#EDF6F0] text-[#28543A]" : "bg-[#FBF4F5] text-[#6B4652]"}`} role={feedback.status === "success" ? "status" : "alert"}>{feedback.message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#57152A] disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Updating password…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#230711]">{label}</label>{children}</div>;
}
