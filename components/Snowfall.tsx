// Fixed (not random) values — random values would cause a server/client
// hydration mismatch on a statically exported page.
//
// Delays are negative: a positive delay leaves a flake sitting statically at
// its pre-animation position (fully opaque, pinned near the top) until the
// delay elapses, which reads as snow "stuck" at the top of the hero on first
// load. A negative delay instead starts each flake as if it were already
// that many seconds into its fall, so on first paint every flake is already
// mid-descent — exactly like the steady-state look once the animation has
// been running for a while.
const flakes = [
  { left: "5%", size: 4, duration: "9s", delay: "-0s" },
  { left: "12%", size: 3, duration: "11s", delay: "-2s" },
  { left: "20%", size: 5, duration: "8s", delay: "-4s" },
  { left: "28%", size: 3, duration: "12s", delay: "-1s" },
  { left: "35%", size: 4, duration: "10s", delay: "-3s" },
  { left: "42%", size: 3, duration: "9s", delay: "-5s" },
  { left: "50%", size: 5, duration: "13s", delay: "-0.5s" },
  { left: "58%", size: 3, duration: "10s", delay: "-2.5s" },
  { left: "65%", size: 4, duration: "8s", delay: "-4.5s" },
  { left: "72%", size: 3, duration: "11s", delay: "-1.5s" },
  { left: "80%", size: 5, duration: "9s", delay: "-3.5s" },
  { left: "88%", size: 3, duration: "12s", delay: "-0s" },
  { left: "15%", size: 4, duration: "14s", delay: "-6s" },
  { left: "45%", size: 3, duration: "9s", delay: "-7s" },
  { left: "68%", size: 4, duration: "11s", delay: "-6.5s" },
  { left: "92%", size: 3, duration: "10s", delay: "-5.5s" },
  { left: "3%", size: 3, duration: "13s", delay: "-8s" },
  { left: "55%", size: 5, duration: "8s", delay: "-8.5s" },
];

export default function Snowfall() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {flakes.map((flake, i) => (
        <span
          key={i}
          className="snow-dot"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            animationDuration: flake.duration,
            animationDelay: flake.delay,
          }}
        />
      ))}
    </div>
  );
}
