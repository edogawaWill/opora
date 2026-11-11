"use client";

import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordForm() {
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    setIsPending(true);
    try {
      const redirectTo = new URL("/reset-password", window.location.origin).toString();
      const { error } = await authClient.requestPasswordReset({ email, redirectTo });
      setNotice(
        error
          ? "We could not process the reset request right now. Please try again later."
          : "If an account uses that email, the reset request has been accepted. Follow the reset instructions if a message arrives."
      );
    } catch {
      setNotice("We could not process the reset request right now. Please try again later.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="space-y-2">
        <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700">
          Email address
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-[#4A1525] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#350F1B] disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>
      {notice && <p role="status" aria-live="polite" className="rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]">{notice}</p>}
    </form>
  );
}
