import Link from "next/link";

import { OporaLogo } from "@/components/brand/opora-logo";
import { Icon } from "@/components/ui/icon";
import CopyrightYear from "@/components/landing/copyright-year";
import { getPatientMobileBackground } from "@/lib/patient-mobile-backgrounds";
import {
  buildUnsplashReferralUrl,
  getPatientMobileBackgroundPresentation,
} from "@/lib/patient-mobile-background-utils.mjs";

import styles from "./landing-page.module.css";

const navigation = [
  { label: "Overview", href: "#overview" },
  { label: "Clinical Care", href: "#clinical-care" },
  { label: "Condition Monitoring", href: "#condition-monitoring" },
  { label: "Safety & Compliance", href: "#safety-compliance" },
  { label: "For Providers", href: "#for-providers" },
];

export default function LandingPage() {
  const photo = getPatientMobileBackground("dashboard");
  const background = getPatientMobileBackgroundPresentation(photo);

  return (
    <div className={styles.page}>
      <div
        className={styles.backdrop}
        aria-hidden="true"
        style={{
          backgroundImage: photo ? `url(${JSON.stringify(photo.imageUrl)})` : background.backgroundImage,
          backgroundPosition: photo ? photo.objectPosition : background.backgroundPosition,
        }}
      />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <OporaLogo
            size="sm"
            subtitle="Healthcare Platform"
            href="/"
            priority
            className={styles.brand}
          />

          <nav className={styles.desktopNav} aria-label="Main navigation">
            {navigation.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={index === 0 ? "page" : undefined}
                className={index === 0 ? styles.navLinkActive : styles.navLink}
              >
                {index === 0 ? <span className={styles.navDot} aria-hidden="true" /> : null}
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <Link href="/login" className={styles.signIn}>Sign In</Link>
            <Link href="/signup" className={styles.register}>Register</Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section id="overview" className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" />Longitudinal Clinical Telemetry &amp; Health Literacy</p>
            <h1 id="hero-heading">Your Health Story,<br /><span>Better Understood.</span></h1>
            <p className={styles.heroDescription}>
              OPORA helps patients record and review symptoms over time, explore curated health information, and communicate with healthcare professionals when access is authorized.
            </p>

            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryButton}>
                Create Patient Account <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/signup/healthcare-professional" className={styles.secondaryButton}>
                <Icon name="hcp" className="h-4 w-4" /> HCP Registration
              </Link>
            </div>

            <ul className={styles.trustStrip} aria-label="Platform principles">
              <li><Icon name="user-check" className="h-3.5 w-3.5" /> Patient-controlled consent</li>
              <li><Icon name="shield-check" className="h-3.5 w-3.5" /> Informational, non-diagnostic tools</li>
              <li><Icon name="lock" className="h-3.5 w-3.5" /> Private account access</li>
            </ul>
          </div>

          <div className={styles.heroAside}>
            {photo ? (
              <figure
                className={styles.mobilePhoto}
                role="img"
                aria-label={photo.alt}
                style={{ backgroundImage: `url(${JSON.stringify(photo.imageUrl)})` }}
              >
                <figcaption>Health information, organised around you</figcaption>
              </figure>
            ) : null}

            <div id="condition-monitoring" className={styles.previewCard} aria-label="Illustrative symptom tracking preview, sample data only">
              <div className={styles.previewDemoLabel}><span aria-hidden="true" />Illustrative interface · Sample data</div>
              <div className={styles.previewRecord}>
                <span className={styles.previewIcon}><Icon name="eye" className="h-4 w-4" /></span>
                <div className={styles.previewRecordText}>
                  <strong>Example symptom entry</strong>
                  <span>Sample severity · 5 / 10</span>
                </div>
                <span className={styles.previewScore}>5<span>/10</span></span>
              </div>
              <div className={styles.chartHeading}>
                <span>Illustrative 14-day trajectory</span>
                <span><i aria-hidden="true" />Example trend</span>
              </div>
              <svg className={styles.chart} viewBox="0 0 520 135" preserveAspectRatio="none" role="img" aria-label="Illustrative sample trend line, not patient data">
                <defs>
                  <linearGradient id="sample-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#9b3f56" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#9b3f56" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M0 106 C34 98 45 96 76 91 S125 84 151 72 S198 50 225 57 S277 76 300 64 S355 29 383 38 S431 67 455 52 S495 45 520 33 L520 135 L0 135 Z" fill="url(#sample-area)" />
                <path d="M0 106 C34 98 45 96 76 91 S125 84 151 72 S198 50 225 57 S277 76 300 64 S355 29 383 38 S431 67 455 52 S495 45 520 33" fill="none" stroke="#7e2d43" strokeWidth="3" strokeLinecap="round" />
                <circle cx="225" cy="57" r="4" fill="#6f1d35" />
                <circle cx="383" cy="38" r="4" fill="#6f1d35" />
                <circle cx="520" cy="33" r="4" fill="#6f1d35" />
              </svg>
              <div className={styles.chartAxis}><span>Day 1</span><span>Day 7</span><span>Day 14</span></div>
              <p className={styles.previewDisclaimer}><Icon name="info" className="h-3.5 w-3.5" /> Visual example only. OPORA does not diagnose or predict conditions.</p>
            </div>

            <div className={styles.consentPreview}>
              <span className={styles.consentIcon}><Icon name="users" className="h-4 w-4" /></span>
              <div><strong>Patient-controlled sharing</strong><span>Access depends on active authorization.</span></div>
              <span className={styles.consentStatus}><i aria-hidden="true" />Consent-based</span>
            </div>
          </div>
        </section>

        <section id="clinical-care" className={styles.capabilities} aria-labelledby="capabilities-heading">
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionEyebrow}>Structured health tools</p>
              <h2 id="capabilities-heading">A considered approach to health management</h2>
            </div>
            <p>OPORA brings together personal tracking, curated information and consent-aware communication in one connected platform.</p>
          </div>

          <div className={styles.capabilityGrid}>
            <article id="symptom-tracking" className={`${styles.capabilityCard} ${styles.capabilityPrimary}`}>
              <span className={styles.capabilityIcon}><Icon name="activity" className="h-5 w-5" /></span>
              <h3>Personal Symptom Tracking</h3>
              <p>Record symptoms, severity and notes over time. Review saved entries and notice patterns to discuss with your healthcare professional.</p>
              <div className={styles.miniEntry}>
                <div><span>Recent entry</span><span>Patient record</span></div>
                <strong>Symptom history stays in your account</strong>
                <span className={styles.entryMeta}><Icon name="clock" className="h-3 w-3" /> Review changes over time</span>
              </div>
            </article>

            <article className={styles.capabilityCard}>
              <span className={styles.capabilityIcon}><Icon name="assessment" className="h-5 w-5" /></span>
              <h3>Guided Assessments</h3>
              <p>Use structured questions to organise reported symptoms and view related disease information from OPORA’s catalogue.</p>
              <p className={styles.inlineNotice}><Icon name="info" className="h-4 w-4" /> Results are informational, not a confirmed diagnosis.</p>
            </article>

            <article className={styles.capabilityCard}>
              <span className={styles.capabilityIcon}><Icon name="book-open" className="h-5 w-5" /></span>
              <h3>Curated Disease Directory</h3>
              <p>Browse educational disease and symptom information maintained in OPORA’s curated catalogue.</p>
              <Link href="/signup" className={styles.textLink}>Create an account <Icon name="arrow-right" className="h-3.5 w-3.5" /></Link>
            </article>

            <article className={`${styles.capabilityCard} ${styles.capabilityWide}`}>
              <div className={styles.capabilityWideCopy}>
                <span className={styles.capabilityIcon}><Icon name="message" className="h-5 w-5" /></span>
                <div>
                  <h3>Consented Clinical Communication</h3>
                  <p>Coordinate appointments and messages through OPORA. Patient record access is limited by authorization and consent checks.</p>
                </div>
              </div>
              <div className={styles.sharingCard}>
                <span className={styles.sharingLabel}>Access is patient-controlled</span>
                <div><span className={styles.sharingAvatar}><Icon name="lock" className="h-3.5 w-3.5" /></span><span><strong>Consent-aware access</strong><small>Permissions can be managed by the patient.</small></span><Icon name="check-circle" className={styles.sharingCheck} /></div>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.howSection} aria-labelledby="how-heading">
          <div className={styles.centerIntro}>
            <p className={styles.sectionEyebrow}>A practical sequence</p>
            <h2 id="how-heading">How OPORA works</h2>
            <p>Tools that support a clearer conversation about health over time.</p>
          </div>
          <ol className={styles.steps}>
            <li className={styles.stepCard}>
              <span className={styles.stepNumber}>01</span><span className={styles.stepIcon}><Icon name="activity" className="h-4 w-4" /></span>
              <h3>Record</h3><p>Log symptoms and their severity in your personal history.</p><a href="#symptom-tracking">Personal symptom record <Icon name="arrow-right" className="h-3 w-3" /></a>
            </li>
            <li className={styles.stepCard}>
              <span className={styles.stepNumber}>02</span><span className={styles.stepIcon}><Icon name="search" className="h-4 w-4" /></span>
              <h3>Explore</h3><p>Review informational assessments and curated disease references.</p><a href="#clinical-care">Health information tools <Icon name="arrow-right" className="h-3 w-3" /></a>
            </li>
            <li className={styles.stepCard}>
              <span className={styles.stepNumber}>03</span><span className={styles.stepIcon}><Icon name="user-check" className="h-4 w-4" /></span>
              <h3>Connect</h3><p>Coordinate with healthcare professionals through supported OPORA tools.</p><a href="#for-providers">Patient-controlled connection <Icon name="arrow-right" className="h-3 w-3" /></a>
            </li>
          </ol>
        </section>

        <section id="for-providers" className={styles.pathways} aria-labelledby="pathways-heading">
          <div className={styles.centerIntro}>
            <p className={styles.sectionEyebrow}>Purpose-built spaces</p>
            <h2 id="pathways-heading">Two pathways, one connected dialogue</h2>
          </div>
          <div className={styles.pathwayGrid}>
            <article className={styles.patientPathway}>
              <span className={styles.pathwayLabel}><Icon name="user" className="h-3 w-3" /> Patient portal</span>
              <h3>For Individuals &amp; Patients</h3>
              <p>Keep a personal record of symptom experiences, use guided informational tools, and choose whether to authorize an eligible healthcare professional.</p>
              <ul>
                <li><Icon name="check-circle" className="h-4 w-4" /> Longitudinal symptom history</li>
                <li><Icon name="check-circle" className="h-4 w-4" /> Informational guided assessments</li>
                <li><Icon name="check-circle" className="h-4 w-4" /> Patient-managed consent</li>
              </ul>
              <Link href="/signup" className={styles.pathwayButton}>Create Patient Account <Icon name="arrow-right" className="h-4 w-4" /></Link>
            </article>

            <article className={styles.hcpPathway}>
              <span className={styles.pathwayLabel}><Icon name="stethoscope" className="h-3 w-3" /> Clinical workspace</span>
              <h3>For Healthcare Professionals</h3>
              <p>Use consent-authorized patient information to support consultations, coordinate appointments, and communicate with patients.</p>
              <ul>
                <li><Icon name="check-circle" className="h-4 w-4" /> Review authorized patient records</li>
                <li><Icon name="check-circle" className="h-4 w-4" /> Coordinate appointments and messages</li>
                <li><Icon name="check-circle" className="h-4 w-4" /> Professional verification required</li>
              </ul>
              <Link href="/signup/healthcare-professional" className={styles.pathwayButtonLight}>HCP Registration <Icon name="arrow-right" className="h-4 w-4" /></Link>
              <span className={styles.pathwayFootnote}>Workspace access follows OPORA’s account and verification requirements.</span>
            </article>
          </div>
        </section>

        <section id="safety-compliance" className={styles.safetyNotice} aria-labelledby="safety-heading">
          <span className={styles.safetyIcon}><Icon name="shield-alert" className="h-5 w-5" /></span>
          <div>
            <p className={styles.sectionEyebrow}>Clinical information &amp; safety</p>
            <h2 id="safety-heading">Information to support—not replace—professional care</h2>
            <p>OPORA’s health references and assessment results are informational and do not establish a confirmed diagnosis. They do not replace evaluation by a healthcare professional. If you may be experiencing a medical emergency, contact your local emergency service.</p>
          </div>
          <a href="#clinical-care" className={styles.safetyLink}>Explore platform tools <Icon name="arrow-right" className="h-3.5 w-3.5" /></a>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerAbout}>
            <OporaLogo size="sm" subtitle="Healthcare Platform" href="/" />
            <p>Tools for recording symptoms, reviewing health information and supporting patient-professional communication.</p>
            {photo ? (
              <p className={styles.attribution}>
                Photo by <a href={buildUnsplashReferralUrl(photo.photographerProfileUrl)} target="_blank" rel="noreferrer">{photo.photographerName}</a> · <a href={buildUnsplashReferralUrl(photo.sourcePhotoUrl)} target="_blank" rel="noreferrer">Unsplash</a>
              </p>
            ) : null}
          </div>
          <div className={styles.footerColumn}>
            <h2>Platform</h2>
            <a href="#clinical-care">Clinical tools</a>
            <a href="#condition-monitoring">Condition monitoring</a>
            <a href="#how-heading">How OPORA works</a>
          </div>
          <div className={styles.footerColumn}>
            <h2>Clinical care</h2>
            <a href="#for-providers">For patients &amp; professionals</a>
            <Link href="/signup">Patient registration</Link>
            <Link href="/signup/healthcare-professional">HCP registration</Link>
          </div>
          <div className={styles.footerColumn}>
            <h2>Safety &amp; access</h2>
            <a href="#safety-compliance">Clinical information notice</a>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© <CopyrightYear /> OPORA. All rights reserved.</span>
          <a href="#overview">Back to top <Icon name="arrow-up" className="h-3.5 w-3.5" /></a>
        </div>
      </footer>
    </div>
  );
}
