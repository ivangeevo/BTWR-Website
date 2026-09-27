// A coffee cup, for Ko-fi.
export default function KofiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3 6h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V6Zm14 1h1.5a3.5 3.5 0 0 1 0 7H17v-2h1.5a1.5 1.5 0 0 0 0-3H17V7ZM2 20h17v2H2v-2Z"
      />
    </svg>
  );
}
