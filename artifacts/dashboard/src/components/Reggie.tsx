import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMatchesQuery } from "../hooks/useMatchesQuery";
import WhatsAppGlyph from "./WhatsAppGlyph";

const SHARE_MESSAGE =
  "Got a butler called Reggie handling my WhatsApp leads now. Ridiculous and brilliant. https://warmly.platespinner.studio";

// Cel-shaded editorial cartoon mascot. Hand-drawn line wobble via SVG
// turbulence; per-pose proportions and expressions per the design canvas
// spec. Exports: Reggie (full-body, pose-driven), ReggieHead (small head-
// only for inline tooltips — kept as-is for crispness at 18-24px), and
// ReggieSays which composes the figure with a speech bubble.

const INK = "#1d1a17";
const COAT = "#2b2925";
const COAT_SHADOW = "#1a1816";
const SHIRT = "#fcf8ef";
const SHIRT_SHADOW = "#e6dfce";
const GLOVE = "#fdfaf2";
const GLOVE_SHADOW = "#e2d9c5";
const SKIN = "#f3cfa8";
const SKIN_SHADOW = "#dcb088";
const HAIR = "#bdb6ad";
const HAIR_SHADOW = "#8f897f";
const BLUSH = "#e0917a";
const SILVER = "#d6d2c9";
const SILVER_SHADOW = "#a8a59c";
const TERRA = "#c96442";

export type ReggiePose =
  | "welcoming"
  | "bow"
  | "presenting"
  | "cheerful"
  | "pleading";

const POSE_FILTERS: Record<ReggiePose, { freq: number; scale: number; seed: number }> = {
  welcoming: { freq: 0.018, scale: 1.2, seed: 3 },
  pleading: { freq: 0.018, scale: 1.2, seed: 3 },
  bow: { freq: 0.022, scale: 1.4, seed: 7 },
  presenting: { freq: 0.02, scale: 1.6, seed: 11 },
  cheerful: { freq: 0.024, scale: 1.5, seed: 15 },
};

