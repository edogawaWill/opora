"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth-client";
import { buildUnsplashReferralUrl } from "@/lib/patient-mobile-background-utils.mjs";
import styles from "@/components/admin/admin-desktop.module.css";

export type AdminNavUser = {
  fullName: string;
  email: string;
  role: string;
};

const adminDesktopDestinations = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Patient Management", href: "/admin/patients", icon: "users" },
  { label: "HCP Verification", href: "/admin/hcps", icon: "user-check" },
  { label: "Disease Catalogue", href: "/admin/diseases", icon: "book-open" },
] as const;

const adminMobileDestinations = [
  { label: "Home", href: "/admin", icon: "dashboard" },
  { label: "Patients", href: "/admin/patients", icon: "users" },
  { label: "HCP Review", href: "/admin/hcps", icon: "user-check" },
  { label: "Diseases", href: "/admin/diseases", icon: "book-open" },
] as const;

export function AdminMobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="admin-mobile-bottom-nav fixed inset-x-3 bottom-3 z-[45] grid w-auto grid-cols-4 items-center gap-1 rounded-[1.65rem] p-1.5 lg:hidden"
      aria-label="Admin primary navigation"
    >
      {adminMobileDestinations.map(({ label, href, icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`admin-mobile-bottom-link flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]${active ? " is-active" : ""}`}
          >
            <span className="admin-mobile-bottom-icon"><Icon name={icon} className="h-5 w-5" /></span>
            <span className="admin-mobile-bottom-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

interface AdminHeaderProps {
  user: AdminNavUser;
  pendingHcpCount: number | null;
}

export function AdminHeader({ user, pendingHcpCount }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopNavigationRef = useRef<HTMLElement>(null);
  const desktopLinkRefs = useRef<Partial<Record<string, HTMLAnchorElement | null>>>({});
  const [navigationIndicator, setNavigationIndicator] = useState({ left: 0, width: 0, visible: false });

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !userMenuRef.current?.contains(target) &&
        !desktopMenuRef.current?.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeDesktopDestination = adminDesktopDestinations.find(({ href }) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href),
  )?.href;

  useEffect(() => {
    const navigation = desktopNavigationRef.current;
    const activeLink = activeDesktopDestination
      ? desktopLinkRefs.current[activeDesktopDestination]
      : null;
    if (!navigation || !activeLink) {
      setNavigationIndicator((current) => current.visible ? { ...current, visible: false } : current);
      return;
    }

    const updateIndicator = () => {
      const navBounds = navigation.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      setNavigationIndicator({
        left: linkBounds.left - navBounds.left,
        width: linkBounds.width,
        visible: true,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeDesktopDestination, pendingHcpCount]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  const isRouteActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };
  const isDashboard = pathname === "/admin";

  return (
    <>
    <header className={styles.desktopHeader}>
      <div className={styles.desktopHeaderInner}>
        <div className={styles.brandCapsule}>
          <OporaLogo
            size="sm"
            subtitle="ADMINISTRATION"
            href="/admin"
            priority
            className={styles.brandLogo}
          />
        </div>

        <nav ref={desktopNavigationRef} aria-label="Admin primary navigation" className={styles.navigationCapsule}>
          <span
            className={styles.navigationIndicator}
            aria-hidden="true"
            style={{
              width: `${navigationIndicator.width}px`,
              transform: `translateX(${navigationIndicator.left}px)`,
              opacity: navigationIndicator.visible ? 1 : 0,
            }}
          />
          <div className={styles.navigation}>
            {adminDesktopDestinations.map(({ label, href, icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  ref={(element) => { desktopLinkRefs.current[href] = element; }}
                  aria-current={active ? "page" : undefined}
                  className={`${styles.navigationLink}${active ? ` ${styles.navigationLinkActive}` : ""}`}
                >
                  <Icon name={icon} className={styles.navigationIcon} />
                  <span>{label}</span>
                  {href === "/admin/hcps" && pendingHcpCount !== null && (
                    <span className={styles.pendingBadge} aria-label={`${pendingHcpCount} HCP applications awaiting review`}>
                      {pendingHcpCount > 99 ? "99+" : pendingHcpCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div ref={desktopMenuRef} className={styles.accountCapsule}>
          <button
            type="button"
            className={styles.accountButton}
            aria-expanded={userMenuOpen}
            aria-controls="admin-desktop-account-menu"
            onClick={() => setUserMenuOpen((previous) => !previous)}
          >
            <span className={styles.accountAvatar}>{user.fullName ? user.fullName[0].toUpperCase() : "A"}</span>
            <span className={styles.accountText}>
              <span className={styles.accountName}>{user.fullName}</span>
              <span className={styles.accountRole}>{user.role === "ADMIN" ? "Administrator" : user.role}</span>
            </span>
            <Icon name="chevron-down" className={`${styles.accountChevron}${userMenuOpen ? ` ${styles.accountChevronOpen}` : ""}`} />
          </button>
          <button
            type="button"
            className={styles.logoutIcon}
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label={isLoggingOut ? "Logging out" : "Log out"}
          >
            <Icon name="logout" className="h-4 w-4" />
          </button>
          {userMenuOpen && (
            <div id="admin-desktop-account-menu" className={styles.accountMenu}>
              <div className={styles.accountMenuIdentity}>
                <p className="truncate font-['Manrope'] text-xs font-bold text-[#1B1C1B]">{user.fullName}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#8A737A]">{user.email}</p>
              </div>
              <Link href="/admin" className={styles.accountMenuLink} onClick={() => setUserMenuOpen(false)}>
                System Overview
              </Link>
              <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={styles.logoutButton}>
                <Icon name="logout" className="h-4 w-4" />
                {isLoggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <header className={`admin-portal-header${isDashboard ? " admin-dashboard-header" : ""} fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0]`}>
      <div className="h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-6">
          <OporaLogo
            size="md"
            subtitle="ADMINISTRATION"
            href="/admin"
            priority
          />

          {/* Desktop Navigation */}
          <nav
            aria-label="Admin Navigation"
            className="hidden lg:flex items-center gap-1 font-['Inter'] text-sm"
          >
            <Link
              href="/admin"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                pathname === "/admin"
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/admin/patients"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/admin/patients")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Patients
            </Link>

            <Link
              href="/admin/hcps"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/admin/hcps")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Professionals
            </Link>

            <Link
              href="/admin/diseases"
              className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                isRouteActive("/admin/diseases")
                  ? "text-[#6F1D35] bg-[#EADDE0]/40 font-bold"
                  : "text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1]"
              }`}
            >
              Diseases
            </Link>
          </nav>
        </div>

        {/* Right: User Menu & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div ref={userMenuRef} className="relative pl-1 border-l border-[#EADDE0]">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#F6F3F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35]"
            >
              <div className="w-8 h-8 rounded-full bg-[#520420] flex items-center justify-center text-white font-['Manrope'] font-bold text-xs shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "A"}
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
                    href="/admin"
                    className="block px-4 py-2 text-xs md:text-sm font-medium text-[#544245] hover:bg-[#F6F3F1] hover:text-[#1B1C1B] transition-colors"
                  >
                    System Overview
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
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open mobile navigation menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="admin-mobile-navigation-drawer"
            aria-haspopup="dialog"
            className="lg:hidden p-2 rounded-lg text-[#544245] hover:text-[#1B1C1B] hover:bg-[#F6F3F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F1D35]"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>
        </div>
      </div>

    </header>

      {/* Sibling of the filtered header so fixed positioning spans the viewport. */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close mobile navigation menu"
            className="absolute inset-0 h-full w-full cursor-default bg-[#30302F]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div id="admin-mobile-navigation-drawer" role="dialog" aria-modal="true" aria-label="Admin mobile navigation" className="absolute inset-y-0 right-0 z-10 w-80 max-w-[85vw] bg-[#FCF9F7] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto overscroll-contain animate-in slide-in-from-right duration-200 border-l border-[#EADDE0]">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADDE0]">
                <OporaLogo size="sm" subtitle="ADMIN" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close navigation"
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

              <nav className="space-y-2 font-['Inter']">
                <Link
                  href="/admin"
                  className={`block px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    pathname === "/admin"
                      ? "bg-[#6F1D35] text-white"
                      : "text-[#544245] hover:bg-[#F6F3F1]"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/patients"
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRouteActive("/admin/patients")
                      ? "bg-[#EADDE0] text-[#6F1D35] font-semibold"
                      : "text-[#544245] hover:bg-[#F6F3F1]"
                  }`}
                >
                  Patients
                </Link>
                <Link
                  href="/admin/hcps"
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRouteActive("/admin/hcps")
                      ? "bg-[#EADDE0] text-[#6F1D35] font-semibold"
                      : "text-[#544245] hover:bg-[#F6F3F1]"
                  }`}
                >
                  Professionals
                </Link>
                <Link
                  href="/admin/diseases"
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRouteActive("/admin/diseases")
                      ? "bg-[#EADDE0] text-[#6F1D35] font-semibold"
                      : "text-[#544245] hover:bg-[#F6F3F1]"
                  }`}
                >
                  Diseases
                </Link>
              </nav>
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

export function AdminFooter({ photoCredit }: {
  photoCredit: { photographerName: string; photographerProfileUrl: string; sourcePhotoUrl: string } | null;
}) {
  const currentYear = new Date().getFullYear();
  return (
    <>
    <footer className="admin-mobile-footer w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 mt-16 text-[#544245] font-['Inter'] text-xs">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OporaLogo size="sm" showText={false} />
          <span className="font-['Manrope'] text-sm font-bold text-[#6F1D35]">
            OPORA
          </span>
          <span className="text-[#8A737A]">|</span>
          <span>System Administration &amp; Clinical Management Console</span>
        </div>
        <div className="flex items-center gap-4 text-[#8A737A]">
          <span>© {currentYear} OPORA. All rights reserved.</span>
        </div>
      </div>
    </footer>
    <footer className={styles.desktopFooter}>
      {photoCredit && (
        <aside className={styles.desktopPhotoCredit} aria-label="Photo attribution">
          Photo by{" "}
          <a href={buildUnsplashReferralUrl(photoCredit.photographerProfileUrl)} target="_blank" rel="noreferrer">{photoCredit.photographerName}</a>
          {" · "}
          <a href={buildUnsplashReferralUrl(photoCredit.sourcePhotoUrl)} target="_blank" rel="noreferrer">Unsplash</a>
        </aside>
      )}
      <div className={styles.footerCapsule}>
        <span className={styles.footerBrand}><span className={styles.footerDot} aria-hidden="true" />OPORA Administration Console</span>
        <span>© {currentYear} OPORA. All rights reserved.</span>
      </div>
    </footer>
    </>
  );
}
