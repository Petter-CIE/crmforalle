export const PROJECT_COLORS = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  purple: "bg-violet-500",
  gray: "bg-zinc-400",
} as const;
export type ProjectColor = keyof typeof PROJECT_COLORS;
