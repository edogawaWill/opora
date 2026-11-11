"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export type TrendDay = {
  date: string;
  dayLabel: string;
  shortDayOfWeek: string;
  hasData: boolean;
  maxSeverity: number | null;
  avgSeverity: number | null;
  recordCount: number;
  symptoms: Array<{ name: string; severity: number }>;
};

export type TrendSummary = {
  totalObservations: number;
  activeDays: number;
  peakSeverity: number | null;
  averageSeverity: number | null;
  mostFrequentSymptom: string | null;
};

type Props = {
  days: TrendDay[];
  summary: TrendSummary;
  title?: string;
  subtitle?: string;
  gradientId?: string;
  showSeverityFilters?: boolean;
  showMissingAsGaps?: boolean;
  neutralScaleLabels?: boolean;
  sparseAxisLabels?: boolean;
};

type SeverityFilter = "all" | "mild" | "moderate" | "severe";

export default function SymptomTrendChart({
  days,
  summary,
  title = "14-Day Symptom Severity Trend",
  subtitle = "Symptom records from the last 14 days",
  gradientId = "oporaCurveGradient",
  showSeverityFilters = false,
  showMissingAsGaps = false,
  neutralScaleLabels = false,
  sparseAxisLabels = false,
}: Props) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const displayedDays = days.map((day) => {
    const symptoms = showSeverityFilters && severityFilter !== "all"
      ? day.symptoms.filter(({ severity }) => matchesSeverityFilter(severity, severityFilter))
      : day.symptoms;
    const severityValues = symptoms.map(({ severity }) => severity);
    const maxSeverity = severityValues.length > 0 ? Math.max(...severityValues) : null;
    const avgSeverity = severityValues.length > 0
      ? Math.round((severityValues.reduce((sum, severity) => sum + severity, 0) / severityValues.length) * 10) / 10
      : null;

    return {
      ...day,
      hasData: symptoms.length > 0,
      maxSeverity,
      avgSeverity,
      recordCount: symptoms.length,
      symptoms,
    };
  });

  const displayedSummary = showSeverityFilters && severityFilter !== "all"
    ? summarizeDays(displayedDays)
    : summary;

  // Derive date bounds
  const startDate = days.length > 0 ? days[0].dayLabel : "";
  const endDate = days.length > 0 ? days[days.length - 1].dayLabel : "";

  // Dynamic SVG parameters
  const svgWidth = 700;
  const svgHeight = 160;
  const paddingX = 30;
  const chartHeight = 120;
  const baselineY = 140;

  // Calculate points for the 14 days
  const stepX = displayedDays.length > 1 ? (svgWidth - paddingX * 2) / (displayedDays.length - 1) : 0;
  const points = displayedDays.map((day, index) => {
    const x = paddingX + index * stepX;
    // Severity scale 0 to 10
    const sev = day.maxSeverity ?? 0;
    const y = baselineY - (sev / 10) * chartHeight;
    return { x, y, day, index };
  });

  const segments = showMissingAsGaps
    ? splitIntoDataSegments(points)
    : points.length > 0 ? [points] : [];
  const pathD = segments.map(buildLinePath).join(" ");
  const areaD = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => `${buildLinePath(segment)} L ${segment[segment.length - 1].x} ${baselineY} L ${segment[0].x} ${baselineY} Z`)
    .join(" ");
  const peakIndex = points.findIndex(({ day }) => day.maxSeverity === displayedSummary.peakSeverity);

  const selectedPoint = selectedDayIndex !== null ? points[selectedDayIndex] : null;

  return (
    <div className="trend-chart-root rounded-xl bg-white p-5 md:p-6 shadow-xs border border-[#EADDE0] flex flex-col space-y-6">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F6F3F1] flex items-center justify-center text-[#6F1D35]">
              <Icon name="chart" className="w-4 h-4" />
            </div>
            <h2 className="font-['Manrope'] text-lg md:text-xl font-bold text-[#1B1C1B]">
              {title}
            </h2>
          </div>
          <p className="font-['Inter'] text-xs text-[#544245] mt-1">
            {startDate && endDate ? `${startDate} to ${endDate}` : subtitle}
          </p>
        </div>

        {showSeverityFilters ? (
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#EADDE0] bg-white/70 p-1 font-['Inter'] text-xs" role="group" aria-label="Filter symptom records by severity">
            {([
              ["all", "All"],
              ["mild", "Mild (1–3)"],
              ["moderate", "Moderate (4–6)"],
              ["severe", "Severe (7–10)"],
            ] as const).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                aria-pressed={severityFilter === filter}
                onClick={() => { setSeverityFilter(filter); setSelectedDayIndex(null); }}
                className={`rounded-full px-3 py-1.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6F1D35] ${severityFilter === filter ? "bg-[#6F1D35] text-white" : "text-[#544245] hover:bg-[#F6F3F1]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#F6F3F1] px-3 py-1.5 rounded-lg font-['Inter'] text-xs text-[#544245] self-start sm:self-auto">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EADDE0]" /><span>Mild (1–3)</span></div>
            <span className="text-[#8A737A]">•</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7E2D43]" /><span>Moderate (4–6)</span></div>
            <span className="text-[#8A737A]">•</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6F1D35]" /><span className="font-semibold text-[#1B1C1B]">Severe (7–10)</span></div>
          </div>
        )}
      </div>

      {/* SVG Telemetry Visualizer */}
      <div className="relative w-full bg-[#F6F3F1] rounded-xl p-4 sm:p-6 overflow-hidden border border-[#EADDE0]/60">
        <div className="relative h-60 w-full flex flex-col justify-between py-1 text-xs font-['Inter'] text-[#8A737A] select-none">
          {/* Grid lines */}
          <div className="absolute inset-x-0 top-3 h-px bg-[#EADDE0] flex items-center justify-between px-2">
            <span className="text-[10px] bg-[#F6F3F1] px-1 font-bold text-[#6F1D35]">
              Severe (10)
            </span>
            <span className="text-[10px] text-[#8A737A] opacity-75 hidden sm:inline">
              {neutralScaleLabels ? "Severity scale" : "High Impact"}
            </span>
          </div>

          <div className="absolute inset-x-0 top-1/2 h-px bg-[#EADDE0] flex items-center justify-between px-2">
            <span className="text-[10px] bg-[#F6F3F1] px-1 font-semibold text-[#7E2D43]">
              Moderate (5)
            </span>
            <span className="text-[10px] text-[#8A737A] opacity-75 hidden sm:inline">
              {neutralScaleLabels ? "Severity 5" : "Action Threshold"}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-6 h-px bg-[#EADDE0] flex items-center justify-between px-2">
            <span className="text-[10px] bg-[#F6F3F1] px-1 text-[#544245]">
              Mild (1)
            </span>
            <span className="text-[10px] text-[#8A737A] opacity-75 hidden sm:inline">
              {neutralScaleLabels ? "Severity 1" : "Baseline"}
            </span>
          </div>

          {/* Scalable SVG Chart */}
          <svg
            className="w-full h-44 my-auto relative z-10 overflow-visible"
            preserveAspectRatio="none"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7E2D43" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7E2D43" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Filled Area */}
            {displayedSummary.activeDays > 0 && areaD && (
              <path d={areaD} fill={`url(#${gradientId})`} />
            )}

            {/* Severity path; desktop gaps are omitted when no record exists for a day. */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={displayedSummary.activeDays > 0 ? "#6F1D35" : "#DAC0C4"}
                strokeWidth={displayedSummary.activeDays > 0 ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            )}

            {/* Individual day points */}
            {points.map((pt) => {
              const hasData = pt.day.hasData;
              const sev = pt.day.maxSeverity ?? 0;
              const isSelected = selectedDayIndex === pt.index;

              let fillColor = "#E5E2E0";
              let strokeColor = "#DAC0C4";
              if (hasData) {
                if (sev >= 7) fillColor = "#6F1D35";
                else if (sev >= 4) fillColor = "#7E2D43";
                else fillColor = "#D0C3C6";
                strokeColor = "#FFFFFF";
              }

              return (
                <g
                  key={pt.day.date}
                  className="cursor-pointer group"
                  onClick={() =>
                    setSelectedDayIndex((prev) => (prev === pt.index ? null : pt.index))
                  }
                >
                  {hasData && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 10 : 6}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                  )}
                  {!hasData && !showMissingAsGaps && (
                    <circle
                      cx={pt.x}
                      cy={baselineY}
                      r={3}
                      fill="#E5E2E0"
                      className="group-hover:fill-[#8A737A] transition-colors"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* X-Axis timeline labels */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-['Inter'] text-[#8A737A]">
            {displayedDays.map((day, idx) => {
              // Show select day labels to avoid clutter on mobile
              const isFirst = idx === 0;
              const isLast = idx === days.length - 1;
              const isMiddle = idx === 7;
              const isPeak = displayedSummary.peakSeverity !== null &&
                day.maxSeverity === displayedSummary.peakSeverity &&
                (sparseAxisLabels ? idx === peakIndex : true);

              if (isFirst || isLast || isMiddle || isPeak) {
                return (
                  <span
                    key={day.date}
                    className={`text-[10px] md:text-xs ${
                      isPeak
                        ? "font-bold text-[#6F1D35] bg-[#EADDE0] px-1.5 py-0.5 rounded"
                        : ""
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                );
              }
              return (
                <span key={day.date} className="hidden md:inline text-[10px]">
                  {day.shortDayOfWeek}
                </span>
              );
            })}
          </div>
        </div>

        {/* Selected Day Info Callout */}
        {selectedPoint && selectedPoint.day.hasData && (
          <div className="mt-3 bg-white rounded-lg p-3 shadow-xs border border-[#EADDE0] flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6F1D35]" />
              <span className="text-xs font-['Inter'] text-[#1B1C1B]">
                <strong>{selectedPoint.day.dayLabel}:</strong>{" "}
                {selectedPoint.day.symptoms.map((s) => s.name).join(", ") || "Symptoms"}{" "}
                (Max Severity: {selectedPoint.day.maxSeverity}/10, Observations:{" "}
                {selectedPoint.day.recordCount})
              </span>
            </div>
            <a
              href="#symptom-history"
              className="text-[#7E2D43] hover:text-[#6F1D35] text-xs font-['Inter'] font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Inspect log</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {showMissingAsGaps && displayedSummary.activeDays === 0 && (
        <p className="-mt-4 rounded-lg border border-dashed border-[#DCC9CE] bg-[#FCF9F7]/75 px-4 py-3 text-sm text-[#544245]" role="status">
          {showSeverityFilters && severityFilter !== "all"
            ? "No symptom records match this severity filter in the selected 14-day period."
            : "No symptom records were recorded in the selected 14-day period."}
        </p>
      )}

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#F6F3F1] rounded-xl p-3.5 flex flex-col justify-between border border-[#EADDE0]/60">
          <span className="font-['Manrope'] text-[10px] md:text-[11px] font-bold text-[#8A737A] uppercase tracking-wider">
            Peak Severity
          </span>
          <div className="mt-1">
            <p className="font-['Manrope'] text-base md:text-lg font-bold text-[#6F1D35]">
              {displayedSummary.peakSeverity !== null
                ? displayedSummary.peakSeverity >= 7
                  ? "Severe"
                  : displayedSummary.peakSeverity >= 4
                  ? "Moderate"
                  : "Mild"
                : "None"}
            </p>
            <p className="font-['Inter'] text-xs font-medium text-[#544245]">
              {displayedSummary.peakSeverity !== null ? `${displayedSummary.peakSeverity} / 10` : "No entries"}
            </p>
          </div>
        </div>

        <div className="bg-[#F6F3F1] rounded-xl p-3.5 flex flex-col justify-between border border-[#EADDE0]/60">
          <span className="font-['Manrope'] text-[10px] md:text-[11px] font-bold text-[#8A737A] uppercase tracking-wider">
            Average Severity
          </span>
          <div className="mt-1">
            <p className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
              {displayedSummary.averageSeverity !== null
                ? `${displayedSummary.averageSeverity} / 10`
                : "None"}
            </p>
            <p className="font-['Inter'] text-xs text-[#7E2D43]">
              {displayedSummary.averageSeverity !== null ? "Across recorded entries" : "No observations"}
            </p>
          </div>
        </div>

        <div className="bg-[#F6F3F1] rounded-xl p-3.5 flex flex-col justify-between border border-[#EADDE0]/60">
          <span className="font-['Manrope'] text-[10px] md:text-[11px] font-bold text-[#8A737A] uppercase tracking-wider">
            Active Days
          </span>
          <div className="mt-1">
            <p className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
              {displayedSummary.activeDays} of 14
            </p>
            <p className="font-['Inter'] text-xs text-[#544245]">
              {((displayedSummary.activeDays / 14) * 100).toFixed(1)}% frequency
            </p>
          </div>
        </div>

        <div className="bg-[#F6F3F1] rounded-xl p-3.5 flex flex-col justify-between border border-[#EADDE0]/60">
          <span className="font-['Manrope'] text-[10px] md:text-[11px] font-bold text-[#8A737A] uppercase tracking-wider">
            Frequent Symptom
          </span>
          <div className="mt-1">
            <p
              className="font-['Manrope'] text-base md:text-lg font-bold text-[#6F1D35] truncate"
              title={displayedSummary.mostFrequentSymptom ?? "None"}
            >
              {displayedSummary.mostFrequentSymptom ?? "None"}
            </p>
            <p className="font-['Inter'] text-xs text-[#544245]">
              {displayedSummary.totalObservations > 0
                ? `${displayedSummary.totalObservations} total logs`
                : "No logs logged"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type TrendPoint = { x: number; y: number; day: TrendDay; index: number };

function matchesSeverityFilter(severity: number, filter: SeverityFilter) {
  if (filter === "mild") return severity >= 1 && severity <= 3;
  if (filter === "moderate") return severity >= 4 && severity <= 6;
  if (filter === "severe") return severity >= 7 && severity <= 10;
  return true;
}

function summarizeDays(days: TrendDay[]): TrendSummary {
  const severityValues = days.flatMap((day) => day.symptoms.map(({ severity }) => severity));
  const peakSeverity = severityValues.length > 0 ? Math.max(...severityValues) : null;
  const averageSeverity = severityValues.length > 0
    ? Math.round((severityValues.reduce((sum, severity) => sum + severity, 0) / severityValues.length) * 10) / 10
    : null;
  const frequencies = new Map<string, number>();
  for (const day of days) {
    for (const symptom of day.symptoms) {
      frequencies.set(symptom.name, (frequencies.get(symptom.name) ?? 0) + 1);
    }
  }
  const mostFrequentSymptom = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  return {
    totalObservations: severityValues.length,
    activeDays: days.filter((day) => day.hasData).length,
    peakSeverity,
    averageSeverity,
    mostFrequentSymptom,
  };
}

function splitIntoDataSegments(points: TrendPoint[]) {
  const segments: TrendPoint[][] = [];
  let current: TrendPoint[] = [];

  for (const point of points) {
    if (point.day.hasData) {
      current.push(point);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length > 0) segments.push(current);
  return segments;
}

function buildLinePath(segment: TrendPoint[]) {
  if (segment.length === 0) return "";
  let path = `M ${segment[0].x} ${segment[0].y}`;
  for (let index = 1; index < segment.length; index += 1) {
    const previous = segment[index - 1];
    const current = segment[index];
    const middleX = (previous.x + current.x) / 2;
    path += ` C ${middleX} ${previous.y}, ${middleX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}
