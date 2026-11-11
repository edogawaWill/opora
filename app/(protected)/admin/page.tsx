import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import type { HcpApplicationSummary } from "@/components/admin/hcp-verification-queue";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import {
  getHcpMobileBackground,
} from "@/lib/patient-mobile-backgrounds";
import {
  buildUnsplashReferralUrl,
  getPatientMobileBackgroundPresentation,
} from "@/lib/patient-mobile-background-utils.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/admin/admin-desktop.module.css";
import mobileStyles from "@/components/admin/admin-mobile.module.css";

type DashboardAuditEntry = {
  auditLogID: number;
  action: string;
  entityType: string;
  entityID: number;
  changeSummary: string;
  createdAt: Date;
  admin: { user: { fullName: string } };
};

function AdminLoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading administration…</p>
      </div>
    </div>
  );
}

export default function AdminLandingPage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminLandingContent />
    </Suspense>
  );
}

async function AdminLandingContent() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const [patientMetric, hcpMetric, diseaseMetric, pendingMetric, pendingResult, auditResult] =
    await Promise.allSettled([
      prisma.patient.count(),
      prisma.healthcareProfessional.count(),
      prisma.disease.count(),
      prisma.healthcareProfessional.count({ where: { verificationStatus: "Pending" } }),
      prisma.healthcareProfessional.findMany({
        where: { verificationStatus: "Pending" },
        orderBy: { hcpID: "asc" },
        select: {
          hcpID: true,
          licenseNo: true,
          specialization: true,
          workplace: true,
          yearsOfExperience: true,
          user: {
            select: {
              fullName: true,
              email: true,
              role: true,
              accountStatus: true,
              emailVerified: true,
              dateRegistered: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 3,
        orderBy: [{ createdAt: "desc" }, { auditLogID: "desc" }],
        select: {
          auditLogID: true,
          action: true,
          entityType: true,
          entityID: true,
          changeSummary: true,
          createdAt: true,
          admin: { select: { user: { select: { fullName: true } } } },
        },
      }),
    ]);

  const patientCount = patientMetric.status === "fulfilled" ? patientMetric.value : null;
  const hcpCount = hcpMetric.status === "fulfilled" ? hcpMetric.value : null;
  const diseaseCount = diseaseMetric.status === "fulfilled" ? diseaseMetric.value : null;
  const pendingHcpCount = pendingMetric.status === "fulfilled" ? pendingMetric.value : null;
  const queueFailed = pendingResult.status === "rejected";
  const auditFailed = auditResult.status === "rejected";

  const pendingApplications: HcpApplicationSummary[] = pendingResult.status === "fulfilled"
    ? pendingResult.value.map((profile) => ({
        hcpID: profile.hcpID,
        fullName: profile.user.fullName,
        email: profile.user.email,
        licenseNo: profile.licenseNo,
        specialization: profile.specialization,
        workplace: profile.workplace,
        yearsOfExperience: profile.yearsOfExperience,
        role: profile.user.role,
        accountStatus: profile.user.accountStatus,
        emailVerified: profile.user.emailVerified,
        submittedDate: formatDate(profile.user.dateRegistered),
      }))
    : [];

  const auditEntries: DashboardAuditEntry[] = auditResult.status === "fulfilled"
    ? auditResult.value
    : [];

  const background = getPatientMobileBackgroundPresentation(
    getHcpMobileBackground("hcp-dashboard"),
  );

  return (
    <div className="admin-dashboard-page relative">
      <div
        className="admin-dashboard-background"
        aria-hidden="true"
        style={{ backgroundImage: background.backgroundImage, backgroundPosition: background.backgroundPosition }}
      />

      <main className={`admin-dashboard-mobile mx-auto w-full ${mobileStyles.mobileDashboard}`}>
        <section className={`admin-mobile-hero relative overflow-hidden rounded-[1.8rem] p-5 text-white sm:p-6 ${mobileStyles.mobileHero}`}>
          <div className="admin-mobile-hero-glow" aria-hidden="true" />
          <div className="relative z-10">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-2 font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.1em] text-white/95 backdrop-blur-md">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F3859D]" />
              Administrative system control · Global operations
            </p>
            <h1 className="mt-4 font-headline text-[1.7rem] font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
              Welcome, {admin.fullName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Review professional applications, manage patient accounts, and maintain the disease catalogue.
            </p>

            <Link
              href="/admin/hcps?status=Pending"
              className="mt-5 flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-center font-['Manrope'] text-sm font-bold text-[#520420] shadow-md transition hover:bg-[#FFF9F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon name="user-check" className="h-5 w-5 shrink-0" />
                <span className="min-w-0">Verify HCP Applications</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#520420] px-3 py-1.5 text-xs font-bold text-white">
                {pendingHcpCount === null ? "Unavailable" : `${pendingHcpCount} Pending`}
              </span>
            </Link>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/admin/patients"
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-3 py-3 text-center text-xs font-bold text-white shadow-sm backdrop-blur-lg transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon name="users" className="h-4 w-4 shrink-0" />
                Manage Patients
              </Link>
              <Link
                href="/admin/diseases"
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-3 py-3 text-center text-xs font-bold text-white shadow-sm backdrop-blur-lg transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon name="book-open" className="h-4 w-4 shrink-0" />
                Disease Catalog
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Administrative overview" className={`admin-glass-overview mt-4 grid grid-cols-3 gap-2 rounded-2xl p-2 sm:gap-3 sm:p-3 ${mobileStyles.mobileMetrics}`}>
          <MobileMetric label="Registered Patients" value={patientCount} icon="users" className={mobileStyles.mobileMetric} />
          <MobileMetric label="Registered HCPs" value={hcpCount} icon="stethoscope" className={mobileStyles.mobileMetric} />
          <MobileMetric label="Pending Reviews" value={pendingHcpCount} icon="clock" accent className={mobileStyles.mobileMetric} />
        </section>

        <section className="mt-5" aria-labelledby="admin-priority-heading">
          <div className={`mb-3 px-1 ${mobileStyles.mobileSectionHeading}`}>
            <p className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E2D43]">Administrative activities</p>
            <h2 id="admin-priority-heading" className="mt-1 font-headline text-xl font-bold text-[#520420]">Priority queue &amp; workflows</h2>
          </div>

          <div className="space-y-3">
            <section className={`admin-glass-panel rounded-2xl p-4 ${mobileStyles.mobilePriorityPanel}`} aria-labelledby="pending-applications-heading">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFD9DF]/80 text-[#520420]">
                  <Icon name="user-check" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="pending-applications-heading" className="font-headline text-base font-bold text-[#520420]">HCP License Verification</h3>
                    {!queueFailed && pendingApplications.length > 0 && (
                      <span className="rounded-full bg-[#FFD9DF] px-2.5 py-1 text-[10px] font-bold text-[#520420]">Pending</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#544245]">
                    Review submitted professional credentials and account eligibility.
                  </p>
                </div>
              </div>

              {queueFailed ? (
                <p className="mt-4 rounded-xl border border-[#EADDE0] bg-white/75 p-3 text-sm text-[#7D2639]" role="alert">The verification queue is unavailable. Please refresh to try again.</p>
              ) : pendingApplications.length === 0 ? (
                <p className="mt-4 rounded-xl border border-white/85 bg-white/65 p-3 text-sm text-[#544245]" role="status">
                  {pendingHcpCount === null
                    ? "No application details are available right now."
                    : "No HCP applications are awaiting review."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pendingApplications.slice(0, 3).map((application) => (
                    <li key={application.hcpID} className="rounded-xl border border-white/85 bg-white/65 p-3 shadow-sm">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#35101F]">{application.fullName}</p>
                          <p className="mt-0.5 text-xs text-[#544245]">{application.specialization} · License {application.licenseNo}</p>
                          <p className="mt-1 text-[11px] text-[#705660]">Submitted {application.submittedDate}</p>
                        </div>
                        <Link
                          href="/admin/hcps?status=Pending"
                          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#6F1D35] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                        >
                          Review
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

            </section>

            <section className={`admin-glass-panel rounded-2xl p-4 ${mobileStyles.mobilePriorityPanel}`} aria-labelledby="disease-catalog-heading">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F0EDEB] text-[#6F1D35]">
                  <Icon name="book-open" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id="disease-catalog-heading" className="font-headline text-base font-bold text-[#520420]">Disease Catalogue</h3>
                  <p className="mt-1 text-xs leading-5 text-[#544245]">Maintain curated disease information and its symptom associations.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#6F1D35]/10 pt-3">
                <p className="text-xs font-medium text-[#544245]">
                  {diseaseCount === null ? "Catalogue count unavailable" : `${diseaseCount} diseases in catalogue`}
                </p>
                <Link href="/admin/diseases" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-white bg-white/80 px-3.5 py-2 text-xs font-bold text-[#520420] shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]">
                  Browse Catalog
                </Link>
              </div>
            </section>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="admin-mobile-actions-heading">
          <div className={`mb-3 px-1 ${mobileStyles.mobileSectionHeading}`}>
            <p className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E2D43]">Administrative shortcuts</p>
            <h2 id="admin-mobile-actions-heading" className="mt-1 font-headline text-lg font-bold text-[#520420]">Management actions</h2>
          </div>
          <ul className={`admin-glass-panel rounded-2xl p-3 ${mobileStyles.mobileActionList}`}>
            <li><Link href="/admin/patients" className={mobileStyles.mobileActionLink}>
              <span className={mobileStyles.mobileActionIcon}><Icon name="users" className="h-4 w-4" /></span>
              <span className={mobileStyles.mobileActionText}><strong>Manage Patient Records</strong><small>Inspect registered accounts</small></span>
              <Icon name="chevron-right" className={`${mobileStyles.mobileActionArrow} h-4 w-4`} />
            </Link></li>
            <li><Link href="/admin/hcps?status=Pending" className={mobileStyles.mobileActionLink}>
              <span className={mobileStyles.mobileActionIcon}><Icon name="user-check" className="h-4 w-4" /></span>
              <span className={mobileStyles.mobileActionText}><strong>HCP Verification Hub</strong><small>{pendingHcpCount === null ? "Pending count unavailable" : `${pendingHcpCount} awaiting review`}</small></span>
              <Icon name="chevron-right" className={`${mobileStyles.mobileActionArrow} h-4 w-4`} />
            </Link></li>
            <li><Link href="/admin/diseases" className={mobileStyles.mobileActionLink}>
              <span className={mobileStyles.mobileActionIcon}><Icon name="book-open" className="h-4 w-4" /></span>
              <span className={mobileStyles.mobileActionText}><strong>Disease Catalogue</strong><small>Manage curated information</small></span>
              <Icon name="chevron-right" className={`${mobileStyles.mobileActionArrow} h-4 w-4`} />
            </Link></li>
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="admin-audit-heading">
          <div className={`mb-3 flex items-end justify-between gap-3 px-1 ${mobileStyles.mobileSectionHeading}`}>
            <div>
              <p className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E2D43]">Administrative activity</p>
              <h2 id="admin-audit-heading" className="mt-1 font-headline text-lg font-bold text-[#520420]">Audit log</h2>
            </div>
          </div>

          <div className={`admin-glass-panel rounded-2xl p-4 ${mobileStyles.mobileAuditPanel}`}>
            {auditFailed ? (
              <p className="rounded-xl border border-[#EADDE0] bg-white/75 p-3 text-sm text-[#7D2639]" role="alert">Recent audit activity is unavailable. Please refresh to try again.</p>
            ) : auditEntries.length === 0 ? (
              <p className="rounded-xl border border-white/85 bg-white/65 p-3 text-sm text-[#544245]" role="status">No administrative audit events have been recorded yet.</p>
            ) : (
              <ol className="divide-y divide-[#6F1D35]/10">
                {auditEntries.map((entry) => (
                  <li key={entry.auditLogID} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#35101F]">{formatAuditAction(entry.action)}</p>
                        <p className="mt-1 text-xs leading-5 text-[#544245]">{entry.changeSummary}</p>
                        <p className="mt-1 text-[11px] text-[#705660]">{entry.entityType} #{entry.entityID} · {entry.admin.user.fullName}</p>
                      </div>
                      <time dateTime={entry.createdAt.toISOString()} className="shrink-0 pt-0.5 text-right text-[10px] font-medium text-[#705660]">
                        {formatAuditDate(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className={`mt-5 rounded-2xl p-4 ${mobileStyles.mobileGovernance}`} aria-labelledby="admin-mobile-governance-heading">
          <h2 id="admin-mobile-governance-heading" className="font-headline text-sm font-bold text-[#520420]">Administrative governance</h2>
          <p className="mt-1.5 text-xs leading-5 text-[#544245]">
            Administrative actions can affect account access and HCP verification. Review submitted information before making changes; supported administrative updates are recorded in the audit log.
          </p>
        </aside>

        {background.photo && (
          <p className="admin-mobile-photo-credit mt-4 text-right text-[10px] text-[#544245]">
            Photo by{" "}
            <a href={buildUnsplashReferralUrl(background.photo.photographerProfileUrl)} target="_blank" rel="noreferrer">{background.photo.photographerName}</a>
            {" · "}
            <a href={buildUnsplashReferralUrl(background.photo.sourcePhotoUrl)} target="_blank" rel="noreferrer">Unsplash</a>
          </p>
        )}
      </main>

      <main className={`admin-dashboard-desktop ${styles.dashboard}`}>
        <section className={styles.hero}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroDot} aria-hidden="true" />
            Administrative system control · Global operations
          </div>
          <h1>Welcome, {admin.fullName}</h1>
          <p className={styles.heroDescription}>
            Manage patient records, verify healthcare professionals, and maintain the curated disease information catalogue.
          </p>
          <div className={styles.heroActions}>
            <Link href="/admin/hcps?status=Pending" className={styles.heroPrimary}>
              <Icon name="user-check" className="h-4 w-4" />
              Verify HCP Applications
              <span className={styles.pendingBadge}>
                {pendingHcpCount === null ? "Unavailable" : `${pendingHcpCount} Pending`}
              </span>
            </Link>
            <Link href="/admin/patients" className={styles.heroSecondary}>
              <Icon name="users" className="h-4 w-4" /> Manage Patients
            </Link>
            <Link href="/admin/diseases" className={styles.heroSecondary}>
              <Icon name="book-open" className="h-4 w-4" /> Disease Catalogue
            </Link>
          </div>
        </section>

        <section className={styles.metrics} aria-label="Administrative overview">
          <DesktopMetric label="Registered Patients" value={patientCount} detail="Registered patient accounts" icon="users" />
          <DesktopMetric label="Practitioners (HCP)" value={hcpCount} detail="Registered HCP profiles" icon="stethoscope" />
          <DesktopMetric label="Verification Queue" value={pendingHcpCount} detail="Applications awaiting review" icon="clock" />
        </section>

        <div className={styles.workspace}>
          <div className={styles.workspaceMain}>
            <section aria-labelledby="admin-priority-heading">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Administrative activities</p>
                <h2 id="admin-priority-heading">Priority queue &amp; workflows</h2>
              </div>

              <div className={`${styles.surface} ${styles.panel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>
                      <Icon name="shield-check" className={`${styles.panelTitleIcon} h-5 w-5`} />
                      HCP License Verification
                    </h3>
                    <p className={styles.panelDescription}>Review submitted professional details and account eligibility.</p>
                  </div>
                  {!queueFailed && pendingApplications.length > 0 && (
                    <span className={styles.statusPill}>{pendingHcpCount === null ? "Pending" : `${pendingHcpCount} Pending`}</span>
                  )}
                </div>

                {queueFailed ? (
                  <p className="mt-4 rounded-xl border border-[#EADDE0] bg-white/75 p-3 text-sm text-[#7D2639]" role="alert">
                    The verification queue is unavailable. Refresh to try again.
                  </p>
                ) : pendingApplications.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-white/85 bg-white/65 p-4 text-sm text-[#544245]" role="status">
                    {pendingHcpCount === null ? "Application details are unavailable right now." : "No HCP applications are awaiting review."}
                  </p>
                ) : (
                  <ul className={styles.applicationList}>
                    {pendingApplications.slice(0, 3).map((application) => (
                      <li className={styles.application} key={application.hcpID}>
                        <div className="min-w-0">
                          <p className={styles.applicantName}>{application.fullName}</p>
                          <p className={styles.applicationDetail}>
                            {application.specialization} · License {application.licenseNo}
                          </p>
                          <p className={styles.applicationDate}>Submitted {application.submittedDate} · Pending review</p>
                        </div>
                        <Link href={`/admin/hcps/${application.hcpID}`} className={styles.reviewLink}>
                          Review <Icon name="arrow-right" className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className={`${styles.surface} ${styles.panel}`} aria-labelledby="admin-audit-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h2 id="admin-audit-heading" className={styles.panelTitle}>
                    <Icon name="clock" className={`${styles.panelTitleIcon} h-5 w-5`} />
                    Recent Administrative Audit Log
                  </h2>
                  <p className={styles.panelDescription}>The latest recorded administrative actions.</p>
                </div>
              </div>
              {auditFailed ? (
                <p className="mt-4 rounded-xl border border-[#EADDE0] bg-white/75 p-3 text-sm text-[#7D2639]" role="alert">
                  Recent audit activity is unavailable. Refresh to try again.
                </p>
              ) : auditEntries.length === 0 ? (
                <p className="mt-4 rounded-xl border border-white/85 bg-white/65 p-4 text-sm text-[#544245]" role="status">
                  No administrative audit events have been recorded yet.
                </p>
              ) : (
                <ol className={styles.auditList}>
                  {auditEntries.slice(0, 3).map((entry) => (
                    <li className={styles.auditEntry} key={entry.auditLogID}>
                      <span className={styles.auditDot} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className={styles.auditAction}>{formatAuditAction(entry.action)}</p>
                        <p className={styles.auditSummary}>{entry.changeSummary}</p>
                        <p className={styles.auditActor}>
                          {entry.entityType} #{entry.entityID} · {entry.admin.user.fullName}
                        </p>
                      </div>
                      <time className={styles.auditTime} dateTime={entry.createdAt.toISOString()}>
                        {formatAuditDate(entry.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside className={styles.workspaceAside} aria-label="Administrative tools">
            <section className={`${styles.surface} ${styles.panel}`} aria-labelledby="admin-actions-heading">
              <div className={styles.panelHeader}>
                <h2 id="admin-actions-heading" className={styles.panelTitle}>
                  <Icon name="settings" className={`${styles.panelTitleIcon} h-5 w-5`} />
                  Administrative Actions
                </h2>
              </div>
              <ul className={styles.actionList}>
                <li>
                  <Link href="/admin/patients" className={styles.actionLink}>
                    <span className={styles.actionIcon}><Icon name="users" className="h-4 w-4" /></span>
                    <span className={styles.actionText}><strong>Manage Patient Records</strong><small>Inspect registered accounts</small></span>
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </Link>
                </li>
                <li>
                  <Link href="/admin/hcps?status=Pending" className={styles.actionLink}>
                    <span className={styles.actionIcon}><Icon name="user-check" className="h-4 w-4" /></span>
                    <span className={styles.actionText}><strong>HCP Verification Hub</strong><small>{pendingHcpCount === null ? "Pending count unavailable" : `${pendingHcpCount} awaiting review`}</small></span>
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </Link>
                </li>
                <li>
                  <Link href="/admin/diseases" className={styles.actionLink}>
                    <span className={styles.actionIcon}><Icon name="book-open" className="h-4 w-4" /></span>
                    <span className={styles.actionText}><strong>Disease Catalogue</strong><small>Manage curated information</small></span>
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </Link>
                </li>
              </ul>
            </section>

            <section className={`${styles.surface} ${styles.panel}`} aria-labelledby="disease-catalog-heading">
              <div className={styles.panelHeader}>
                <h2 id="disease-catalog-heading" className={styles.panelTitle}>
                  <Icon name="book-open" className={`${styles.panelTitleIcon} h-5 w-5`} />
                  Disease Catalogue
                </h2>
                <span className={styles.statusPill}>Curated</span>
              </div>
              <p className={styles.catalogEyebrow}>Curated medical knowledge</p>
              <p className={styles.catalogDescription}>
                Maintain disease descriptions, symptom associations and educational information available across OPORA.
              </p>
              <div className={styles.catalogFooter}>
                <span className={styles.catalogCount}>
                  {diseaseCount === null ? "Catalogue count unavailable" : `${diseaseCount} catalogue entries`}
                </span>
                <Link href="/admin/diseases" className={styles.catalogLink}>
                  Browse Catalogue <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            <section className={`${styles.surface} ${styles.panel}`} aria-labelledby="governance-heading">
              <h2 id="governance-heading" className={styles.panelTitle}>
                <Icon name="shield" className={`${styles.governanceIcon} h-4 w-4`} />
                Governance Notice
              </h2>
              <p className={styles.noticeText}>
                Administrative actions can affect account access and HCP verification. Review submitted information before making changes; supported administrative updates are recorded in the audit log.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MobileMetric({
  label,
  value,
  icon,
  accent = false,
  className,
}: {
  label: string;
  value: number | null;
  icon: "users" | "stethoscope" | "clock";
  accent?: boolean;
  className?: string;
}) {
  return (
    <article className={`admin-glass-metric flex min-h-[104px] flex-col justify-between rounded-xl p-2.5 sm:p-3 ${accent ? "admin-glass-metric-accent" : ""} ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`grid h-7 w-7 place-items-center rounded-full ${accent ? "bg-[#520420] text-white" : "bg-[#FFD9DF]/80 text-[#520420]"}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="font-['Manrope'] text-[9px] font-bold uppercase tracking-[0.12em] text-[#7E2D43]">{accent ? "Queue" : "Total"}</span>
      </div>
      <div>
        <p className="font-headline text-2xl font-extrabold leading-none text-[#520420]">{value === null ? "—" : value.toLocaleString("en-MY")}</p>
        <p className="mt-1.5 text-[10px] font-medium leading-snug text-[#544245]">{label}</p>
        {value === null && <p className="mt-1 text-[9px] font-semibold text-[#7D2639]">Unavailable</p>}
      </div>
    </article>
  );
}

function DesktopMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number | null;
  detail: string;
  icon: "users" | "stethoscope" | "clock";
}) {
  return (
    <article className={`${styles.surface} ${styles.metric}`}>
      <div className={styles.metricHead}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricIcon}><Icon name={icon} className="h-5 w-5" /></span>
      </div>
      <div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValue}>{value === null ? "—" : value.toLocaleString("en-MY")}</span>
        </div>
        <p className={styles.metricDescription}>{value === null ? "Count unavailable" : detail}</p>
      </div>
    </article>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function formatAuditDate(date: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

function formatAuditAction(action: string) {
  return action.replaceAll("_", " ").toLocaleLowerCase("en-MY").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
