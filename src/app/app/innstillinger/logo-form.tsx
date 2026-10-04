"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { setWorkspaceLogo } from "./actions";

export type LogoTexts = {
  intro: string;
  upload: string;
  replace: string;
  remove: string;
  uploading: string;
  saved: string;
  removed: string;
  tooBig: string;
  badType: string;
  failed: string;
};

// PNG and JPG only: those can also be embedded in the quote PDF.
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };

/** Upload/replace/remove the company logo (owners and admins). */
export function LogoForm({ workspaceId, current, t }: { workspaceId: string; current: string | null; t: LogoTexts }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const toasts = useToast();

  function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError(t.badType);
    if (file.size > 1024 * 1024) return setError(t.tooBig);
    start(async () => {
      const path = `${workspaceId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("logos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) return setError(t.failed);
      const res = await setWorkspaceLogo(path);
      if (!res.ok) return setError(t.failed);
      setPreview(URL.createObjectURL(file));
      toasts?.toast(t.saved);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t.intro}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-40 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-white p-2">
          {preview ? (
            <Image src={preview} alt="" width={160} height={64} unoptimized style={{ width: "auto", height: "auto" }} className="max-h-12 w-auto object-contain" />
          ) : (
            <span className="text-xs text-zinc-400">Logo</span>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t.uploading : preview ? t.replace : t.upload}
        </Button>
        {preview && !busy && (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              start(async () => {
                const res = await setWorkspaceLogo(null);
                if (!res.ok) return setError(t.failed);
                setPreview(null);
                toasts?.toast(t.removed);
              })
            }
          >
            {t.remove}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
