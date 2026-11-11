
import Image from "next/image";
import type { ReactNode } from "react";
import AuthLogo from "@/components/auth/auth-logo";

type AuthShellProps = {
    children: ReactNode;
    adminLoginDiscovery?: boolean;
};

export default function AuthShell({ children, adminLoginDiscovery = false }: AuthShellProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FCF9FA] via-[#F8F3F5] to-[#F5EFF2] p-3 font-sans antialiased sm:p-6 lg:p-8">
            <section className="relative isolate min-h-[640px] w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#E8D1D8]/70 bg-white shadow-[0_30px_80px_-15px_rgba(45,12,23,0.22)] lg:rounded-[36px]">
                {/* Desktop background photograph */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 hidden overflow-hidden lg:block"
                >
                    <Image
                        src="/images/auth-panel.jpg"
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        className="object-cover object-right"
                    />

                    <div className="absolute inset-0 bg-gradient-to-r from-[#230711]/50 via-[#350F1B]/25 to-[#230711]/55" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#230711]/45 via-transparent to-[#350F1B]/15" />
                </div>

                {/* Layered paper-cut separator */}
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
                    fill="none"
                    viewBox="0 0 1000 680"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="auth-deep-wine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3D0E1C" />
                            <stop offset="100%" stopColor="#230711" />
                        </linearGradient>

                        <linearGradient id="auth-plum" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6E2337" />
                            <stop offset="100%" stopColor="#4F1626" />
                        </linearGradient>

                        <linearGradient id="auth-rose" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D9A8B5" />
                            <stop offset="100%" stopColor="#B87788" />
                        </linearGradient>
                    </defs>

                    <path
                        d="M 0,0 L 730,0 C 725,60 705,120 670,165 C 625,220 540,240 545,335 C 550,420 635,460 625,550 C 618,610 520,630 460,680 L 0,680 Z"
                        fill="url(#auth-deep-wine)"
                    />

                    <path
                        d="M 0,0 L 700,0 C 695,65 675,120 640,170 C 595,225 515,245 520,340 C 525,420 610,460 600,550 C 592,605 500,630 440,680 L 0,680 Z"
                        fill="url(#auth-plum)"
                    />

                    <path
                        d="M 0,0 L 670,0 C 665,70 645,125 610,175 C 565,230 485,250 490,345 C 495,420 585,460 575,550 C 565,605 480,630 420,680 L 0,680 Z"
                        fill="url(#auth-rose)"
                    />

                    <path
                        d="M 0,0 L 640,0 C 635,75 615,130 580,180 C 535,235 455,255 460,350 C 465,420 555,460 545,550 C 535,610 455,630 395,680 L 0,680 Z"
                        fill="#FFFFFF"
                        style={{
                            filter:
                                "drop-shadow(14px 3px 15px rgba(20,3,8,0.28))",
                        }}
                    />
                </svg>

                {/* Page content */}
                <div className="relative z-10 grid min-h-[640px] grid-cols-1 lg:grid-cols-12">
                    {/* Form side */}
                    <section className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:col-span-6 lg:bg-transparent lg:px-10 lg:py-12 xl:col-span-5 xl:px-12">

                        <AuthLogo adminLoginDiscovery={adminLoginDiscovery} />

                        <div className="mt-8 flex flex-1 flex-col sm:mt-10">
                            {children}
                        </div>
                    </section>

                    {/* Desktop branding side */}
                    <section className="relative hidden flex-col items-end justify-between p-8 text-white lg:col-span-6 lg:flex xl:col-span-7 xl:p-12">
                        <div className="my-auto mr-2 max-w-md text-right">
                            <h2 className="text-2xl font-extrabold leading-snug tracking-tight drop-shadow-md xl:text-3xl">
                                Know your symptoms.
                                <br />
                                <span className="text-[#F3DEE3]">
                                    Reach your doctor sooner.
                                </span>
                            </h2>

                            <p className="ml-auto mt-3 max-w-sm text-xs leading-relaxed text-[#FDF7F8]/90 xl:text-sm">
                                Your symptoms, health history, and healthcare connections in
                                one place.
                            </p>
                        </div>

                        <p className="text-right text-[11px] text-[#F3DEE3]">
                            Your health information deserves careful protection.
                        </p>
                    </section>
                </div>
            </section>
        </main>
    );
}
