"use client";

import { useState } from "react";
import { PROJECT_PALETTE, projectColorHex } from "@/lib/colors";

/** Ten preset colours plus a custom colour. Posts `color` (preset name or "custom") and `custom_color`. */
export function ColorPicker({ initial, legend, customLabel }: { initial: string; legend: string; customLabel: string }) {
  const isPreset = initial in PROJECT_PALETTE;
  const [selected, setSelected] = useState(isPreset ? initial : "custom");
  const [custom, setCustom] = useState(isPreset ? "#0f766e" : projectColorHex(initial));

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(PROJECT_PALETTE).map(([key, hex]) => (
          <label key={key} className="cursor-pointer" title={key}>
            <input
              type="radio"
              name="color"
              value={key}
              checked={selected === key}
              onChange={() => setSelected(key)}
              className="peer sr-only"
            />
            <span
              className="block h-7 w-7 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2"
              style={{ backgroundColor: hex }}
            />
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-3 text-sm">
          <input
            type="radio"
            name="color"
            value="custom"
            checked={selected === "custom"}
            onChange={() => setSelected("custom")}
            className="peer sr-only"
          />
          <span className="relative block h-7 w-7 overflow-hidden rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2">
            <input
              type="color"
              name="custom_color"
              value={custom}
              aria-label={customLabel}
              onChange={(e) => {
                setCustom(e.target.value);
                setSelected("custom");
              }}
              className="absolute -inset-2 h-12 w-12 cursor-pointer border-0 p-0"
            />
          </span>
          {customLabel}
        </label>
      </div>
    </fieldset>
  );
}
