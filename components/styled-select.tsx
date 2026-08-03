"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export interface StyledSelectOption<T extends string> {
  value: T;
  label: string;
}

export function StyledSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
}: {
  value: T;
  options: readonly StyledSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function select(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) select(activeIndex);
      else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) =>
        (current + direction + options.length) % options.length,
      );
    }
  }

  const selected = options[selectedIndex];
  return (
    <div
      className={`styled-select${open ? " is-open" : ""}${compact ? " is-compact" : ""}`}
      ref={rootRef}
    >
      <button
        className="styled-select-trigger"
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label}</span>
        <span className="styled-select-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="styled-select-menu" id={`${id}-listbox`} role="listbox">
          {options.map((option, index) => (
            <li
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              key={option.value}
            >
              <button
                className={index === activeIndex ? "is-active" : ""}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(index)}
              >
                <span>{option.label}</span>
                {option.value === value ? <span aria-hidden="true">✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