export function Reggie({
  size = 96,
  pose = "welcoming",
}: {
  size?: number;
  pose?: ReggiePose;
}) {
  const reactId = useId();
  const filterId = `reggie-wobble-${reactId.replace(/:/g, "")}`;
  const filter = POSE_FILTERS[pose];
  const renderPose = pose === "pleading" ? "welcoming" : pose;

  return (
    <svg
      viewBox="0 0 320 400"
      style={{
        display: "block",
        flexShrink: 0,
        // Sizing via CSS rather than width/height attributes so the explicit
        // size always wins (attributes can be treated as advisory in some
        // intrinsic-sizing contexts, which previously caused the SVG to fall
        // back to its 320×400 viewBox dimensions on mobile and clip the
        // head above the viewport). maxWidth: 100% + height: auto means
        // the SVG never overflows its parent and shrinks proportionally
        // via the viewBox aspect ratio.
        width: size,
        maxWidth: "100%",
        height: "auto",
        aspectRatio: "320 / 400",
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={filter.freq}
            numOctaves={2}
            seed={filter.seed}
          />
          <feDisplacementMap in="SourceGraphic" scale={filter.scale} />
        </filter>
      </defs>
      {renderPose === "welcoming" && <PoseWelcomeBody filterId={filterId} />}
      {renderPose === "bow" && <PoseBowBody filterId={filterId} />}
      {renderPose === "presenting" && <PoseTrayBody filterId={filterId} />}
      {renderPose === "cheerful" && <PoseSuccessBody filterId={filterId} />}
    </svg>
  );
}

function PoseWelcomeBody({ filterId }: { filterId: string }) {
  return (
    <>
      <ellipse cx="172" cy="378" rx="62" ry="6" fill={INK} opacity="0.12" />
      <g filter={`url(#${filterId})`}>
        <path d="M132 268 L120 372 L150 372 L154 268 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M168 268 L184 372 L210 372 L196 268 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M138 282 L132 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M188 282 L192 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="132" cy="376" rx="17" ry="6.5" fill={INK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="196" cy="376" rx="17" ry="6.5" fill={INK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="128" cy="373" rx="6" ry="2" fill={SHIRT} opacity="0.25" />
        <ellipse cx="192" cy="373" rx="6" ry="2" fill={SHIRT} opacity="0.25" />
        <path
          d="M108 168 Q102 220 116 270 L150 270 L150 220 L176 220 L176 270 L214 270 Q224 220 216 168 Q196 148 162 146 Q126 148 108 168 Z"
          fill={COAT} stroke={INK} strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M176 168 Q204 168 216 184 Q220 230 212 270 L182 270 L184 220 L176 220 Z" fill={COAT_SHADOW} opacity="0.55" />
        <path d="M116 270 Q112 322 124 360 L142 358 L144 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M214 270 Q220 322 206 360 L188 358 L184 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M150 156 L150 220 L176 220 L176 156 Z" fill={SHIRT} stroke={INK} strokeWidth="2.4" />
        <path d="M172 162 L172 218" stroke={SHIRT_SHADOW} strokeWidth="3" fill="none" />
        <circle cx="163" cy="180" r="1.6" fill={INK} />
        <circle cx="163" cy="196" r="1.6" fill={INK} />
        <circle cx="163" cy="212" r="1.6" fill={INK} />
        <path d="M190 190 L202 188 L200 202 L192 200 Z" fill={TERRA} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M112 176 Q98 216 108 256 L122 256 Q126 216 124 178 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M214 176 Q244 174 270 188 Q278 200 272 210 L260 204 Q244 192 218 196 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M142 152 L154 162 L162 158 L170 162 L182 152" fill={SHIRT} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M148 158 L158 164 L148 170 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M176 158 L166 164 L176 170 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="158" y="161" width="8" height="8" rx="1.5" fill={COAT_SHADOW} stroke={INK} strokeWidth="2" />
        <g transform="rotate(-4 162 96)">
          <ellipse cx="162" cy="96" rx="46" ry="44" fill={SKIN} stroke={INK} strokeWidth="3" />
          <path d="M166 58 Q204 76 204 100 Q198 132 166 138 Q180 124 184 102 Q184 80 166 58 Z" fill={SKIN_SHADOW} opacity="0.5" />
          <path d="M118 92 Q114 70 134 60 Q146 56 154 60 Q138 70 130 86 Q124 102 118 92 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M124 84 Q122 96 126 102" stroke={HAIR_SHADOW} strokeWidth="2" fill="none" />
          <path d="M206 92 Q210 70 190 60 Q178 56 170 60 Q186 70 194 86 Q200 102 206 92 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M200 84 Q202 96 198 102" stroke={HAIR_SHADOW} strokeWidth="2" fill="none" />
          <path d="M116 96 Q108 100 112 112 Q116 118 122 114" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M208 96 Q216 100 212 112 Q208 118 202 114" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M138 76 Q146 70 156 76" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M168 76 Q178 70 186 76" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <ellipse cx="148" cy="92" rx="4.2" ry="5" fill={SHIRT} stroke={INK} strokeWidth="2" />
          <ellipse cx="176" cy="92" rx="4.2" ry="5" fill={SHIRT} stroke={INK} strokeWidth="2" />
          <circle cx="149" cy="93" r="2.6" fill={INK} />
          <circle cx="177" cy="93" r="2.6" fill={INK} />
          <circle cx="150" cy="91.5" r="1" fill={SHIRT} />
          <circle cx="178" cy="91.5" r="1" fill={SHIRT} />
          <path d="M158 102 Q156 112 159 116 Q163 118 166 114 Q166 110 164 102" fill={SKIN_SHADOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
          <ellipse cx="128" cy="116" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <ellipse cx="196" cy="116" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <path d="M138 126 Q146 124 154 126 Q150 132 142 132 Q136 130 138 126 Z M186 126 Q178 124 170 126 Q174 132 182 132 Q188 130 186 126 Z" fill={HAIR} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M154 126 Q162 130 170 126" stroke={INK} strokeWidth="2" fill="none" />
          <path d="M138 126 Q133 122 130 126" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M186 126 Q191 122 194 126" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M150 138 Q160 144 174 140 Q170 142 162 142 Q156 142 150 138 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g transform="translate(115 260)">
          <ellipse cx="0" cy="0" rx="11" ry="11" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
          <path d="M3 -7 Q10 0 3 7" fill={GLOVE_SHADOW} opacity="0.7" />
          <path d="M-5 0 Q0 -3 5 0" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M-5 4 Q0 1 5 4" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
        <g transform="translate(278 200) rotate(15)">
          <path d="M-12 0 Q-12 -10 0 -12 Q12 -10 14 -2 Q16 8 8 12 Q-2 14 -10 8 Q-14 4 -12 0 Z" fill={GLOVE} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M-3 -10 L-3 -2 M3 -10 L3 -2 M9 -8 L9 0 M-9 -6 L-10 2" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M5 -2 Q12 2 8 10" fill={GLOVE_SHADOW} opacity="0.6" />
        </g>
      </g>
    </>
  );
}

function PoseBowBody({ filterId }: { filterId: string }) {
  return (
    <>
      <ellipse cx="172" cy="378" rx="60" ry="6" fill={INK} opacity="0.12" />
      <g filter={`url(#${filterId})`}>
        <path d="M144 282 L138 372 L162 372 L168 282 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M174 282 L184 372 L208 372 L200 282 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M152 290 L150 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M192 290 L194 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="148" cy="376" rx="17" ry="6.5" fill={INK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="196" cy="376" rx="17" ry="6.5" fill={INK} stroke={INK} strokeWidth="2.4" />
        <path
          d="M84 232 Q72 268 92 290 L138 292 L142 252 L196 244 L210 290 L246 290 Q258 246 234 208 Q198 178 144 184 Q104 192 84 232 Z"
          fill={COAT} stroke={INK} strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M84 232 Q72 268 92 290 L138 292 L142 252 L132 246 Q108 232 96 210 Z" fill={COAT_SHADOW} opacity="0.55" />
        <path d="M92 290 Q86 326 102 358 L120 354 L138 292 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M246 290 Q252 326 234 358 L216 354 L210 290 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M138 226 L168 240 L172 280 L142 278 Z" fill={SHIRT} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="156" cy="246" r="1.4" fill={INK} />
        <circle cx="158" cy="262" r="1.4" fill={INK} />
        <path d="M178 232 L188 232 L186 244 L180 242 Z" fill={TERRA} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M104 218 Q90 240 124 252 L154 244 Q140 224 122 216 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M226 220 Q244 240 210 252 L180 244 Q196 224 214 216 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <g transform="rotate(-32 152 196)">
          <path d="M132 188 L144 198 L152 194 L160 198 L172 188" fill={SHIRT} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M138 194 L148 200 L138 206 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M166 194 L156 200 L166 206 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="148" y="197" width="8" height="8" rx="1.5" fill={COAT_SHADOW} stroke={INK} strokeWidth="2" />
        </g>
        <g transform="rotate(-38 138 158)">
          <ellipse cx="138" cy="158" rx="44" ry="42" fill={SKIN} stroke={INK} strokeWidth="3" />
          <path d="M140 122 Q174 138 174 162 Q172 188 142 196 Q156 184 162 162 Q160 142 140 122 Z" fill={SKIN_SHADOW} opacity="0.5" />
          <path d="M98 154 Q94 132 114 122 Q126 118 134 122 Q120 132 112 148 Q106 162 98 154 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M178 154 Q182 132 162 122 Q150 118 142 122 Q156 132 164 148 Q170 162 178 154 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M96 158 Q88 162 92 174 Q96 180 102 176" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M180 158 Q188 162 184 174 Q180 180 174 176" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M114 138 Q124 130 132 138 Q126 134 120 136" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M144 138 Q152 130 162 138 Q156 134 150 136" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M114 154 Q123 162 132 154" stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M144 154 Q153 162 162 154" stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M115 156 L113 159 M131 156 L133 159 M145 156 L143 159 M161 156 L163 159" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M134 164 Q132 174 135 178 Q139 180 142 176 Q142 172 140 164" fill={SKIN_SHADOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
          <ellipse cx="104" cy="178" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <ellipse cx="172" cy="178" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <path d="M114 188 Q128 186 138 188 Q132 196 120 196 Q112 194 114 188 Z M162 188 Q148 186 138 188 Q144 196 156 196 Q164 194 162 188 Z" fill={HAIR} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M126 204 Q138 200 150 204 Q144 208 138 208 Q132 208 126 204 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g transform="translate(150 244)">
          <ellipse cx="-8" cy="2" rx="13" ry="10" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
          <path d="M-3 -4 Q4 0 -2 6" fill={GLOVE_SHADOW} opacity="0.6" />
          <g transform="translate(8 -4) rotate(-15)">
            <ellipse cx="0" cy="0" rx="13" ry="10" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
            <path d="M-6 -2 Q-2 -5 4 -2 M-7 2 Q-1 -1 6 2" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M5 -3 Q12 0 6 6" fill={GLOVE_SHADOW} opacity="0.6" />
          </g>
        </g>
      </g>
    </>
  );
}

function PoseTrayBody({ filterId }: { filterId: string }) {
  return (
    <>
      <ellipse cx="162" cy="378" rx="58" ry="6" fill={INK} opacity="0.12" />
      <g filter={`url(#${filterId})`}>
        <path d="M138 268 L132 372 L156 372 L160 268 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M164 268 L168 372 L192 372 L186 268 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M148 280 L144 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M178 280 L180 366" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="142" cy="376" rx="16" ry="6" fill={INK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="180" cy="376" rx="16" ry="6" fill={INK} stroke={INK} strokeWidth="2.4" />
        <path
          d="M114 168 Q108 220 116 270 L150 270 L150 220 L174 220 L174 270 L210 270 Q216 220 210 168 Q190 150 162 150 Q132 150 114 168 Z"
          fill={COAT} stroke={INK} strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M174 168 Q200 168 210 184 Q214 232 208 268 L182 268 L184 220 L174 220 Z" fill={COAT_SHADOW} opacity="0.55" />
        <path d="M114 270 Q110 322 122 360 L138 358 L142 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M210 270 Q214 322 202 360 L186 358 L182 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M150 158 L150 220 L174 220 L174 158 Z" fill={SHIRT} stroke={INK} strokeWidth="2.4" />
        <path d="M170 162 L170 218" stroke={SHIRT_SHADOW} strokeWidth="3" fill="none" />
        <circle cx="162" cy="180" r="1.6" fill={INK} />
        <circle cx="162" cy="196" r="1.6" fill={INK} />
        <circle cx="162" cy="212" r="1.6" fill={INK} />
        <path d="M188 190 L200 188 L198 200 L190 200 Z" fill={TERRA} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M214 178 Q224 198 216 224 L200 226 Q204 200 198 184 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M142 152 L154 162 L162 158 L170 162 L182 152" fill={SHIRT} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M148 158 L158 164 L148 170 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M176 158 L166 164 L176 170 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="158" y="161" width="8" height="8" rx="1.5" fill={COAT_SHADOW} stroke={INK} strokeWidth="2" />
        <g transform="rotate(-8 162 100)">
          <ellipse cx="162" cy="100" rx="46" ry="44" fill={SKIN} stroke={INK} strokeWidth="3" />
          <path d="M166 62 Q204 80 204 104 Q198 136 166 142 Q180 128 184 106 Q184 84 166 62 Z" fill={SKIN_SHADOW} opacity="0.5" />
          <path d="M118 96 Q114 74 134 64 Q146 60 154 64 Q138 74 130 90 Q124 106 118 96 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M206 96 Q210 74 190 64 Q178 60 170 64 Q186 74 194 90 Q200 106 206 96 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M116 100 Q108 104 112 116 Q116 122 122 118" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M208 100 Q216 104 212 116 Q208 122 202 118" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M138 80 Q146 76 156 80" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M168 80 Q178 76 186 80" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <ellipse cx="148" cy="96" rx="4.2" ry="5" fill={SHIRT} stroke={INK} strokeWidth="2" />
          <ellipse cx="176" cy="96" rx="4.2" ry="5" fill={SHIRT} stroke={INK} strokeWidth="2" />
          <circle cx="149" cy="98" r="2.6" fill={INK} />
          <circle cx="177" cy="98" r="2.6" fill={INK} />
          <circle cx="150" cy="96.5" r="1" fill={SHIRT} />
          <circle cx="178" cy="96.5" r="1" fill={SHIRT} />
          <path d="M158 106 Q156 116 159 120 Q163 122 166 118 Q166 114 164 106" fill={SKIN_SHADOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
          <ellipse cx="128" cy="120" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <ellipse cx="196" cy="120" rx="9" ry="5" fill={BLUSH} opacity="0.7" />
          <path d="M138 130 Q146 128 154 130 Q150 136 142 136 Q136 134 138 130 Z M186 130 Q178 128 170 130 Q174 136 182 136 Q188 134 186 130 Z" fill={HAIR} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M154 130 Q162 134 170 130" stroke={INK} strokeWidth="2" fill="none" />
          <path d="M150 144 Q162 148 174 144" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
        <path d="M114 184 Q86 210 92 240 L110 244 Q108 222 122 200 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <ellipse cx="180" cy="256" rx="86" ry="11" fill={SILVER_SHADOW} stroke={INK} strokeWidth="2.6" />
        <ellipse cx="180" cy="252" rx="82" ry="8" fill={SILVER} stroke={INK} strokeWidth="2.2" />
        <path d="M118 250 Q150 244 198 246" stroke={SHIRT} strokeWidth="2" fill="none" opacity="0.5" />
        <rect x="166" y="234" width="34" height="22" rx="2" fill={TERRA} stroke={INK} strokeWidth="2" />
        <path d="M166 234 L183 248 L200 234" stroke={INK} strokeWidth="2" fill="none" />
        <circle cx="183" cy="244" r="3" fill={COAT} stroke={INK} strokeWidth="1.5" />
        <g transform="translate(108 250) rotate(-15)">
          <ellipse cx="0" cy="0" rx="13" ry="10" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
          <path d="M-6 -2 Q0 -4 6 -2 M-7 2 Q-1 0 6 3" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M5 -3 Q12 0 6 6" fill={GLOVE_SHADOW} opacity="0.6" />
        </g>
      </g>
    </>
  );
}

function PoseSuccessBody({ filterId }: { filterId: string }) {
  return (
    <>
      <ellipse cx="162" cy="380" rx="44" ry="4.5" fill={INK} opacity="0.12" />
      <g filter={`url(#${filterId})`}>
        <path d="M138 264 L130 360 L154 360 L160 264 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M164 264 L170 360 L194 360 L188 264 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M146 280 L142 354" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M180 280 L182 354" stroke={COAT_SHADOW} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="140" cy="362" rx="16" ry="6" fill={INK} stroke={INK} strokeWidth="2.4" transform="rotate(-8 140 362)" />
        <ellipse cx="184" cy="362" rx="16" ry="6" fill={INK} stroke={INK} strokeWidth="2.4" transform="rotate(8 184 362)" />
        <path
          d="M112 156 Q104 214 114 270 L150 270 L150 214 L176 214 L176 270 L212 270 Q222 214 214 156 Q194 138 162 136 Q132 138 112 156 Z"
          fill={COAT} stroke={INK} strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M176 158 Q204 158 214 174 Q218 226 210 268 L182 268 L184 214 L176 214 Z" fill={COAT_SHADOW} opacity="0.55" />
        <path d="M114 270 Q110 320 122 358 L138 354 L142 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M212 270 Q218 320 204 358 L188 354 L184 270 Z" fill={COAT_SHADOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M150 144 L150 214 L176 214 L176 144 Z" fill={SHIRT} stroke={INK} strokeWidth="2.4" />
        <path d="M172 150 L172 212" stroke={SHIRT_SHADOW} strokeWidth="3" fill="none" />
        <circle cx="163" cy="170" r="1.6" fill={INK} />
        <circle cx="163" cy="186" r="1.6" fill={INK} />
        <circle cx="163" cy="202" r="1.6" fill={INK} />
        <path d="M190 178 L202 176 L200 190 L192 188 Z" fill={TERRA} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M114 158 Q80 130 50 88 L40 100 Q70 144 110 184 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M214 158 Q248 130 278 88 L288 100 Q258 144 218 184 Z" fill={COAT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M142 140 L154 150 L162 146 L170 150 L182 140" fill={SHIRT} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M148 146 L158 152 L148 158 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M176 146 L166 152 L176 158 Z" fill={COAT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="158" y="149" width="8" height="8" rx="1.5" fill={COAT_SHADOW} stroke={INK} strokeWidth="2" />
        <g>
          <ellipse cx="162" cy="84" rx="46" ry="44" fill={SKIN} stroke={INK} strokeWidth="3" />
          <path d="M166 46 Q204 64 204 88 Q198 120 166 126 Q180 112 184 90 Q184 68 166 46 Z" fill={SKIN_SHADOW} opacity="0.5" />
          <path d="M118 80 Q114 58 134 48 Q146 44 154 48 Q138 58 130 74 Q124 90 118 80 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M206 80 Q210 58 190 48 Q178 44 170 48 Q186 58 194 74 Q200 90 206 80 Z" fill={HAIR} stroke={INK} strokeWidth="2.4" />
          <path d="M116 84 Q108 88 112 100 Q116 106 122 102" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M208 84 Q216 88 212 100 Q208 106 202 102" fill={SKIN} stroke={INK} strokeWidth="2.4" />
          <path d="M134 60 Q146 50 158 60" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M166 60 Q178 50 190 60" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M134 80 Q146 70 158 80 Q146 76 134 80 Z" fill={INK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M166 80 Q178 70 190 80 Q178 76 166 80 Z" fill={INK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M158 90 Q156 100 159 104 Q163 106 166 102 Q166 98 164 90" fill={SKIN_SHADOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
          <ellipse cx="126" cy="102" rx="11" ry="6" fill={BLUSH} opacity="0.85" />
          <ellipse cx="198" cy="102" rx="11" ry="6" fill={BLUSH} opacity="0.85" />
          <path d="M138 116 Q146 110 156 116 Q150 120 142 120 Q136 120 138 116 Z M186 116 Q178 110 168 116 Q174 120 182 120 Q188 120 186 116 Z" fill={HAIR} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M138 116 Q132 110 128 112" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M186 116 Q192 110 196 112" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M138 124 Q162 148 186 124 Q180 142 162 144 Q144 142 138 124 Z" fill={INK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M148 130 Q162 134 176 130 L172 132 L152 132 Z" fill={SHIRT} />
          <path d="M154 138 Q162 144 170 138 Q166 142 162 142 Q158 142 154 138 Z" fill={BLUSH} />
        </g>
        <g transform="translate(40 80) rotate(-30)">
          <ellipse cx="0" cy="0" rx="13" ry="12" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
          <path d="M-4 -8 L-4 0 M2 -10 L2 -2 M8 -7 L8 1" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M5 -2 Q12 2 6 8" fill={GLOVE_SHADOW} opacity="0.6" />
        </g>
        <g transform="translate(288 80) rotate(30)">
          <ellipse cx="0" cy="0" rx="13" ry="12" fill={GLOVE} stroke={INK} strokeWidth="2.4" />
          <path d="M-4 -8 L-4 0 M2 -10 L2 -2 M8 -7 L8 1" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M-5 -2 Q-12 2 -6 8" fill={GLOVE_SHADOW} opacity="0.6" />
        </g>
        <path d="M30 130 L30 142 M24 136 L36 136" stroke={TERRA} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M290 130 L290 142 M284 136 L296 136" stroke={TERRA} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="50" cy="180" r="2.4" fill={TERRA} />
        <circle cx="270" cy="180" r="2.4" fill={TERRA} />
        <path d="M70 50 L70 60 M65 55 L75 55" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M250 50 L250 60 M245 55 L255 55" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M122 384 Q132 388 142 384" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M182 384 Q192 388 202 384" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>
    </>
  );
}

export function ReggieHead({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <ellipse cx="25" cy="22" rx="14" ry="16" fill="var(--cream)" stroke="var(--ink)" />
      <path
        d="M 11 18 Q 14 6 25 5 Q 36 6 39 18 Q 33 11 25 11 Q 17 11 11 18 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 19 24 Q 21 27 23 24" />
      <path d="M 27 24 Q 29 27 31 24" />
      <path
        d="M 17 32 Q 21 34 25 33 Q 29 34 33 32 Q 31 36 26 34 Q 25 34 24 34 Q 19 36 17 32 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 14 41 L 18 47 L 32 47 L 36 41 Z" fill="var(--ink)" stroke="var(--ink)" />
      <path d="M 22 41 L 25 44 L 28 41" stroke="#fff" />
    </svg>
  );
}

export function ReggieSays({
  children,
  layout = "row",
  size = 96,
  pose = "welcoming",
  bubbleMaxWidth = 460,
}: {
  children: ReactNode;
  layout?: "row" | "column";
  size?: number;
  pose?: ReggiePose;
  bubbleMaxWidth?: number;
}) {
  const isRow = layout === "row";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: isRow ? "flex-start" : "center",
        gap: isRow ? 18 : 14,
        width: "100%",
      }}
    >
      <Reggie size={size} pose={pose} />
      <Bubble tail={isRow ? "left" : "top"} maxWidth={bubbleMaxWidth}>
        {children}
      </Bubble>
    </div>
  );
}

export function ReggieReferralPlea() {
  const isNarrow = useMatchesQuery("(max-width: 720px)");
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <ReggieSays
        layout={isNarrow ? "column" : "row"}
        size={isNarrow ? 80 : 72}
        pose="pleading"
        bubbleMaxWidth={520}
      >
        Enjoying my service, Master? One does so love a full house. A kind word in a friend's
        ear would be most appreciated. Master doesn't feed me unless more guests arrive at the
        party.
      </ReggieSays>
      <ShareButtons />
    </div>
  );
}

export function ReggieBreakthrough({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--ink)",
        borderRadius: 18,
        padding: "20px 22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 10px 30px -18px rgba(26,26,26,0.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <Reggie size={120} pose="cheerful" />
        <div style={{ flex: 1, minWidth: 240, display: "grid", gap: 10 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            A triumph, Master.
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--ink-2)",
              margin: 0,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            One's establishment is open. The first guests will arrive soon. If Master is
            feeling generous, a recommendation to a friend would not go amiss. One does, after
            all, eat only when guests arrive.
          </p>
        </div>
      </div>
      <ShareButtons size="large" />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 500,
            fontStyle: "italic",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Right you are, Reggie
        </button>
      </div>
    </div>
  );
}

function ShareButtons({ size = "small" }: { size?: "small" | "large" }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyMessage() {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(SHARE_MESSAGE);
        ok = true;
      } catch {
        ok = legacyCopy(SHARE_MESSAGE);
      }
    } else {
      ok = legacyCopy(SHARE_MESSAGE);
    }
    if (!ok) return;
    if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 2000);
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  const isLarge = size === "large";
  const iconBox = isLarge ? 44 : 36;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: isLarge ? 12 : 8,
      }}
    >
      <ShareButton href={waUrl} label="WhatsApp" iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: "#25D366",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
          }}
        >
          <WhatsAppGlyph size={isLarge ? 22 : 18} color="#fff" />
        </span>
      </ShareButton>
      <ShareButton href={xUrl} label="X" iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: "var(--ink)",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
            color: "#fff",
          }}
        >
          <svg
            width={isLarge ? 22 : 18}
            height={isLarge ? 22 : 18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4 L20 20 M20 4 L4 20" />
          </svg>
        </span>
      </ShareButton>
      <ShareButton onClick={copyMessage} label={copied ? "Copied!" : "Copy"} iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: copied ? "var(--cream)" : "var(--cream-2)",
            border: copied ? "1px solid var(--green)" : "1px solid var(--hair)",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
            color: copied ? "var(--green-d)" : "var(--ink-2)",
          }}
        >
          <svg
            width={isLarge ? 20 : 16}
            height={isLarge ? 20 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="12" height="12" rx="2" />
            <rect x="3" y="9" width="12" height="12" rx="2" />
          </svg>
        </span>
      </ShareButton>
    </div>
  );
}

