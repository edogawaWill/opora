"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [notice, setNotice] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    if (password.length < 8 || password.length > 128) {
      setNotice("Use a password between 8 and 128 characters.");
      return;
    }
    if (password !== confirmation) {
      setNotice("Your passwords do not match. Please check them.");
      return;
    }

    setIsPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        setNotice("This reset link is invalid or expired. Request a new one and try again.");
      } else {
        setCompleted(true);
        setNotice("Your password has been updated. You can now sign in.");
      }
    } catch {
      setNotice("We could not update your password. Request a new reset link and try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (!token || completed) {
    return (
      <div className="mt-6 space-y-5">
        <p role="status" className="rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]">
          {notice || "This reset link is missing or invalid. Request a new one to continue."}
        </p>
        <Link href="/login" className="inline-flex font-semibold text-[#7E2D43] hover:underline">Return to login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-slate-700">Confirm new password</label>
        <input id="confirm-new-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10" />
      </div>
      <button type="submit" disabled={isPending} className="w-full rounded-2xl bg-[#4A1525] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#350F1B] disabled:opacity-60">
        {isPending ? "Updating…" : "Update password"}
      </button>
      {notice && <p role="status" aria-live="polite" className="rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]">{notice}</p>}
    </form>
  );
}
