"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import { filterSymptoms, formatSymptomChoice } from "@/lib/symptom-search.mjs";

export type SymptomChoice = {
  symptomID: number;
  symptomName: string;
  bodyPart: string;
};

export default function SymptomCombobox({
  symptoms,
  defaultSymptomID = null,
  name = "symptomID",
}: {
  symptoms: SymptomChoice[];
  defaultSymptomID?: number | null;
  name?: string;
}) {
  const id = useId();
  const inputId = `symptom-search-${id}`;
  const listboxId = `symptom-options-${id}`;
  const [selectedSymptomId, setSelectedSymptomId] = useState<number | null>(defaultSymptomID);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedSymptom = symptoms.find((symptom) => symptom.symptomID === selectedSymptomId);
  const filteredSymptoms = filterSymptoms(symptoms, searchQuery);

  function selectSymptom(symptom: SymptomChoice) {
    setSelectedSymptomId(symptom.symptomID);
    setSearchQuery("");
    setIsListOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isListOpen) {
        setSearchQuery("");
        setIsListOpen(true);
        setActiveIndex(0);
      } else if (filteredSymptoms.length > 0) {
        setActiveIndex((index) => Math.min(index + 1, filteredSymptoms.length - 1));
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isListOpen) {
        setSearchQuery("");
        setIsListOpen(true);
        setActiveIndex(Math.max(filteredSymptoms.length - 1, 0));
      } else if (filteredSymptoms.length > 0) {
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
    } else if (event.key === "Enter" && isListOpen) {
      event.preventDefault();
      if (filteredSymptoms.length > 0) {
        selectSymptom(filteredSymptoms[activeIndex] ?? filteredSymptoms[0]);
      }
    } else if (event.key === "Escape" && isListOpen) {
      event.preventDefault();
      setIsListOpen(false);
      setSearchQuery("");
      setActiveIndex(0);
    }
  }

  function keepComboboxFocus(event: MouseEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  return (
    <div
      className="space-y-2"
      onReset={() => {
        setSelectedSymptomId(defaultSymptomID);
        setSearchQuery("");
        setIsListOpen(false);
        setActiveIndex(0);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsListOpen(false);
          setSearchQuery("");
        }
      }}
    >
      <label htmlFor={inputId} className="block text-sm font-semibold text-[#4D303A]">Symptom</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isListOpen}
        aria-controls={listboxId}
        aria-activedescendant={isListOpen && filteredSymptoms[activeIndex]
          ? `${listboxId}-option-${filteredSymptoms[activeIndex].symptomID}`
          : undefined}
        aria-describedby={`${inputId}-help`}
        autoComplete="off"
        required={!selectedSymptom}
        value={isListOpen ? searchQuery : selectedSymptom ? formatSymptomChoice(selectedSymptom) : searchQuery}
        placeholder="Search symptoms by name or body area"
        onFocus={() => {
          if (!isListOpen) {
            setSearchQuery("");
            setIsListOpen(true);
            setActiveIndex(0);
          }
        }}
        onChange={(event) => {
          setSelectedSymptomId(null);
          setSearchQuery(event.currentTarget.value);
          setActiveIndex(0);
          setIsListOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-[#DCC9CE] bg-white px-4 py-3 text-sm text-[#35101F] outline-none focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
      />
      <input type="hidden" name={name} value={selectedSymptom ? selectedSymptom.symptomID : ""} />
      <p id={`${inputId}-help`} className="text-xs text-[#806771]">
        {selectedSymptom
          ? `Selected: ${formatSymptomChoice(selectedSymptom)}. Type to change it, or press Escape to keep it.`
          : "Type to search, then use the arrow keys and Enter to select a symptom."}
      </p>
      {isListOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Matching symptoms"
          className="max-h-60 overflow-y-auto rounded-xl border border-[#DCC9CE] bg-white py-1 shadow-lg"
        >
          {filteredSymptoms.length > 0 ? filteredSymptoms.map((symptom, index) => (
            <li
              key={symptom.symptomID}
              id={`${listboxId}-option-${symptom.symptomID}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={keepComboboxFocus}
              onClick={() => selectSymptom(symptom)}
              className={`cursor-pointer px-4 py-3 text-sm text-[#35101F] ${index === activeIndex ? "bg-[#F8ECEF]" : "hover:bg-[#FBF6F7]"}`}
            >
              {formatSymptomChoice(symptom)}
            </li>
          )) : (
            <li role="presentation" className="px-4 py-3 text-sm text-[#806771]" aria-live="polite">
              No matching symptoms found
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
