import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthorizationError, requireHcpAccount } from "@/lib/authorization";
import styles from "@/components/hcp/hcp-desktop.module.css";

function HcpStatusLoadingFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading verification status…</p>
      </div>
    </div>
  );
}

export default function HcpStatusPage() {
  return (
    <Suspense fallback={<HcpStatusLoadingFallback />}>
      <HcpStatusContent />
    </Suspense>
  );
}

async function HcpStatusContent() {
  let principal;
  try {
    principal = await requireHcpAccount();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const verificationStatus = principal.healthcareProfessional?.verificationStatus;
  const approved = verificationStatus === "Approved";
  const rejected = verificationStatus === "Rejected";
  if (approved) redirect("/hcp");

  return (
    <main className={`${styles.desktopPage} ${styles.statusPage}`}>
      <section className={styles.pageIntro}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7E2D43]">OPORA · Healthcare professional</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1B1C1B] font-headline">Verification status</h1>
      </section>
      <section className="mt-6 rounded-3xl border border-white/85 bg-white/65 p-6 shadow-sm backdrop-blur-2xl sm:p-8">
        <p className="text-sm text-[#1B1C1B]">
          Account status: <strong className="rounded-full bg-[#F5ECF0] px-3 py-1 text-[#6F1D35]">{approved ? "Approved" : rejected ? "Not approved" : "Pending review"}</strong>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#705660]">
          {approved
            ? "Your professional account is approved. Clinical features are not available in this stage."
            : rejected
              ? "Your application was not approved. Please contact an OPORA administrator for guidance. Patient information and clinical functions remain unavailable."
              : "Your professional details are awaiting administrator review. Patient information and clinical functions remain unavailable until approval."}
        </p>
      </section>
      <div className="mt-6">
        <Link
          href="/hcp/profile"
          className="inline-flex min-h-11 items-center rounded-xl border border-white/85 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#6F1D35] shadow-sm backdrop-blur-xl transition hover:bg-white/90"
        >
          Manage personal profile
        </Link>
      </div>
    </main>
  );
}
