import { projectColorHex } from "@/lib/colors";

/** Small coloured circle for a project. */
export function ProjectDot({ color, className = "h-2 w-2" }: { color: string | null | undefined; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: projectColorHex(color) }} />;
}
