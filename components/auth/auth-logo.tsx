"use client";

import Image from "next/image";
import { useRef, type MouseEvent } from "react";

type AuthLogoProps = {
  adminLoginDiscovery: boolean;
};

const CLICK_GAP_MS = 1500;

export default function AuthLogo({ adminLoginDiscovery }: AuthLogoProps) {
  const clickCount = useRef(0);
  const lastClickAt = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!adminLoginDiscovery) return;
    event.preventDefault();

    const now = Date.now();
    if (now - lastClickAt.current > CLICK_GAP_MS) clickCount.current = 0;
    lastClickAt.current = now;

    if (resetTimer.current) clearTimeout(resetTimer.current);
    clickCount.current += 1;

    if (clickCount.current >= 7) {
      clickCount.current = 0;
      lastClickAt.current = 0;
      resetTimer.current = null;
      window.dispatchEvent(new Event("opora:show-admin-login"));
      return;
    }

    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
      lastClickAt.current = 0;
      resetTimer.current = null;
    }, CLICK_GAP_MS);
  }

  return (
    <a
      href="/login"
      onClick={handleClick}
      aria-label="OPORA login page"
      className="flex w-fit items-center gap-3"
    >
      <Image
        src="/images/opora-logo.png"
        alt=""
        width={48}
        height={40}
        priority
        className="h-10 w-12 shrink-0 object-contain"
      />
      <span className="text-2xl font-extrabold tracking-[0.08em] text-[#4A1525]">
        OPORA
      </span>
    </a>
  );
}
