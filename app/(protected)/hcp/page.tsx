import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requireApprovedHcp } from "@/lib/authorization";
import { ownApprovedHcpProfileWhere } from "@/lib/hcp-dashboard-policy.mjs";
import { loadLatestConsentedPatientSymptom } from "@/lib/hcp-patient-access.mjs";
import { loadUnreadCount } from "@/lib/message-service.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

function HcpDashboardLoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your professional dashboard…</p>
      </div>
    </div>
  );
}

export default function HcpDashboardPage() {
  return (
    <Suspense fallback={<HcpDashboardLoadingFallback />}>
      <HcpDashboardContent />
    </Suspense>
  );
}

async function HcpDashboardContent() {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const profileWhere = ownApprovedHcpProfileWhere(principal);
  if (!profileWhere) return <HcpProfileUnavailable fullName={principal.fullName} />;

  let profile;
  let unreadCount: number | null = null;
  let patientCount: number | null = null;
  let appointmentCount: number | null = null;
  let latestSymptom: {
    recordID: number;
    patientID: number;
    severity: number;
    recordedAt: Date;
    symptom: { symptomName: string };
    patient: { patientID: number; user: { fullName: string } };
  } | null = null;
  let symptomStreamStatus: "success" | "error" | "denied" = "denied";

  try {
    const [foundProfile, unreadResult] = await Promise.all([
      prisma.healthcareProfessional.findUnique({
        where: profileWhere,
        select: {
          hcpID: true,
          licenseNo: true,
          specialization: true,
          workplace: true,
          yearsOfExperience: true,
          verificationStatus: true,
        },
      }),
      loadUnreadCount({ requireUser: async () => principal, prisma }),
    ]);
    profile = foundProfile;
    unreadCount = unreadResult.status === "success" ? unreadResult.count : null;

    if (profile?.hcpID) {
      const [ptCount, apptCount] = await Promise.all([
        prisma.patient.count({
          where: {
            hcpConsents: { some: { hcpID: profile.hcpID, status: "ACTIVE" } },
          },
        }).catch(() => null),
        prisma.appointment.count({
          where: {
            hcpID: profile.hcpID,
            status: "CONFIRMED",
            appointmentDate: { gte: getUtcStartOfToday() },
          },
        }).catch(() => null),
      ]);
      patientCount = ptCount;
      appointmentCount = apptCount;

      const streamResult = await loadLatestConsentedPatientSymptom({
        requireApprovedHcp: async () => principal,
        prisma,
      });
      symptomStreamStatus = streamResult.status;
      latestSymptom = streamResult.status === "success" ? streamResult.record : null;
    }
  } catch {
    console.error("OPORA HCP dashboard profile lookup failed");
    return <HcpDashboardError fullName={principal.fullName} />;
  }

  if (!profile) return <HcpProfileUnavailable fullName={principal.fullName} />;

  return (
    <>
      <HcpDashboardDesktop
        fullName={principal.fullName}
        profile={profile}
        patientCount={patientCount}
        appointmentCount={appointmentCount}
        unreadCount={unreadCount}
        latestSymptom={latestSymptom}
        symptomStreamStatus={symptomStreamStatus}
      />
      <main className="hcp-dashboard-mobile mx-auto w-full max-w-[440px] px-4 pt-2 pb-6 sm:px-5 md:max-w-[680px] md:px-6 lg:max-w-7xl lg:px-8 lg:py-8">
      <div className="space-y-5 md:space-y-6">
        <section className="hcp-dashboard-hero relative overflow-hidden rounded-[1.65rem] border border-white/30 p-5 text-white shadow-xl sm:p-7">
          <div className="hcp-dashboard-hero-glow" aria-hidden="true" />
          <div className="relative z-10">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md sm:text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
              <span className="truncate">{profile.verificationStatus} Clinical Practice · {profile.specialization}</span>
            </div>
            <h1 className="mt-4 font-headline text-[1.8rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
              Welcome, {principal.fullName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Review your authorized patient roster, scheduled consultations, and patient-reported symptom updates.
            </p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <Link href="/hcp/appointments" className="hcp-dashboard-primary-action inline-flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#6F1D35] shadow-md transition hover:bg-[#FCF9F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <span className="inline-flex items-center gap-2"><Icon name="calendar" className="h-4 w-4" />Manage Appointments</span>
                <Icon name="chevron-right" className="h-4 w-4" />
              </Link>
              <div className="grid grid-cols-2 gap-2.5">
                <Link href="/hcp/patients" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-2.5 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">
                  <Icon name="users" className="h-4 w-4 shrink-0" />
                  <span className="truncate">Patients{patientCount === null ? "" : ` (${patientCount})`}</span>
                </Link>
                <Link href="/hcp/messages" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-2.5 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">
                  <Icon name="message" className="h-4 w-4 shrink-0" />Messages
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="practice-overview-heading" className="hcp-dashboard-overview rounded-[1.65rem] border border-white/85 bg-white/70 p-4 shadow-lg backdrop-blur-2xl sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-[#6F1D35]" />
            <h2 id="practice-overview-heading" className="font-headline text-base font-bold text-[#35101F] sm:text-lg">Practice Overview</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricCard label="Active Patients" value={patientCount} supporting="Active consent" icon="users" />
            <MetricCard label="Upcoming Consultations" value={appointmentCount} supporting="Confirmed today or later" icon="calendar" />
            <MetricCard label="Unread Messages" value={unreadCount} supporting="Unread" icon="message" />
          </div>
        </section>

        <section aria-labelledby="clinical-workflows-heading">
          <div className="mb-3 px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7E2D43]">Fast access</p>
            <h2 id="clinical-workflows-heading" className="mt-0.5 font-headline text-xl font-bold text-[#35101F] sm:text-2xl">Clinical Workflows</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <WorkflowCard href="/hcp/patients" label="Patient Roster" description="Open consented patient records" icon="users" />
            <WorkflowCard href="/hcp/appointments" label="Appointments" description="Review and manage visits" icon="calendar" />
            <WorkflowCard href="/hcp/messages" label="Patient Messages" description="Read and respond to patients" icon="message" wide />
          </div>
        </section>

        <section aria-labelledby="authorized-stream-heading" className="rounded-[1.65rem] border border-white/85 bg-white/70 p-4 shadow-lg backdrop-blur-2xl sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="activity" className="h-4 w-4 text-[#6F1D35]" />
              <h2 id="authorized-stream-heading" className="font-headline text-base font-bold text-[#35101F] sm:text-lg">Authorized Patient Stream</h2>
            </div>
            <span className="rounded-full border border-[#EADDE0] bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#544245]">Active consent only</span>
          </div>

          {symptomStreamStatus === "error" ? (
            <p className="rounded-xl border border-[#EADDE0] bg-white/75 p-4 text-sm text-[#544245]" role="status">The latest symptom update could not be loaded. Open the patient roster to review consented records.</p>
          ) : latestSymptom ? (
            <article className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F6E9EC] text-[#6F1D35]"><Icon name="user" className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h3 className="truncate font-headline text-sm font-bold text-[#1B1C1B] sm:text-base">{latestSymptom.patient.user.fullName}</h3>
                    <p className="mt-0.5 text-xs text-[#544245]">Active consent</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[#EADDE0] bg-[#FCF9F7] px-2.5 py-1 text-xs font-semibold text-[#6F1D35]">Severity {latestSymptom.severity}/10</span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#EADDE0]/70 bg-white/75 px-3 py-3">
                <div className="flex min-w-0 items-center gap-2 text-sm text-[#1B1C1B]"><Icon name="eye" className="h-4 w-4 shrink-0 text-[#7E2D43]" /><span className="min-w-0 break-words">{latestSymptom.symptom.symptomName}</span></div>
                <time dateTime={latestSymptom.recordedAt.toISOString()} className="shrink-0 pt-0.5 text-[10px] text-[#705660] sm:text-xs">{formatSymptomTimestamp(latestSymptom.recordedAt)}</time>
              </div>
              <Link href={`/hcp/patients/${latestSymptom.patientID}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6F1D35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#591428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]">
                View authorized patient record<Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </article>
          ) : symptomStreamStatus === "success" ? (
            <div className="rounded-xl border border-dashed border-[#D8C2C7] bg-white/55 px-4 py-6 text-center">
              <p className="font-semibold text-[#35101F]">No symptom updates to show</p>
              <p className="mt-1 text-sm text-[#705660]">New patient-reported entries shared through active consent will appear here.</p>
              <Link href="/hcp/patients" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[#6F1D35] underline underline-offset-2">Open patient roster</Link>
            </div>
          ) : (
            <p className="rounded-xl border border-[#EADDE0] bg-white/75 p-4 text-sm text-[#544245]" role="status">Patient updates are unavailable right now.</p>
          )}
        </section>

        <p className="px-2 pb-2 text-center text-xs leading-relaxed text-[#544245]">Patient symptoms are self-reported and are provided to support clinical consultation. They do not represent a confirmed diagnosis.</p>
      </div>
      </main>
    </>
  );
}

function HcpDashboardDesktop({ fullName, profile, patientCount, appointmentCount, unreadCount, latestSymptom, symptomStreamStatus }: {
  fullName: string;
  profile: { licenseNo: string; specialization: string; workplace: string; yearsOfExperience: number; verificationStatus: string };
  patientCount: number | null;
  appointmentCount: number | null;
  unreadCount: number | null;
  latestSymptom: {
    recordID: number;
    patientID: number;
    severity: number;
    recordedAt: Date;
    symptom: { symptomName: string };
    patient: { patientID: number; user: { fullName: string } };
  } | null;
  symptomStreamStatus: "success" | "error" | "denied";
}) {
  const patientInitials = latestSymptom?.patient.user.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "";

  return (
    <main className={`hcp-dashboard-desktop ${styles.dashboard}`}>
      <section className={styles.hero} aria-labelledby="hcp-dashboard-welcome">
        <div className={styles.heroEyebrow}>
          <span className={styles.heroEyebrowDot} aria-hidden="true" />
          {profile.verificationStatus} clinical practice · {profile.specialization}
        </div>
        <h1 id="hcp-dashboard-welcome">Welcome, {fullName}</h1>
        <p className={styles.heroDescription}>
          Review your authorized patient roster, scheduled consultations, and patient-reported symptom updates shared with your practice.
        </p>
        <div className={styles.heroActions}>
          <Link href="/hcp/appointments" className={styles.heroPrimaryAction}>
            <Icon name="calendar" className="h-4 w-4" aria-hidden="true" />Manage Appointments<Icon name="chevron-right" className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/hcp/patients" className={styles.heroSecondaryAction}>
            <Icon name="users" className="h-4 w-4" aria-hidden="true" />Authorized Patients{patientCount === null ? "" : ` · ${patientCount}`}
          </Link>
          <Link href="/hcp/messages" className={styles.heroSecondaryAction}>
            <Icon name="message" className="h-4 w-4" aria-hidden="true" />Patient Messages{unreadCount === null ? "" : ` · ${unreadCount}`}
          </Link>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Practice overview">
        <HcpDesktopMetric
          label="Active Patients"
          value={patientCount}
          unit={patientCount === 1 ? "patient" : "patients"}
          description="Unique patients with current active consent for your practice."
          status={patientCount === null ? "Unavailable" : patientCount > 0 ? `${patientCount} consented` : "No active consent"}
          icon="user-check"
        />
        <HcpDesktopMetric
          label="Upcoming Consultations"
          value={appointmentCount}
          unit={appointmentCount === 1 ? "appointment" : "appointments"}
          description="Confirmed appointments scheduled today or later."
          status={appointmentCount === null ? "Unavailable" : appointmentCount > 0 ? "Confirmed today or later" : "No confirmed appointments"}
          icon="calendar"
        />
        <HcpDesktopMetric
          label="Unread Communications"
          value={unreadCount}
          unit={unreadCount === 1 ? "message" : "messages"}
          description="Messages received by you that are still marked unread."
          status={unreadCount === null ? "Unavailable" : unreadCount > 0 ? "Needs review" : "All caught up"}
          icon="message"
        />
      </section>

      <div className={styles.workspace}>
        <div className={styles.workspaceMain}>
          <section className={`${styles.surface} ${styles.panel}`} aria-labelledby="hcp-patient-stream-heading">
            <div className={styles.panelHeading}>
              <div className={styles.panelHeadingContent}>
                <div className={styles.panelTitleRow}>
                  <span className={styles.panelAccent} aria-hidden="true" />
                  <h2 id="hcp-patient-stream-heading" className={styles.panelTitle}>Recent Consented Patient Stream</h2>
                </div>
                <p className={styles.panelDescription}>Latest patient-reported symptom update shared under active consent.</p>
              </div>
              <span className={styles.streamTag}>Active consent checked</span>
            </div>

            {latestSymptom ? (
              <article className={styles.patientCard}>
                <div className={styles.patientHeader}>
                  <div className={styles.patientIdentity}>
                    <span className={styles.patientAvatar} aria-hidden="true">{patientInitials}</span>
                    <div className="min-w-0">
                      <h3 className={styles.patientName}>{latestSymptom.patient.user.fullName}</h3>
                      <span className={styles.consentStatus}><Icon name="shield-check" className="h-3.5 w-3.5" aria-hidden="true" />Active patient consent</span>
                    </div>
                  </div>
                  <Link href={`/hcp/patients/${latestSymptom.patientID}`} className={styles.viewPatientLink}>
                    View patient record<Icon name="arrow-right" className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className={styles.symptomCard}>
                  <div className={styles.symptomHeader}>
                    <span className={styles.symptomName}><Icon name="eye" className="h-4 w-4 shrink-0" aria-hidden="true" />{latestSymptom.symptom.symptomName}</span>
                    <span className={styles.severity}>Patient-reported severity {latestSymptom.severity}/10</span>
                  </div>
                  <time dateTime={latestSymptom.recordedAt.toISOString()} className={styles.recordedAt}>
                    Recorded {formatSymptomTimestamp(latestSymptom.recordedAt)}
                  </time>
                  <div className={styles.patientNotice}>
                    <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-[#7E2D43]" aria-hidden="true" />
                    <span><strong>Patient-reported observation.</strong> This information is shared to support clinical consultation; it is not a confirmed diagnosis.</span>
                  </div>
                </div>
              </article>
            ) : symptomStreamStatus === "success" ? (
              <div className={styles.emptyState} role="status">
                <h3>No recent symptom updates</h3>
                <p>Authorized patient records will appear here when an active-consent patient has submitted a symptom entry.</p>
                <Link href="/hcp/patients" className={styles.inlineLink}>View authorized patients<Icon name="arrow-right" className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            ) : (
              <div className={styles.unavailableState} role="status">
                <h3>Patient stream unavailable</h3>
                <p>We could not load the latest consented symptom update. You can review the authorized patient roster.</p>
                <Link href="/hcp/patients" className={styles.inlineLink}>Open patient roster<Icon name="arrow-right" className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            )}

            <div className={styles.patientPolicy}>
              <Icon name="lock" className="h-4 w-4 shrink-0 text-[#7E2D43]" aria-hidden="true" />
              Patient information is shown only while the authenticated professional has active patient consent.
            </div>
          </section>

          <section className={`${styles.surface} ${styles.clinicalNotice}`} aria-labelledby="hcp-clinical-notice-heading">
            <div className={styles.clinicalNoticeHeader}>
              <Icon name="badge-check" className="h-5 w-5 shrink-0 text-[#6F1D35]" aria-hidden="true" />
              <h2 id="hcp-clinical-notice-heading" className={styles.clinicalNoticeTitle}>Clinical context and patient consent</h2>
            </div>
            <p>Symptom entries and guided assessment results are patient-provided information for consultation. They do not establish a diagnosis. Patient data is available to you only under the patient&apos;s active consent.</p>
          </section>
        </div>

        <aside className={styles.workspaceAside} aria-label="Clinical actions and practitioner profile">
          <section className={`${styles.surface} ${styles.quickActions}`} aria-labelledby="hcp-quick-actions-heading">
            <div className={styles.quickActionsHeader}>
              <h2 id="hcp-quick-actions-heading" className={styles.quickActionsTitle}>Quick Clinical Actions</h2>
              <Icon name="activity" className="h-5 w-5 text-[#7E2D43]" aria-hidden="true" />
            </div>
            <div className={styles.quickActionList}>
              <HcpQuickAction href="/hcp/patients" icon="users" title="Authorized Patient Roster" description="Open active-consent patient records" />
              <HcpQuickAction href="/hcp/appointments" icon="calendar" title="Consultation Schedule" description="Review and manage appointments" />
              <HcpQuickAction href="/hcp/messages" icon="message" title="Patient Communications" description="Read and reply to messages" />
            </div>
          </section>

          <section className={`${styles.surface} ${styles.profile}`} aria-labelledby="hcp-practitioner-profile-heading">
            <div className={styles.profileHeader}>
              <h2 id="hcp-practitioner-profile-heading" className={styles.profileEyebrow}>Practitioner Profile</h2>
              <span className={styles.profileStatus}><span className={styles.metricStatusDot} aria-hidden="true" />{profile.verificationStatus}</span>
            </div>
            <div className={styles.profileIdentity}>
              <span className={styles.profileIcon} aria-hidden="true"><Icon name="stethoscope" className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className={styles.profileName}>{fullName}</h3>
                <p className={styles.profileSpecialization}>{profile.specialization}</p>
              </div>
            </div>
            <dl className={styles.profileRows}>
              <ProfileRow label="Workplace" value={profile.workplace} />
              <ProfileRow label="Medical license" value={profile.licenseNo} />
              <ProfileRow label="Experience" value={`${profile.yearsOfExperience} ${profile.yearsOfExperience === 1 ? "year" : "years"}`} />
            </dl>
            <Link href="/hcp/profile" className={styles.profileLink}>View and edit profile<Icon name="arrow-right" className="h-4 w-4" aria-hidden="true" /></Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

function HcpDesktopMetric({ label, value, unit, description, status, icon }: {
  label: string;
  value: number | null;
  unit: string;
  description: string;
  status: string;
  icon: keyof typeof import("@/components/ui/icon").ICON_MAP;
}) {
  return (
    <article className={`${styles.surface} ${styles.metric}`}>
      <div className={styles.metricHead}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricIcon}><Icon name={icon} className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      <div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValue}>{value ?? "—"}</span>
          <span className={styles.metricUnit}>{value === null ? "" : unit}</span>
        </div>
        <p className={styles.metricDescription}>{value === null ? "This count is currently unavailable." : description}</p>
      </div>
      <span className={styles.metricStatus}><span className={styles.metricStatusDot} aria-hidden="true" />{status}</span>
    </article>
  );
}

function HcpQuickAction({ href, icon, title, description }: { href: string; icon: keyof typeof import("@/components/ui/icon").ICON_MAP; title: string; description: string }) {
  return (
    <Link href={href} className={styles.quickAction}>
      <span className={styles.quickActionLeading}>
        <span className={styles.quickActionIcon}><Icon name={icon} className="h-5 w-5" aria-hidden="true" /></span>
        <span className={styles.quickActionText}>
          <span className={styles.quickActionTitle}>{title}</span>
          <span className={styles.quickActionDescription}>{description}</span>
        </span>
      </span>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[#877275]" aria-hidden="true" />
    </Link>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return value ? <div className={styles.profileRow}><dt>{label}</dt><dd>{value}</dd></div> : null;
}

function MetricCard({ label, value, supporting, icon }: { label: string; value: number | null; supporting: string; icon: keyof typeof import("@/components/ui/icon").ICON_MAP }) {
  return (
    <div className="hcp-dashboard-metric flex min-h-[112px] min-w-0 flex-col items-center justify-center rounded-2xl border border-white bg-white/80 px-2 py-3 text-center shadow-sm sm:min-h-[128px] sm:px-3">
      <Icon name={icon} className="mb-1 h-4 w-4 text-[#7E2D43]" />
      <span className="font-headline text-2xl font-extrabold leading-none text-[#6F1D35] sm:text-3xl">{value ?? "—"}</span>
      <span className="mt-1.5 text-[10px] font-bold leading-tight text-[#1B1C1B] sm:text-xs">{label}</span>
      <span className="mt-1 text-[9px] leading-tight text-[#705660] sm:text-[10px]">{value === null ? "Unavailable" : supporting}</span>
    </div>
  );
}

function WorkflowCard({ href, label, description, icon, wide = false }: { href: string; label: string; description: string; icon: keyof typeof import("@/components/ui/icon").ICON_MAP; wide?: boolean }) {
  return (
    <Link href={href} className={`hcp-dashboard-workflow group flex min-h-[118px] flex-col justify-between rounded-2xl border border-white/90 bg-white/70 p-3.5 shadow-md backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] sm:min-h-[132px] sm:p-4${wide ? " col-span-2" : ""}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D8B9C1] bg-[#6F1D35]/10 text-[#6F1D35]"><Icon name={icon} className="h-5 w-5" /></span>
      <span className="mt-3 flex min-w-0 items-center justify-between gap-2">
        <span className="block truncate font-headline text-sm font-bold text-[#1B1C1B]">{label}</span>
        <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-[#6F1D35] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="mt-0.5 block text-xs leading-snug text-[#544245]">
        {description}
      </span>
    </Link>
  );
}

function getUtcStartOfToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatSymptomTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(value);
}

function HcpProfileUnavailable({ fullName }: { fullName: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF4F4] text-[#6F1D35]">
          <Icon name="alert-circle" className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#1B1C1B] font-headline">Profile Unavailable</h1>
        <p className="mt-2 text-sm text-[#705660]">
          Hello {fullName}. Your healthcare professional profile could not be loaded. Please contact an OPORA administrator.
        </p>
      </div>
    </div>
  );
}

function HcpDashboardError({ fullName }: { fullName: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF4F4] text-[#6F1D35]">
          <Icon name="alert-triangle" className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#1B1C1B] font-headline">Dashboard Error</h1>
        <p className="mt-2 text-sm text-[#705660]">
          Hello {fullName}. We encountered an error loading your dashboard. Please refresh to try again.
        </p>
      </div>
    </div>
  );
}
