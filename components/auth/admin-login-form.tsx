"use client";

import { useActionState, useState } from "react";

import { signInAdminAction } from "@/app/(auth)/actions";
import { INITIAL_LOGIN_STATE } from "@/lib/login-state";

type AdminLoginFormProps = {
  onBack: () => void;
};

export default function AdminLoginForm({ onBack }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInAdminAction,
    INITIAL_LOGIN_STATE,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section
      aria-labelledby="admin-login-heading"
      className="flex flex-1 flex-col animate-[opora-admin-login-reveal_220ms_ease-out_both] motion-reduce:animate-none"
    >
      <header className="mb-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7E2D43]">
          OPORA administration
        </p>
        <h1
          id="admin-login-heading"
          className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
        >
          Administrator log in
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with your authorized OPORA administrator account.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700">
            Email address
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-[#7E2D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7E2D43]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-[#4A1525] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#350F1B]/20 transition hover:bg-[#350F1B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? "Signing in…" : "Log In"}
        </button>

        {state.message && (
          <p role="status" aria-live="polite" className="rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]">
            {state.message}
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 w-fit text-sm font-semibold text-[#7E2D43] transition hover:text-[#4A1525] hover:underline"
      >
        Back to regular login
      </button>
    </section>
  );
}
