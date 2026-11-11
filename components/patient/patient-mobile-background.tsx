"use client";

import { usePathname } from "next/navigation";

import {
  getPatientMobileBackground,
  type PatientMobilePageGroup,
} from "@/lib/patient-mobile-backgrounds";
import {
  buildUnsplashReferralUrl,
  getPatientDesktopBackgroundPresentation,
  getPatientMobilePageGroupForPath,
  getPatientMobileBackgroundPresentation,
} from "@/lib/patient-mobile-background-utils.mjs";

export function PatientMobileBackground() {
  const pathname = usePathname();
  const photo = getPhotoForPath(pathname);
  const presentation = getPatientMobileBackgroundPresentation(photo);

  return <div className="patient-mobile-background" aria-hidden="true" style={{ backgroundImage: presentation.backgroundImage, backgroundPosition: presentation.backgroundPosition }} />;
}

export function PatientMobilePhotoCredit() {
  const pathname = usePathname();
  const photo = getPhotoForPath(pathname);
  if (!photo) return null;

  return (
    <aside className="patient-mobile-attribution" aria-label="Photo attribution">
      Photo by <a href={buildUnsplashReferralUrl(photo.photographerProfileUrl)} target="_blank" rel="noreferrer">{photo.photographerName}</a>
      {" · "}
      <a href={buildUnsplashReferralUrl(photo.sourcePhotoUrl)} target="_blank" rel="noreferrer">Unsplash</a>
    </aside>
  );
}

const patientDesktopPhoto = getPatientMobileBackground("assessment-history");
const patientDesktopPresentation = getPatientDesktopBackgroundPresentation(patientDesktopPhoto);

export function PatientDesktopBackground() {
  return (
    <div
      className="patient-desktop-background"
      aria-hidden="true"
      style={{
        backgroundImage: patientDesktopPresentation.backgroundImage,
        backgroundPosition: patientDesktopPresentation.backgroundPosition,
      }}
    />
  );
}

export function PatientDesktopPhotoCredit() {
  if (!patientDesktopPhoto) return null;

  return (
    <aside className="patient-desktop-attribution" aria-label="Photo attribution">
      Photo by <a href={buildUnsplashReferralUrl(patientDesktopPhoto.photographerProfileUrl)} target="_blank" rel="noreferrer">{patientDesktopPhoto.photographerName}</a>
      {" · "}
      <a href={buildUnsplashReferralUrl(patientDesktopPhoto.sourcePhotoUrl)} target="_blank" rel="noreferrer">Unsplash</a>
    </aside>
  );
}

function getPhotoForPath(pathname: string | null) {
  const pageGroup = getPatientMobilePageGroupForPath(pathname) as PatientMobilePageGroup | null;
  return pageGroup ? getPatientMobileBackground(pageGroup) : undefined;
}
