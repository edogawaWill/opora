"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { Icon } from "@/components/ui/icon";
import dashboardStyles from "@/app/(protected)/patient/dashboard-mobile.module.css";
import { authClient } from "@/lib/auth-client";
import {
  getActivePatientDestination,
  getPatientDashboardSectionTarget,
} from "@/lib/patient-navigation-state.mjs";

export type PatientNavUser = {
  fullName: string;
  email: string;
  totalUnread?: number;
};

interface PatientHeaderProps {
  user: PatientNavUser;
}

const patientDesktopNavItems = [
  { id: "overview", label: "Overview", href: "/patient", icon: "dashboard" },
  { id: "symptoms", label: "Symptom Logs", href: "/patient#symptom-history", icon: "symptom" },
  { id: "history", label: "Health History", href: "/patient/history", icon: "health" },
  { id: "assessment", label: "Guided Assessments", href: "/patient/assessment", icon: "assessment" },
  { id: "diseases", label: "Disease Directory", href: "/patient/diseases", icon: "disease" },
  { id: "appointments", label: "Appointments", href: "/patient/appointments", icon: "calendar" },
  { id: "messages", label: "Care & Messages", href: "/patient/messages", icon: "chat" },
] as const;

type PatientDesktopNavId = (typeof patientDesktopNavItems)[number]["id"];

