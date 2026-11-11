"use client";

import { usePathname } from "next/navigation";

import {
  getHcpMobileBackground,
  type HcpMobilePageGroup,
} from "@/lib/patient-mobile-backgrounds";
import {
  buildUnsplashReferralUrl,
  getHcpMobilePageGroupForPath,
  getPatientMobileBackgroundPresentation,
  getPatientDesktopBackgroundPresentation,
} from "@/lib/patient-mobile-background-utils.mjs";
import styles from "@/components/hcp/hcp-desktop.module.css";

function getPhotoForPath(pathname: string | null) {
  const pageGroup = getHcpMobilePageGroupForPath(pathname) as HcpMobilePageGroup | null;
  return pageGroup ? getHcpMobileBackground(pageGroup) : undefined;
}

export function HcpMobileBackground() {
  const photo = getPhotoForPath(usePathname());
  const presentation = getPatientMobileBackgroundPresentation(photo);

  return (
    <div
      className="hcp-mobile-background"
      aria-hidden="true"
      style={{
        backgroundImage: presentation.backgroundImage,
        backgroundPosition: presentation.backgroundPosition,
      }}
    />
  );
}

export function HcpDesktopBackground() {
  const pathname = usePathname();
  const photo = getPhotoForPath(pathname);
  if (!photo) return null;
  const presentation = getPatientDesktopBackgroundPresentation(photo);

  return (
    <div
      className={styles.desktopBackground}
      aria-hidden="true"
      style={{
        backgroundImage: presentation.backgroundImage,
        backgroundPosition: presentation.backgroundPosition,
      }}
    />
  );
}

export function HcpMobilePhotoCredit() {
  const photo = getPhotoForPath(usePathname());
  if (!photo) return null;

  return (
    <aside className="hcp-mobile-attribution" aria-label="Photo attribution">
      Photo by{" "}
      <a href={buildUnsplashReferralUrl(photo.photographerProfileUrl)} target="_blank" rel="noreferrer">
        {photo.photographerName}
      </a>
      {" · "}
      <a href={buildUnsplashReferralUrl(photo.sourcePhotoUrl)} target="_blank" rel="noreferrer">
        Unsplash
      </a>
    </aside>
  );
}

export function HcpDesktopPhotoCredit() {
  const pathname = usePathname();
  const photo = getPhotoForPath(pathname);
  if (!photo) return null;

  return (
    <aside className="hcp-mobile-attribution" aria-label="Photo attribution">
      Photo by{" "}
      <a href={buildUnsplashReferralUrl(photo.photographerProfileUrl)} target="_blank" rel="noreferrer">
        {photo.photographerName}
      </a>
      {" · "}
      <a href={buildUnsplashReferralUrl(photo.sourcePhotoUrl)} target="_blank" rel="noreferrer">
        Unsplash
      </a>
    </aside>
  );
}
