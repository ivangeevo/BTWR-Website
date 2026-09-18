// A thin glowing seam between homepage sections — visible against both the
// dark hero/Outpost banners and the light stats/card sections.
export default function SectionDivider() {
  return (
    <div
      aria-hidden="true"
      className="h-[5px] w-full bg-gradient-to-r from-transparent via-glow/60 to-transparent"
    />
  );
}
