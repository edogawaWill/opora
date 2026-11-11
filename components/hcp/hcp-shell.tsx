"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { HcpDesktopPhotoCredit, HcpMobilePhotoCredit } from "@/components/hcp/hcp-mobile-background";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth-client";
import { getHcpPrimaryNavigationItem } from "@/lib/hcp-navigation.mjs";
import styles from "@/components/hcp/hcp-desktop.module.css";

export type HcpNavUser = {
  fullName: string;
  email: string;
  specialization?: string | null;
  totalUnread?: number | null;
};

interface HcpHeaderProps {
  user: HcpNavUser;
}

export function HcpHeader({ user }: HcpHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      trigger?.focus();
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

  const isRouteActive = (href: string) => {
    if (href === "/hcp") return pathname === "/hcp";
    return pathname.startsWith(href);
  };
  const isDashboard = pathname === "/hcp";

  return (
    <>
    <HcpDesktopHeader user={user} />
    <header className={`hcp-mobile-header${isDashboard ? " hcp-dashboard-header" : ""} fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0]`}>
      <div className="h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className={`hcp-header-brand-group flex items-center gap-6${isDashboard ? " hcp-dashboard-desktop-brand" : ""}`}>
          <OporaLogo
            size="md"
            subtitle="CLINICAL PORTAL"
            href="/hcp"
            priority
          />

          {/* Desktop Navigation */}
          <nav
            ref={navRef}
            aria-label="HCP Navigation"
            className="hidden lg:flex items-center gap-1 font-['Inter'] text-sm"
          >
            <Link
              href="/hcp"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                pathname === "/hcp"
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/hcp/patients"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/hcp/patients")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Consented Patients
            </Link>

            <Link
              href="/hcp/appointments"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/hcp/appointments")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Appointments
            </Link>

            <Link
              href="/hcp/messages"
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/hcp/messages")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              <span>Messages</span>
              {user.totalUnread && user.totalUnread > 0 ? (
                <span className="inline-flex items-center justify-center rounded-full bg-[#6F1D35] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {user.totalUnread}
                </span>
              ) : null}
            </Link>

            <Link
              href="/hcp/profile"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/hcp/profile")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Profile
            </Link>
          </nav>
        </div>

        {isDashboard ? (
          <Link href="/hcp" className="hcp-dashboard-mobile-brand" aria-label="OPORA HCP Clinical Workspace">
            <OporaLogo size="sm" showText={false} priority />
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E2D43]">OPORA HCP</span>
              <span className="block max-w-[115px] truncate font-['Manrope'] text-sm font-bold text-[#6F1D35]">Clinical Workspace</span>
            </span>
          </Link>
        ) : null}

        {/* Right: User Menu & Mobile Toggle */}
        <div className={`hcp-header-actions flex items-center gap-2 sm:gap-4${isDashboard ? " hcp-dashboard-actions" : ""}`}>
          <Link
            href="/hcp/messages"
            aria-label="Messages"
            className={`relative p-2 rounded-full text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1] transition-colors${isDashboard ? " hcp-dashboard-message-link" : ""}`}
          >
            <Icon name="chat" className="w-5 h-5" />
            {user.totalUnread && user.totalUnread > 0 ? (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#6F1D35] ring-2 ring-[#FCF9F7]" />
            ) : null}
          </Link>

          {/* User Account Menu */}
          <div ref={userMenuRef} className={`relative pl-1 border-l border-[#EADDE0]${isDashboard ? " hcp-dashboard-account" : ""}`}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              className={`flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#F6F3F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35]${isDashboard ? " hcp-dashboard-account-toggle" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#6F1D35] flex items-center justify-center text-white font-['Manrope'] font-bold text-xs shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "D"}
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
                    href="/hcp/profile"
                    className="block px-4 py-2 text-xs md:text-sm font-medium text-[#544245] hover:bg-[#F6F3F1] hover:text-[#1B1C1B] transition-colors"
                  >
                    Clinical Profile
                  </Link>
                  <Link
                    href="/hcp/patients"
                    className="block px-4 py-2 text-xs md:text-sm font-medium text-[#544245] hover:bg-[#F6F3F1] hover:text-[#1B1C1B] transition-colors"
                  >
                    Consented Patients
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

          {/* Mobile Hamburger */}
          <button
            ref={drawerToggleRef}
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              setMobileDrawerOpen(true);
            }}
            aria-label="Open account and settings menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="hcp-mobile-drawer"
            aria-haspopup="dialog"
            className={`lg:hidden p-2 rounded-lg text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35]${isDashboard ? " hcp-dashboard-menu-button" : ""}`}
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>
        </div>
      </div>

    </header>

      {/* Render outside the filtered, fixed header so the drawer is positioned against the viewport. */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" data-testid="hcp-mobile-drawer-layer">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close account and settings menu"
            className="absolute inset-0 h-full w-full cursor-default bg-[#30302F]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            ref={drawerPanelRef}
            id="hcp-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Account and settings menu"
            tabIndex={-1}
            className="hcp-mobile-drawer-panel absolute inset-y-0 right-0 z-10 w-80 max-w-[85vw] bg-[#FCF9F7] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto overscroll-contain animate-in slide-in-from-right duration-200 border-l border-[#EADDE0]"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADDE0]">
                <OporaLogo size="sm" subtitle="CLINICAL" />
                <button
                  ref={drawerCloseRef}
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close account and settings menu"
                  className="p-1 rounded-lg text-[#8A737A] hover:text-[#1B1C1B] hover:bg-[#F6F3F1] transition-colors"
                >
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EADDE0]">
                <p className="font-['Manrope'] font-bold text-sm text-[#1B1C1B]">
                  {user.fullName}
                </p>
                <p className="font-['Inter'] text-xs text-[#8A737A] truncate">
                  {user.email}
                </p>
              </div>

              <div className="space-y-3 font-['Inter']">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7E2D43]">Account settings</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#705660]">Manage your professional details and password in your profile.</p>
                </div>
                <Link
                  href="/hcp/profile"
                  className="flex items-center gap-2 rounded-xl border border-[#EADDE0] bg-white/70 px-3 py-3 text-sm font-semibold text-[#6F1D35] transition hover:bg-white"
                >
                  <Icon name="profile" className="h-4 w-4" />
                  Clinical Profile & Security
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-[#EADDE0]">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full py-2.5 px-4 rounded-xl border border-[#BA1A1A] text-[#BA1A1A] font-semibold text-sm hover:bg-[#FFDAD6]/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name="logout" className="w-4 h-4" />
                <span>{isLoggingOut ? "Logging out…" : "Log out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const desktopNavigationItems = [
  { id: "home", label: "Overview", href: "/hcp", icon: "dashboard" },
  { id: "patients", label: "Patient Roster", href: "/hcp/patients", icon: "users" },
  { id: "appointments", label: "Appointments", href: "/hcp/appointments", icon: "calendar" },
  { id: "messages", label: "Messages", href: "/hcp/messages", icon: "message" },
] as const;

type HcpDesktopNavigationId = (typeof desktopNavigationItems)[number]["id"];

function HcpDesktopHeader({ user }: HcpHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = getHcpPrimaryNavigationItem(pathname) as HcpDesktopNavigationId | null;
  const navigationRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Partial<Record<HcpDesktopNavigationId, HTMLAnchorElement | null>>>({});
  const accountRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const updateIndicator = () => {
      const navigation = navigationRef.current;
      const activeLink = activeItem ? linkRefs.current[activeItem] : null;
      if (!navigation || !activeLink) {
        setIndicator((current) => current.visible ? { ...current, visible: false } : current);
        return;
      }

      const navBounds = navigation.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      const next = { left: linkBounds.left - navBounds.left, width: linkBounds.width, visible: true };
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
    if (navigationRef.current) resizeObserver?.observe(navigationRef.current);
    Object.values(linkRefs.current).forEach((link) => link && resizeObserver?.observe(link));
    window.addEventListener("resize", updateIndicator);
    document.fonts?.addEventListener("loadingdone", updateIndicator);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
      document.fonts?.removeEventListener("loadingdone", updateIndicator);
    };
  }, [activeItem]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const initials = user.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "H";

  return (
    <header className={styles.desktopHeader}>
      <div className={styles.desktopHeaderInner}>
        <div className={styles.brandCapsule}>
          <OporaLogo size="md" subtitle="CLINICAL PORTAL" href="/hcp" priority className={styles.brandLogo} />
        </div>

        <div className={styles.navigationCapsule}>
          <nav ref={navigationRef} className={styles.navigation} aria-label="HCP primary navigation">
            <span
              className={styles.navigationIndicator}
              aria-hidden="true"
              style={{ width: indicator.width, transform: `translate3d(${indicator.left}px, 0, 0)`, opacity: indicator.visible ? 1 : 0 }}
            />
            {desktopNavigationItems.map((item) => {
              const active = activeItem === item.id;
              return (
                <Link
                  key={item.href}
                  ref={(node) => { linkRefs.current[item.id] = node; }}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${styles.navigationLink}${active ? ` ${styles.navigationLinkActive}` : ""}`}
                >
                  <Icon name={item.icon} className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.id === "messages" && user.totalUnread && user.totalUnread > 0 ? (
                    <span className="sr-only">{user.totalUnread} unread</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div ref={accountRef} className={styles.accountCapsule}>
          <button
            type="button"
            className={styles.accountButton}
            aria-label="Open HCP account menu"
            aria-expanded={menuOpen}
            aria-controls="hcp-desktop-account-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.accountAvatar} aria-hidden="true">{initials}</span>
            <span className={styles.accountText}>
              <span className={styles.accountName}>{user.fullName}</span>
              <span className={styles.accountSpecialization}>{user.specialization || "Healthcare professional"}</span>
            </span>
            <Icon name="chevron-down" className="h-4 w-4 shrink-0 text-[#544245]" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div id="hcp-desktop-account-menu" className={styles.accountMenu} aria-label="HCP account actions">
              <div className={styles.accountMenuIdentity}>
                <p className={styles.accountMenuName}>{user.fullName}</p>
                <p className={styles.accountMenuEmail}>{user.email}</p>
              </div>
              <Link href="/hcp/profile" className={styles.accountMenuLink} onClick={() => setMenuOpen(false)}>
                <Icon name="profile" className="h-4 w-4" aria-hidden="true" />Clinical Profile
              </Link>
              <Link href="/hcp/status" className={styles.accountMenuLink} onClick={() => setMenuOpen(false)}>
                <Icon name="shield-check" className="h-4 w-4" aria-hidden="true" />Account Status
              </Link>
              <Link href="/hcp/patients" className={styles.accountMenuLink} onClick={() => setMenuOpen(false)}>
                <Icon name="users" className="h-4 w-4" aria-hidden="true" />Authorized Patients
              </Link>
              <button type="button" className={styles.logoutButton} disabled={isLoggingOut} onClick={handleLogout}>
                <Icon name="logout" className="h-4 w-4" aria-hidden="true" />
                {isLoggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function HcpBottomNavigation({ user }: HcpHeaderProps) {
  const pathname = usePathname();
  const activeItem = getHcpPrimaryNavigationItem(pathname);
  const items = [
    { id: "home", href: "/hcp", label: "Home", icon: "dashboard" as const },
    { id: "patients", href: "/hcp/patients", label: "Patients", icon: "users" as const },
    { id: "appointments", href: "/hcp/appointments", label: "Appointments", icon: "calendar" as const },
    { id: "messages", href: "/hcp/messages", label: "Messages", icon: "message" as const },
    { id: "profile", href: "/hcp/profile", label: "Profile", icon: "profile" as const },
  ];

  return (
    <nav className="hcp-mobile-bottom-nav" aria-label="HCP primary navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={activeItem === item.id ? "page" : undefined}
          data-active={activeItem === item.id ? "true" : "false"}
          className="hcp-mobile-bottom-nav-link"
        >
          <span className="hcp-mobile-bottom-nav-icon-wrap">
            <Icon name={item.icon} className="h-[19px] w-[19px]" aria-hidden="true" />
          {item.id === "messages" && user.totalUnread && user.totalUnread > 0 ? (
              <span className="hcp-mobile-bottom-nav-badge" aria-label={`${user.totalUnread} unread messages`}>
                {user.totalUnread > 99 ? "99+" : user.totalUnread}
              </span>
            ) : null}
          </span>
          <span className="hcp-mobile-bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function HcpFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <footer className="hcp-mobile-footer w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 mt-16 text-[#544245] font-['Inter'] text-xs">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <OporaLogo size="sm" showText={false} />
            <span className="font-['Manrope'] text-sm font-bold text-[#6F1D35]">
              OPORA
            </span>
            <span className="text-[#8A737A]">|</span>
            <span>Healthcare Professional Workspace</span>
          </div>
          <div className="flex items-center gap-4 text-[#8A737A]">
            <span>© {currentYear} OPORA. All rights reserved.</span>
          </div>
        </div>
        <HcpMobilePhotoCredit />
      </footer>
      <footer className={styles.desktopFooter}>
        <div className={styles.desktopPhotoCredit}>
          <HcpDesktopPhotoCredit />
        </div>
        <div className={styles.desktopFooterCapsule}>
          <span className={styles.footerBrand}><span className={styles.footerDot} aria-hidden="true" />OPORA Healthcare Professional Workspace</span>
          <span>© {currentYear} OPORA. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
