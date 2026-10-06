"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_ACCEPT, attachmentType, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";
import { registerAttachment } from "../actions";


function safeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-120);
  return cleaned || "fil";
}

export function AttachmentUpload({
  workspaceId,
  taskId,
  t,
}: {
  workspaceId: string;
  taskId: string;
  t: { upload: string; uploading: string; maxSize: string; tooLarge: string; uploadFailed: string; notAllowed: string; allowed: string };
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const problems: string[] = [];
    const storage = createClient().storage.from("attachments");
    for (const file of Array.from(files)) {
      const type = attachmentType(file.name);
      if (!type) {
        problems.push(t.notAllowed.replace("{name}", file.name));
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        problems.push(t.tooLarge.replace("{name}", file.name));
        continue;
      }
      const path = `${workspaceId}/tasks/${taskId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error } = await storage.upload(path, file, { contentType: type, upsert: false });
      if (error) {
        problems.push(t.uploadFailed.replace("{name}", file.name));
        continue;
      }
      const res = await registerAttachment({ taskId, path, name: file.name, size: file.size });
      if (res.error) problems.push(t.uploadFailed.replace("{name}", file.name));
    }
    setErrors(problems);
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted hover:border-brand hover:text-brand ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <span aria-hidden>📎</span>
        {busy ? t.uploading : t.upload}
        <input
          ref={input}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          onChange={(e) => void onFiles(e.currentTarget.files)}
          disabled={busy}
        />
      </label>
      <p className="text-xs text-muted">
        {t.maxSize} {t.allowed}
      </p>
      {errors.map((e) => (
        <Notice key={e} tone="error">
          {e}
        </Notice>
      ))}
    </div>
  );
}