function PatientDesktopNavigation({
  pathname,
  unreadCount,
}: {
  pathname: string;
  unreadCount?: number;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Partial<Record<PatientDesktopNavId, HTMLAnchorElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const [dashboardHash, setDashboardHash] = useState("");
  const [visibleDashboardSection, setVisibleDashboardSection] = useState<"overview" | "symptoms" | null>(null);
  const activeId = getActivePatientDestination(pathname, dashboardHash, visibleDashboardSection);

  useEffect(() => {
    const syncHash = () => {
      setDashboardHash(window.location.hash);
      setVisibleDashboardSection(null);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/patient") return;

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | null = null;
    let scrollSpyCleanup: (() => void) | null = null;
    const connectObserver = () => {
      observer?.disconnect();
      scrollSpyCleanup?.();
      scrollSpyCleanup = null;
      observer = null;
      if (!desktopQuery.matches || typeof IntersectionObserver === "undefined") return;

      const sections = ["patient-overview", "symptom-trends", "record-symptom", "symptom-history"]
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element !== null);
      if (sections.length === 0) return;

      let frame = 0;
      const updateVisibleSection = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = 0;
          const activationLine = window.innerHeight * 0.2;
          const currentSection = sections
            .map((element) => ({
              section: getPatientDashboardSectionTarget(element),
              bounds: element.getBoundingClientRect(),
            }))
            .filter((entry): entry is { section: "overview" | "symptoms"; bounds: DOMRect } => entry.section !== null)
            .filter(({ bounds }) => bounds.top <= activationLine && bounds.bottom >= activationLine)
            .sort((first, second) => second.bounds.top - first.bounds.top)[0]?.section;
          if (currentSection) setVisibleDashboardSection(currentSection);
        });
      };

      observer = new IntersectionObserver(updateVisibleSection, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });

      sections.forEach((section) => observer?.observe(section));
      window.addEventListener("scroll", updateVisibleSection, { passive: true });
      window.addEventListener("resize", updateVisibleSection);
      updateVisibleSection();
      scrollSpyCleanup = () => {
        window.removeEventListener("scroll", updateVisibleSection);
        window.removeEventListener("resize", updateVisibleSection);
        if (frame) cancelAnimationFrame(frame);
      };
    };

    connectObserver();
    desktopQuery.addEventListener("change", connectObserver);
    return () => {
      desktopQuery.removeEventListener("change", connectObserver);
      observer?.disconnect();
      scrollSpyCleanup?.();
    };
  }, [pathname]);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const updateIndicator = () => {
      const activeLink = activeId ? linkRefs.current[activeId] : null;
      if (!activeLink) {
        setIndicator((current) => current.visible ? { ...current, visible: false } : current);
        return;
      }

      const navigationBounds = navigation.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      const next = {
        left: linkBounds.left - navigationBounds.left - navigation.clientLeft,
        width: linkBounds.width,
        visible: true,
      };
      setIndicator((current) =>
        current.visible === next.visible &&
        Math.abs(current.left - next.left) < 0.5 &&
        Math.abs(current.width - next.width) < 0.5
          ? current
          : next,
      );
    };

    updateIndicator();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    resizeObserver?.observe(navigation);
    Object.values(linkRefs.current).forEach((link) => link && resizeObserver?.observe(link));
    window.addEventListener("resize", updateIndicator);
    document.fonts?.addEventListener("loadingdone", updateIndicator);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
      document.fonts?.removeEventListener("loadingdone", updateIndicator);
    };
  }, [activeId]);

  return (
    <nav ref={navigationRef} className="patient-dashboard-full-nav" aria-label="Patient primary navigation">
      <span
        className="patient-desktop-nav-indicator"
        aria-hidden="true"
        style={{ width: indicator.width, transform: `translate3d(${indicator.left}px, 0, 0)`, opacity: indicator.visible ? 1 : 0 }}
      />
      {patientDesktopNavItems.map((item) => {
        const active = activeId === item.id;
        return (
          <Link
            key={item.id}
            ref={(node) => { linkRefs.current[item.id] = node; }}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? (item.id === "symptoms" ? "location" : "page") : undefined}
            className={`patient-dashboard-full-nav-link${active ? " is-active" : ""}`}
            onClick={() => {
              if (pathname !== "/patient") return;
              if (item.id === "overview") {
                setDashboardHash("");
                setVisibleDashboardSection("overview");
              } else if (item.id === "symptoms") {
                setDashboardHash("#symptom-history");
                setVisibleDashboardSection("symptoms");
              }
            }}
          >
            <Icon name={item.icon} className="patient-desktop-nav-icon h-4 w-4 shrink-0" />
            <span className="patient-desktop-nav-label">{item.label}</span>
            {item.id === "messages" && unreadCount && unreadCount > 0 ? (
              <span className="patient-dashboard-nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function PatientHeader({ user }: PatientHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setUserMenuOpen(false);
    setMobileDrawerOpen(false);
  }

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const trigger = drawerToggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerPanelRef.current) return;

      const focusable = Array.from(
        drawerPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        drawerPanelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileDrawerOpen(false);
    };
    desktopQuery.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktopQuery.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      if (trigger?.getClientRects().length) trigger.focus();
    };
  }, [mobileDrawerOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
    <header className={`patient-mobile-header fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0] ${dashboardStyles.desktopHeader} ${pathname === "/patient" ? dashboardStyles.dashboardHeader : ""}`}>
      <div className="patient-dashboard-header-inner h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: OPORA Branding */}
        <div className="patient-dashboard-brand-group flex items-center gap-3 lg:gap-6">
          <OporaLogo
            size="md"
            subtitle="PATIENT SPACE"
            href="/patient"
            priority
            className="patient-header-desktop-brand patient-dashboard-brand-capsule"
          />

          <div className="patient-header-mobile-brand">
            <OporaLogo size="lg" showText={false} href="/patient" priority />
            <div>
              <p>OPORA HEALTH</p>
              <p>{user.fullName}</p>
            </div>
          </div>
        </div>

        <PatientDesktopNavigation pathname={pathname} unreadCount={user.totalUnread} />

        {/* Right: User Profile & Mobile Toggle */}
        <div className="patient-dashboard-account-capsule flex items-center gap-2 sm:gap-4">
          {/* Messages link quick pill (mobile/desktop) */}
          <Link
            href="/patient/messages"
            aria-label="Messages"
            className="relative p-2 rounded-full text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1] transition-colors"
          >
            <Icon name="chat" className="w-5 h-5" />
            {user.totalUnread && user.totalUnread > 0 ? (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#6F1D35] ring-2 ring-[#FCF9F7]" />
            ) : null}
          </Link>

          {/* User Account Menu */}
          <div aria-hidden="true" className="patient-mobile-header-avatar flex lg:hidden w-8 h-8 shrink-0 items-center justify-center rounded-full bg-[#6F1D35] text-xs font-bold text-white shadow-xs">
            {user.fullName ? user.fullName[0].toUpperCase() : "P"}
          </div>

          <button
            ref={drawerToggleRef}
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              setMobileDrawerOpen(true);
            }}
            aria-label="Open account and settings menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="patient-mobile-drawer"
            aria-haspopup="dialog"
            className="patient-mobile-menu-trigger inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/60 text-[#544245] shadow-sm transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div ref={userMenuRef} className="hidden lg:block relative pl-1 border-l border-[#EADDE0]">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#F6F3F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35]"
            >
              <div className="w-8 h-8 rounded-full bg-[#6F1D35] flex items-center justify-center text-white font-['Manrope'] font-bold text-xs shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "P"}
              </div>
              <span className="hidden md:block font-['Inter'] text-xs font-semibold text-[#1B1C1B] max-w-[130px] truncate">
                {user.fullName}
              </span>
              <Icon
                name="chevron-down"
                className={`w-3.5 h-3.5 text-[#8A737A] transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full pt-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-52 bg-white rounded-xl shadow-[0_12px_36px_-4px_rgba(111,29,53,0.12)] border border-[#EADDE0] py-1.5">
                  <div className="px-4 py-2 border-b border-[#EADDE0]">
                    <p className="font-['Manrope'] text-xs font-bold text-[#1B1C1B] truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-[#8A737A] truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/patient/profile"
                    className="block px-4 py-2 text-xs md:text-sm font-medium text-[#544245] hover:bg-[#F6F3F1] hover:text-[#1B1C1B] transition-colors"
                  >
                    Profile &amp; Settings
                  </Link>
                  <Link
                    href="/patient/assessment/history"
                    className="block px-4 py-2 text-xs md:text-sm font-medium text-[#544245] hover:bg-[#F6F3F1] hover:text-[#1B1C1B] transition-colors"
                  >
                    Assessment History
                  </Link>
                  <div className="h-px bg-[#EADDE0] my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2 text-xs md:text-sm font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/30 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    <Icon name="logout" className="w-4 h-4" />
                    <span>{isLoggingOut ? "Logging out…" : "Log out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>

      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" data-testid="patient-mobile-drawer-layer">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close account and settings menu"
            className="absolute inset-0 h-full w-full cursor-default bg-[#30302F]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            ref={drawerPanelRef}
            id="patient-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Patient account and settings menu"
            tabIndex={-1}
            className="patient-mobile-drawer-panel absolute inset-y-0 right-0 z-10 flex w-80 max-w-[85vw] flex-col justify-between overflow-y-auto overscroll-contain border-l border-[#EADDE0] bg-[#FCF9F7] p-6 shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#EADDE0] pb-4">
                <OporaLogo size="sm" subtitle="PATIENT PORTAL" />
                <button
                  ref={drawerCloseRef}
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close account and settings menu"
                  className="rounded-lg p-2 text-[#8A737A] transition-colors hover:bg-[#F6F3F1] hover:text-[#1B1C1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/70 p-4 shadow-sm">
                <div aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#6F1D35] font-['Manrope'] text-sm font-bold text-white shadow-sm">
                  {user.fullName ? user.fullName[0].toUpperCase() : "P"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-['Manrope'] text-sm font-bold text-[#1B1C1B]">{user.fullName}</p>
                  <p className="truncate font-['Inter'] text-xs text-[#705660]">{user.email}</p>
                </div>
              </div>

              <nav aria-label="Patient account settings" className="space-y-3 font-['Inter']">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7E2D43]">Personal settings</p>
                <Link
                  href="/patient/profile"
                  aria-current={pathname.startsWith("/patient/profile") ? "page" : undefined}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-white/85 bg-white/65 px-4 py-3 text-sm font-semibold text-[#6F1D35] shadow-sm transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                >
                  <Icon name="profile" className="h-4 w-4" />
                  Profile &amp; Settings
                </Link>
                <Link
                  href="/patient/assessment/history"
                  aria-current={pathname.startsWith("/patient/assessment/history") ? "page" : undefined}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-white/85 bg-white/65 px-4 py-3 text-sm font-semibold text-[#6F1D35] shadow-sm transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                >
                  <Icon name="assessment" className="h-4 w-4" />
                  Assessment History
                </Link>
              </nav>
            </div>

            <div className="mt-8 border-t border-[#EADDE0] pt-6">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#BA1A1A]/50 bg-white/65 px-4 py-2.5 text-sm font-semibold text-[#BA1A1A] shadow-sm transition hover:bg-[#FFDAD6]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35] disabled:cursor-wait disabled:opacity-60"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span>{isLoggingOut ? "Logging out…" : "Log out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PatientFooter() {
  return (
    <footer className="patient-mobile-footer w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-6 mt-16 text-[#544245] font-['Inter'] text-xs">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OporaLogo size="sm" showText={false} />
          <span className="font-['Manrope'] text-sm font-bold text-[#6F1D35]">
            OPORA
          </span>
          <span className="text-[#8A737A]">|</span>
          <span>Personal Longitudinal Symptom &amp; Health Monitoring</span>
        </div>
        <div className="flex items-center gap-4 text-[#8A737A]">
          <span>© 2026 OPORA. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
