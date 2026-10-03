/** The ten preset project colours (stored by name); a custom colour is stored as #rrggbb. */
export const PROJECT_PALETTE = {
  green: "#10b981",
  teal: "#14b8a6",
  blue: "#0ea5e9",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  pink: "#ec4899",
  red: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  gray: "#a1a1aa",
} as const;
export type ProjectColor = keyof typeof PROJECT_PALETTE;

const HEX = /^#[0-9a-f]{6}$/i;

/** Hex value for a stored project colour (preset name or custom #rrggbb). */
export function projectColorHex(color: string | null | undefined) {
  if (!color) return PROJECT_PALETTE.gray;
  if (HEX.test(color)) return color.toLowerCase();
  return PROJECT_PALETTE[color as ProjectColor] ?? PROJECT_PALETTE.gray;
}

/** Normalises user input to something we store: a preset name or #rrggbb; otherwise null. */
export function parseProjectColor(value: string, custom?: string) {
  if (value === "custom" && custom && HEX.test(custom)) return custom.toLowerCase();
  if (value in PROJECT_PALETTE) return value;
  if (HEX.test(value)) return value.toLowerCase();
  return null;
}
