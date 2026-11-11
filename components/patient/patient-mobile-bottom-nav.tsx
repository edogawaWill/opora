"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

type Destination = "home" | "symptoms" | "trends" | "care" | "profile";

const destinations: Array<{
  key: Destination;
  label: string;
  href: string;
  icon: "dashboard" | "symptom" | "chart" | "hcp" | "profile";
}> = [
  { key: "home", label: "Home", href: "/patient", icon: "dashboard" },
  { key: "symptoms", label: "Symptoms", href: "/patient#mobile-record-symptom", icon: "symptom" },
  { key: "trends", label: "Trends", href: "/patient#mobile-symptom-trends", icon: "chart" },
  { key: "care", label: "Care", href: "/patient/appointments", icon: "hcp" },
  { key: "profile", label: "Profile", href: "/patient/profile", icon: "profile" },
];

export function PatientMobileBottomNav() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<"symptoms" | "trends" | null>(null);

  useEffect(() => {
    function syncSectionFromLocation() {
      const hash = window.location.hash;
      setActiveSection(
        hash === "#mobile-record-symptom"
          ? "symptoms"
          : hash === "#mobile-symptom-trends"
            ? "trends"
            : null,
      );
    }

    syncSectionFromLocation();
    window.addEventListener("hashchange", syncSectionFromLocation);
    window.addEventListener("popstate", syncSectionFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncSectionFromLocation);
      window.removeEventListener("popstate", syncSectionFromLocation);
    };
  }, [pathname]);

  const activeDestination = getActiveDestination(pathname, activeSection);

  return (
    <nav className="patient-mobile-nav fixed inset-x-4 bottom-3 z-[35] grid w-auto grid-cols-5 items-center gap-1 px-2 py-2 lg:hidden" aria-label="Patient shortcuts">
      {destinations.map((destination) => {
        const isActive = destination.key === activeDestination;
        return (
          <Link
            key={destination.key}
            href={destination.href}
            aria-current={isActive
              ? pathname === "/patient" && (destination.key === "symptoms" || destination.key === "trends")
                ? "location"
                : "page"
              : undefined}
            data-active={isActive ? "true" : "false"}
            onClick={() => {
              setActiveSection(
                destination.key === "symptoms" || destination.key === "trends"
                  ? destination.key
                  : null,
              );
            }}
            className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] font-semibold leading-tight text-[#65717C] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
          >
            <Icon name={destination.icon} className="h-5 w-5" />
            <span className={isActive ? "font-bold text-[#6F1D35]" : "text-[#65717C]"}>
              {destination.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function getActiveDestination(
  pathname: string,
  activeSection: "symptoms" | "trends" | null,
): Destination | null {
  if (pathname === "/patient") return activeSection ?? "home";
  if (pathname.startsWith("/patient/profile")) return "profile";
  if (pathname.startsWith("/patient/appointments") || pathname.startsWith("/patient/messages")) {
    return "care";
  }
  if (pathname.startsWith("/patient/history") || pathname.startsWith("/patient/assessment")) {
    return "symptoms";
  }
  return null;
}
