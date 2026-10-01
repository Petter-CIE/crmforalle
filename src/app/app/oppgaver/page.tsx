import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Oppgaver" };

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Oppgaver</h1>
      <Card>
        <p className="text-sm text-muted">Oppgaver og påminnelser kommer i neste fase.</p>
      </Card>
    </div>
  );
}
