// A simplified Revolut "R".
export default function RevolutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M5 3h8a5.5 5.5 0 0 1 2.4 10.45L19.5 21h-4.6l-3.6-7H9v7H5V3Zm4 3.6v3.8h4a1.9 1.9 0 0 0 0-3.8H9Z"
      />
    </svg>
  );
}
