import { useId } from "react";

// The Apex mark: a faceted peak split down the middle (left half neutral,
// right half gold) with an upward-arrow notch, and two smaller peaks behind.
// "dark" is for the site's ink background (left half lifts to platinum);
// "light" is black + gold for white backgrounds (emails, reports, print).
const TONES = {
  dark: {
    side: ["#3A3F47", "#4A5059", "#2A2E35"],
    left: ["#C9CBC7", "#9CA0A0", "#EDEEEC", "#B4B7B4"],
  },
  light: {
    side: ["#1C1F24", "#2E3238", "#111316"],
    left: ["#23272D", "#0A0B0D", "#3A3F47", "#15171B"],
  },
} as const;
const GOLD = ["#B4863C", "#D8B268", "#8A6220", "#C39A4E"];

export function LogoMark({
  tone = "dark",
  width = 44,
  className,
  title,
}: {
  tone?: keyof typeof TONES;
  width?: number;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const t = TONES[tone];
  const c = (name: string) => `${id}-${name}`;

  return (
    <svg
      viewBox="0 0 200 130"
      width={width}
      height={Math.round((width * 130) / 200)}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={c("l")}><polygon points="100,8 38,124 94,124 94,96 84,96 100,74" /></clipPath>
        <clipPath id={c("r")}><polygon points="100,8 162,124 106,124 106,96 116,96 100,74" /></clipPath>
        <clipPath id={c("sl")}><polygon points="50,58 14,124 74,124" /></clipPath>
        <clipPath id={c("sr")}><polygon points="150,58 126,124 186,124" /></clipPath>
      </defs>
      <g clipPath={`url(#${c("sl")})`}>
        <rect width="200" height="130" fill={t.side[0]} />
        <polygon points="50,58 14,124 44,124" fill={t.side[1]} />
        <polygon points="50,58 44,124 74,124" fill={t.side[2]} />
      </g>
      <g clipPath={`url(#${c("sr")})`}>
        <rect width="200" height="130" fill={t.side[0]} />
        <polygon points="150,58 186,124 160,124" fill={t.side[1]} />
        <polygon points="150,58 126,124 150,124" fill={t.side[2]} />
      </g>
      <g clipPath={`url(#${c("l")})`}>
        <rect width="200" height="130" fill={t.left[0]} />
        <polygon points="100,8 38,124 70,124" fill={t.left[1]} />
        <polygon points="100,8 70,124 100,124 100,60" fill={t.left[2]} />
        <polygon points="100,60 80,100 100,124" fill={t.left[3]} />
      </g>
      <g clipPath={`url(#${c("r")})`}>
        <rect width="200" height="130" fill={GOLD[0]} />
        <polygon points="100,8 100,60 128,124 162,124" fill={GOLD[1]} />
        <polygon points="100,60 120,100 100,124" fill={GOLD[2]} />
        <polygon points="128,124 162,124 140,90" fill={GOLD[3]} />
      </g>
    </svg>
  );
}
