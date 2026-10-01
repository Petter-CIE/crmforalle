import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Salg" };

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Salg</h1>
      <Card>
        <p className="text-sm text-muted">Salgstrakten med kanban kommer i neste fase.</p>
      </Card>
    </div>
  );
}
