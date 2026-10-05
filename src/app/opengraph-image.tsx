import { ImageResponse } from "next/og";

/** The picture shown when a link to allseats.no is shared (Facebook, LinkedIn, Messenger, Slack …). */
export const alt = "AllSeats CRM – CRM for hele bedriften til én fast pris";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const seats = Array.from({ length: 24 }, (_, i) => i);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#12392c",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#3fb68b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "#12392c",
            }}
          >
            A
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>AllSeats CRM</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 900 }}>
            CRM for hele bedriften – én fast pris
          </div>
          <div style={{ fontSize: 32, color: "#b9dccd", maxWidth: 900 }}>
            Alle brukere inkludert. Ingen pris per bruker.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {seats.map((i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: i < 18 ? "#3fb68b" : "#2a5a48" }} />
            ))}
          </div>
          <div style={{ fontSize: 28, color: "#b9dccd" }}>allseats.no</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
