// Which files may be attached (tasks). Shared by the browser (before upload) and the server (when the
// upload is registered); the storage bucket has the same list of content types.
// The content type is taken from the extension, never from the browser, so it cannot be faked.

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

/** Opened in the browser; everything else is always downloaded. */
const INLINE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

export function extensionOf(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? m[1] : "";
}

/** The content type to store the file with, or null when the file type is not allowed. */
export function attachmentType(name: string) {
  return ATTACHMENT_TYPES[extensionOf(name)] ?? null;
}

export const showInline = (mime: string | null | undefined) => !!mime && INLINE.has(mime);

/** For the file picker's accept attribute. */
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES)
  .map((e) => `.${e}`)
  .join(",");
