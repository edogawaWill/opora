import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { AuthorizationError, requirePatient } from "@/lib/authorization";
import { loadUnreadCount } from "@/lib/message-service.mjs";
import prisma from "@/lib/prisma";
import {
  PatientHeader,
  PatientFooter,
  type PatientNavUser,
} from "@/components/patient/patient-shell";
import { PatientMobileBottomNav } from "@/components/patient/patient-mobile-bottom-nav";
import {
  PatientDesktopBackground,
  PatientDesktopPhotoCredit,
  PatientMobileBackground,
  PatientMobilePhotoCredit,
} from "@/components/patient/patient-mobile-background";

export default function PatientLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="patient-portal-shell min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B]">
      <Suspense fallback={<PatientShellLoadingFallback />}>
        <AuthenticatedPatientShell>{children}</AuthenticatedPatientShell>
      </Suspense>
    </div>
  );
}

async function AuthenticatedPatientShell({
  children,
}: {
  children: ReactNode;
}) {
  let principal;
  try {
    principal = await requirePatient();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  let totalUnread = 0;
  try {
    const unreadResult = await loadUnreadCount({
      requireUser: async () => principal,
      prisma,
    });
    if (unreadResult.status === "success") {
      totalUnread = unreadResult.count;
    }
  } catch {
    totalUnread = 0;
  }

  const navUser: PatientNavUser = {
    fullName: principal.fullName,
    email: principal.email,
    totalUnread,
  };

  return (
    <>
      <PatientDesktopBackground />
      <PatientMobileBackground />
      <PatientHeader user={navUser} />
      <div className="patient-mobile-content flex-1 pt-16 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="patient-desktop-route">
          {children}
          <PatientMobilePhotoCredit />
          <PatientDesktopPhotoCredit />
        </div>
      </div>
      <PatientMobileBottomNav />
      <PatientFooter />
    </>
  );
}

function PatientShellLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B]">
      {/* Skeleton Header conforming to Warm Clinical Editorial */}
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0]">
        <div className="h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <OporaLogo size="md" subtitle="PATIENT PORTAL" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EADDE0]/50 animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex-1 pt-16 flex items-center justify-center p-8">
        <div className="rounded-xl border border-[#EADDE0] bg-white p-6 max-w-sm w-full text-center space-y-2 shadow-xs">
          <div className="w-6 h-6 border-2 border-[#6F1D35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-['Inter'] text-xs font-semibold text-[#7E2D43]">
            Verifying patient session…
          </p>
        </div>
      </div>
      <footer className="w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 text-[#8A737A] font-['Inter'] text-xs text-center">
        <span>© 2026 OPORA. All rights reserved.</span>
      </footer>
    </div>
  );
}
