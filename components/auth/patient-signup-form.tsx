"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { registerPatientAction } from "@/app/(auth)/actions";
import { INITIAL_REGISTRATION_STATE } from "@/lib/registration-state";

export default function PatientSignupForm() {
    const [state, formAction, isPending] = useActionState(
        registerPatientAction,
        INITIAL_REGISTRATION_STATE,
    );
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [noKnownAllergies, setNoKnownAllergies] = useState(false);

    return (
        <div className="pb-2">
            <header className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#230711] sm:text-3xl">
                    Create your patient account
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4A1525]/80">
                    Create an account to manage your symptoms, health history and
                    healthcare connections.
                </p>
            </header>

            <form action={formAction} className="space-y-8">
                <input
                    type="hidden"
                    name="noKnownAllergies"
                    value={noKnownAllergies ? "true" : "false"}
                />
                {/* SECTION 1: Account Information */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#F0DFE3] pb-2">
                        <span className="h-2 w-2 rounded-full bg-[#7E2D43]" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
                            Account Information
                        </h2>
                    </div>

                    <div>
                        <label
                            htmlFor="patient-full-name"
                            className="mb-1.5 block text-xs font-semibold text-[#230711]"
                        >
                            Full name <span className="text-[#7E2D43]">*</span>
                        </label>

                        <input
                            id="patient-full-name"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            required
                            placeholder="e.g. Nurul Izzati binti Ahmad"
                            className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="patient-email"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Email address <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="patient-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="name@example.com"
                                aria-invalid={Boolean(state.fieldErrors?.email)}
                                aria-describedby={state.fieldErrors?.email ? "patient-email-error" : undefined}
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                            {state.fieldErrors?.email && (
                                <p
                                    id="patient-email-error"
                                    role="alert"
                                    className="mt-1.5 text-xs leading-relaxed text-[#9B1C3B]"
                                >
                                    {state.fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="patient-phone"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Phone number <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="patient-phone"
                                name="phoneNo"
                                type="tel"
                                autoComplete="tel"
                                required
                                maxLength={15}
                                placeholder="+60 12-345 6789"
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="patient-password"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Password <span className="text-[#7E2D43]">*</span>
                            </label>

                            <div className="relative">
                                <input
                                    id="patient-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
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
                                    {showPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="patient-confirm-password"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Confirm password <span className="text-[#7E2D43]">*</span>
                            </label>

                            <div className="relative">
                                <input
                                    id="patient-confirm-password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
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
                                    {showConfirmPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[#4A1525]/60">
                        Use a password between 8 and 128 characters.
                    </p>
                </section>

                {/* SECTION 2: Personal Information */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#F0DFE3] pb-2">
                        <span className="h-2 w-2 rounded-full bg-[#7E2D43]" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
                            Personal Information
                        </h2>
                    </div>

                    <div>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                            <label
                                htmlFor="patient-ic"
                                className="text-xs font-semibold text-[#230711]"
                            >
                                Malaysian IC number{" "}
                                <span className="text-[#7E2D43]">*</span>
                            </label>

                            <span className="text-[10px] text-[#4A1525]/60">
                                12-digit IC number
                            </span>
                        </div>

                        <input
                            id="patient-ic"
                            name="icNumber"
                            type="text"
                            autoComplete="off"
                            required
                            maxLength={14}
                            placeholder="e.g. 960814-14-5824"
                            className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />

                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#4A1525]/60">
                            Enter your Malaysian Identity Card number with or without
                            hyphens.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="patient-dob"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Date of birth <span className="text-[#7E2D43]">*</span>
                            </label>

                            <input
                                id="patient-dob"
                                name="dateOfBirth"
                                type="date"
                                autoComplete="bday"
                                required
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="patient-gender"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Gender <span className="text-[#7E2D43]">*</span>
                            </label>

                            <select
                                id="patient-gender"
                                name="gender"
                                required
                                defaultValue=""
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition"
                            >
                                <option value="" disabled>
                                    Select gender
                                </option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Declined">Prefer not to say</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="patient-address"
                            className="mb-1.5 block text-xs font-semibold text-[#230711]"
                        >
                            Home address <span className="text-[#7E2D43]">*</span>
                        </label>

                        <textarea
                            id="patient-address"
                            name="address"
                            rows={2}
                            required
                            autoComplete="street-address"
                            placeholder="Street address, apartment or unit, city, postal code"
                            className="opora-input w-full resize-y rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                        />
                    </div>
                </section>

                {/* SECTION 3: Optional Health Information */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[#F0DFE3] pb-2">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#C78393]" />
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7E2D43]">
                                Health Information
                            </h2>
                        </div>

                        <span className="rounded-full border border-[#E5CDD3] bg-[#F9EFF1] px-2.5 py-0.5 text-[10px] font-medium text-[#4A1525]/70">
                            Optional
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="patient-blood-type"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Blood type{" "}
                                <span className="font-normal text-[#4A1525]/60">
                                    (optional)
                                </span>
                            </label>

                            <select
                                id="patient-blood-type"
                                name="bloodType"
                                defaultValue=""
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] transition"
                            >
                                <option value="">Not sure / Leave unselected</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="patient-emergency-contact"
                                className="mb-1.5 block text-xs font-semibold text-[#230711]"
                            >
                                Emergency contact{" "}
                                <span className="font-normal text-[#4A1525]/60">
                                    (optional)
                                </span>
                            </label>

                            <input
                                id="patient-emergency-contact"
                                name="emergencyContact"
                                type="text"
                                autoComplete="off"
                                placeholder="Name and phone number"
                                className="opora-input w-full rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <label
                                htmlFor="patient-allergies"
                                className="text-xs font-semibold text-[#230711]"
                            >
                                Known allergies{" "}
                                <span className="font-normal text-[#4A1525]/60">
                                    (optional)
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#7E2D43]">
                                <input
                                    type="checkbox"
                                    checked={noKnownAllergies}
                                    onChange={(event) => {
                                        setNoKnownAllergies(event.target.checked);
                                    }}
                                    className="h-4 w-4 rounded border-[#E5CDD3] accent-[#7E2D43] focus:ring-[#7E2D43]"
                                />
                                <span>Declare no known allergies</span>
                            </label>
                        </div>

                        <textarea
                            id="patient-allergies"
                            name="allergies"
                            rows={2}
                            value={
                                noKnownAllergies
                                    ? "No known allergies (declared)"
                                    : undefined
                            }
                            disabled={noKnownAllergies}
                            placeholder="List known drug, food or environmental allergies."
                            className="opora-input w-full resize-y rounded-xl border border-[#E5CDD3] bg-white px-4 py-3 text-sm text-[#230711] placeholder:text-[#4A1525]/40 transition disabled:cursor-not-allowed disabled:bg-[#F0E9EB] disabled:text-[#75666A]"
                        />

                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#4A1525]/60">
                            Leaving this blank means allergy information has not been
                            provided.
                        </p>
                    </div>
                </section>

                {/* Privacy reassurance */}
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
                        Your health information is sensitive. OPORA is designed to help
                        you manage your health information with care.
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
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#7E2D43] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7E2D43]/20 transition hover:bg-[#4A1525] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 active:scale-[0.99]"
                    >
                        <span>{isPending ? "Creating account…" : "Create Patient Account"}</span>

                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 12h14m-7-7 7 7-7 7"
                            />
                        </svg>
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
                <span>Patient registration</span>
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
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.2 3.2M6.2 6.2C3.7 7.7 2.5 10 2 12c1 2.5 4.5 7 10 7 1.2 0 2.3-.2 3.3-.6" />
        </svg>
    );
}
