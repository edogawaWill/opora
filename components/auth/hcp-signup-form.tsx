"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { registerHealthcareProfessionalAction } from "@/app/(auth)/actions";
import { INITIAL_REGISTRATION_STATE } from "@/lib/registration-state";

export default function HcpSignupForm() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(
        registerHealthcareProfessionalAction,
        INITIAL_REGISTRATION_STATE,
    );
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [specialization, setSpecialization] = useState("");
    const [otherSpecialization, setOtherSpecialization] = useState("");

    useEffect(() => {
        if (state.redirectTo) {
            router.replace(state.redirectTo);
        }
    }, [router, state.redirectTo]);

    return (
        <div className="pb-2">
            {/* Page heading */}
            <header className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#230711] sm:text-3xl">
                    Create your healthcare professional account
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4A1525]/80">
                    Register your professional details for verification by an OPORA
                    administrator.
                </p>
            </header>

            <form action={formAction} className="space-y-8">
                {/* SECTION 1: Account Information */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#F0DFE3] pb-2">
                        <span className="h-2 w-2 rounded-full bg-[#7E2D43]" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
                            Account Information
                        </h2>
                    </div>

                    {/* Full name */}
                    <div>
                        <label
                            htmlFor="hcp-full-name"
                            className="mb-1.5 block text-xs font-semibold text-[#230711]"
                        >
                            Full name <span className="text-[#7E2D43]">*</span>
                        </label>

                        <input
                            id="hcp-full-name"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            required
                            placeholder="e.g. Dr. Nurul Izzati binti Ahmad"
                            className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />
                    </div>

                    {/* Email and phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="hcp-email"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Email address <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="hcp-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="doctor@hospital.gov.my"
                                aria-invalid={Boolean(state.fieldErrors?.email)}
                                aria-describedby={state.fieldErrors?.email ? "hcp-email-error" : undefined}
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                            {state.fieldErrors?.email && (
                                <p
                                    id="hcp-email-error"
                                    role="alert"
                                    className="mt-1.5 text-xs leading-relaxed text-[#9B1C3B]"
                                >
                                    {state.fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="hcp-phone"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Phone number <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="hcp-phone"
                                name="phoneNo"
                                type="tel"
                                autoComplete="tel"
                                maxLength={15}
                                required
                                placeholder="+60 12-345 6789"
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                        </div>
                    </div>

                    {/* Password and confirmation */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="hcp-password"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Password <span className="text-[#7E2D43]">*</span>
                            </label>

                            <div className="relative">
                                <input
                                    id="hcp-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    placeholder="Create a password"
                                    className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white py-3 pl-4 pr-12 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword((current) => !current)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    aria-pressed={showPassword}
                                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4A1525]/60 transition hover:text-[#7E2D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7E2D43]"
                                >
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="hcp-confirm-password"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Confirm password{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <div className="relative">
                                <input
                                    id="hcp-confirm-password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    placeholder="Re-enter your password"
                                    className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white py-3 pl-4 pr-12 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword((current) => !current)
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirmation password"
                                            : "Show confirmation password"
                                    }
                                    aria-pressed={showConfirmPassword}
                                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4A1525]/60 transition hover:text-[#7E2D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7E2D43]"
                                >
                                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[#4A1525]/60">
                        Use a password between 8 and 128 characters.
                    </p>
                </section>

                {/* SECTION 2: Professional Credentials */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#F0DFE3] pb-2">
                        <span className="h-2 w-2 rounded-full bg-[#7E2D43]" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
                            Professional Credentials
                        </h2>
                    </div>

                    {/* MMC registration number */}
                    <div>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                            <label
                                htmlFor="hcp-license"
                                className="text-xs font-semibold text-[#230711]"
                            >
                                MMC registration number{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <span className="text-[10px] text-[#4A1525]/60">
                                Medical Council ID
                            </span>
                        </div>

                        <input
                            id="hcp-license"
                            name="licenseNo"
                            type="text"
                            autoComplete="off"
                            required
                            maxLength={20}
                            placeholder="e.g. your MMC registration number"
                            aria-invalid={Boolean(state.fieldErrors?.licenseNo)}
                            aria-describedby={state.fieldErrors?.licenseNo ? "hcp-license-error" : undefined}
                            className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />

                        {state.fieldErrors?.licenseNo && (
                            <p
                                id="hcp-license-error"
                                role="alert"
                                className="mt-1.5 text-xs leading-relaxed text-[#9B1C3B]"
                            >
                                {state.fieldErrors.licenseNo}
                            </p>
                        )}

                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#4A1525]/60">
                            Required for administrator verification against the Malaysian
                            Medical Council register.
                        </p>
                    </div>

                    {/* Specialisation and experience */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="hcp-specialization"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Specialisation{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <select
                                id="hcp-specialization"
                                name="specialization"
                                required
                                value={specialization}
                                onChange={(event) => setSpecialization(event.target.value)}
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition"
                            >
                                <option value="" disabled>
                                    Select specialisation
                                </option>
                                <option value="General Practice / Family Medicine">
                                    General Practice / Family Medicine
                                </option>
                                <option value="Internal Medicine">Internal Medicine</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Paediatrics">Paediatrics</option>
                                <option value="Endocrinology">Endocrinology</option>
                                <option value="Obstetrics & Gynaecology">
                                    Obstetrics &amp; Gynaecology
                                </option>
                                <option value="Dermatology">Dermatology</option>
                                <option value="Other Specialisation">
                                    Other Specialisation
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="hcp-experience"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Years of experience{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="hcp-experience"
                                name="yearsOfExperience"
                                type="number"
                                min={0}
                                step={1}
                                required
                                placeholder="e.g. 8"
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />

                            <p className="mt-1 text-[11px] text-[#4A1525]/60">
                                Post-housemanship clinical years
                            </p>
                        </div>
                    </div>

                    {specialization === "Other Specialisation" && (
                        <div>
                            <label
                                htmlFor="hcp-other-specialization"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Specify your specialisation{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="hcp-other-specialization"
                                name="otherSpecialization"
                                type="text"
                                required
                                value={otherSpecialization}
                                onChange={(event) => setOtherSpecialization(event.target.value)}
                                placeholder="Enter your specialisation"
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                        </div>
                    )}

                    {/* Workplace */}
                    <div>
                        <label
                            htmlFor="hcp-workplace"
                            className="mb-1.5 block text-xs font-semibold text-[#230711]"
                        >
                            Workplace / clinic{" "}
                            <span className="text-[#7E2D43]">*</span>
                        </label>

                        <input
                            id="hcp-workplace"
                            name="workplace"
                            type="text"
                            required
                            maxLength={120}
                            placeholder="e.g. Hospital Kuala Lumpur / Klinik Kesihatan Bangsar"
                            className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />
                    </div>

                    {/* Verification notice */}
                    <aside className="flex items-start gap-3 rounded-xl border border-[#E5CDD3] bg-[#F9EFF1] p-4">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5CDD3] bg-white text-[#7E2D43]">
                            <ShieldCheckIcon />
                        </div>

                        <div>
                            <h3 className="text-xs font-semibold text-[#4A1525]">
                                Administrator verification required
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-[#4A1525]/80">
                                Your account will remain pending until an OPORA administrator
                                verifies your professional registration details.
                            </p>
                        </div>
                    </aside>
                </section>

                {/* Privacy note */}
                <aside className="flex items-start gap-2.5 rounded-xl border border-[#E5CDD3] bg-[#F9EFF1]/80 p-3.5 text-xs leading-relaxed text-[#4A1525]/85">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#7E2D43]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    >
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>

                    <p>
                        Professional data and clinical access are intended to be managed
                        according to role permissions and appropriate privacy safeguards.
                    </p>
                </aside>

                {state.message && (
                    <p
                        role="status"
                        aria-live="polite"
                        className="rounded-xl border border-[#E5CDD3] bg-white p-3 text-sm leading-relaxed text-[#4A1525]"
                    >
                        {state.message}
                    </p>
                )}

                {/* Actions */}
                <div className="space-y-4 pt-1">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7E2D43] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#7E2D43]/15 transition hover:bg-[#4A1525] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 active:scale-[0.99]"
                    >
                        {isPending ? "Submitting…" : "Submit for Verification"}
                        <span aria-hidden="true">→</span>
                    </button>

                    <p className="text-center text-sm text-[#4A1525]/80">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="ml-1 font-bold text-[#7E2D43] transition hover:text-[#4A1525] hover:underline"
                        >
                            Log in
                        </Link>
                    </p>
                </div>
            </form>

            <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-[#F0DFE3] pt-4 text-[10px] text-[#4A1525]/55">
                <span>OPORA · Symptom &amp; Disease Management System</span>
                <span>Healthcare professional registration</span>
            </footer>
        </div>
    );
}

function EyeIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path d="m3 3 18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.2 3.2M6.2 6.2C3.7 7.7 2.5 10 2 12c1.2 2.5 4.5 7 10 7 1.2 0 2.3-.2 3.3-.6" />
        </svg>
    );
}

function ShieldCheckIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 12 2 2 4-4"
            />
        </svg>
    );
}
