// Fixed (not random) positions — random values would cause a server/client
// hydration mismatch on a statically exported page.
const dots = [
  { top: "10%", left: "15%", size: 6, delay: "0s" },
  { top: "20%", left: "80%", size: 4, delay: "0.6s" },
  { top: "60%", left: "10%", size: 5, delay: "1.2s" },
  { top: "75%", left: "70%", size: 3, delay: "1.8s" },
  { top: "35%", left: "50%", size: 4, delay: "2.4s" },
  { top: "85%", left: "40%", size: 5, delay: "3s" },
  { top: "15%", left: "45%", size: 3, delay: "0.3s" },
  { top: "50%", left: "90%", size: 4, delay: "1.5s" },
  { top: "65%", left: "25%", size: 3, delay: "2.1s" },
  { top: "5%", left: "60%", size: 5, delay: "2.7s" },
  { top: "45%", left: "5%", size: 4, delay: "0.9s" },
  { top: "90%", left: "85%", size: 3, delay: "1.8s" },
];

export default function FrostShimmer() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {dots.map((dot, i) => (
        <span
          key={i}
          className="shimmer-dot"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  );
}
