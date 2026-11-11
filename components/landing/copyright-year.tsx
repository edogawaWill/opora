"use client";

import { useEffect, useState } from "react";

const INITIAL_COPYRIGHT_YEAR = 2026;

export default function CopyrightYear() {
  const [year, setYear] = useState(INITIAL_COPYRIGHT_YEAR);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const browserYear = new Date().getFullYear();
      setYear((currentYear) => currentYear === browserYear ? currentYear : browserYear);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return year;
}
