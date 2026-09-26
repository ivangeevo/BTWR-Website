"use client";

import { useEffect, useRef, useState } from "react";
import {
  areStarsEnabled,
  computeCyclePhase,
  isDayNightCycleActive,
  isThemeOverrideAllowed,
  loadCycleStartedAt,
  MOON_PHASES,
  rgbToCss,
  siteBgBlend,
  skyColors,
  themeForPhase,
  type CyclePhase,
} from "./hub/day-night-cycle";
import { isSkyHeldByEngine, pushInbox, readEnginePublic } from "./hub/engine/bridge-storage";

// The whole-page crossfade spans 8s before the true rise/set instant to 8s
// after it — CSS transitions can only animate FORWARD from the moment a
// value actually changes, there's no way to make one "start early" against
// a value that hasn't changed yet. So instead the flip itself (the
// data-theme attribute actually changing) is moved 8s EARLIER than the true
// boundary, and the transition is stretched to cover the full 16s — which
// means it's still easing when the true boundary passes, and finishes 8s
// past it. Kept in sync with app/globals.css's html.daynight-theme-transition
// rule.
const THEME_FLIP_LEAD_MS = 8_000;
const THEME_TRANSITION_MS = THEME_FLIP_LEAD_MS * 2;

// How far to peek ahead/behind the current moment for the left/right sky
// wash below — the sun/moon moves left-to-right, so "left" is always a
// preview of what's coming (closer to a rise) and "right" is always a
// lingering trace of what just was (closer to a set). Sampled through
// computeCyclePhase itself (not just clamped within the current phase
// object) so it correctly crosses the twilight gap and segment boundary —
// right after a rise, the right side still needs to show the OLD segment's
// trailing color, which a same-phase clamp can't reach.
const WASH_LOOKAHEAD_MS = 10_000;

// Where the sun/moon sits along its parabolic arc, as percentages of the
// band: rises from the horizon at the edges to its peak at the midpoint of
// the visible arc, same shape sunrise-to-sunset would trace. Driven by
// bodyProgress (arc-only), not progress (the full segment including the
// trailing twilight gap) — the body holds at the set position
// (bodyProgress 1) through the gap while its opacity fades out.
function bodyPosition(phase: CyclePhase) {
  const heightFactor = 1 - Math.pow(2 * phase.bodyProgress - 1, 2);
  return { x: phase.bodyProgress * 100, y: 88 - heightFactor * 78, heightFactor };
}

// A custom-property-only extension of React's own style type — see the big
// comment on .day-night-sky in globals.css for why these have to be CSS
// custom properties (registered there via @property) rather than just
// baked into a `background` string set from JS: only a registered custom
// property can be smoothly transitioned when it's used inside a gradient
// function's arguments.
type SkyStyle = React.CSSProperties & {
  "--sky-top"?: string;
  "--sky-bg-blend"?: string;
  "--sky-glow"?: string;
  "--sky-wash-left"?: string;
  "--sky-wash-right"?: string;
  "--sky-ray"?: string;
};

// Fixed, hand-placed star positions (percent of the band's width/height) —
// deliberately NOT randomized per render, so they read as a real, stable
// sky instead of shifting noise. One is marked `marker: true`: a bit bigger
// and slower-pulsing, sitting front-and-center — not wired to anything yet,
// but a deliberate, easy-to-find hook for a future clickable Outpost secret.
type Star = { left: number; top: number; delay: number; marker?: boolean };

const STARS: Star[] = [
  { left: 6, top: 20, delay: 0 },
  { left: 13, top: 55, delay: 0.6 },
  { left: 21, top: 12, delay: 1.4 },
  { left: 29, top: 40, delay: 0.2 },
  { left: 37, top: 65, delay: 1.9 },
  { left: 46, top: 24, delay: 0.9 },
  { left: 50, top: 45, delay: 0, marker: true },
  { left: 58, top: 15, delay: 2.3 },
  { left: 66, top: 58, delay: 0.4 },
  { left: 74, top: 30, delay: 1.6 },
  { left: 81, top: 50, delay: 0.8 },
  { left: 88, top: 18, delay: 2.0 },
  { left: 93, top: 62, delay: 1.1 },
  { left: 10, top: 70, delay: 2.6 },
  { left: 96, top: 35, delay: 0.3 },
];

