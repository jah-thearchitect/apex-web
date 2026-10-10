import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share image: the hero, simplified. Ink background, platinum glow, gold
// brand box. System serif keeps it dependency-free.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "radial-gradient(circle at 80% 15%, rgba(169,196,214,0.28), #0A0B0D 60%)",
          color: "#EDEEEC",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ border: "2px solid rgba(180,134,60,0.6)", padding: "8px 22px", fontSize: 40 }}>Apex</div>
          <div style={{ fontSize: 20, letterSpacing: 5, color: "#9CA0A0" }}>BRAND MANAGEMENT FIRM</div>
        </div>
        <div style={{ display: "flex", fontSize: 108, lineHeight: 1.02 }}>
          Start. Expand.&nbsp;<span style={{ color: "#D8B268", fontStyle: "italic" }}>Profit.</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9CA0A0" }}>We build brands that make money.</div>
      </div>
    ),
    size
  );
}
