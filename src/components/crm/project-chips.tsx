import Link from "next/link";
import { ProjectDot } from "@/components/crm/project-dot";
import { } from "@/lib/crm";

type Project = { id: string; name: string; color: string };

/** Small coloured project labels; each one filters the list by that project. */
export function ProjectChips({ projects, hrefBase }: { projects: (Project | undefined)[]; hrefBase: string }) {
  const list = projects.filter((p): p is Project => !!p);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((p) => (
        <Link
          key={p.id}
          href={`${hrefBase}?prosjekt=${p.id}`}
          className="row-above inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2 py-0.5 text-xs hover:underline"
        >
          <ProjectDot color={p.color} className="h-2 w-2" />
          {p.name}
        </Link>
      ))}
    </div>
  );
}