// Full-width band at the very top of every page — a sun (day) or the
// current moon phase (night) crosses it along a parabolic arc once per
// 5-minute-long phase (day-night-cycle.ts's PHASE_MS). Height is reserved
// by app/layout.tsx's boot script
// (html[data-daynight-active]) before hydration, so there's no layout
// shift when this pops in; this component just re-confirms that same
// state every second afterward so it also reacts to the visitor flipping
// the setting mid-session, not just on load.
//
// Also the one place that keeps data-theme live-synced to the cycle across
// a long-lived tab (the boot script only sets it once, before hydration) —
// except while ThemeToggle's own "fighting" revert timer owns it
// (html.daynight-fighting), so the two don't fight each other too.
export default function DayNightSky() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<CyclePhase | null>(null);
  // True only for the single tick a new body starts rising (bodyVisible
  // flips false -> true, right after the twilight gap). At that instant
  // `bodyProgress` resets from 1 back to 0, so `left`/--sky-body-x jump from
  // ~100% back to 0%. The icon rises already fully faded out (see its
  // opacity transition), and the rays/glow are at zero strength right up to
  // that moment too, so the jump itself is invisible — this just also skips
  // the relevant position transitions for that one render so nothing sweeps
  // across while fading back in, and normal easing resumes next tick.
  const [justRose, setJustRose] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [starsOn, setStarsOn] = useState(true);
  // The marker star's secret: while the Outpost's Engine is hunting its
  // keyword (Stage 7), the marker star can be clicked at night for a piece.
  const [starHunt, setStarHunt] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const prevBodyVisibleRef = useRef<boolean | null>(null);
  const themeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function tick() {
      const isActive = isDayNightCycleActive();
      setActive(isActive);
      document.documentElement.setAttribute("data-daynight-active", String(isActive));
      if (!isActive) {
        setPhase(null);
        prevBodyVisibleRef.current = null;
        return;
      }
      // Re-read every tick: a Hardcore Spawn respawn moves the anchor to the
      // next morning (day-night-cycle.ts's skipToMorning).
      startedAtRef.current = loadCycleStartedAt();
      const now = Date.now();
      const nextPhase = computeCyclePhase(startedAtRef.current, now);
      setJustRose(prevBodyVisibleRef.current === false && nextPhase.bodyVisible);
      prevBodyVisibleRef.current = nextPhase.bodyVisible;
      setPhase(nextPhase);
      setNowMs(now);
      setStarsOn(areStarsEnabled());
      const pub = readEnginePublic();
      setStarHunt(!!pub?.keywordHunt && !pub.fragments.includes("frag-star"));
      const root = document.documentElement;
      // The Engine can hold the sky still (Stage 8) — the theme stays where the visitor put it.
      if (!isThemeOverrideAllowed() && !root.classList.contains("daynight-fighting") && !isSkyHeldByEngine(now)) {
        // Decided from 8s in the future, not "now" — see THEME_FLIP_LEAD_MS.
        const themePhase = computeCyclePhase(startedAtRef.current, now + THEME_FLIP_LEAD_MS);
        const nextTheme = themeForPhase(themePhase.isDay);
        // Only the actual flip needs the whole-page crossfade — wrapping
        // every tick (most of which are no-ops, same theme as before) would
        // leave the transition class permanently on and quietly slow down
        // every other color change on the site.
        if (root.getAttribute("data-theme") !== nextTheme) {
          root.classList.add("daynight-theme-transition");
          if (themeTransitionTimerRef.current) clearTimeout(themeTransitionTimerRef.current);
          themeTransitionTimerRef.current = setTimeout(() => {
            root.classList.remove("daynight-theme-transition");
          }, THEME_TRANSITION_MS);
        }
        root.setAttribute("data-theme", nextTheme);
      }
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      if (themeTransitionTimerRef.current) clearTimeout(themeTransitionTimerRef.current);
    };
  }, []);

  // The sun/moon and the rays centred on it move every frame, not once a
  // second: the position is worked out fresh from the clock each frame, the
  // icon is placed by a sub-pixel transform (a tweened left/top snapped to
  // whole pixels, stepping visibly), and the rays read the very same
  // --sky-body-x/y straight away, with no transition of their own to lag
  // behind it. The colours still change on the 1s tick above, tweened.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const frame = () => {
      const sky = skyRef.current;
      const body = bodyRef.current;
      const startedAt = startedAtRef.current;
      if (sky && startedAt !== null) {
        const { x, y } = bodyPosition(computeCyclePhase(startedAt, Date.now()));
        sky.style.setProperty("--sky-body-x", `${x}%`);
        sky.style.setProperty("--sky-body-y", `${y}%`);
        if (body) {
          const px = (x / 100) * sky.clientWidth;
          const py = (y / 100) * sky.clientHeight;
          body.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active || !phase) return <div ref={skyRef} className="day-night-sky" aria-hidden="true" />;

  const { heightFactor } = bodyPosition(phase);
  const { top, horizon } = skyColors(phase);
  const bgBlend = siteBgBlend(phase);

  // The warm horizon glow is a radial patch anchored under wherever the
  // sun/moon currently is, not a band spanning the full width — strongest
  // right at rise/set (heightFactor -> 0, body near an edge) and fully gone
  // at the arc's peak (heightFactor -> 1, body overhead), same as real
  // sunrise/sunset light only warming the sky near the horizon. Fades out
  // entirely once the body's actually set (the trailing twilight gap), so
  // the lingering afterglow reads as ambient dusk/dawn light (the vertical
  // gradient below, still gradually shifting) rather than a hot spot with
  // nothing left to cast it.
  const glowStrength = phase.bodyVisible ? 1 - heightFactor : 0;

  // Left/right sky wash — the whitening (or darkening) of the sky itself
  // happens on whichever side the change is actually coming from, not
  // uniformly across the whole band. Left previews the color a little
  // further into the future (closer to an imminent rise), right still
  // carries a little of the past (closer to what just set) — see
  // WASH_LOOKAHEAD_MS above.
  const startedAt = startedAtRef.current ?? nowMs;
  const leftTop = skyColors(computeCyclePhase(startedAt, nowMs + WASH_LOOKAHEAD_MS)).top;
  const rightTop = skyColors(computeCyclePhase(startedAt, nowMs - WASH_LOOKAHEAD_MS)).top;

  // Rays reuse the horizon's own warm/cool tone (dependent on the same
  // color the glow uses) and the same rise/set-only strength, just at a much
  // lower alpha so it reads as a soft light burst rather than a sunburst
  // graphic.
  const skyStyle: SkyStyle = {
    "--sky-top": rgbToCss(top),
    "--sky-bg-blend": rgbToCss(bgBlend),
    "--sky-glow": rgbToCss(horizon, glowStrength * 0.85),
    "--sky-wash-left": rgbToCss(leftTop, 0.5),
    "--sky-wash-right": rgbToCss(rightTop, 0.5),
    "--sky-ray": rgbToCss(horizon, glowStrength * 0.16),
    transitionProperty: justRose
      ? "height, filter, --sky-top, --sky-bg-blend, --sky-glow, --sky-wash-left, --sky-wash-right, --sky-ray"
      : undefined,
  };

  // Stars fade with the sky's OWN current darkness (derived from --sky-top's
  // luminance) rather than a separate isDay/timer check — so they come in
  // and out on exactly the same gradual dusk/dawn curve as everything else,
  // with zero extra state to keep in sync.
  const luminance = (0.299 * top[0] + 0.587 * top[1] + 0.114 * top[2]) / 255;
  const starOpacity = Math.max(0, Math.min(1, 1 - luminance * 1.6));

  const icon = phase.isDay ? "☀️" : MOON_PHASES[phase.moonPhaseIndex].icon;
  const label = phase.isDay ? "Daytime" : MOON_PHASES[phase.moonPhaseIndex].name;

  return (
    <div
      ref={skyRef}
      className="day-night-sky"
      data-active="true"
      data-phase={phase.isDay ? "day" : "night"}
      style={skyStyle}
      aria-hidden="true"
    >
      {starsOn && (
        <div className="day-night-stars" style={{ opacity: starOpacity }}>
          {STARS.map((star, i) =>
            star.marker && starHunt && !phase.isDay ? (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                className="day-night-star day-night-star--marker"
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  animationDelay: `${star.delay}s`,
                  pointerEvents: "auto",
                  cursor: "pointer",
                  boxShadow: "0 0 10px 3px rgba(255, 210, 122, 0.9)",
                }}
                onClick={() => {
                  pushInbox({ type: "keyFragment", data: { frag: "frag-star", via: "star" } });
                  setStarHunt(false);
                }}
              />
            ) : (
              <span
                key={i}
                className={star.marker ? "day-night-star day-night-star--marker" : "day-night-star"}
                style={{ left: `${star.left}%`, top: `${star.top}%`, animationDelay: `${star.delay}s` }}
              />
            )
          )}
        </div>
      )}
      <div
        ref={bodyRef}
        className="day-night-body"
        style={{
          opacity: phase.bodyVisible ? 1 : 0,
          transitionProperty: justRose ? "opacity" : undefined,
        }}
        title={label}
      >
        {icon}
      </div>
    </div>
  );
}
