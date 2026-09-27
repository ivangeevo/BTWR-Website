export default function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 2.9 4 6.9 4c2.2 0 3.9 1.2 5.1 3 1.2-1.8 2.9-3 5.1-3 4 0 6 4.3 4.5 7.7C19.5 16.4 12 21 12 21Z"
      />
    </svg>
  );
}
