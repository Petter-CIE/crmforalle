import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Kontakter" };

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Kontakter</h1>
      <Card>
        <p className="text-sm text-muted">Kontaktpersoner kommer i neste fase.</p>
      </Card>
    </div>
  );
}
