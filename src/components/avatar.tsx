/** Initials in a coloured circle; the colour is derived from the name so a person always gets the same one. */
export function initialsOf(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

const SIZES = { xs: "h-5 w-5 text-[8px]", sm: "h-6 w-6 text-[9px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-lg" };

export function Avatar({
  name,
  size = "sm",
  className = "",
  title,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={`avatar inline-grid shrink-0 place-items-center rounded-full font-semibold ${SIZES[size]} ${className}`}
      style={{ ["--h" as string]: hue(name) }}
    >
      {initialsOf(name)}
    </span>
  );
}