function ShareButton({
  href,
  onClick,
  label,
  iconBox: _iconBox,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  iconBox: number;
  children: ReactNode;
}) {
  const inner = (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink-2)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </span>
  );
  const sharedStyle = {
    background: "transparent",
    border: "none",
    padding: 4,
    cursor: "pointer",
    width: "100%",
  } as const;
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...sharedStyle, textDecoration: "none" }}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={sharedStyle}>
      {inner}
    </button>
  );
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function Bubble({
  children,
  tail,
  maxWidth,
}: {
  children: ReactNode;
  tail: "left" | "top";
  maxWidth: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1.5px solid var(--ink)",
        borderRadius: 14,
        padding: "14px 18px",
        fontSize: 14.5,
        lineHeight: 1.5,
        color: "var(--ink)",
        fontWeight: 500,
        maxWidth,
        boxShadow: "0 4px 14px -10px rgba(26,26,26,0.25)",
      }}
    >
      <span
        aria-hidden="true"
        style={
          tail === "left"
            ? {
                position: "absolute",
                left: -8,
                top: 22,
                width: 14,
                height: 14,
                background: "var(--surface)",
                borderLeft: "1.5px solid var(--ink)",
                borderBottom: "1.5px solid var(--ink)",
                transform: "rotate(45deg)",
              }
            : {
                position: "absolute",
                top: -8,
                left: "50%",
                marginLeft: -7,
                width: 14,
                height: 14,
                background: "var(--surface)",
                borderTop: "1.5px solid var(--ink)",
                borderLeft: "1.5px solid var(--ink)",
                transform: "rotate(45deg)",
              }
        }
      />
      {children}
    </div>
  );
}
