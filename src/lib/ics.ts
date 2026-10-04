// Small iCalendar (RFC 5545) helpers for calendar feeds and meeting invitations.

/** Escapes text values: backslash, semicolon, comma and new lines. */
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** UTC timestamp in the basic format, e.g. 20261004T120000Z. */
export const icsStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Lines longer than 75 octets are folded, as the format requires. */
export function icsFold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** One event as a complete .ics file (for e-mail attachments and downloads). */
export function icsEvent(e: {
  uid: string;
  start: string;
  end: string;
  title: string;
  description?: string;
  location?: string | null;
  organizer?: { name: string; email: string };
  url?: string;
  cancelled?: boolean;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AllSeats CRM//Booking//NO",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(e.end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    ...(e.organizer ? [`ORGANIZER;CN=${icsEscape(e.organizer.name)}:mailto:${e.organizer.email}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
