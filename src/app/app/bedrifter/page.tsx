import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Bedrifter" };

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bedrifter</h1>
      <Card>
        <p className="text-sm text-muted">Kunderegister med oppslag i Brønnøysundregistrene kommer i neste fase.</p>
      </Card>
    </div>
  );
}
